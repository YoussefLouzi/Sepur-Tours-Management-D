// =====================================================
// APP TOURS - LOCAL ANNOTATIONS
// =====================================================
//
// Les annotations principales de l'entité Tours sont déjà définies
// côté service CAP dans srv/annotations.cds ou srv/route-management-service.cds.
//
// Ce fichier est volontairement laissé sans annotation active afin
// d'éviter les erreurs de duplication :
// - @UI.HeaderInfo
// - @UI.SelectionFields
// - @UI.LineItem
// - @UI.Facets
// - @UI.FieldGroup
//
// L'application app/tours consomme les annotations exposées par le service
// /odata/v4/route-management/ directement depuis le backend.