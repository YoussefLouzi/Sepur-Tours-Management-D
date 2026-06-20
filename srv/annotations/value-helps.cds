using RouteManagementService as service from '../route-management-service';

annotate service.Tours with {
    status @Common.ValueListWithFixedValues : true @Common.ValueList : {
        CollectionPath : 'TourStatuses',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : status, ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'label' }
        ]
    };

    scheduleStatus @Common.ValueListWithFixedValues : true @Common.ValueList : {
        CollectionPath : 'TourScheduleStatuses',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : scheduleStatus, ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'label' }
        ]
    };

    unitOfMeasure @Common.ValueListWithFixedValues : true @Common.ValueList : {
        CollectionPath : 'UnitsOfMeasure',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : unitOfMeasure, ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'label' }
        ]
    };
};

annotate service.Roadmaps with {
    status @Common.ValueListWithFixedValues : true @Common.ValueList : {
        CollectionPath : 'RoadmapStatuses',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : status, ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'label' }
        ]
    };

    scheduleStatus @Common.ValueListWithFixedValues : true @Common.ValueList : {
        CollectionPath : 'RoadmapScheduleStatuses',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : scheduleStatus, ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'label' }
        ]
    };

    integrationStatus @Common.ValueListWithFixedValues : true @Common.ValueList : {
        CollectionPath : 'IntegrationStatuses',
        Parameters : [
            { $Type : 'Common.ValueListParameterInOut', LocalDataProperty : integrationStatus, ValueListProperty : 'code' },
            { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'label' }
        ]
    };
};

annotate service.TourStatuses with @(
    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            { Property : code, AllowedExpressions : 'SingleValue' }
        ]
    },
    UI.LineItem : [
        { $Type : 'UI.DataField', Label : 'Code', Value : code },
        { $Type : 'UI.DataField', Label : 'Statut', Value : label }
    ]
) {
    code @Common.Text : label @Common.TextArrangement : #TextOnly;
};

annotate service.RoadmapStatuses with @(
    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            { Property : code, AllowedExpressions : 'SingleValue' }
        ]
    },
    UI.LineItem : [
        { $Type : 'UI.DataField', Label : 'Code', Value : code },
        { $Type : 'UI.DataField', Label : 'Statut', Value : label }
    ]
) {
    code @Common.Text : label @Common.TextArrangement : #TextOnly;
};

annotate service.TourScheduleStatuses with @(
    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            { Property : code, AllowedExpressions : 'SingleValue' }
        ]
    },
    UI.LineItem : [
        { $Type : 'UI.DataField', Label : 'Code', Value : code },
        { $Type : 'UI.DataField', Label : 'État temporel', Value : label }
    ]
) {
    code @Common.Text : label @Common.TextArrangement : #TextOnly;
};

annotate service.RoadmapScheduleStatuses with @(
    Capabilities.FilterRestrictions : {
        FilterExpressionRestrictions : [
            { Property : code, AllowedExpressions : 'SingleValue' }
        ]
    },
    UI.LineItem : [
        { $Type : 'UI.DataField', Label : 'Code', Value : code },
        { $Type : 'UI.DataField', Label : 'État temporel', Value : label }
    ]
) {
    code @Common.Text : label @Common.TextArrangement : #TextOnly;
};

annotate service.UnitsOfMeasure with @Capabilities.FilterRestrictions : {
    FilterExpressionRestrictions : [
        { Property : code, AllowedExpressions : 'SingleValue' }
    ]
} {
    code @Common.Text : label @Common.TextArrangement : #TextOnly;
};

annotate service.IntegrationStatuses with @Capabilities.FilterRestrictions : {
    FilterExpressionRestrictions : [
        { Property : code, AllowedExpressions : 'SingleValue' }
    ]
} {
    code @Common.Text : label @Common.TextArrangement : #TextOnly;
};
