# Frontend UI5/Fiori

Ce dossier contient uniquement les applications executees dans le navigateur.

## Autorise

- controleurs UI5 de presentation;
- vues XML, manifests, styles et traductions;
- navigation et etat visuel;
- appels au contrat OData public;
- affichage des messages retournes par le backend.

## Interdit

- requetes SQL ou acces direct a la base;
- calcul d'un statut metier faisant autorite;
- validation de securite uniquement cote navigateur;
- mots de passe, secrets ou configuration Cloud Foundry;
- duplication d'une regle implementee dans `srv/`.

Les fichiers JavaScript sont necessaires au runtime UI5. Ils restent ici parce
qu'un navigateur ne peut pas executer les handlers Node.js de `srv/`. Toutes
les decisions metier et tous les controles de securite restent toutefois dans
le backend.

## Erreurs

Le frontend affiche le message OData fourni par le service. Le backend retourne
un statut HTTP et un code stable, par exemple `VALIDATION_ERROR`,
`AUTHENTICATION_FAILED`, `FORBIDDEN`, `NOT_FOUND` ou `INTERNAL_ERROR`.
