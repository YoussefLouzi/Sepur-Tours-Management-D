const cds = require('@sap/cds');

const TOUR_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
};

const ROADMAP_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

function reject(req, message, status = 400) {
  return req.reject(status, message);
}

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
    if (m) seq = parseInt(m[1], 10) + 1;
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
      Drivers,
    } = cds.entities('route.management');

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
        active: user.active,
      };
    });

    this.on('submitTour', async (req) => {
      const { tourID } = req.data;
      const tour = await SELECT.one.from(Tours).where({ ID: tourID });
      if (!tour) return reject(req, 'Tournée introuvable.');
      if (![TOUR_STATUS.DRAFT, TOUR_STATUS.REJECTED].includes(tour.status)) {
        return reject(req, 'Seules les tournées brouillon ou rejetées peuvent être soumises.');
      }
      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.PENDING,
          rejectionReason: null,
          updatedAt: new Date().toISOString(),
        })
        .where({ ID: tourID });
      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('acceptTour', async (req) => {
      const { tourID, supervisorID } = req.data;
      const tour = await SELECT.one.from(Tours).where({ ID: tourID });
      if (!tour) return reject(req, 'Tournée introuvable.');
      if (tour.status !== TOUR_STATUS.PENDING) {
        return reject(req, 'Seules les tournées en attente peuvent être acceptées.');
      }
      const supervisor = await SELECT.one.from(Users).where({ ID: supervisorID });
      if (!supervisor) return reject(req, 'Superviseur introuvable.');
      if (supervisor.role !== 'SUPERVISEUR') {
        return reject(req, 'Seul un superviseur peut accepter une tournée.');
      }

      await UPDATE(Tours)
        .set({ status: TOUR_STATUS.ACCEPTED, updatedAt: new Date().toISOString() })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        decision: 'ACCEPTED',
        reason: null,
        decidedBy_ID: supervisorID,
        tour_ID: tourID,
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('rejectTour', async (req) => {
      const { tourID, supervisorID, reason } = req.data;
      if (!reason || !String(reason).trim()) {
        return reject(req, 'Le motif de refus est obligatoire.');
      }
      const tour = await SELECT.one.from(Tours).where({ ID: tourID });
      if (!tour) return reject(req, 'Tournée introuvable.');
      if (tour.status !== TOUR_STATUS.PENDING) {
        return reject(req, 'Seules les tournées en attente peuvent être rejetées.');
      }
      const supervisor = await SELECT.one.from(Users).where({ ID: supervisorID });
      if (!supervisor) return reject(req, 'Superviseur introuvable.');
      if (supervisor.role !== 'SUPERVISEUR') {
        return reject(req, 'Seul un superviseur peut rejeter une tournée.');
      }

      const trimmedReason = String(reason).trim();
      await UPDATE(Tours)
        .set({
          status: TOUR_STATUS.REJECTED,
          rejectionReason: trimmedReason,
          updatedAt: new Date().toISOString(),
        })
        .where({ ID: tourID });

      await INSERT.into(DecisionHistories).entries({
        decision: 'REJECTED',
        reason: trimmedReason,
        decidedBy_ID: supervisorID,
        tour_ID: tourID,
      });

      return SELECT.one.from(Tours).where({ ID: tourID });
    });

    this.on('createRoadmapFromTour', async (req) => {
      const { tourID } = req.data;
      const tour = await SELECT.one.from(Tours).where({ ID: tourID });
      if (!tour) return reject(req, 'Tournée introuvable.');
      if (tour.status !== TOUR_STATUS.ACCEPTED) {
        return reject(req, 'La roadmap ne peut être créée que depuis une tournée acceptée.');
      }

      const existing = await SELECT.one.from(Roadmaps).where({ tour_ID: tourID });
      if (existing) {
        return reject(req, 'Une roadmap existe déjà pour cette tournée.');
      }

      return cds.tx(req, async (tx) => {
        const roadmapCode = await nextCode('Roadmaps', 'roadmapCode', 'RM');
        const roadmapID = cds.utils.uuid();
        const startDate = tour.tourDate || new Date().toISOString().slice(0, 10);

        await INSERT.into(Roadmaps).entries({
          ID: roadmapID,
          roadmapCode,
          status: ROADMAP_STATUS.ACTIVE,
          startDate,
          endDate: startDate,
          tour_ID: tourID,
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
            collectionPoint_ID: cpId,
          });
          seq += 1;
        }

        return SELECT.one.from(Roadmaps).where({ ID: roadmapID });
      });
    });

    this.on('getPlannerStats', async (req) => {
      const { userID } = req.data;
      const where = userID ? { createdByUser_ID: userID } : {};
      const tours = await SELECT.from(Tours).columns('status').where(where);
      const roadmaps = await SELECT.from(Roadmaps).columns('ID');

      const count = (s) => tours.filter((t) => t.status === s).length;
      return {
        totalTours: tours.length,
        draftTours: count(TOUR_STATUS.DRAFT),
        pendingTours: count(TOUR_STATUS.PENDING),
        acceptedTours: count(TOUR_STATUS.ACCEPTED),
        rejectedTours: count(TOUR_STATUS.REJECTED),
        totalRoadmaps: roadmaps.length,
      };
    });

    this.on('getSupervisorStats', async () => {
      const tours = await SELECT.from(Tours).columns('status');
      const roadmaps = await SELECT.from(Roadmaps).columns('status');
      return {
        totalTours: tours.length,
        pendingValidation: tours.filter((t) => t.status === TOUR_STATUS.PENDING).length,
        acceptedTours: tours.filter((t) => t.status === TOUR_STATUS.ACCEPTED).length,
        rejectedTours: tours.filter((t) => t.status === TOUR_STATUS.REJECTED).length,
        activeRoadmaps: roadmaps.filter((r) => r.status === ROADMAP_STATUS.ACTIVE).length,
        totalRoadmaps: roadmaps.length,
      };
    });

    this.on('getPendingTours', async () => {
      return SELECT.from(Tours).where({ status: TOUR_STATUS.PENDING });
    });

    this.on('getTourDetails', async (req) => {
      const { tourID } = req.data;
      const tour = await SELECT.one.from(Tours).where({ ID: tourID });
      if (!tour) return reject(req, 'Tournée introuvable.');

      const [client, vehicle, driver, roadmap, decisions, tourPoints] = await Promise.all([
        tour.client_ID ? SELECT.one.from(Clients).where({ ID: tour.client_ID }) : null,
        tour.vehicle_ID ? SELECT.one.from(Vehicles).where({ ID: tour.vehicle_ID }) : null,
        tour.driver_ID ? SELECT.one.from(Drivers).where({ ID: tour.driver_ID }) : null,
        SELECT.one.from(Roadmaps).where({ tour_ID: tourID }),
        SELECT.from(DecisionHistories).where({ tour_ID: tourID }),
        SELECT.from(TourCollectionPoints).where({ tour_ID: tourID }),
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
        status: tour.status,
        rejectionReason: tour.rejectionReason,
        clientName: client?.name || '',
        vehicleRegistration: vehicle?.registrationNumber || '',
        driverName,
        roadmapCode: roadmap?.roadmapCode || '',
        roadmapStatus: roadmap?.status || '',
        decisionsCount: decisions.length,
        tourPointsCount: tourPoints.length,
      };
    });

    this.before('CREATE', Tours, async (req) => {
      if (!req.data.tourCode) {
        req.data.tourCode = await nextCode('Tours', 'tourCode', 'TOUR');
      }
      if (!req.data.status) req.data.status = TOUR_STATUS.DRAFT;
    });

    this.before('UPDATE', Tours, async (req) => {
      const id = req.data.ID || req.params?.[0]?.ID;
      if (!id) return;
      const tour = await SELECT.one.from(Tours).where({ ID: id });
      if (!tour) return;
      if ([TOUR_STATUS.ACCEPTED, TOUR_STATUS.PENDING].includes(tour.status)) {
        const allowed = new Set(['status', 'rejectionReason', 'updatedAt']);
        const keys = Object.keys(req.data).filter((k) => !k.startsWith('_'));
        const forbidden = keys.filter((k) => !allowed.has(k) && k !== 'ID');
        if (forbidden.length) {
          return reject(
            req,
            'Modification interdite : la tournée est en attente ou déjà acceptée.'
          );
        }
      }
    });

    return super.init();
  }
};
