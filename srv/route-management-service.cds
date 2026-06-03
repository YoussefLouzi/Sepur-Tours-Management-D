using { route.management as db } from '../db/schema';

service RouteManagementService {

    /* ===================================================== */
    /* ENTITIES                                              */
    /* ===================================================== */

    entity Users as projection on db.Users;

    entity Clients as projection on db.Clients;

    entity Vehicles as projection on db.Vehicles;

    entity Drivers as projection on db.Drivers;

    entity CollectionPoints as projection on db.CollectionPoints;

    entity TourCollectionPoints as projection on db.TourCollectionPoints;
@cds.redirection.target: true
entity Tours as projection on db.Tours {
        *,
        client.name                 as clientName          : String,
        vehicle.registrationNumber  as vehicleRegistration : String,
        driver.firstName            as driverFirstName     : String,
        driver.lastName             as driverLastName      : String,
        createdByUser.fullName      as createdByName       : String,

        virtual statusCriticality   : Integer,
        virtual canValidate         : Boolean,
        virtual canReject           : Boolean
    }
    actions {
        action validate() returns Tours;
        action reject(reason : String) returns Tours;
    };

    @cds.redirection.target: true
entity Roadmaps as projection on db.Roadmaps {
        *,
        tour.tourCode as tourCode : String,
        tour.tourDate as tourDate : Date,
        tour.zone     as tourZone : String,

        virtual statusCriticality : Integer,
        virtual canValidate       : Boolean,
        virtual canReject         : Boolean
    }
    actions {
        action validateRoadmap() returns Roadmaps;
        action rejectRoadmap(reason : String) returns Roadmaps;
    };

    entity RoadmapSteps as projection on db.RoadmapSteps;

    entity DecisionHistories as projection on db.DecisionHistories;


    /* ===================================================== */
    /* ANALYTICS ENTITIES FOR OVP DASHBOARD                  */
    /* ===================================================== */

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
    entity TourStatusAnalytics as select from db.Tours {
        key status   as status,
            count(1) as total : Integer
    }
    group by status;


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
    entity RoadmapStatusAnalytics as select from db.Roadmaps {
        key status   as status,
            count(1) as total : Integer
    }
    group by status;


    /* ===================================================== */
    /* TYPES                                                 */
    /* ===================================================== */

    type LoginResult {
        ID       : UUID;
        username : String;
        fullName : String;
        role     : String;
        active   : Boolean;
    }

    type PlannerStats {
        totalTours    : Integer;
        draftTours    : Integer;
        pendingTours  : Integer;
        acceptedTours : Integer;
        rejectedTours : Integer;
        totalRoadmaps : Integer;
    }

    type SupervisorStats {
        totalTours         : Integer;
        pendingValidation  : Integer;
        acceptedTours      : Integer;
        rejectedTours      : Integer;
        activeRoadmaps     : Integer;
        totalRoadmaps      : Integer;
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

    action login(username : String, password : String) returns LoginResult;

    action submitTour(tourID : UUID) returns Tours;

    action acceptTour(tourID : UUID, supervisorID : UUID) returns Tours;

    action rejectTour(tourID : UUID, supervisorID : UUID, reason : String) returns Tours;

    action createRoadmapFromTour(tourID : UUID) returns Roadmaps;

    function getPlannerStats(userID : UUID) returns PlannerStats;

    function getSupervisorStats() returns SupervisorStats;

    function getPendingTours() returns many Tours;

    function getTourDetails(tourID : UUID) returns TourDetails;
}