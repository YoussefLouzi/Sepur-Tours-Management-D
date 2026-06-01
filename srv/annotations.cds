using RouteManagementService as service from './route-management-service';

annotate service.Tours with @(
    UI.HeaderInfo : {
        TypeName       : 'Tournée',
        TypeNamePlural : 'Tournées',
        Title          : { Value : tourCode },
        Description    : { Value : zone }
    },
    UI.SelectionFields : [
        tourCode,
        tourDate,
        zone,
        status
    ],
    UI.LineItem : [
        { Value : tourCode, Label : 'Code' },
        { Value : tourDate, Label : 'Date' },
        { Value : zone, Label : 'Zone' },
        { Value : collectionType, Label : 'Type collecte' },
        { Value : status, Label : 'Statut' },
        { Value : client.name, Label : 'Client' },
        { Value : vehicle.registrationNumber, Label : 'Véhicule' },
        { Value : driver.firstName, Label : 'Chauffeur' }
    ],
    UI.Identification : [
        { Value : tourCode },
        { Value : tourDate },
        { Value : zone },
        { Value : collectionType },
        { Value : description },
        { Value : status },
        { Value : rejectionReason }
    ],
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Informations générales',
            Target : '@UI.FieldGroup#General'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Client',
            Target : 'client/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Véhicule et chauffeur',
            Target : '@UI.FieldGroup#Resources'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Roadmap',
            Target : 'roadmap/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Historique des décisions',
            Target : 'decisions/@UI.LineItem'
        }
    ],
    UI.FieldGroup #General : {
        Data : [
            { Value : tourCode },
            { Value : tourDate },
            { Value : zone },
            { Value : collectionType },
            { Value : status },
            { Value : description },
            { Value : rejectionReason }
        ]
    },
    UI.FieldGroup #Resources : {
        Data : [
            { Value : vehicle.registrationNumber, Label : 'Immatriculation' },
            { Value : vehicle.type, Label : 'Type véhicule' },
            { Value : driver.firstName, Label : 'Prénom chauffeur' },
            { Value : driver.lastName, Label : 'Nom chauffeur' }
        ]
    },
    UI.Criticality : status
);

annotate service.Tours with {
    status @UI.TextArrangement : #TextOnly;
};

annotate service.Roadmaps with @(
    UI.HeaderInfo : {
        TypeName       : 'Roadmap',
        TypeNamePlural : 'Roadmaps',
        Title          : { Value : roadmapCode },
        Description    : { Value : status }
    },
    UI.LineItem : [
        { Value : roadmapCode, Label : 'Code' },
        { Value : status, Label : 'Statut' },
        { Value : startDate, Label : 'Début' },
        { Value : endDate, Label : 'Fin' },
        { Value : tour.tourCode, Label : 'Tournée' }
    ],
    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Informations roadmap',
            Target : '@UI.FieldGroup#RoadmapInfo'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Tournée associée',
            Target : 'tour/@UI.Identification'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            Label  : 'Étapes de la roadmap',
            Target : 'steps/@UI.LineItem'
        }
    ],
    UI.FieldGroup #RoadmapInfo : {
        Data : [
            { Value : roadmapCode },
            { Value : status },
            { Value : startDate },
            { Value : endDate }
        ]
    }
);

annotate service.RoadmapSteps with @(
    UI.LineItem : [
        { Value : sequence, Label : 'Séquence' },
        { Value : plannedArrivalTime, Label : 'Arrivée prévue' },
        { Value : realArrivalTime, Label : 'Arrivée réelle' },
        { Value : status, Label : 'Statut' },
        { Value : collectionPoint.label, Label : 'Point de collecte' }
    ]
);

annotate service.DecisionHistories with @(
    UI.LineItem : [
        { Value : decision, Label : 'Décision' },
        { Value : reason, Label : 'Motif' },
        { Value : decisionDate, Label : 'Date' },
        { Value : decidedBy.fullName, Label : 'Décideur' }
    ]
);

annotate service.Clients with @(
    UI.LineItem : [
        { Value : code },
        { Value : name },
        { Value : city },
        { Value : phone }
    ]
);

annotate service.Vehicles with @(
    UI.LineItem : [
        { Value : registrationNumber },
        { Value : type },
        { Value : capacity },
        { Value : status },
        { Value : available }
    ]
);

annotate service.Drivers with @(
    UI.LineItem : [
        { Value : firstName },
        { Value : lastName },
        { Value : phone },
        { Value : available }
    ]
);

annotate service.CollectionPoints with @(
    UI.LineItem : [
        { Value : label },
        { Value : address },
        { Value : city },
        { Value : client.name }
    ]
);
