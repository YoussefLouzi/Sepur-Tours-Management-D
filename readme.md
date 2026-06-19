# SEPUR — Gestion des tournées de collecte et roadmaps

Application **SAP CAP / Fiori** pour la digitalisation des tournées de collecte et la gestion des roadmaps (PFE I59).

## Prérequis

- Node.js 18+
- `@sap/cds-dk` (installé via `npm install`)

## Démarrage local (SQLite)

```bash
npm install
npm add @cap-js/sqlite -D
cds deploy --to sqlite
cds watch
```

> **Windows :** si `better-sqlite3` échoue au déploiement, exécutez `npm rebuild better-sqlite3` (nécessite les outils C++ Visual Studio) ou utilisez **SAP Business Application Studio**, où SQLite est préconfiguré.

Applications disponibles (après `cds watch`) :

| Application | URL |
|-------------|-----|
| Accueil | http://localhost:4004/home/webapp/index.html |
| Connexion | http://localhost:4004/login/webapp/index.html |
| Dashboard Planificateur | http://localhost:4004/planner-dashboard/webapp/index.html |
| Dashboard Superviseur | http://localhost:4004/supervisor-dashboard/webapp/index.html |
| Tournées (Fiori Elements) | http://localhost:4004/tours/webapp/index.html |
| Roadmaps (Fiori Elements) | http://localhost:4004/roadmaps/webapp/index.html |
| API OData | http://localhost:4004/odata/v4/route-management/ |

## Parcours utilisateur

1. L'utilisateur arrive sur l'accueil public `/home/webapp/index.html`.
2. Les tuiles protégées redirigent vers `/login/webapp/index.html?redirect=...` si aucune session n'est active.
3. Après connexion, l'utilisateur revient vers la page demandée ou vers son dashboard par défaut.
4. Le planificateur accède aux dashboards de planification, tournées et roadmaps.
5. Le superviseur accède aux dashboards de supervision, validation des tournées et validation des roadmaps.

## Séparation front / back

- `db/` contient le modèle métier CDS et les données CSV.
- `srv/route-management-service.cds` expose le contrat OData, les actions et les types de retour.
- `srv/route-management-service.js` porte les règles métier : statuts, validation, rejet, génération de codes, statistiques et feuilles de route.
- `srv/handlers/login-handler.js` isole la logique d'authentification applicative.
- `app/` contient uniquement les applications UI5/Fiori : navigation, affichage, messages utilisateur et appels OData.
- Les règles métier critiques restent vérifiées côté backend même si le front masque ou désactive certaines actions.

## Comptes de test

| Utilisateur | Mot de passe | Rôle |
|-------------|--------------|------|
| `oussama.benkacem.plan@sepur.com` | `plan123` | PLANIFICATEUR |
| `oussama.benkacem.sup@sepur.com` | `sup123` | SUPERVISEUR |

## Architecture

```
db/          Modèle CDS + données CSV
srv/         RouteManagementService (CDS + logique métier JS)
app/         login, planner-dashboard, supervisor-dashboard, tours, roadmaps
```

## Production BTP (futur)

- `mta.yaml` et `xs-security.json` conservés pour déploiement Cloud Foundry
- Basculer `cds.requires.db.kind` vers `hana` en production
- Remplacer l’action `login` par **XSUAA** et rôles IAS
