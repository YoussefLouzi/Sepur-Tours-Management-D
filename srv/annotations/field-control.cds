using RouteManagementService from '../route-management-service';

annotate RouteManagementService.Tours with {
    tourCode       @readonly;
    tourNumber     @readonly;
    status         @readonly;
    rejectionReason @readonly;
    updatedAt      @readonly;
    createdByName  @readonly;
    statusText     @readonly;
    scheduleStatus @readonly;
    scheduleStatusText @readonly;
    scheduleCriticality @readonly;
    canValidate @readonly;
    canReject @readonly;
    canComplete @readonly;

    tourDate       @Common.FieldControl: #Mandatory;
    zone           @Common.FieldControl: #Mandatory;
    collectionType @Common.FieldControl: #Mandatory;
    client         @Common.FieldControl: #Mandatory;
    quantity       @Common.FieldControl: #Mandatory;
    unitOfMeasure  @Common.FieldControl: #Mandatory;
};

annotate RouteManagementService.Roadmaps with {
    roadmapCode       @readonly;
    roadmapNumber     @readonly;
    status            @readonly;
    integrationStatus @readonly;
    sapSalesOrder     @readonly;
    integrationDate  @readonly;
    integrationMessage @readonly;
    rejectionReason  @readonly;
    startDate         @readonly;
    endDate           @readonly;
    updatedAt         @readonly;
    statusText        @readonly;
    scheduleStatus    @readonly;
    scheduleStatusText @readonly;
    scheduleCriticality @readonly;
    canValidate @readonly;
    canReject @readonly;
    canComplete @readonly;

    client            @Common.FieldControl: #Mandatory;
    month             @Common.FieldControl: #Mandatory;
    year              @Common.FieldControl: #Mandatory;
};

annotate RouteManagementService.Clients with {
    customerCode @Common.FieldControl: #Mandatory;
    name         @Common.FieldControl: #Mandatory;
};

annotate RouteManagementService.Vehicles with {
    registrationNumber @Common.FieldControl: #Mandatory;
    type               @Common.FieldControl: #Mandatory;
    capacity           @Common.FieldControl: #Mandatory;
};

annotate RouteManagementService.Drivers with {
    firstName @Common.FieldControl: #Mandatory;
    lastName  @Common.FieldControl: #Mandatory;
};

annotate RouteManagementService.CollectionPoints with {
    label   @Common.FieldControl: #Mandatory;
    address @Common.FieldControl: #Mandatory;
    city    @Common.FieldControl: #Mandatory;
    client  @Common.FieldControl: #Mandatory;
};
