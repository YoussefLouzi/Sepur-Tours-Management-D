# SEPUR - Gestion des tournees et feuilles de route

Application SAP CAP / Fiori pour la digitalisation des tournees de collecte et
la gestion des feuilles de route.

## Demarrage local

Prerequis: Node.js 22.18+ et les dependances installees avec `npm install`.
Le build MTAR demande aussi GNU Make; SAP Business Application Studio et la
plupart des environnements Linux le fournissent. Sous Windows, installez Make
ou executez le build depuis BAS.

```bash
npx cds deploy --to sqlite
npm run watch-home
```

Applications disponibles apres `cds watch`:

| Application | URL |
|---|---|
| Accueil | http://localhost:4004/home/webapp/index.html |
| Connexion | http://localhost:4004/login/webapp/index.html |
| Dashboard Planificateur | http://localhost:4004/planner-dashboard/webapp/index.html |
| Dashboard Superviseur | http://localhost:4004/supervisor-dashboard/webapp/index.html |
| Tournees | http://localhost:4004/tours/webapp/index.html |
| Feuilles de route | http://localhost:4004/roadmaps/webapp/index.html |
| API OData | http://localhost:4004/odata/v4/route-management/ |

## Parcours utilisateur

1. L'utilisateur arrive sur l'accueil public.
2. Une tuile protegee redirige vers la connexion en conservant la destination.
3. Le backend verifie les identifiants et l'etat actif du compte.
4. Le planificateur arrive dans son dashboard de planification.
5. Le superviseur arrive dans son dashboard de validation.

## Comptes de demonstration

| Nom d'utilisateur | E-mail | Variable du mot de passe | Role |
|---|---|---|---|
| `planificateur` | `youssef.louzi.plan@sepur.com` | `DEMO_PLANNER_PASSWORD` | PLANIFICATEUR |
| `superviseur` | `youssef.louzi.sup@sepur.com` | `DEMO_SUPERVISOR_PASSWORD` | SUPERVISEUR |

En developpement local/BAS, les comptes de demonstration acceptent tout mot de
passe non vide. Pour tester avec des mots de passe fixes, configurer:

```bash
export DEMO_PLANNER_PASSWORD='<mot-de-passe-planificateur>'
export DEMO_SUPERVISOR_PASSWORD='<mot-de-passe-superviseur>'
npm run watch-home
```

L'entite `Users` n'est pas exposee par l'API OData et aucun mot de passe n'est
publie dans le depot.

## Architecture

```text
app/         Frontend UI5/Fiori uniquement
srv/         API OData, controles et regles metier
db/          Modele CDS et donnees initiales
approuter/   Point d'entree du deploiement Cloud Foundry
```

Les controleurs presents dans `app/` sont des controleurs UI5 de presentation,
pas des controleurs backend. La description complete est disponible dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Le guide complet BAS et Cloud Foundry est disponible dans
[`docs/BAS_CLOUD_FOUNDRY_DEPLOYMENT.md`](docs/BAS_CLOUD_FOUNDRY_DEPLOYMENT.md).

## Build et deploiement BTP

```bash
npm run build
cf deploy mta_archives/archive.mtar --retries 1
```

Le `mta.yaml` construit la base HANA, le service CAP, les huit interfaces et
l'Application Router. `approuter/xs-app.json` centralise les routes frontend,
SAPUI5 et OData.

Apres deploiement, l'URL suivante ouvre directement la page d'accueil:

`https://b3754953trial-dev-sepur-tours-management-approuter.cfapps.us10-001.hana.ondemand.com`

Pour une production reelle, remplacer la session applicative de demonstration
par XSUAA/IAS et mapper les roles Planificateur et Superviseur.
