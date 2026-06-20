using { route.management as db } from '../db/schema';

service RouteManagementService {

    /* ===================================================== */
    /* ENTITIES                                              */
    /* ===================================================== */

    entity Clients as projection on db.Clients;

    @readonly
    entity Materials as projection on db.Materials;

    @readonly
    entity TourStatuses as projection on db.TourStatuses;

    @readonly
    entity RoadmapStatuses as projection on db.RoadmapStatuses;

    @readonly
    entity IntegrationStatuses as projection on db.IntegrationStatuses;

    @readonly
    entity TourScheduleStatuses as projection on db.TourScheduleStatuses;

    @readonly
    entity RoadmapScheduleStatuses as projection on db.RoadmapScheduleStatuses;

    @readonly
    entity UnitsOfMeasure as projection on db.UnitsOfMeasure;

    entity Vehicles as projection on db.Vehicles;

    entity Drivers as projection on db.Drivers;

    entity CollectionPoints as projection on db.CollectionPoints;

    entity TourCollectionPoints as projection on db.TourCollectionPoints;

    @odata.draft.enabled
    @cds.redirection.target: true
    entity Tours as projection on db.Tours {
        *,
        client.name                  as clientName          : String,
        vehicle.registrationNumber   as vehicleRegistration : String,
        driver.firstName             as driverFirstName     : String,
        driver.lastName              as driverLastName      : String,
        createdByUser.fullName       as createdByName       : String,

        case
            when status = 'CREATED' then 'Créée'
            when status = 'REJECTED' then 'Rejetée'
            when status = 'VALIDATED' then 'Validée'
            when status = 'ASSIGNED' then 'Affectée'
            when status = 'COMPLETED' then 'Terminée'
            when status = 'CANCELLED' then 'Annulée'
            else 'Statut inconnu'
        end as statusText : String(40),

        case
            when status = 'COMPLETED' then 'COMPLETED'
            when status = 'CANCELLED' then 'CANCELLED'
            when coalesce(tourDate, collectionDate) < current_date then 'OVERDUE'
            when coalesce(tourDate, collectionDate) = current_date then 'DUE_TODAY'
            else 'ON_TIME'
        end as scheduleStatus : String(20),

        case
            when status = 'COMPLETED' then 'Terminée'
            when status = 'CANCELLED' then 'Annulée'
            when coalesce(tourDate, collectionDate) < current_date then 'En retard'
            when coalesce(tourDate, collectionDate) = current_date then 'À exécuter aujourd’hui'
            else 'Dans les délais'
        end as scheduleStatusText : String(60),

        case
            when status = 'COMPLETED' then 3
            when status = 'CANCELLED' then 0
            when coalesce(tourDate, collectionDate) < current_date then 1
            when coalesce(tourDate, collectionDate) = current_date then 2
            else 0
        end as scheduleCriticality : Integer,

        virtual statusCriticality    : Integer,
        virtual canValidate          : Boolean,
        virtual canReject            : Boolean,
        virtual canComplete          : Boolean
    }
    actions {
        action validate() returns Tours;
        action rejectTourDecision(reason : String) returns Tours;
        action markTourCompleted() returns Tours;
    };

    @odata.draft.enabled
    @cds.redirection.target: true
    entity Roadmaps as projection on db.Roadmaps {
        *,
        tour.tourCode                   as tourCode                 : String,
        tour.tourDate                   as tourDate                 : Date,
        tour.zone                       as tourZone                 : String,
        tour.collectionType             as tourCollectionType       : String,
        tour.client.name                as tourClientName           : String,
        tour.driver.firstName           as tourDriverFirstName      : String,
        tour.driver.lastName            as tourDriverLastName       : String,
        tour.vehicle.registrationNumber as tourVehicleRegistration  : String,

        case
            when status = 'CREATED' then 'Créée'
            when status = 'REJECTED' then 'Rejetée'
            when status = 'VALIDATED' then 'Validée'
            when status = 'COMPLETED' then 'Terminée'
            when status = 'CANCELLED' then 'Annulée'
            else 'Statut inconnu'
        end as statusText : String(40),

        case
            when status = 'COMPLETED' then 'COMPLETED'
            when status = 'CANCELLED' then 'CANCELLED'
            when endDate < current_date then 'OVERDUE'
            when startDate > current_date then 'UPCOMING'
            else 'CURRENT'
        end as scheduleStatus : String(20),

        case
            when status = 'COMPLETED' then 'Terminée'
            when status = 'CANCELLED' then 'Annulée'
            when endDate < current_date then 'En retard'
            when startDate > current_date then 'À venir'
            else 'En cours'
        end as scheduleStatusText : String(60),

        case
            when status = 'COMPLETED' then 3
            when status = 'CANCELLED' then 0
            when endDate < current_date then 1
            when startDate > current_date then 0
            else 2
        end as scheduleCriticality : Integer,

        virtual statusCriticality       : Integer,
        virtual canValidate             : Boolean,
        virtual canReject               : Boolean,
        virtual canComplete             : Boolean
    }
    actions {
        action validateRoadmap() returns Roadmaps;
    action rejectRoadmap(reason : String) returns Roadmaps;
    action autoAssignTours() returns Roadmaps;
    action generateRoadmapSheetHtml() returns LargeString;
    action markRoadmapCompleted() returns Roadmaps;
    };

    entity RoadmapTours as projection on db.RoadmapTours {
        *,
        roadmap.roadmapCode             as roadmapCode         : String,
        tour.tourCode                   as tourCode            : String,
        tour.tourDate                   as tourDate            : Date,
        tour.zone                       as tourZone            : String,
        tour.collectionType             as tourCollectionType  : String,
        tour.client.name                as clientName          : String,
        tour.driver.firstName           as driverFirstName     : String,
        tour.driver.lastName            as driverLastName      : String,
        tour.vehicle.registrationNumber as vehicleRegistration : String
    }
    actions {
        action updateResources(
            clientID  : UUID,
            driverID  : UUID,
            vehicleID : UUID
        ) returns RoadmapTours;
    };

    entity RoadmapSteps as projection on db.RoadmapSteps;

    entity DecisionHistories as projection on db.DecisionHistories {
        *,
        decidedBy.fullName as decidedByName : String,
        tour.tourCode as decisionTourCode : String,
        roadmap.roadmapCode as decisionRoadmapCode : String
    };

    @readonly
    @Aggregation.ApplySupported: {
        Transformations: [
            'aggregate',
            'groupby',
            'filter',
            'search'
        ],
        GroupableProperties: [
            status
        ],
        AggregatableProperties: [
            {
                Property: total
            }
        ]
    }
    entity TourStatusAnalytics as projection on db.TourStatusAnalytics;

    @readonly
    @Aggregation.ApplySupported: {
        Transformations: [
            'aggregate',
            'groupby',
            'filter',
            'search'
        ],
        GroupableProperties: [
            status
        ],
        AggregatableProperties: [
            {
                Property: total
            }
        ]
    }
    entity RoadmapStatusAnalytics as projection on db.RoadmapStatusAnalytics;

    /* ===================================================== */
    /* TYPES                                                 */
    /* ===================================================== */

    type LoginResult {
        ID       : UUID;
        email    : String;
        username : String;
        fullName : String;
        role     : String;
        active   : Boolean;
    }

    type PlannerStats {
        totalTours        : Integer;
        draftTours        : Integer;
        pendingTours      : Integer;
        acceptedTours     : Integer;
        rejectedTours     : Integer;
        assignedTours     : Integer;
        completedTours    : Integer;
        cancelledTours    : Integer;
        overdueTours      : Integer;
        totalRoadmaps     : Integer;
        createdRoadmaps   : Integer;
        validatedRoadmaps : Integer;
        rejectedRoadmaps  : Integer;
        completedRoadmaps : Integer;
        cancelledRoadmaps : Integer;
        overdueRoadmaps   : Integer;
    }

    type SupervisorStats {
        totalTours         : Integer;
        pendingValidation  : Integer;
        acceptedTours      : Integer;
        rejectedTours      : Integer;
        assignedTours      : Integer;
        completedTours     : Integer;
        cancelledTours     : Integer;
        overdueTours       : Integer;
        totalRoadmaps      : Integer;
        createdRoadmaps    : Integer;
        validatedRoadmaps  : Integer;
        rejectedRoadmaps   : Integer;
        completedRoadmaps  : Integer;
        cancelledRoadmaps  : Integer;
        overdueRoadmaps    : Integer;
        integratedRoadmaps : Integer;
        activeRoadmaps     : Integer;
        totalDecisions     : Integer;
        acceptedDecisions  : Integer;
        rejectedDecisions  : Integer;
        salesOrdersCount   : Integer;
    }

    type TourDetails {
        tourID              : UUID;
        tourCode            : String;
        tourDate            : Date;
        zone                : String;
        collectionType      : String;
        description         : LargeString;
        status              : String;
        rejectionReason     : LargeString;
        clientName          : String;
        vehicleRegistration : String;
        driverName          : String;
        roadmapCode         : String;
        roadmapStatus       : String;
        decisionsCount      : Integer;
        tourPointsCount     : Integer;
    }

    /* ===================================================== */
    /* ACTIONS & FUNCTIONS                                   */
    /* ===================================================== */

    action login(email : String, username : String, password : String) returns LoginResult;

    action submitTour(tourID : UUID) returns Tours;

    action acceptTour(tourID : UUID, supervisorID : UUID) returns Tours;

    action rejectTour(tourID : UUID, supervisorID : UUID, reason : String) returns Tours;

    action createRoadmapFromTour(tourID : UUID) returns Roadmaps;

    function getPlannerStats(userID : UUID) returns PlannerStats;

    function getSupervisorStats() returns SupervisorStats;

    function getPendingTours() returns many Tours;

    function getTourDetails(tourID : UUID) returns TourDetails;
}

/* ===================================================== */
/* VALUE HELPS                                           */
/* ===================================================== */

annotate RouteManagementService.Tours with {
    collectionType @Common.ValueList : {
        Label          : 'Matériau / Type de déchet',
        CollectionPath : 'Materials',
        Parameters     : [
            {
                $Type             : 'Common.ValueListParameterInOut',
                LocalDataProperty : collectionType,
                ValueListProperty : 'description'
            },
            {
                $Type             : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'materialCode'
            },
            {
                $Type             : 'Common.ValueListParameterOut',
                LocalDataProperty : unitOfMeasure,
                ValueListProperty : 'unitOfMeasure'
            }
        ]
    };

    client @Common.ValueList : {
        CollectionPath : 'Clients',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : client_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'code'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'city'
            }
        ]
    };

    vehicle @Common.ValueList : {
        CollectionPath : 'Vehicles',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : vehicle_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'registrationNumber'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'type'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'capacity'
            }
        ]
    };

    driver @Common.ValueList : {
        CollectionPath : 'Drivers',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : driver_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'firstName'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'lastName'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'phone'
            }
        ]
    };
};

annotate RouteManagementService.Roadmaps with {
    tour @Common.ValueList : {
        CollectionPath : 'Tours',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : tour_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'tourCode'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'tourDate'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'zone'
            }
        ]
    };
};

/* ===================================================== */
/* TOURS ANNOTATIONS                                     */
/* ===================================================== */

annotate RouteManagementService.Tours with @(
    UI.HeaderInfo : {
        TypeName       : 'Tournée',
        TypeNamePlural : 'Tournées',
        Title          : {
            Value : tourCode
        },
        Description    : {
            Value : status
        }
    },

    UI.SelectionFields : [
        tourCode,
        tourDate,
        zone,
        collectionType,
        client_ID,
        vehicle_ID,
        driver_ID,
        status
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Code tournée',
            Value : tourCode,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'Date',
            Value : tourDate,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'Zone',
            Value : zone
        },
        {
            $Type : 'UI.DataField',
            Label : 'Type de collecte',
            Value : collectionType
        },
        {
            $Type : 'UI.DataField',
            Label : 'Client',
            Value : clientName,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'Véhicule',
            Value : vehicleRegistration
        },
        {
            $Type : 'UI.DataField',
            Label : 'Chauffeur',
            Value : driverLastName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Statut',
            Value : status,
            Criticality : statusCriticality,
            CriticalityRepresentation : #WithIcon,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'Motif de rejet',
            Value : rejectionReason
        }
    ],

    UI.Identification : [
        {
            $Type : 'UI.DataField',
            Label : 'Code tournée',
            Value : tourCode
        },
        {
            $Type : 'UI.DataField',
            Label : 'Date',
            Value : tourDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Zone',
            Value : zone
        },
        {
            $Type : 'UI.DataField',
            Label : 'Type de collecte',
            Value : collectionType
        },
        {
            $Type : 'UI.DataField',
            Label : 'Client',
            Value : client_ID
        },
        {
            $Type : 'UI.DataField',
            Label : 'Véhicule',
            Value : vehicle_ID
        },
        {
            $Type : 'UI.DataField',
            Label : 'Chauffeur',
            Value : driver_ID
        },
        {
            $Type : 'UI.DataField',
            Label : 'Statut',
            Value : status,
            Criticality : statusCriticality,
            CriticalityRepresentation : #WithIcon
        },
        {
            $Type : 'UI.DataField',
            Label : 'Description',
            Value : description
        },
        {
            $Type : 'UI.DataField',
            Label : 'Motif de rejet',
            Value : rejectionReason
        }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Informations générales',
            Target : '@UI.FieldGroup#General'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Ressources',
            Target : '@UI.FieldGroup#Resources'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Suivi',
            Target : '@UI.FieldGroup#Tracking'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Historique des décisions',
            Target : 'decisions/@UI.LineItem'
        }
    ],

    UI.FieldGroup #General : {
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Code tournée',
                Value : tourCode
            },
            {
                $Type : 'UI.DataField',
                Label : 'Date',
                Value : tourDate
            },
            {
                $Type : 'UI.DataField',
                Label : 'Zone',
                Value : zone
            },
            {
                $Type : 'UI.DataField',
                Label : 'Type de collecte',
                Value : collectionType
            },
            {
                $Type : 'UI.DataField',
                Label : 'Client',
                Value : client_ID
            },
            {
                $Type : 'UI.DataField',
                Label : 'Description',
                Value : description
            }
        ]
    },

    UI.FieldGroup #Resources : {
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Véhicule',
                Value : vehicle_ID
            },
            {
                $Type : 'UI.DataField',
                Label : 'Chauffeur',
                Value : driver_ID
            }
        ]
    },

    UI.FieldGroup #Tracking : {
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Statut',
                Value : status,
                Criticality : statusCriticality,
                CriticalityRepresentation : #WithIcon
            },
            {
                $Type : 'UI.DataField',
                Label : 'Motif de rejet',
                Value : rejectionReason
            },
            {
                $Type : 'UI.DataField',
                Label : 'Créé par',
                Value : createdByName
            },
            {
                $Type : 'UI.DataField',
                Label : 'Dernière modification',
                Value : updatedAt
            }
        ]
    }
);

/* ===================================================== */
/* ROADMAPS ANNOTATIONS                                  */
/* ===================================================== */

annotate RouteManagementService.Roadmaps with {

    client @Common.ValueList : {
        CollectionPath : 'Clients',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : client_ID,
                ValueListProperty : 'ID'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'customerCode'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name'
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'city'
            }
        ]
    };
};

annotate RouteManagementService.Roadmaps with @(
    UI.HeaderInfo : {
        TypeName       : 'Feuille de route',
        TypeNamePlural : 'Feuilles de route',
        Title          : {
            Value : roadmapCode
        },
        Description    : {
            Value : statusText
        }
    },

    UI.SelectionFields : [
        roadmapCode,
        client_ID,
        month,
        year,
        status,
        scheduleStatus,
        integrationStatus
    ],

    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'N° feuille de route',
            Value : roadmapCode,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'Client',
            Value : client.name,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'Mois',
            Value : month
        },
        {
            $Type : 'UI.DataField',
            Label : 'Année',
            Value : year
        },
        {
            $Type : 'UI.DataField',
            Label : 'Statut',
            Value : statusText,
            Criticality : statusCriticality,
            CriticalityRepresentation : #WithIcon,
            ![@UI.Importance] : #High
        },
        {
            $Type : 'UI.DataField',
            Label : 'État temporel',
            Value : scheduleStatusText,
            Criticality : scheduleCriticality,
            CriticalityRepresentation : #WithIcon
        },
        {
            $Type : 'UI.DataField',
            Label : 'Statut intégration',
            Value : integrationStatus
        }
    ],

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Informations générales',
            Target : '@UI.FieldGroup#General'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Tournées affectées',
            Target : 'assignedTours/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Suivi',
            Target : '@UI.FieldGroup#Tracking'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Historique des décisions',
            Target : 'decisions/@UI.LineItem'
        }
    ],

    UI.FieldGroup #General : {
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'N° feuille de route',
                Value : roadmapCode
            },
            {
                $Type : 'UI.DataField',
                Label : 'Client',
                Value : client_ID
            },
            {
                $Type : 'UI.DataField',
                Label : 'Mois',
                Value : month
            },
            {
                $Type : 'UI.DataField',
                Label : 'Année',
                Value : year
            }
        ]
    },

    UI.FieldGroup #Tracking : {
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Statut',
                Value : statusText,
                Criticality : statusCriticality,
                CriticalityRepresentation : #WithIcon
            },
            {
                $Type : 'UI.DataField',
                Label : 'État temporel',
                Value : scheduleStatusText,
                Criticality : scheduleCriticality,
                CriticalityRepresentation : #WithIcon
            },
            {
                $Type : 'UI.DataField',
                Label : 'Statut intégration',
                Value : integrationStatus
            },
            {
                $Type : 'UI.DataField',
                Label : 'Commande SAP',
                Value : sapSalesOrder
            },
            {
                $Type : 'UI.DataField',
                Label : 'Motif de rejet',
                Value : rejectionReason
            }
        ]
    }
);

annotate RouteManagementService.RoadmapTours with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Séquence',
            Value : sequence
        },
        {
            $Type : 'UI.DataField',
            Label : 'N° tournée',
            Value : tourCode
        },
        {
            $Type : 'UI.DataField',
            Label : 'Date de collecte',
            Value : tourDate
        },
        {
            $Type : 'UI.DataField',
            Label : 'Matériau / Type de déchet',
            Value : tourCollectionType
        },
        {
            $Type : 'UI.DataField',
            Label : 'Client',
            Value : clientName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Remarque',
            Value : note
        }
    ]
);

annotate RouteManagementService.DecisionHistories with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Décision',
            Value : decision
        },
        {
            $Type : 'UI.DataField',
            Label : 'Motif',
            Value : reason
        },
        {
            $Type : 'UI.DataField',
            Label : 'Décidé par',
            Value : decidedByName
        },
        {
            $Type : 'UI.DataField',
            Label : 'Date de décision',
            Value : decisionDate
        }
    ]
);
