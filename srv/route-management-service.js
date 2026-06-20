const cds = require('@sap/cds');
const registerLoginHandler = require('./handlers/login-handler');
const {
  registerErrorHandler,
  rejectRequest: reject
} = require('./lib/error-handler');

const TOUR_STATUS = Object.freeze({
  CREATED: 'CREATED',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
  ASSIGNED: 'ASSIGNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

const ROADMAP_STATUS = Object.freeze({
  CREATED: 'CREATED',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
});

/* ===================================================== */
/* STATUS HELPERS                                        */
/* ===================================================== */

function normalizeTourStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();

  if (['DRAFT', 'PENDING'].includes(normalized)) {
    return TOUR_STATUS.CREATED;
  }

  if (normalized === 'ACCEPTED') {
    return TOUR_STATUS.VALIDATED;
  }

  if (Object.values(TOUR_STATUS).includes(normalized)) {
    return normalized;
  }

  return TOUR_STATUS.CREATED;
}

function normalizeRoadmapStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toUpperCase();

  if (['DRAFT', 'PENDING', 'CREATED'].includes(normalized)) {
    return ROADMAP_STATUS.CREATED;
  }

  if (normalized === 'ACTIVE') {
    return ROADMAP_STATUS.VALIDATED;
  }

  if (Object.values(ROADMAP_STATUS).includes(normalized)) {
    return normalized;
  }

  return ROADMAP_STATUS.CREATED;
}

function isCreatedStatus(status) {
  return normalizeTourStatus(status) === TOUR_STATUS.CREATED;
}

function isValidatedStatus(status) {
  return normalizeTourStatus(status) === TOUR_STATUS.VALIDATED;
}

function isRejectedStatus(status) {
  return normalizeTourStatus(status) === TOUR_STATUS.REJECTED;
}

function isCreatedRoadmapStatus(status) {
  return normalizeRoadmapStatus(status) === ROADMAP_STATUS.CREATED;
}

function isValidatedRoadmapStatus(status) {
  return normalizeRoadmapStatus(status) === ROADMAP_STATUS.VALIDATED;
}

function isRejectedRoadmapStatus(status) {
  return normalizeRoadmapStatus(status) === ROADMAP_STATUS.REJECTED;
}

function isDraftRequest(req) {
  const key = req.params && req.params[0];
  const active = key && key.IsActiveEntity;
  const targetName = req.target && req.target.name || '';

  return active === false || String(active).toLowerCase() === 'false' || targetName.endsWith('.drafts');
}

function ensureActiveEntity(req, label) {
  if (!isDraftRequest(req)) {
    return true;
  }

  reject(req, `Veuillez enregistrer ${label} avant de lancer cette action.`, 400, {
    code: 'DRAFT_MUST_BE_ACTIVATED'
  });
  return false;
}

function requestUserID(req) {
  const headers = req.headers || {};
  return headers['x-sepur-user-id'] || headers['X-Sepur-User-Id'] || null;
}

async function requireRole(req, Users, expectedRole) {
  const userID = requestUserID(req);

  if (!userID) {
    return reject(req, 'Action non autorisée pour ce rôle.', 403, { code: 'ROLE_REQUIRED' });
  }

  const user = await SELECT.one.from(Users).where({ ID: userID, active: true });
  const role = String(user && user.role || '').trim().toUpperCase();

  if (!user || (role !== expectedRole && role !== 'ADMIN')) {
    return reject(req, 'Action non autorisée pour ce rôle.', 403, { code: 'FORBIDDEN' });
  }

  return user;
}

function tourStatusCriticality(status) {
  const normalized = normalizeTourStatus(status);
  if ([TOUR_STATUS.VALIDATED, TOUR_STATUS.ASSIGNED, TOUR_STATUS.COMPLETED].includes(normalized)) return 3;
  if (normalized === TOUR_STATUS.REJECTED) return 1;
  if (normalized === TOUR_STATUS.CREATED) return 2;
  return 0;
}

function roadmapStatusCriticality(status) {
  const normalized = normalizeRoadmapStatus(status);
  if ([ROADMAP_STATUS.VALIDATED, ROADMAP_STATUS.COMPLETED].includes(normalized)) return 3;
  if (normalized === ROADMAP_STATUS.REJECTED) return 1;
  if (normalized === ROADMAP_STATUS.CREATED) return 2;
  return 0;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function tourScheduleStatus(tour) {
  const status = normalizeTourStatus(tour.status);
  if (status === TOUR_STATUS.COMPLETED) return 'COMPLETED';
  if (status === TOUR_STATUS.CANCELLED) return 'CANCELLED';
  const date = tour.tourDate || tour.collectionDate;
  if (!date) return 'ON_TIME';
  if (date < todayISO()) return 'OVERDUE';
  if (date === todayISO()) return 'DUE_TODAY';
  return 'ON_TIME';
}

function roadmapScheduleStatus(roadmap) {
  const status = normalizeRoadmapStatus(roadmap.status);
  if (status === ROADMAP_STATUS.COMPLETED) return 'COMPLETED';
  if (status === ROADMAP_STATUS.CANCELLED) return 'CANCELLED';
  if (roadmap.endDate && roadmap.endDate < todayISO()) return 'OVERDUE';
  if (roadmap.startDate && roadmap.startDate > todayISO()) return 'UPCOMING';
  return 'CURRENT';
}

/* ===================================================== */
/* CODE GENERATOR                                        */
/* ===================================================== */

async function nextCode(entityName, fieldName, prefix) {
  const entities = cds.entities('route.management');
  const target = entities[entityName];

  const rows = await SELECT.from(target)
    .columns(fieldName)
    .orderBy(`${fieldName} desc`)
    .limit(1);

  let seq = 1;

  if (rows.length && rows[0][fieldName]) {
    const match = String(rows[0][fieldName]).match(/(\d+)$/);
    if (match) {
      seq = parseInt(match[1], 10) + 1;
    }
  }

  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/* ===================================================== */
/* FIELD COMPATIBILITY HELPERS                           */
/* ===================================================== */

function syncTourPayload(data) {
  if (!data) {
    return;
  }

  if (data.tourNumber && !data.tourCode) {
    data.tourCode = data.tourNumber;
  }

  if (data.tourCode && !data.tourNumber) {
    data.tourNumber = data.tourCode;
  }

  if (data.collectionDate && !data.tourDate) {
    data.tourDate = data.collectionDate;
  }

  if (data.tourDate && !data.collectionDate) {
    data.collectionDate = data.tourDate;
  }

  if (data.remarks && !data.description) {
    data.description = data.remarks;
  }

  if (data.description && !data.remarks) {
    data.remarks = data.description;
  }
}

function syncRoadmapPayload(data) {
  if (!data) {
    return;
  }

  if (data.roadmapNumber && !data.roadmapCode) {
    data.roadmapCode = data.roadmapNumber;
  }

  if (data.roadmapCode && !data.roadmapNumber) {
    data.roadmapNumber = data.roadmapCode;
  }

  if (data.startDate && (!data.month || !data.year)) {
    const d = new Date(data.startDate);
    if (!Number.isNaN(d.getTime())) {
      data.month = data.month || d.getMonth() + 1;
      data.year = data.year || d.getFullYear();
    }
  }

  if (data.month && data.year) {
    const range = monthRange(data.year, data.month);
    data.startDate = range.startDate;
    data.endDate = range.endDate;
  }
}

function enrichTourAliases(tour) {
  if (!tour) {
    return;
  }

  tour.tourNumber = tour.tourNumber || tour.tourCode;
  tour.tourCode = tour.tourCode || tour.tourNumber;

  tour.collectionDate = tour.collectionDate || tour.tourDate;
  tour.tourDate = tour.tourDate || tour.collectionDate;

  tour.remarks = tour.remarks || tour.description;
  tour.description = tour.description || tour.remarks;
}

function enrichRoadmapAliases(roadmap) {
  if (!roadmap) {
    return;
  }

  roadmap.roadmapNumber = roadmap.roadmapNumber || roadmap.roadmapCode;
  roadmap.roadmapCode = roadmap.roadmapCode || roadmap.roadmapNumber;

  if (roadmap.startDate && (!roadmap.month || !roadmap.year)) {
    const d = new Date(roadmap.startDate);
    if (!Number.isNaN(d.getTime())) {
      roadmap.month = roadmap.month || d.getMonth() + 1;
      roadmap.year = roadmap.year || d.getFullYear();
    }
  }
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function monthRange(year, month) {
  const y = Number(year);
  const m = Number(month);

  const startDate = `${y}-${pad2(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${pad2(m)}-${pad2(lastDay)}`;

  return {
    startDate,
    endDate
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = class RouteManagementService extends cds.ApplicationService {
  init() {
    registerErrorHandler(this);

    const {
      Users,
      Tours,
      Roadmaps,
      RoadmapTours,
      RoadmapSteps,
      DecisionHistories,
      TourCollectionPoints,
      CollectionPoints,
      Clients,
      Vehicles,
      Drivers
    } = cds.entities('route.management');

    /* ===================================================== */
    /* READ ENRICHMENT — TOURS                               */
    /* ===================================================== */

    this.after('READ', 'Tours', function (rows) {
      const list = Array.isArray(rows) ? rows : [rows];

      for (const tour of list) {
        if (!tour) {
          continue;
        }

        enrichTourAliases(tour);
        const normalizedStatus = normalizeTourStatus(tour.status);
        const isActive = tour.IsActiveEntity !== false;
        tour.status = normalizedStatus;
        tour.statusCriticality = tourStatusCriticality(normalizedStatus);
        tour.canValidate = isActive && normalizedStatus === TOUR_STATUS.CREATED;
        tour.canReject = isActive && normalizedStatus === TOUR_STATUS.CREATED;
        tour.canComplete = isActive && [TOUR_STATUS.VALIDATED, TOUR_STATUS.ASSIGNED].includes(normalizedStatus);
      }
    });

    /* ===================================================== */
    /* READ ENRICHMENT — ROADMAPS                            */
    /* ===================================================== */

    this.after('READ', 'Roadmaps', function (rows) {
      const list = Array.isArray(rows) ? rows : [rows];

      for (const roadmap of list) {
        if (!roadmap) {
          continue;
        }
        enrichRoadmapAliases(roadmap);

        const normalizedStatus = normalizeRoadmapStatus(roadmap.status);
        const isActive = roadmap.IsActiveEntity !== false;
        roadmap.status = normalizedStatus;
        roadmap.statusCriticality = roadmapStatusCriticality(normalizedStatus);
        roadmap.canValidate = isActive && normalizedStatus === ROADMAP_STATUS.CREATED;
        roadmap.canReject = isActive && normalizedStatus === ROADMAP_STATUS.CREATED;
        roadmap.canComplete = isActive && normalizedStatus === ROADMAP_STATUS.VALIDATED;
      }
    });

    registerLoginHandler(this, { Users }, { reject });

    /* ===================================================== */
    /* TOURS — BEFORE CREATE / UPDATE                        */
    /* ===================================================== */

    this.before('CREATE', 'Tours', async (req) => {
  await requireRole(req, Users, 'PLANIFICATEUR');
  syncTourPayload(req.data);

  const code = await nextCode('Tours', 'tourCode', 'TOUR');
  req.data.tourCode = code;
  req.data.tourNumber = code;
  req.data.status = TOUR_STATUS.CREATED;
  req.data.rejectionReason = null;

  if (isDraftRequest(req)) {
    return;
  }

  const validationError = validateTourPayload(req, req.data);
  if (validationError) {
    return validationError;
  }
});

    this.before('SAVE', 'Tours', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      syncTourPayload(req.data);

      const validationError = validateTourPayload(req, req.data);
      if (validationError) {
        return validationError;
      }

      if (!req.data.tourCode) {
        const code = await nextCode('Tours', 'tourCode', 'TOUR');
        req.data.tourCode = code;
        req.data.tourNumber = code;
      }

      req.data.status = TOUR_STATUS.CREATED;
      req.data.rejectionReason = null;
    });
    

      this.before('UPDATE', 'Tours', async (req) => {
  await requireRole(req, Users, 'PLANIFICATEUR');
  syncTourPayload(req.data);

  const validationError = validateTourPayload(req, req.data, true);
  if (validationError) {
    return validationError;
  }

  const id = req.data.ID || req.params?.[0]?.ID;

  if (!id) {
    return;
  }

  const tour = await SELECT.one.from(Tours).where({ ID: id });

  if (!tour) {
    return;
  }

  const normalizedStatus = normalizeTourStatus(tour.status);

  if (![TOUR_STATUS.CREATED, TOUR_STATUS.REJECTED].includes(normalizedStatus)) {
    return reject(req, 'Les tournées validées, terminées ou annulées ne peuvent plus être modifiées.', 409, {
      code: 'TOUR_NOT_EDITABLE'
    });
  }

  const technicalFields = new Set([
    'ID',
    'IsActiveEntity',
    'HasActiveEntity',
    'HasDraftEntity',
    'DraftAdministrativeData',
    'DraftAdministrativeData_DraftUUID',
    'SiblingEntity',
    'DraftMessages',
    'statusCriticality',
    'canValidate',
    'canReject',
    'canComplete',
    'statusText',
    'scheduleStatus',
    'scheduleStatusText',
    'scheduleCriticality',
    'clientName',
    'driverFirstName',
    'driverLastName',
    'vehicleRegistration',
    'createdByName',
    'tourPoints',
    'decisions',
    'roadmap',
    'humanResources',
    'materialResources',
    'tourCode',
    'tourNumber',
    'status',
    'rejectionReason',
    'updatedAt',
    'createdByUser_ID',
    'createdAt',
    'createdBy',
    'modifiedAt',
    'modifiedBy'
  ]);

  const keys = Object.keys(req.data).filter((key) => {
    return !key.startsWith('_') && !technicalFields.has(key);
  });

  const allowedFields = new Set([
    'tourDate',
    'collectionDate',
    'zone',
    'collectionType',
    'description',
    'remarks',
    'quantity',
    'unitOfMeasure',
    'client_ID',
    'client',

    'material_ID',
    'material',

    'vehicle_ID',
    'vehicle',
    'driver_ID',
    'driver',

    'assignedHumanResource_ID',
    'assignedHumanResource',
    'assignedMaterialResource_ID',
    'assignedMaterialResource'
  ]);

  const forbidden = keys.filter((key) => !allowedFields.has(key));

  if (forbidden.length) {
    return reject(
      req,
      'Cette modification contient des champs non modifiables. Rechargez la page puis réessayez.',
      400,
      { code: 'READ_ONLY_FIELD_MODIFIED' }
    );
  }

  if (normalizedStatus === TOUR_STATUS.REJECTED) {
    const businessFields = [
      'tourCode',
      'tourNumber',
      'tourDate',
      'collectionDate',
      'zone',
      'collectionType',
      'description',
      'remarks',
      'quantity',
      'unitOfMeasure',

      'client_ID',
      'client',

      'material_ID',
      'material',

      'vehicle_ID',
      'vehicle',
      'driver_ID',
      'driver',

      'assignedHumanResource_ID',
      'assignedHumanResource',
      'assignedMaterialResource_ID',
      'assignedMaterialResource'
    ];

    const hasBusinessModification = keys.some((key) => {
      return businessFields.includes(key);
    });

    if (hasBusinessModification) {
      req.data.status = TOUR_STATUS.CREATED;
      req.data.rejectionReason = null;
    }
  }
});

    /* ===================================================== */
    /* ROADMAPS — BEFORE CREATE / UPDATE                     */
    /* ===================================================== */

    this.before('CREATE', 'Roadmaps', async (req) => {
  await requireRole(req, Users, 'PLANIFICATEUR');
  syncRoadmapPayload(req.data);

  const code = await nextCode('Roadmaps', 'roadmapNumber', 'RM');
  req.data.roadmapNumber = code;
  req.data.roadmapCode = code;
  req.data.status = ROADMAP_STATUS.CREATED;
  req.data.integrationStatus = 'PENDING';
  req.data.rejectionReason = null;

  if (isDraftRequest(req)) {
    return;
  }

  const validationError = validateRoadmapPayload(req, req.data);
  if (validationError) {
    return validationError;
  }
});

    this.before('SAVE', 'Roadmaps', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      syncRoadmapPayload(req.data);

      const validationError = validateRoadmapPayload(req, req.data);
      if (validationError) {
        return validationError;
      }

      if (!req.data.roadmapCode) {
        const code = await nextCode('Roadmaps', 'roadmapNumber', 'RM');
        req.data.roadmapNumber = code;
        req.data.roadmapCode = code;
      }

      req.data.status = ROADMAP_STATUS.CREATED;
      req.data.integrationStatus = 'PENDING';
      req.data.rejectionReason = null;
    });

    this.before('UPDATE', 'Roadmaps', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      syncRoadmapPayload(req.data);

      const validationError = validateRoadmapPayload(req, req.data, true);
      if (validationError) {
        return validationError;
      }

      const id = req.data.ID || req.params?.[0]?.ID;

      if (!id) {
        return;
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: id });

      if (!roadmap) {
        return;
      }

      const normalizedStatus = normalizeRoadmapStatus(roadmap.status);

      if (![ROADMAP_STATUS.CREATED, ROADMAP_STATUS.REJECTED].includes(normalizedStatus)) {
        return reject(req, 'Les feuilles de route validées, terminées ou annulées ne peuvent plus être modifiées.', 409, {
          code: 'ROADMAP_NOT_EDITABLE'
        });
      }

      const technicalFields = new Set([
        'ID',
        'IsActiveEntity',
        'HasActiveEntity',
        'HasDraftEntity',
        'DraftAdministrativeData',
        'DraftAdministrativeData_DraftUUID',
        'SiblingEntity',
        'DraftMessages',
        'statusCriticality',
        'canValidate',
        'canReject',
        'canComplete',
        'statusText',
        'scheduleStatus',
        'scheduleStatusText',
        'scheduleCriticality',
        'tourCode',
        'tourDate',
        'tourZone',
        'tourCollectionType',
        'tourClientName',
        'tourDriverFirstName',
        'tourDriverLastName',
        'tourVehicleRegistration',
        'startDate',
        'endDate',
        'assignedTours',
        'steps',
        'roadmapCode',
        'roadmapNumber',
        'status',
        'integrationStatus',
        'sapSalesOrder',
        'integrationDate',
        'integrationMessage',
        'rejectionReason',
        'updatedAt',
        'createdAt',
        'createdBy',
        'modifiedAt',
        'modifiedBy'
      ]);

      const keys = Object.keys(req.data).filter((key) => {
        return !key.startsWith('_') && !technicalFields.has(key);
      });

      const allowedFields = new Set([
  'client_ID',
  'client',
  'month',
  'year',

  'tour_ID',
  'tour'
]);

      const forbidden = keys.filter((key) => !allowedFields.has(key));

      if (forbidden.length) {
        return reject(
          req,
          'Cette modification contient des champs non modifiables. Rechargez la page puis réessayez.',
          400,
          { code: 'READ_ONLY_FIELD_MODIFIED' }
        );
      }

      if (normalizedStatus === ROADMAP_STATUS.REJECTED) {
        const businessFields = [
          'startDate',
          'endDate',
          'client_ID',
          'client',
          'month',
          'year',
          'tour_ID',
          'tour'
        ];

        const hasBusinessModification = keys.some((key) => businessFields.includes(key));

        if (hasBusinessModification) {
          req.data.status = ROADMAP_STATUS.CREATED;
          req.data.rejectionReason = null;
        }
      }
    });

    /* ===================================================== */
    /* ROADMAP TOURS                                         */
    /* ===================================================== */

    this.before('CREATE', 'RoadmapTours', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');

      if (!isDraftRequest(req) && req.data.roadmap_ID && req.data.tour_ID) {
        const [roadmap, tour, existing] = await Promise.all([
          SELECT.one.from(Roadmaps).where({ ID: req.data.roadmap_ID }),
          SELECT.one.from(Tours).where({ ID: req.data.tour_ID }),
          SELECT.one.from(RoadmapTours).where({ tour_ID: req.data.tour_ID })
        ]);

        if (!roadmap || ![ROADMAP_STATUS.CREATED, ROADMAP_STATUS.REJECTED]
          .includes(normalizeRoadmapStatus(roadmap.status))) {
          return reject(req, 'Cette feuille de route ne peut plus recevoir de tournées.', 409);
        }

        if (!tour || ![TOUR_STATUS.VALIDATED, TOUR_STATUS.ASSIGNED]
          .includes(normalizeTourStatus(tour.status))) {
          return reject(req, 'Seule une tournée validée et disponible peut être affectée.', 409);
        }

        if (existing && existing.roadmap_ID !== req.data.roadmap_ID) {
          return reject(req, 'Cette tournée appartient déjà à une autre feuille de route.', 409);
        }
      }

      if (!req.data.sequence) {
        const roadmapID = req.data.roadmap_ID;

        if (roadmapID) {
          const existing = await SELECT.from(RoadmapTours)
            .columns('sequence')
            .where({ roadmap_ID: roadmapID })
            .orderBy('sequence desc')
            .limit(1);

          req.data.sequence = existing.length && existing[0].sequence
            ? existing[0].sequence + 1
            : 1;
        }
      }
    });

    this.before('UPDATE', 'RoadmapTours', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');

      if (!isDraftRequest(req)) {
        const assignmentID = req.data.ID || req.params?.[0]?.ID;
        const assignment = assignmentID && await SELECT.one.from(RoadmapTours).where({ ID: assignmentID });
        const roadmap = assignment?.roadmap_ID && await SELECT.one.from(Roadmaps).where({ ID: assignment.roadmap_ID });

        if (roadmap && ![ROADMAP_STATUS.CREATED, ROADMAP_STATUS.REJECTED]
          .includes(normalizeRoadmapStatus(roadmap.status))) {
          return reject(req, 'Une affectation validée ou terminée ne peut plus être modifiée.', 409);
        }
      }

      const technicalFields = new Set([
        'ID',
        'IsActiveEntity',
        'HasActiveEntity',
        'HasDraftEntity',
        'DraftAdministrativeData',
        'DraftAdministrativeData_DraftUUID',
        'SiblingEntity',
        'DraftMessages',
        'roadmapCode',
        'tourCode',
        'tourDate',
        'tourZone',
        'tourCollectionType',
        'clientName',
        'driverFirstName',
        'driverLastName',
        'vehicleRegistration',
        'updatedAt',
        'createdAt',
        'createdBy',
        'modifiedAt',
        'modifiedBy'
      ]);

      const keys = Object.keys(req.data).filter((key) => {
        return !key.startsWith('_') && !technicalFields.has(key);
      });

      const allowedFields = new Set([
        'sequence',
        'note',
        'roadmap_ID',
        'roadmap',
        'tour_ID',
        'tour'
      ]);

      const forbidden = keys.filter((key) => !allowedFields.has(key));

      if (forbidden.length) {
        return reject(
          req,
          'Cette modification contient des champs non modifiables. Rechargez la page puis réessayez.',
          400,
          { code: 'READ_ONLY_FIELD_MODIFIED' }
        );
      }
    });

    this.after('CREATE', 'RoadmapTours', async (assignment) => {
      if (!assignment || assignment.IsActiveEntity === false || !assignment.tour_ID || !assignment.roadmap_ID) {
        return;
      }

      await UPDATE(Tours).set({
        status: TOUR_STATUS.ASSIGNED,
        roadmap_ID: assignment.roadmap_ID,
        updatedAt: new Date().toISOString()
      }).where({
        ID: assignment.tour_ID,
        status: TOUR_STATUS.VALIDATED
      });
    });

    this.before('DELETE', 'RoadmapTours', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');

      if (isDraftRequest(req)) {
        return;
      }

      const assignmentID = req.data.ID || req.params?.[0]?.ID;
      const assignment = assignmentID && await SELECT.one.from(RoadmapTours).where({ ID: assignmentID });
      const roadmap = assignment?.roadmap_ID && await SELECT.one.from(Roadmaps).where({ ID: assignment.roadmap_ID });

      if (roadmap && ![ROADMAP_STATUS.CREATED, ROADMAP_STATUS.REJECTED]
        .includes(normalizeRoadmapStatus(roadmap.status))) {
        return reject(req, 'Une affectation validée ou terminée ne peut plus être supprimée.', 409);
      }

      req._deletedRoadmapAssignment = assignment;
    });

    this.after('DELETE', 'RoadmapTours', async (_data, req) => {
      const assignment = req._deletedRoadmapAssignment;

      if (!assignment?.tour_ID) {
        return;
      }

      await UPDATE(Tours).set({
        status: TOUR_STATUS.VALIDATED,
        roadmap_ID: null,
        updatedAt: new Date().toISOString()
      }).where({
        ID: assignment.tour_ID,
        status: TOUR_STATUS.ASSIGNED
      });
    });

    this.before('DELETE', 'Tours', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      const id = req.data.ID || req.params?.[0]?.ID;
      const tour = id && await SELECT.one.from(Tours).where({ ID: id });

      if (tour && ![TOUR_STATUS.CREATED, TOUR_STATUS.REJECTED].includes(normalizeTourStatus(tour.status))) {
        return reject(req, 'Seules les tournées créées ou rejetées peuvent être supprimées.', 409, {
          code: 'TOUR_NOT_DELETABLE'
        });
      }
    });

    this.before('DELETE', 'Roadmaps', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      const id = req.data.ID || req.params?.[0]?.ID;
      const roadmap = id && await SELECT.one.from(Roadmaps).where({ ID: id });

      if (roadmap && ![ROADMAP_STATUS.CREATED, ROADMAP_STATUS.REJECTED].includes(normalizeRoadmapStatus(roadmap.status))) {
        return reject(req, 'Seules les feuilles de route créées ou rejetées peuvent être supprimées.', 409, {
          code: 'ROADMAP_NOT_DELETABLE'
        });
      }

      if (roadmap) {
        const assignments = await SELECT.from(RoadmapTours).columns('tour_ID').where({ roadmap_ID: id });
        const tourIDs = assignments.map((assignment) => assignment.tour_ID).filter(Boolean);

        if (tourIDs.length) {
          await UPDATE(Tours).set({
            status: TOUR_STATUS.VALIDATED,
            roadmap_ID: null,
            updatedAt: new Date().toISOString()
          }).where({
            ID: { in: tourIDs },
            status: TOUR_STATUS.ASSIGNED
          });
        }
      }
    });

    /* ===================================================== */
    /* TOURS — GLOBAL ACTIONS                                */
    /* ===================================================== */

    this.on('submitTour', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      const { tourID } = req.data;

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isCreatedStatus(tour.status) && !isRejectedStatus(tour.status)) {
        return reject(req, 'Seules les tournées créées ou rejetées peuvent être soumises.');
      }

      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.CREATED,
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: tourID });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('acceptTour', async (req) => {
      const { tourID, supervisorID } = req.data;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');

      if (supervisorID && supervisorID !== supervisor.ID) {
        return reject(req, 'Le superviseur indiqué ne correspond pas à la session active.', 403);
      }

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isCreatedStatus(tour.status)) {
        return reject(req, 'Seules les tournées créées peuvent être validées.');
      }

      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.VALIDATED,
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: TOUR_STATUS.VALIDATED,
        reason: null,
        decidedBy_ID: supervisor.ID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('rejectTour', async (req) => {
      const { tourID, supervisorID, reason } = req.data;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');

      if (supervisorID && supervisorID !== supervisor.ID) {
        return reject(req, 'Le superviseur indiqué ne correspond pas à la session active.', 403);
      }

      if (!reason || !String(reason).trim()) {
        return reject(req, 'Le motif de refus est obligatoire.');
      }

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isCreatedStatus(tour.status)) {
        return reject(req, 'Seules les tournées créées peuvent être rejetées.');
      }

      const trimmedReason = String(reason).trim();

      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.REJECTED,
          rejectionReason: trimmedReason,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: TOUR_STATUS.REJECTED,
        reason: trimmedReason,
        decidedBy_ID: supervisor.ID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    /* ===================================================== */
    /* TOURS — BOUND ACTIONS FOR FIORI                       */
    /* ===================================================== */

    this.on('validate', 'Tours', async (req) => {
      if (!ensureActiveEntity(req, 'la tournée')) return;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');
      const tourID = req.params?.[0]?.ID;

      if (!tourID) {
        return reject(req, 'Identifiant de tournée manquant.');
      }

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isCreatedStatus(tour.status)) {
        return reject(req, 'Seules les tournées créées peuvent être validées.');
      }

      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.VALIDATED,
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: TOUR_STATUS.VALIDATED,
        reason: null,
        decidedBy_ID: supervisor.ID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('rejectTourDecision', 'Tours', async (req) => {
      if (!ensureActiveEntity(req, 'la tournée')) return;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');
      const tourID = req.params?.[0]?.ID;
      const reason = req.data.reason;

      if (!tourID) {
        return reject(req, 'Identifiant de tournée manquant.');
      }

      if (!reason || !String(reason).trim()) {
        return reject(req, 'Le motif de refus est obligatoire.');
      }

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isCreatedStatus(tour.status)) {
        return reject(req, 'Seules les tournées créées peuvent être rejetées.');
      }

      const trimmedReason = String(reason).trim();

      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.REJECTED,
          rejectionReason: trimmedReason,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: TOUR_STATUS.REJECTED,
        reason: trimmedReason,
        decidedBy_ID: supervisor.ID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('markTourCompleted', 'Tours', async (req) => {
      if (!ensureActiveEntity(req, 'la tournée')) return;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');
      const tourID = req.params?.[0]?.ID;
      const tour = tourID && await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.', 404);
      }

      const status = normalizeTourStatus(tour.status);
      if (![TOUR_STATUS.VALIDATED, TOUR_STATUS.ASSIGNED].includes(status)) {
        return reject(req, 'Une tournée ne peut être terminée qu’après validation ou affectation.', 409, {
          code: 'INVALID_TOUR_COMPLETION'
        });
      }

      await UPDATE(Tours).set({
        status: TOUR_STATUS.COMPLETED,
        updatedAt: new Date().toISOString()
      }).where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: TOUR_STATUS.COMPLETED,
        reason: null,
        decidedBy_ID: supervisor.ID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    /* ===================================================== */
    /* ROADMAPS — BOUND ACTIONS FOR FIORI                    */
    /* ===================================================== */
    this.on('autoAssignTours', 'Roadmaps', async (req) => {
      if (!ensureActiveEntity(req, 'la feuille de route')) return;
      await requireRole(req, Users, 'PLANIFICATEUR');
      const roadmapID = req.params?.[0]?.ID;

      if (!roadmapID) {
        return reject(req, 'Identifiant de feuille de route manquant.');
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Feuille de route introuvable.');
      }

      if (!isCreatedRoadmapStatus(roadmap.status)) {
        return reject(req, 'Seule une feuille de route créée peut recevoir des tournées.');
      }

      if (!roadmap.client_ID) {
        return reject(req, 'Veuillez sélectionner un client avant d’affecter les tournées.');
      }

      if (!roadmap.month || !roadmap.year) {
        return reject(req, 'Veuillez saisir le mois et l’année avant d’affecter les tournées.');
      }

      const range = monthRange(roadmap.year, roadmap.month);

      await UPDATE(Roadmaps)
        .set({
          startDate: range.startDate,
          endDate: range.endDate,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: roadmapID });

      const existingAssignments = await SELECT.from(RoadmapTours)
        .columns('tour_ID', 'roadmap_ID');

      const assignedToOtherRoadmap = new Set(
        existingAssignments
          .filter((assignment) => assignment.roadmap_ID !== roadmapID)
          .map((assignment) => assignment.tour_ID)
      );
      const assignedToCurrentRoadmap = new Set(
        existingAssignments
          .filter((assignment) => assignment.roadmap_ID === roadmapID)
          .map((assignment) => assignment.tour_ID)
      );

      const allTours = await SELECT.from(Tours);

      const matchingTours = allTours.filter((tour) => {
        const date = tour.tourDate || tour.collectionDate;

        if (!date) {
          return false;
        }

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) {
          return false;
        }

        const sameClient = tour.client_ID === roadmap.client_ID;
        const sameMonth = d.getUTCMonth() + 1 === Number(roadmap.month);
        const sameYear = d.getUTCFullYear() === Number(roadmap.year);
        const status = normalizeTourStatus(tour.status);
        const validStatus = status === TOUR_STATUS.VALIDATED ||
          (status === TOUR_STATUS.ASSIGNED && assignedToCurrentRoadmap.has(tour.ID));
        const notAssignedElsewhere = !assignedToOtherRoadmap.has(tour.ID);

        return sameClient && sameMonth && sameYear && validStatus && notAssignedElsewhere;
      });

      if (!matchingTours.length) {
        return reject(
          req,
          'Aucune tournée validée et disponible ne correspond au client et à la période sélectionnés.'
        );
      }

      await DELETE.from(RoadmapTours).where({ roadmap_ID: roadmapID });

      if (assignedToCurrentRoadmap.size) {
        await UPDATE(Tours).set({
          status: TOUR_STATUS.VALIDATED,
          roadmap_ID: null,
          updatedAt: new Date().toISOString()
        }).where({
          ID: { in: Array.from(assignedToCurrentRoadmap) },
          status: TOUR_STATUS.ASSIGNED
        });
      }

      let sequence = 1;

      for (const tour of matchingTours) {
        await INSERT.into(RoadmapTours).entries({
          ID: cds.utils.uuid(),
          sequence,
          note: `Tournée affectée automatiquement`,
          roadmap_ID: roadmapID,
          tour_ID: tour.ID
        });

        sequence += 1;
      }

      await UPDATE(Tours).set({
        status: TOUR_STATUS.ASSIGNED,
        roadmap_ID: roadmapID,
        updatedAt: new Date().toISOString()
      }).where({ ID: { in: matchingTours.map((tour) => tour.ID) } });

      return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
    });

    this.on('generateRoadmapSheetHtml', 'Roadmaps', async (req) => {
      if (!ensureActiveEntity(req, 'la feuille de route')) return;
      await requireRole(req, Users, 'PLANIFICATEUR');
      const roadmapID = req.params?.[0]?.ID;

      if (!roadmapID) {
        return reject(req, 'Identifiant de feuille de route manquant.');
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Feuille de route introuvable.');
      }

      const client = roadmap.client_ID
        ? await SELECT.one.from(Clients).where({ ID: roadmap.client_ID })
        : null;

      const assignments = await SELECT.from(RoadmapTours)
        .where({ roadmap_ID: roadmapID })
        .orderBy('sequence');

      if (!assignments.length) {
        return reject(req, 'Aucune tournée affectée à cette feuille de route.');
      }

      const tourIDs = assignments.map((assignment) => assignment.tour_ID);
      const tours = await SELECT.from(Tours).where({ ID: { in: tourIDs } });

      const toursByID = new Map(tours.map((tour) => [tour.ID, tour]));

      const groups = new Map();

      for (const assignment of assignments) {
        const tour = toursByID.get(assignment.tour_ID);

        if (!tour) {
          continue;
        }

        const material = tour.collectionType || 'Non renseigné';
        const unit = tour.unitOfMeasure || 'KG';
        const key = `${material}__${unit}`;

        if (!groups.has(key)) {
          groups.set(key, {
            material,
            unit,
            totalQuantity: 0,
            tourCodes: []
          });
        }

        const group = groups.get(key);

        group.totalQuantity += Number(tour.quantity || 0);
        group.tourCodes.push(tour.tourCode || tour.tourNumber || tour.ID);
      }

      const groupRows = Array.from(groups.values()).map((group) => {
        return `
          <tr>
            <td>${escapeHtml(group.material)}</td>
            <td>${escapeHtml(group.tourCodes.join(' / '))}</td>
            <td class="right">${group.totalQuantity.toFixed(3)}</td>
            <td>${escapeHtml(group.unit)}</td>
          </tr>
        `;
      }).join('');

      const detailRows = assignments.map((assignment) => {
        const tour = toursByID.get(assignment.tour_ID);

        if (!tour) {
          return '';
        }

        return `
          <tr>
            <td>${assignment.sequence || ''}</td>
            <td>${escapeHtml(tour.tourCode || tour.tourNumber)}</td>
            <td>${escapeHtml(tour.tourDate || tour.collectionDate)}</td>
            <td>${escapeHtml(tour.zone)}</td>
            <td>${escapeHtml(tour.collectionType)}</td>
            <td class="right">${Number(tour.quantity || 0).toFixed(3)}</td>
            <td>${escapeHtml(tour.unitOfMeasure || 'KG')}</td>
          </tr>
        `;
      }).join('');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Feuille de route ${escapeHtml(roadmap.roadmapCode || roadmap.roadmapNumber)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #1d2d3e;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0a6ed1;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }

            h1 {
              margin: 0;
              color: #0a6ed1;
              font-size: 24px;
            }

            h2 {
              margin-top: 28px;
              color: #1d2d3e;
              font-size: 18px;
            }

            .meta {
              line-height: 1.8;
              font-size: 14px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              font-size: 13px;
            }

            th {
              background: #eaf4ff;
              color: #1d2d3e;
              text-align: left;
            }

            th, td {
              border: 1px solid #d0d7de;
              padding: 8px;
            }

            .right {
              text-align: right;
            }

            .actions {
              margin-bottom: 20px;
            }

            .print {
              background: #0a6ed1;
              color: white;
              border: none;
              padding: 8px 14px;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
            }

            @media print {
              .actions {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="actions">
            <button class="print" onclick="window.print()">Télécharger / Imprimer en PDF</button>
          </div>

          <div class="header">
            <div>
              <h1>Feuille de route</h1>
              <div class="meta">
                <strong>N° :</strong> ${escapeHtml(roadmap.roadmapCode || roadmap.roadmapNumber)}<br>
                <strong>Client :</strong> ${escapeHtml(client?.name || '')}<br>
                <strong>Période :</strong> ${escapeHtml(roadmap.month)}/${escapeHtml(roadmap.year)}
              </div>
            </div>
            <div class="meta">
              <strong>Statut :</strong> ${escapeHtml(roadmap.status)}<br>
              <strong>Générée le :</strong> ${new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>

          <h2>Résumé par matériau / type de déchet</h2>
          <table>
            <thead>
              <tr>
                <th>Matériau / Type de déchet</th>
                <th>Tournées regroupées</th>
                <th>Quantité totale</th>
                <th>Unité</th>
              </tr>
            </thead>
            <tbody>
              ${groupRows}
            </tbody>
          </table>

          <h2>Détail des tournées affectées</h2>
          <table>
            <thead>
              <tr>
                <th>Séquence</th>
                <th>N° tournée</th>
                <th>Date de collecte</th>
                <th>Zone</th>
                <th>Matériau / Type de déchet</th>
                <th>Quantité</th>
                <th>Unité</th>
              </tr>
            </thead>
            <tbody>
              ${detailRows}
            </tbody>
          </table>
        </body>
        </html>
      `;
    });


    this.on('validateRoadmap', 'Roadmaps', async (req) => {
      if (!ensureActiveEntity(req, 'la feuille de route')) return;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');
      const roadmapID = req.params?.[0]?.ID;

      if (!roadmapID) {
        return reject(req, 'Identifiant de feuille de route manquant.');
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Feuille de route introuvable.');
      }

      if (!isCreatedRoadmapStatus(roadmap.status)) {
        return reject(req, 'Seules les feuilles de route créées peuvent être validées.');
      }

      const assignments = await SELECT.from(RoadmapTours)
        .columns('ID', 'tour_ID')
        .where({ roadmap_ID: roadmapID });

      if (!assignments.length) {
        return reject(req, 'Affectez au moins une tournée avant de valider la feuille de route.');
      }

      const linkedTours = await SELECT.from(Tours).columns('status').where({
        ID: { in: assignments.map((assignment) => assignment.tour_ID) }
      });
      const hasUnvalidatedTour = linkedTours.some((tour) => {
        return ![TOUR_STATUS.VALIDATED, TOUR_STATUS.ASSIGNED, TOUR_STATUS.COMPLETED]
          .includes(normalizeTourStatus(tour.status));
      });

      if (linkedTours.length !== assignments.length || hasUnvalidatedTour) {
        return reject(req, 'Toutes les tournées associées doivent être validées avant de valider la feuille de route.', 409, {
          code: 'ROADMAP_TOURS_NOT_VALIDATED'
        });
      }

      await UPDATE(Roadmaps)
        .set({
          status: ROADMAP_STATUS.VALIDATED,
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: roadmapID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: ROADMAP_STATUS.VALIDATED,
        reason: null,
        decidedBy_ID: supervisor.ID,
        roadmap_ID: roadmapID
      });

      return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
    });

    this.on('rejectRoadmap', 'Roadmaps', async (req) => {
      if (!ensureActiveEntity(req, 'la feuille de route')) return;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');
      const roadmapID = req.params?.[0]?.ID;
      const reason = req.data.reason;

      if (!roadmapID) {
        return reject(req, 'Identifiant de feuille de route manquant.');
      }

      if (!reason || !String(reason).trim()) {
        return reject(req, 'Le motif de refus est obligatoire.');
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Feuille de route introuvable.');
      }

      if (!isCreatedRoadmapStatus(roadmap.status)) {
        return reject(req, 'Seules les feuilles de route créées peuvent être rejetées.');
      }

      const trimmedReason = String(reason).trim();

      await UPDATE(Roadmaps)
        .set({
          status: ROADMAP_STATUS.REJECTED,
          rejectionReason: trimmedReason,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: roadmapID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: ROADMAP_STATUS.REJECTED,
        reason: trimmedReason,
        decidedBy_ID: supervisor.ID,
        roadmap_ID: roadmapID
      });

      return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
    });

    this.on('markRoadmapCompleted', 'Roadmaps', async (req) => {
      if (!ensureActiveEntity(req, 'la feuille de route')) return;
      const supervisor = await requireRole(req, Users, 'SUPERVISEUR');
      const roadmapID = req.params?.[0]?.ID;
      const roadmap = roadmapID && await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Feuille de route introuvable.', 404);
      }

      if (normalizeRoadmapStatus(roadmap.status) !== ROADMAP_STATUS.VALIDATED) {
        return reject(req, 'Seule une feuille de route validée peut être terminée.', 409, {
          code: 'INVALID_ROADMAP_COMPLETION'
        });
      }

      const assignments = await SELECT.from(RoadmapTours).columns('tour_ID').where({ roadmap_ID: roadmapID });
      const tourIDs = assignments.map((assignment) => assignment.tour_ID).filter(Boolean);
      if (!tourIDs.length && roadmap.tour_ID) tourIDs.push(roadmap.tour_ID);

      const linkedTours = tourIDs.length
        ? await SELECT.from(Tours).columns('status').where({ ID: { in: tourIDs } })
        : [];

      if (!linkedTours.length || linkedTours.some((tour) => normalizeTourStatus(tour.status) !== TOUR_STATUS.COMPLETED)) {
        return reject(
          req,
          'La feuille de route ne peut pas être terminée tant que toutes les tournées associées ne sont pas terminées.',
          409,
          { code: 'ROADMAP_TOURS_NOT_COMPLETED' }
        );
      }

      await UPDATE(Roadmaps).set({
        status: ROADMAP_STATUS.COMPLETED,
        updatedAt: new Date().toISOString()
      }).where({ ID: roadmapID });

      await INSERT.into(DecisionHistories).entries({
        ID: cds.utils.uuid(),
        decision: ROADMAP_STATUS.COMPLETED,
        reason: null,
        decidedBy_ID: supervisor.ID,
        roadmap_ID: roadmapID
      });

      return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
    });

    /* ===================================================== */
    /* ROADMAP TOURS — UPDATE RESOURCES ACTION               */
    /* ===================================================== */

    this.on('updateResources', 'RoadmapTours', async (req) => {
      if (!ensureActiveEntity(req, 'la ligne de feuille de route')) return;
      await requireRole(req, Users, 'PLANIFICATEUR');
      const roadmapTourID = req.params?.[0]?.ID;
      const { clientID, driverID, vehicleID } = req.data;

      if (!roadmapTourID) {
        return reject(req, 'Identifiant de ligne roadmap/tournée manquant.');
      }

      const roadmapTour = await SELECT.one.from(RoadmapTours).where({ ID: roadmapTourID });

      if (!roadmapTour) {
        return reject(req, 'Ligne roadmap/tournée introuvable.');
      }

      if (!roadmapTour.tour_ID) {
        return reject(req, 'Aucune tournée associée à cette ligne.');
      }

      const [roadmap, tour] = await Promise.all([
        SELECT.one.from(Roadmaps).where({ ID: roadmapTour.roadmap_ID }),
        SELECT.one.from(Tours).where({ ID: roadmapTour.tour_ID })
      ]);

      if (!roadmap || ![ROADMAP_STATUS.CREATED, ROADMAP_STATUS.REJECTED]
        .includes(normalizeRoadmapStatus(roadmap.status))) {
        return reject(req, 'Les ressources ne peuvent être modifiées que pendant la préparation de la feuille de route.', 409);
      }

      if (!tour || ![TOUR_STATUS.VALIDATED, TOUR_STATUS.ASSIGNED]
        .includes(normalizeTourStatus(tour.status))) {
        return reject(req, 'Les ressources ne peuvent être affectées qu’à une tournée validée.', 409);
      }

      const updateData = {
        updatedAt: new Date().toISOString()
      };

      if (clientID) {
        const client = await SELECT.one.from(Clients).where({ ID: clientID });
        if (!client) {
          return reject(req, 'Client introuvable.');
        }
        if (roadmap.client_ID && clientID !== roadmap.client_ID) {
          return reject(req, 'Le client de la tournée doit correspondre à celui de la feuille de route.', 409);
        }
        updateData.client_ID = clientID;
      }

      if (driverID) {
        const driver = await SELECT.one.from(Drivers).where({ ID: driverID });
        if (!driver || driver.available === false) {
          return reject(req, 'La ressource humaine sélectionnée n’est pas disponible.');
        }
        updateData.driver_ID = driverID;
      }

      if (vehicleID) {
        const vehicle = await SELECT.one.from(Vehicles).where({ ID: vehicleID });
        if (!vehicle || vehicle.available === false) {
          return reject(req, 'La ressource matérielle sélectionnée n’est pas disponible.');
        }
        updateData.vehicle_ID = vehicleID;
      }

      await UPDATE(Tours)
        .set({
          ...updateData,
          status: TOUR_STATUS.ASSIGNED,
          roadmap_ID: roadmapTour.roadmap_ID
        })
        .where({ ID: roadmapTour.tour_ID });

      return SELECT.one.from(RoadmapTours).where({ ID: roadmapTourID });
    });

    /* ===================================================== */
    /* CREATE ROADMAP FROM TOUR                              */
    /* ===================================================== */

    this.on('createRoadmapFromTour', async (req) => {
      await requireRole(req, Users, 'PLANIFICATEUR');
      const { tourID } = req.data;

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isValidatedStatus(tour.status)) {
        return reject(req, 'La feuille de route ne peut être créée que depuis une tournée validée.');
      }

      const existingRoadmap = await SELECT.one.from(Roadmaps).where({ tour_ID: tourID });
      const existingAssignment = await SELECT.one.from(RoadmapTours).where({ tour_ID: tourID });

      if (existingRoadmap || existingAssignment) {
        return reject(req, 'Cette tournée est déjà rattachée à une feuille de route.');
      }

      if (!tour.client_ID) {
        return reject(req, 'La tournée doit avoir un client avant de créer une feuille de route.', 400, {
          code: 'TOUR_CLIENT_REQUIRED',
          target: 'client'
        });
      }

      {
        const roadmapCode = await nextCode('Roadmaps', 'roadmapCode', 'RM');
        const roadmapID = cds.utils.uuid();
        const startDate = tour.tourDate || new Date().toISOString().slice(0, 10);
        const roadmapDate = new Date(`${startDate}T00:00:00Z`);
        const month = roadmapDate.getUTCMonth() + 1;
        const year = roadmapDate.getUTCFullYear();

        await INSERT.into(Roadmaps).entries({
          ID: roadmapID,
          roadmapCode,
          roadmapNumber: roadmapCode,
          status: ROADMAP_STATUS.CREATED,
          integrationStatus: 'PENDING',
          startDate,
          endDate: startDate,
          month,
          year,
          client_ID: tour.client_ID,
          rejectionReason: null,
          tour_ID: tourID
        });

        await INSERT.into(RoadmapTours).entries({
          ID: cds.utils.uuid(),
          sequence: 1,
          note: 'Tournée principale',
          roadmap_ID: roadmapID,
          tour_ID: tourID
        });

        await UPDATE(Tours).set({
          status: TOUR_STATUS.ASSIGNED,
          roadmap_ID: roadmapID,
          updatedAt: new Date().toISOString()
        }).where({ ID: tourID });

        let points = await SELECT.from(TourCollectionPoints)
          .where({ tour_ID: tourID })
          .orderBy('sequence');

        if (!points.length && tour.client_ID) {
          points = await SELECT.from(CollectionPoints)
            .where({ client_ID: tour.client_ID })
            .orderBy('label');
        }

        let seq = 1;

        for (const point of points) {
          const collectionPointID = point.collectionPoint_ID || point.ID;

          await INSERT.into(RoadmapSteps).entries({
            ID: cds.utils.uuid(),
            sequence: point.sequence || seq,
            plannedArrivalTime: `08:${String(seq).padStart(2, '0')}:00`,
            status: 'PLANNED',
            roadmap_ID: roadmapID,
            collectionPoint_ID: collectionPointID
          });

          seq += 1;
        }

        return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
      }
    });

    /* ===================================================== */
    /* STATISTICS                                            */
    /* ===================================================== */

    this.on('getPlannerStats', async (req) => {
      const { userID } = req.data || {};
      const allTours = await SELECT.from(Tours).columns('status', 'tourDate', 'collectionDate', 'createdByUser_ID');
      const hasAuthorData = allTours.some((tour) => hasValue(tour.createdByUser_ID));
      const tours = userID && hasAuthorData
        ? allTours.filter((tour) => tour.createdByUser_ID === userID)
        : allTours;
      const roadmaps = await SELECT.from(Roadmaps).columns('status', 'startDate', 'endDate');
      const createdRoadmaps = roadmaps.filter((roadmap) => isCreatedRoadmapStatus(roadmap.status)).length;
      const validatedRoadmaps = roadmaps.filter((roadmap) => isValidatedRoadmapStatus(roadmap.status)).length;
      const rejectedRoadmaps = roadmaps.filter((roadmap) => isRejectedRoadmapStatus(roadmap.status)).length;
      const completedRoadmaps = roadmaps.filter((roadmap) => normalizeRoadmapStatus(roadmap.status) === ROADMAP_STATUS.COMPLETED).length;
      const cancelledRoadmaps = roadmaps.filter((roadmap) => normalizeRoadmapStatus(roadmap.status) === ROADMAP_STATUS.CANCELLED).length;

      return {
        totalTours: tours.length,
        draftTours: tours.filter((tour) => isCreatedStatus(tour.status)).length,
        pendingTours: tours.filter((tour) => isCreatedStatus(tour.status)).length,
        acceptedTours: tours.filter((tour) => isValidatedStatus(tour.status)).length,
        rejectedTours: tours.filter((tour) => isRejectedStatus(tour.status)).length,
        assignedTours: tours.filter((tour) => normalizeTourStatus(tour.status) === TOUR_STATUS.ASSIGNED).length,
        completedTours: tours.filter((tour) => normalizeTourStatus(tour.status) === TOUR_STATUS.COMPLETED).length,
        cancelledTours: tours.filter((tour) => normalizeTourStatus(tour.status) === TOUR_STATUS.CANCELLED).length,
        overdueTours: tours.filter((tour) => tourScheduleStatus(tour) === 'OVERDUE').length,
        totalRoadmaps: roadmaps.length,
        createdRoadmaps,
        validatedRoadmaps,
        rejectedRoadmaps,
        completedRoadmaps,
        cancelledRoadmaps,
        overdueRoadmaps: roadmaps.filter((roadmap) => roadmapScheduleStatus(roadmap) === 'OVERDUE').length
      };
    });

    this.on('getSupervisorStats', async () => {
      const tours = await SELECT.from(Tours).columns('status', 'tourDate', 'collectionDate');
      const roadmaps = await SELECT.from(Roadmaps).columns('status', 'startDate', 'endDate', 'integrationStatus', 'sapSalesOrder');
      const decisions = await SELECT.from(DecisionHistories).columns('decision');
      const createdRoadmaps = roadmaps.filter((roadmap) => isCreatedRoadmapStatus(roadmap.status)).length;
      const validatedRoadmaps = roadmaps.filter((roadmap) => isValidatedRoadmapStatus(roadmap.status)).length;
      const rejectedRoadmaps = roadmaps.filter((roadmap) => isRejectedRoadmapStatus(roadmap.status)).length;
      const completedRoadmaps = roadmaps.filter((roadmap) => normalizeRoadmapStatus(roadmap.status) === ROADMAP_STATUS.COMPLETED).length;
      const cancelledRoadmaps = roadmaps.filter((roadmap) => normalizeRoadmapStatus(roadmap.status) === ROADMAP_STATUS.CANCELLED).length;
      const integratedRoadmaps = roadmaps.filter((roadmap) => {
        return String(roadmap.integrationStatus || '').trim().toUpperCase() === 'INTEGRATED';
      }).length;
      const acceptedDecisions = decisions.filter((decision) => {
        return ['ACCEPTED', 'VALIDATED'].includes(String(decision.decision || '').trim().toUpperCase());
      }).length;
      const rejectedDecisions = decisions.filter((decision) => {
        return String(decision.decision || '').trim().toUpperCase() === 'REJECTED';
      }).length;
      const salesOrdersCount = roadmaps.filter((roadmap) => hasValue(roadmap.sapSalesOrder)).length;

      return {
        totalTours: tours.length,
        pendingValidation: tours.filter((tour) => isCreatedStatus(tour.status)).length,
        acceptedTours: tours.filter((tour) => isValidatedStatus(tour.status)).length,
        rejectedTours: tours.filter((tour) => isRejectedStatus(tour.status)).length,
        assignedTours: tours.filter((tour) => normalizeTourStatus(tour.status) === TOUR_STATUS.ASSIGNED).length,
        completedTours: tours.filter((tour) => normalizeTourStatus(tour.status) === TOUR_STATUS.COMPLETED).length,
        cancelledTours: tours.filter((tour) => normalizeTourStatus(tour.status) === TOUR_STATUS.CANCELLED).length,
        overdueTours: tours.filter((tour) => tourScheduleStatus(tour) === 'OVERDUE').length,
        totalRoadmaps: roadmaps.length,
        createdRoadmaps,
        validatedRoadmaps,
        rejectedRoadmaps,
        completedRoadmaps,
        cancelledRoadmaps,
        overdueRoadmaps: roadmaps.filter((roadmap) => roadmapScheduleStatus(roadmap) === 'OVERDUE').length,
        integratedRoadmaps,
        activeRoadmaps: validatedRoadmaps,
        totalDecisions: decisions.length,
        acceptedDecisions,
        rejectedDecisions,
        salesOrdersCount
      };
    });

    this.on('getPendingTours', async () => {
      const tours = await SELECT.from(Tours);
      return tours.filter((tour) => isCreatedStatus(tour.status));
    });

    /* ===================================================== */
    /* TOUR DETAILS                                          */
    /* ===================================================== */

    this.on('getTourDetails', async (req) => {
      const { tourID } = req.data;

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      const [client, vehicle, driver, roadmap, decisions, tourPoints] = await Promise.all([
        tour.client_ID ? SELECT.one.from(Clients).where({ ID: tour.client_ID }) : null,
        tour.vehicle_ID ? SELECT.one.from(Vehicles).where({ ID: tour.vehicle_ID }) : null,
        tour.driver_ID ? SELECT.one.from(Drivers).where({ ID: tour.driver_ID }) : null,
        SELECT.one.from(Roadmaps).where({ tour_ID: tourID }),
        SELECT.from(DecisionHistories).where({ tour_ID: tourID }),
        SELECT.from(TourCollectionPoints).where({ tour_ID: tourID })
      ]);

      const driverName = driver
        ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim()
        : '';

      return {
        tourID: tour.ID,
        tourCode: tour.tourCode,
        tourDate: tour.tourDate,
        zone: tour.zone,
        collectionType: tour.collectionType,
        description: tour.description,
        status: normalizeTourStatus(tour.status),
        rejectionReason: tour.rejectionReason,
        clientName: client?.name || '',
        vehicleRegistration: vehicle?.registrationNumber || '',
        driverName,
        roadmapCode: roadmap?.roadmapCode || '',
        roadmapStatus: roadmap ? normalizeRoadmapStatus(roadmap.status) : '',
        decisionsCount: decisions.length,
        tourPointsCount: tourPoints.length
      };
    });

    

    return super.init();
  }
};

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function requireValues(req, fields) {
  const missing = fields.find((field) => !hasValue(field.value));

  if (!missing) {
    return null;
  }

  return reject(req, `${missing.label} est obligatoire.`, 400, {
    code: 'MANDATORY_FIELD_MISSING',
    target: missing.target
  });
}

function validateTourPayload(req, data, partial = false) {
  const required = [
    { target: 'tourDate', keys: ['tourDate', 'collectionDate'], label: 'La date de collecte', value: data.tourDate || data.collectionDate },
    { target: 'zone', keys: ['zone'], label: 'La zone de collecte', value: data.zone },
    { target: 'collectionType', keys: ['collectionType'], label: 'Le type de collecte', value: data.collectionType },
    { target: 'client', keys: ['client', 'client_ID'], label: 'Le client', value: data.client_ID || data.client?.ID },
    { target: 'quantity', keys: ['quantity'], label: 'La quantité', value: data.quantity },
    { target: 'unitOfMeasure', keys: ['unitOfMeasure'], label: "L'unité", value: data.unitOfMeasure }
  ];

  const fields = partial
    ? required.filter((field) => field.keys.some((key) => Object.prototype.hasOwnProperty.call(data, key)))
    : required;

  const requiredError = requireValues(req, fields);

  if (requiredError) {
    return requiredError;
  }

  if (data.quantity !== undefined && data.quantity !== null) {
    const quantity = Number(data.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return reject(req, 'La quantité doit être supérieure à zéro.', 400, {
        code: 'INVALID_QUANTITY',
        target: 'quantity'
      });
    }
  }

  return null;
}

function validateRoadmapPayload(req, data, partial = false) {
  const required = [
    { target: 'client', keys: ['client', 'client_ID'], label: 'Le client', value: data.client_ID || data.client?.ID },
    { target: 'month', keys: ['month'], label: 'Le mois', value: data.month },
    { target: 'year', keys: ['year'], label: "L'année", value: data.year }
  ];
  const fields = partial
    ? required.filter((field) => field.keys.some((key) => Object.prototype.hasOwnProperty.call(data, key)))
    : required;

  const requiredError = requireValues(req, fields);

  if (requiredError) {
    return requiredError;
  }

  if (data.month !== undefined) {
    const month = Number(data.month);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return reject(req, 'Le mois doit être compris entre 1 et 12.', 400, {
        code: 'INVALID_MONTH',
        target: 'month'
      });
    }
  }

  if (data.year !== undefined) {
    const year = Number(data.year);

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return reject(req, "L'année doit être comprise entre 2000 et 2100.", 400, {
        code: 'INVALID_YEAR',
        target: 'year'
      });
    }
  }

  return null;
}
