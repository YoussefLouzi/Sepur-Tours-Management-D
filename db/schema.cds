namespace route.management;

using { cuid, managed } from '@sap/cds/common';

/* ===================================================== */
/* USERS & AUTH (dev local — XSUAA plus tard)            */
/* ===================================================== */

entity Users : cuid {
    username : String(100)  @mandatory;
    password : String(100)  @mandatory;
    fullName : String(200);
    role     : String(30);   // PLANIFICATEUR | SUPERVISEUR
    active   : Boolean default true;
}

/* ===================================================== */
/* MASTER DATA                                           */
/* ===================================================== */

entity Clients : cuid {
    code    : String(30);
    name    : String(150);
    address : String(255);
    city    : String(100);
    phone   : String(30);
    email   : String(100);

    collectionPoints : Composition of many CollectionPoints
        on collectionPoints.client = $self;
}

entity Vehicles : cuid {
    registrationNumber : String(30);
    type               : String(50);
    capacity           : Integer;
    status             : String(30);
    available          : Boolean default true;
}

entity Drivers : cuid {
    firstName : String(100);
    lastName  : String(100);
    phone     : String(30);
    available : Boolean default true;
}

entity CollectionPoints : cuid {
    label     : String(150);
    address   : String(255);
    city      : String(100);
    latitude  : Decimal(9, 6);
    longitude : Decimal(9, 6);
    client    : Association to Clients;
}

/* ===================================================== */
/* TOURS & VALIDATION                                    */
/* ===================================================== */

entity Tours : cuid, managed {
    tourCode         : String(30);
    tourDate         : Date;
    zone             : String(100);
    collectionType   : String(50);
    description      : LargeString;
    status           : String(20) default 'DRAFT'; // DRAFT | PENDING | ACCEPTED | REJECTED
    rejectionReason  : LargeString;
    createdAt        : Timestamp @cds.on.insert: $now;
    updatedAt        : Timestamp @cds.on.insert: $now  @cds.on.update: $now;

    createdByUser : Association to Users;
    client        : Association to Clients;
    vehicle       : Association to Vehicles;
    driver        : Association to Drivers;

    tourPoints : Composition of many TourCollectionPoints
        on tourPoints.tour = $self;
    decisions  : Composition of many DecisionHistories
        on decisions.tour = $self;
    roadmap    : Association to Roadmaps;
}

entity TourCollectionPoints : cuid {
    sequence         : Integer;
    tour             : Association to Tours;
    collectionPoint  : Association to CollectionPoints;
}

/* ===================================================== */
/* ROADMAPS                                              */
/* ===================================================== */

entity Roadmaps : cuid, managed {
    roadmapCode : String(30);
    status      : String(20) default 'DRAFT'; // DRAFT | ACTIVE | COMPLETED | CANCELLED
    startDate   : Date;
    endDate     : Date;
    createdAt   : Timestamp @cds.on.insert: $now;
    updatedAt   : Timestamp @cds.on.insert: $now  @cds.on.update: $now;

    tour  : Association to Tours;
    steps : Composition of many RoadmapSteps
        on steps.roadmap = $self;
}

entity RoadmapSteps : cuid {
    sequence            : Integer;
    plannedArrivalTime    : Time;
    realArrivalTime       : Time;
    status                : String(20) default 'PLANNED'; // PLANNED | DONE | SKIPPED
    roadmap               : Association to Roadmaps;
    collectionPoint       : Association to CollectionPoints;
}

/* ===================================================== */
/* DECISION HISTORY                                      */
/* ===================================================== */

entity DecisionHistories : cuid {
    decision     : String(20); // ACCEPTED | REJECTED
    reason       : LargeString;
    decisionDate : Timestamp @cds.on.insert: $now;
    decidedBy    : Association to Users;
    tour         : Association to Tours;
}
