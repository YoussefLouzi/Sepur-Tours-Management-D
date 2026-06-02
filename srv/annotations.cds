using RouteManagementService as service from './route-management-service';

/* ===================================================== */
/* TOURS                                                 */
/* ===================================================== */

annotate service.Tours with @(
    UI.HeaderInfo: {
        TypeName: 'Tournée',
        TypeNamePlural: 'Tournées de collecte',
        Title: {
            $Type: 'UI.DataField',
            Value: tourCode
        },
        Description: {
            $Type: 'UI.DataField',
            Value: status
        }
    },

    Capabilities.InsertRestrictions.Insertable: false,
    Capabilities.DeleteRestrictions.Deletable: false,
    Capabilities.UpdateRestrictions.Updatable: false,

    UI.SelectionFields: [
        status,
        tourCode,
        tourDate,
        clientName,
        collectionType,
        driverLastName,
        vehicleRegistration
    ],

    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'N° tournée',
            Value: tourCode
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date de collecte',
            Value: tourDate
        },
        {
            $Type: 'UI.DataField',
            Label: 'Client',
            Value: clientName
        },
        {
            $Type: 'UI.DataField',
            Label: 'Matériau',
            Value: collectionType
        },
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status,
            Criticality: statusCriticality
        },
        {
            $Type: 'UI.DataFieldForAction',
            Label: 'Valider',
            Action: 'RouteManagementService.validate',
            Inline: true
        },
        {
            $Type: 'UI.DataFieldForAction',
            Label: 'Rejeter',
            Action: 'RouteManagementService.reject',
            Inline: true
        }
    ],

    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Informations générales',
            Target: '@UI.FieldGroup#General'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Client et matériau',
            Target: '@UI.FieldGroup#ClientMaterial'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Affectation des ressources',
            Target: '@UI.FieldGroup#Resources'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Suivi de la tournée',
            Target: '@UI.FieldGroup#Tracking'
        }
    ],

    UI.FieldGroup #General: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'N° tournée',
                Value: tourCode
            },
            {
                $Type: 'UI.DataField',
                Label: 'Date de collecte',
                Value: tourDate
            },
            {
                $Type: 'UI.DataField',
                Label: 'Zone',
                Value: zone
            },
            {
                $Type: 'UI.DataField',
                Label: 'Statut',
                Value: status,
                Criticality: statusCriticality
            }
        ]
    },

    UI.FieldGroup #ClientMaterial: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Client',
                Value: clientName
            },
            {
                $Type: 'UI.DataField',
                Label: 'Matériau',
                Value: collectionType
            },
            {
                $Type: 'UI.DataField',
                Label: 'Description',
                Value: description
            }
        ]
    },

    UI.FieldGroup #Resources: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Ressource humaine',
                Value: driverLastName
            },
            {
                $Type: 'UI.DataField',
                Label: 'Ressource matérielle',
                Value: vehicleRegistration
            }
        ]
    },

    UI.FieldGroup #Tracking: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Motif de refus',
                Value: rejectionReason
            },
            {
                $Type: 'UI.DataField',
                Label: 'Créé le',
                Value: createdAt
            },
            {
                $Type: 'UI.DataField',
                Label: 'Mis à jour le',
                Value: updatedAt
            }
        ]
    }
);

annotate service.Tours with {
    status              @Common.Label: 'Statut de modification';
    tourCode            @Common.Label: 'N° tournée';
    tourDate            @Common.Label: 'Date de collecte';
    clientName          @Common.Label: 'Client';
    collectionType      @Common.Label: 'Matériau';
    driverLastName      @Common.Label: 'Ressource humaine';
    vehicleRegistration @Common.Label: 'Ressource matérielle';
    zone                @Common.Label: 'Zone';
    description         @Common.Label: 'Description';
    rejectionReason     @Common.Label: 'Motif de refus';
    statusCriticality   @Common.Label: 'Criticité du statut';
    canValidate         @Core.Computed: true;
    canReject           @Core.Computed: true;
};


/* ===================================================== */
/* ROADMAPS                                              */
/* ===================================================== */

annotate service.Roadmaps with @(
    UI.HeaderInfo: {
        TypeName: 'Roadmap',
        TypeNamePlural: 'Roadmaps',
        Title: {
            $Type: 'UI.DataField',
            Value: roadmapCode
        },
        Description: {
            $Type: 'UI.DataField',
            Value: status
        }
    },

    Capabilities.InsertRestrictions.Insertable: false,
    Capabilities.DeleteRestrictions.Deletable: false,
    Capabilities.UpdateRestrictions.Updatable: false,

    UI.SelectionFields: [
        status,
        roadmapCode,
        startDate,
        endDate,
        tourCode,
        tourDate,
        tourZone
    ],

    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'N° roadmap',
            Value: roadmapCode
        },
        {
            $Type: 'UI.DataField',
            Label: 'Tournée liée',
            Value: tourCode
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date tournée',
            Value: tourDate
        },
        {
            $Type: 'UI.DataField',
            Label: 'Zone',
            Value: tourZone
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date début',
            Value: startDate
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date fin',
            Value: endDate
        },
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status,
            Criticality: statusCriticality
        },
        {
            $Type: 'UI.DataFieldForAction',
            Label: 'Valider',
            Action: 'RouteManagementService.validateRoadmap',
            Inline: true
        },
        {
            $Type: 'UI.DataFieldForAction',
            Label: 'Rejeter',
            Action: 'RouteManagementService.rejectRoadmap',
            Inline: true
        }
    ],

    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Informations générales',
            Target: '@UI.FieldGroup#RoadmapGeneral'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Tournée associée',
            Target: '@UI.FieldGroup#RoadmapTour'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Suivi de validation',
            Target: '@UI.FieldGroup#RoadmapTracking'
        }
    ],

    UI.FieldGroup #RoadmapGeneral: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'N° roadmap',
                Value: roadmapCode
            },
            {
                $Type: 'UI.DataField',
                Label: 'Date début',
                Value: startDate
            },
            {
                $Type: 'UI.DataField',
                Label: 'Date fin',
                Value: endDate
            },
            {
                $Type: 'UI.DataField',
                Label: 'Statut',
                Value: status,
                Criticality: statusCriticality
            }
        ]
    },

    UI.FieldGroup #RoadmapTour: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Tournée liée',
                Value: tourCode
            },
            {
                $Type: 'UI.DataField',
                Label: 'Date tournée',
                Value: tourDate
            },
            {
                $Type: 'UI.DataField',
                Label: 'Zone tournée',
                Value: tourZone
            }
        ]
    },

    UI.FieldGroup #RoadmapTracking: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Motif de refus',
                Value: rejectionReason
            },
            {
                $Type: 'UI.DataField',
                Label: 'Créé le',
                Value: createdAt
            },
            {
                $Type: 'UI.DataField',
                Label: 'Mis à jour le',
                Value: updatedAt
            }
        ]
    }
);

annotate service.Roadmaps with {
    roadmapCode       @Common.Label: 'N° roadmap';
    status            @Common.Label: 'Statut de modification';
    startDate         @Common.Label: 'Date début';
    endDate           @Common.Label: 'Date fin';
    tourCode          @Common.Label: 'Tournée liée';
    tourDate          @Common.Label: 'Date tournée';
    tourZone          @Common.Label: 'Zone tournée';
    rejectionReason   @Common.Label: 'Motif de refus';
    statusCriticality @Common.Label: 'Criticité du statut';
    canValidate       @Core.Computed: true;
    canReject         @Core.Computed: true;
};