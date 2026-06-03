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
            Label: 'Ressource humaine',
            Value: driverLastName
        },
        {
            $Type: 'UI.DataField',
            Label: 'Ressource matérielle',
            Value: vehicleRegistration
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
            Label: 'Suivi',
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
    statusCriticality @Common.Label: 'Criticité du statut';
    canValidate       @Core.Computed: true;
    canReject         @Core.Computed: true;
};


/* ===================================================== */
/* OVP DASHBOARD TABLE CARDS                             */
/* ===================================================== */

annotate service.Tours with @(
    UI.LineItem #DashboardTours: [
        {
            $Type: 'UI.DataField',
            Label: 'N° tournée',
            Value: tourCode
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date',
            Value: tourDate
        },
        {
            $Type: 'UI.DataField',
            Label: 'Client',
            Value: clientName
        },
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status,
            Criticality: statusCriticality
        }
    ]
);

annotate service.Roadmaps with @(
    UI.LineItem #DashboardRoadmaps: [
        {
            $Type: 'UI.DataField',
            Label: 'N° roadmap',
            Value: roadmapCode
        },
        {
            $Type: 'UI.DataField',
            Label: 'Tournée',
            Value: tourCode
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date début',
            Value: startDate
        },
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status,
            Criticality: statusCriticality
        }
    ]
);


/* ===================================================== */
/* OVP DASHBOARD CHART CARDS                             */
/* ===================================================== */

annotate service.TourStatusAnalytics with @(
    UI.Chart #TourStatusChart: {
        $Type: 'UI.ChartDefinitionType',
        Title: 'Répartition des tournées par statut',
        Description: 'Analyse des tournées créées, validées et rejetées',
        ChartType: #Column,
        Dimensions: [
            status
        ],
        Measures: [
            total
        ],
        DimensionAttributes: [
            {
                $Type: 'UI.ChartDimensionAttributeType',
                Dimension: status,
                Role: #Category
            }
        ],
        MeasureAttributes: [
            {
                $Type: 'UI.ChartMeasureAttributeType',
                Measure: total,
                Role: #Axis1
            }
        ]
    },

    UI.PresentationVariant #TourStatusPV: {
        Text: 'Statistiques des tournées',
        Visualizations: [
            '@UI.Chart#TourStatusChart'
        ]
    },

    UI.LineItem #TourStatusTable: [
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status
        },
        {
            $Type: 'UI.DataField',
            Label: 'Nombre de tournées',
            Value: total
        }
    ]
);

annotate service.TourStatusAnalytics with {
    status @Common.Label: 'Statut';
    total  @Common.Label: 'Nombre de tournées';
    total  @Aggregation.default: #SUM;
};


annotate service.RoadmapStatusAnalytics with @(
    UI.Chart #RoadmapStatusChart: {
        $Type: 'UI.ChartDefinitionType',
        Title: 'Répartition des roadmaps par statut',
        Description: 'Analyse des roadmaps créées, validées et rejetées',
        ChartType: #Donut,
        Dimensions: [
            status
        ],
        Measures: [
            total
        ],
        DimensionAttributes: [
            {
                $Type: 'UI.ChartDimensionAttributeType',
                Dimension: status,
                Role: #Category
            }
        ],
        MeasureAttributes: [
            {
                $Type: 'UI.ChartMeasureAttributeType',
                Measure: total,
                Role: #Axis1
            }
        ]
    },

    UI.PresentationVariant #RoadmapStatusPV: {
        Text: 'Statistiques des roadmaps',
        Visualizations: [
            '@UI.Chart#RoadmapStatusChart'
        ]
    },

    UI.LineItem #RoadmapStatusTable: [
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status
        },
        {
            $Type: 'UI.DataField',
            Label: 'Nombre de roadmaps',
            Value: total
        }
    ]
);

annotate service.RoadmapStatusAnalytics with {
    status @Common.Label: 'Statut';
    total  @Common.Label: 'Nombre de roadmaps';
    total  @Aggregation.default: #SUM;
};


/* ===================================================== */
/* RELATED ENTITIES                                      */
/* ===================================================== */

annotate service.RoadmapSteps with @(
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Séquence',
            Value: sequence
        },
        {
            $Type: 'UI.DataField',
            Label: 'Arrivée prévue',
            Value: plannedArrivalTime
        },
        {
            $Type: 'UI.DataField',
            Label: 'Arrivée réelle',
            Value: realArrivalTime
        },
        {
            $Type: 'UI.DataField',
            Label: 'Statut',
            Value: status
        }
    ]
);

annotate service.DecisionHistories with @(
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Décision',
            Value: decision
        },
        {
            $Type: 'UI.DataField',
            Label: 'Motif',
            Value: reason
        },
        {
            $Type: 'UI.DataField',
            Label: 'Date',
            Value: decisionDate
        }
    ]
);

annotate service.Clients with @(
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Code',
            Value: code
        },
        {
            $Type: 'UI.DataField',
            Label: 'Nom',
            Value: name
        },
        {
            $Type: 'UI.DataField',
            Label: 'Ville',
            Value: city
        },
        {
            $Type: 'UI.DataField',
            Label: 'Téléphone',
            Value: phone
        }
    ]
);

annotate service.Vehicles with @(
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Immatriculation',
            Value: registrationNumber
        },
        {
            $Type: 'UI.DataField',
            Label: 'Type',
            Value: type
        },
        {
            $Type: 'UI.DataField',
            Label: 'Capacité',
            Value: capacity
        },
        {
            $Type: 'UI.DataField',
            Label: 'Disponible',
            Value: available
        }
    ]
);

annotate service.Drivers with @(
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Prénom',
            Value: firstName
        },
        {
            $Type: 'UI.DataField',
            Label: 'Nom',
            Value: lastName
        },
        {
            $Type: 'UI.DataField',
            Label: 'Téléphone',
            Value: phone
        },
        {
            $Type: 'UI.DataField',
            Label: 'Disponible',
            Value: available
        }
    ]
);

annotate service.CollectionPoints with @(
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Libellé',
            Value: label
        },
        {
            $Type: 'UI.DataField',
            Label: 'Adresse',
            Value: address
        },
        {
            $Type: 'UI.DataField',
            Label: 'Ville',
            Value: city
        }
    ]
);