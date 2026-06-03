const cds = require('@sap/cds');

const TOUR_STATUS = {
  CREATED: 'CREATED',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED'
};

const ROADMAP_STATUS = {
  CREATED: 'CREATED',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED'
};

function reject(req, message, status = 400) {
  return req.reject(status, message);
}

/* ===================================================== */
/* TOURS STATUS HELPERS                                  */
/* ===================================================== */

function normalizeTourStatus(status) {
  if (['DRAFT', 'PENDING', 'CREATED'].includes(status)) {
    return TOUR_STATUS.CREATED;
  }

  if (['ACCEPTED', 'VALIDATED', 'COMPLETED'].includes(status)) {
    return TOUR_STATUS.VALIDATED;
  }

  if (['REJECTED', 'CANCELLED'].includes(status)) {
    return TOUR_STATUS.REJECTED;
  }

  return TOUR_STATUS.CREATED;
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

/* ===================================================== */
/* ROADMAPS STATUS HELPERS                               */
/* ===================================================== */

function normalizeRoadmapStatus(status) {
  if (['DRAFT', 'PENDING', 'CREATED'].includes(status)) {
    return ROADMAP_STATUS.CREATED;
  }

  if (['ACTIVE', 'VALIDATED', 'COMPLETED'].includes(status)) {
    return ROADMAP_STATUS.VALIDATED;
  }

  if (['REJECTED', 'CANCELLED'].includes(status)) {
    return ROADMAP_STATUS.REJECTED;
  }

  return ROADMAP_STATUS.CREATED;
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

/* ===================================================== */
/* CODE GENERATOR                                        */
/* ===================================================== */

async function nextCode(entity, field, prefix) {
  const { Tours, Roadmaps } = cds.entities('route.management');
  const target = entity === 'Tours' ? Tours : Roadmaps;
  const codeField = field;

  const rows = await SELECT.from(target)
    .columns(codeField)
    .orderBy(`${codeField} desc`)
    .limit(1);

  let seq = 1;

  if (rows.length && rows[0][codeField]) {
    const m = String(rows[0][codeField]).match(/(\d+)$/);
    if (m) {
      seq = parseInt(m[1], 10) + 1;
    }
  }

  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = class RouteManagementService extends cds.ApplicationService {
  init() {
    const {
      Users,
      Tours,
      Roadmaps,
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

        const normalizedStatus = normalizeTourStatus(tour.status);
        tour.status = normalizedStatus;

        if (normalizedStatus === TOUR_STATUS.VALIDATED) {
          tour.statusCriticality = 3;
          tour.canValidate = false;
          tour.canReject = false;
        } else if (normalizedStatus === TOUR_STATUS.REJECTED) {
          tour.statusCriticality = 1;
          tour.canValidate = false;
          tour.canReject = false;
        } else {
          tour.statusCriticality = 2;
          tour.canValidate = true;
          tour.canReject = true;
        }
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

        const normalizedStatus = normalizeRoadmapStatus(roadmap.status);
        roadmap.status = normalizedStatus;

        if (normalizedStatus === ROADMAP_STATUS.VALIDATED) {
          roadmap.statusCriticality = 3;
          roadmap.canValidate = false;
          roadmap.canReject = false;
        } else if (normalizedStatus === ROADMAP_STATUS.REJECTED) {
          roadmap.statusCriticality = 1;
          roadmap.canValidate = false;
          roadmap.canReject = false;
        } else {
          roadmap.statusCriticality = 2;
          roadmap.canValidate = true;
          roadmap.canReject = true;
        }
      }
    });

    /* ===================================================== */
    /* AUTHENTICATION                                        */
    /* ===================================================== */

    this.on('login', async (req) => {
      const { username, password } = req.data;

      if (!username || !password) {
        return reject(req, 'Identifiants requis.');
      }

      const user = await SELECT.one.from(Users).where({ username, password });

      if (!user) {
        return reject(req, 'Identifiants incorrects.', 401);
      }

      if (!user.active) {
        return reject(req, 'Utilisateur inactif.', 403);
      }

      return {
        ID: user.ID,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        active: user.active
      };
    });

    /* ===================================================== */
    /* TOURS — BEFORE CREATE / UPDATE                        */
    /* ===================================================== */

    this.before('CREATE', 'Tours', async (req) => {
      if (!req.data.tourCode) {
        req.data.tourCode = await nextCode('Tours', 'tourCode', 'TOUR');
      }

      if (!req.data.status) {
        req.data.status = TOUR_STATUS.CREATED;
      }
    });

    this.before('UPDATE', 'Tours', async (req) => {
      const id = req.data.ID || req.params?.[0]?.ID;

      if (!id) {
        return;
      }

      const tour = await SELECT.one.from(Tours).where({ ID: id });

      if (!tour) {
        return;
      }

      const normalizedStatus = normalizeTourStatus(tour.status);

      if (normalizedStatus === TOUR_STATUS.VALIDATED) {
        const allowed = new Set(['status', 'rejectionReason', 'updatedAt']);
        const keys = Object.keys(req.data).filter((k) => !k.startsWith('_'));
        const forbidden = keys.filter((k) => !allowed.has(k) && k !== 'ID');

        if (forbidden.length) {
          return reject(req, 'Modification interdite : la tournée est déjà validée.');
        }
      }

      if (normalizedStatus === TOUR_STATUS.REJECTED) {
        const businessFields = [
          'tourDate',
          'zone',
          'collectionType',
          'description',
          'client_ID',
          'vehicle_ID',
          'driver_ID'
        ];

        const keys = Object.keys(req.data).filter((k) => !k.startsWith('_'));
        const hasBusinessModification = keys.some((key) => businessFields.includes(key));

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
      if (!req.data.roadmapCode) {
        req.data.roadmapCode = await nextCode('Roadmaps', 'roadmapCode', 'RM');
      }

      if (!req.data.status) {
        req.data.status = ROADMAP_STATUS.CREATED;
      }
    });

    this.before('UPDATE', 'Roadmaps', async (req) => {
      const id = req.data.ID || req.params?.[0]?.ID;

      if (!id) {
        return;
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: id });

      if (!roadmap) {
        return;
      }

      const normalizedStatus = normalizeRoadmapStatus(roadmap.status);

      if (normalizedStatus === ROADMAP_STATUS.VALIDATED) {
        const allowed = new Set(['status', 'rejectionReason', 'updatedAt']);
        const keys = Object.keys(req.data).filter((k) => !k.startsWith('_'));
        const forbidden = keys.filter((k) => !allowed.has(k) && k !== 'ID');

        if (forbidden.length) {
          return reject(req, 'Modification interdite : la roadmap est déjà validée.');
        }
      }

      if (normalizedStatus === ROADMAP_STATUS.REJECTED) {
        const businessFields = [
          'startDate',
          'endDate',
          'tour_ID'
        ];

        const keys = Object.keys(req.data).filter((k) => !k.startsWith('_'));
        const hasBusinessModification = keys.some((key) => businessFields.includes(key));

        if (hasBusinessModification) {
          req.data.status = ROADMAP_STATUS.CREATED;
          req.data.rejectionReason = null;
        }
      }
    });

    /* ===================================================== */
    /* TOURS — GLOBAL ACTIONS                                */
    /* ===================================================== */

    this.on('submitTour', async (req) => {
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

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isCreatedStatus(tour.status)) {
        return reject(req, 'Seules les tournées créées peuvent être validées.');
      }

      const supervisor = await SELECT.one.from(Users).where({ ID: supervisorID });

      if (!supervisor) {
        return reject(req, 'Superviseur introuvable.');
      }

      if (supervisor.role !== 'SUPERVISEUR') {
        return reject(req, 'Seul un superviseur peut valider une tournée.');
      }

      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.VALIDATED,
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        decision: TOUR_STATUS.VALIDATED,
        reason: null,
        decidedBy_ID: supervisorID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('rejectTour', async (req) => {
      const { tourID, supervisorID, reason } = req.data;

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

      const supervisor = await SELECT.one.from(Users).where({ ID: supervisorID });

      if (!supervisor) {
        return reject(req, 'Superviseur introuvable.');
      }

      if (supervisor.role !== 'SUPERVISEUR') {
        return reject(req, 'Seul un superviseur peut rejeter une tournée.');
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
        decision: TOUR_STATUS.REJECTED,
        reason: trimmedReason,
        decidedBy_ID: supervisorID,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    /* ===================================================== */
    /* TOURS — BOUND ACTIONS FOR FIORI                       */
    /* ===================================================== */

    this.on('validate', 'Tours', async (req) => {
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
        decision: TOUR_STATUS.VALIDATED,
        reason: null,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('reject', 'Tours', async (req) => {
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
        decision: TOUR_STATUS.REJECTED,
        reason: trimmedReason,
        tour_ID: tourID
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    /* ===================================================== */
    /* ROADMAPS — BOUND ACTIONS FOR FIORI                    */
    /* ===================================================== */

    this.on('validateRoadmap', 'Roadmaps', async (req) => {
      const roadmapID = req.params?.[0]?.ID;

      if (!roadmapID) {
        return reject(req, 'Identifiant de roadmap manquant.');
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Roadmap introuvable.');
      }

      if (!isCreatedRoadmapStatus(roadmap.status)) {
        return reject(req, 'Seules les roadmaps créées peuvent être validées.');
      }

      await UPDATE(Roadmaps)
        .set({
          status: ROADMAP_STATUS.VALIDATED,
          rejectionReason: null,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: roadmapID });

      return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
    });

    this.on('rejectRoadmap', 'Roadmaps', async (req) => {
      const roadmapID = req.params?.[0]?.ID;
      const reason = req.data.reason;

      if (!roadmapID) {
        return reject(req, 'Identifiant de roadmap manquant.');
      }

      if (!reason || !String(reason).trim()) {
        return reject(req, 'Le motif de refus est obligatoire.');
      }

      const roadmap = await SELECT.one.from(Roadmaps).where({ ID: roadmapID });

      if (!roadmap) {
        return reject(req, 'Roadmap introuvable.');
      }

      if (!isCreatedRoadmapStatus(roadmap.status)) {
        return reject(req, 'Seules les roadmaps créées peuvent être rejetées.');
      }

      const trimmedReason = String(reason).trim();

      await UPDATE(Roadmaps)
        .set({
          status: ROADMAP_STATUS.REJECTED,
          rejectionReason: trimmedReason,
          updatedAt: new Date().toISOString()
        })
        .where({ ID: roadmapID });

      return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
    });

    /* ===================================================== */
    /* CREATE ROADMAP FROM TOUR                              */
    /* ===================================================== */

    this.on('createRoadmapFromTour', async (req) => {
      const { tourID } = req.data;

      const tour = await SELECT.one.from(Tours).where({ ID: tourID });

      if (!tour) {
        return reject(req, 'Tournée introuvable.');
      }

      if (!isValidatedStatus(tour.status)) {
        return reject(req, 'La roadmap ne peut être créée que depuis une tournée validée.');
      }

      const existing = await SELECT.one.from(Roadmaps).where({ tour_ID: tourID });

      if (existing) {
        return reject(req, 'Une roadmap existe déjà pour cette tournée.');
      }

      return cds.tx(req, async () => {
        const roadmapCode = await nextCode('Roadmaps', 'roadmapCode', 'RM');
        const roadmapID = cds.utils.uuid();
        const startDate = tour.tourDate || new Date().toISOString().slice(0, 10);

        await INSERT.into(Roadmaps).entries({
          ID: roadmapID,
          roadmapCode,
          status: ROADMAP_STATUS.CREATED,
          startDate,
          endDate: startDate,
          rejectionReason: null,
          tour_ID: tourID
        });

        let points = await SELECT.from(TourCollectionPoints)
          .where({ tour_ID: tourID })
          .orderBy('sequence');

        if (!points.length && tour.client_ID) {
          points = await SELECT.from(CollectionPoints)
            .where({ client_ID: tour.client_ID })
            .orderBy('label');
        }

        let seq = 1;

        for (const p of points) {
          const cpId = p.collectionPoint_ID || p.ID;

          await INSERT.into(RoadmapSteps).entries({
            sequence: p.sequence || seq,
            plannedArrivalTime: `08:${String(seq).padStart(2, '0')}:00`,
            status: 'PLANNED',
            roadmap_ID: roadmapID,
            collectionPoint_ID: cpId
          });

          seq += 1;
        }

        return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
      });
    });

    /* ===================================================== */
    /* STATISTICS                                            */
    /* ===================================================== */

    this.on('getPlannerStats', async (req) => {
      const { userID } = req.data;
      const where = userID ? { createdByUser_ID: userID } : {};

      const tours = await SELECT.from(Tours).columns('status').where(where);
      const roadmaps = await SELECT.from(Roadmaps).columns('status');

      return {
        totalTours: tours.length,
        draftTours: tours.filter((t) => isCreatedStatus(t.status)).length,
        pendingTours: tours.filter((t) => isCreatedStatus(t.status)).length,
        acceptedTours: tours.filter((t) => isValidatedStatus(t.status)).length,
        rejectedTours: tours.filter((t) => isRejectedStatus(t.status)).length,
        totalRoadmaps: roadmaps.length
      };
    });

    this.on('getSupervisorStats', async () => {
      const tours = await SELECT.from(Tours).columns('status');
      const roadmaps = await SELECT.from(Roadmaps).columns('status');

      return {
        totalTours: tours.length,
        pendingValidation: tours.filter((t) => isCreatedStatus(t.status)).length,
        acceptedTours: tours.filter((t) => isValidatedStatus(t.status)).length,
        rejectedTours: tours.filter((t) => isRejectedStatus(t.status)).length,
        activeRoadmaps: roadmaps.filter((r) => isValidatedRoadmapStatus(r.status)).length,
        totalRoadmaps: roadmaps.length
      };
    });

    this.on('getPendingTours', async () => {
      const tours = await SELECT.from(Tours);
      return tours.filter((t) => isCreatedStatus(t.status));
    });

    /* ===================================================== */
/* ANALYTICS — DASHBOARD OVP                             */
/* ===================================================== */

// this.on('READ', 'TourStatusAnalytics', async () => {
//   const tours = await SELECT.from(Tours).columns('status');

//   const counts = {
//     CREATED: 0,
//     VALIDATED: 0,
//     REJECTED: 0
//   };

//   for (const tour of tours) {
//     const status = normalizeTourStatus(tour.status);
//     counts[status] = (counts[status] || 0) + 1;
//   }

//   return [
//     {
//       status: 'CREATED',
//       total: counts.CREATED,
//       criticality: 2
//     },
//     {
//       status: 'VALIDATED',
//       total: counts.VALIDATED,
//       criticality: 3
//     },
//     {
//       status: 'REJECTED',
//       total: counts.REJECTED,
//       criticality: 1
//     }
//   ];
// });

// this.on('READ', 'RoadmapStatusAnalytics', async () => {
//   const roadmaps = await SELECT.from(Roadmaps).columns('status');

//   const counts = {
//     CREATED: 0,
//     VALIDATED: 0,
//     REJECTED: 0
//   };

//   for (const roadmap of roadmaps) {
//     const status = normalizeRoadmapStatus(roadmap.status);
//     counts[status] = (counts[status] || 0) + 1;
//   }

//   return [
//     {
//       status: 'CREATED',
//       total: counts.CREATED,
//       criticality: 2
//     },
//     {
//       status: 'VALIDATED',
//       total: counts.VALIDATED,
//       criticality: 3
//     },
//     {
//       status: 'REJECTED',
//       total: counts.REJECTED,
//       criticality: 1
//     }
//   ];
// });

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