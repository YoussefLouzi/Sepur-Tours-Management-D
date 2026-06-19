# Integration BAS et deploiement Cloud Foundry

Ce guide decrit l'import du projet dans SAP Business Application Studio (BAS),
son execution locale et son deploiement dans SAP BTP Cloud Foundry.

## 1. Prerequis BTP

- un subaccount SAP BTP avec Cloud Foundry active;
- une organisation et un espace `dev`;
- les entitlements `SAP HANA Schemas & HDI Containers` et `Destination`;
- un Dev Space BAS de type **Full Stack Cloud Application**;
- Node.js 22.18 ou plus recent;
- Cloud MTA Build Tool (`mbt`) et Cloud Foundry CLI avec le plugin multiapps.

Verifier les outils dans le terminal BAS:

```bash
node --version
npm --version
mbt --version
cf --version
cf plugins
```

Le plugin `multiapps` doit apparaitre. Sinon:

```bash
cf install-plugin -r CF-Community "MultiApps"
```

## 2. Importer le depot dans BAS

```bash
git clone https://github.com/YoussefLouzi/Sepur-Tours-Management-D.git
cd Sepur-Tours-Management-D
npm ci
cd approuter && npm ci && cd ..
```

La structure attendue est:

```text
frontend/    Applications UI5 et Fiori
srv/         Service CAP, regles metier, erreurs et annotations
db/          Modele CDS et donnees initiales
approuter/   Point d'entree Cloud Foundry
mta.yaml     Assemblage du deploiement
```

## 3. Executer dans BAS

```bash
npx cds deploy --to sqlite
npm run watch-home
```

L'accueil local est disponible a l'adresse affichee par BAS, avec le chemin
`/home/webapp/index.html`.

| Role | Utilisateur | Mot de passe |
|---|---|---|
| Planificateur | `youssef.louzi.plan@sepur.com` | `plan123` |
| Superviseur | `youssef.louzi.sup@sepur.com` | `sup123` |

## 4. Compiler et verifier

```bash
npx cds compile srv --to csn
npx cds build --production
npx mbt mtad-gen --platform cf --target gen/mtad-validation
```

Le build ne doit produire aucune erreur CDS. Les fichiers `gen/` sont generes
et ne doivent pas etre commits.

## 5. Connexion Cloud Foundry

```bash
cf api https://api.cf.us10-001.hana.ondemand.com
cf login --sso
cf target -o <ORGANISATION> -s dev
cf target
```

## 6. Construire et deployer

```bash
npm run build
cf deploy mta_archives/archive.mtar --retries 1
```

Le MTAR contient le service CAP, le deployer HDI, l'Application Router et les
huit applications frontend utilisees.

Suivre le deploiement:

```bash
cf apps
cf services
cf logs Sepur_tours_management-approuter --recent
cf logs Sepur_tours_management-srv --recent
```

## 7. URL finale

La route est fixee dans `mta.yaml`:

```text
https://b3754953trial-dev-sepur-tours-management-approuter.cfapps.us10-001.hana.ondemand.com
```

L'ouverture de cette URL sans chemin charge automatiquement
`/home/webapp/index.html` grace au `welcomeFile` de `approuter/xs-app.json`.

## 8. Controle apres deploiement

1. Ouvrir la route de l'Application Router.
2. Verifier que la page d'accueil apparait sans ajouter de chemin.
3. Ouvrir une fonction Planificateur et verifier la redirection vers le login.
4. Se connecter avec le compte Planificateur et verifier son dashboard.
5. Se deconnecter puis tester le compte Superviseur.
6. Creer un brouillon de tournee et verifier les champs obligatoires.
7. Verifier que le code, le statut et le motif de rejet sont non modifiables.
8. Valider et rejeter une tournee pour controler messages et historique.

## 9. Mise a jour ulterieure

```bash
git pull origin main
npm ci
cd approuter && npm ci && cd ..
npm run build
cf deploy mta_archives/archive.mtar --retries 1
```

## 10. Depannage

### La racine affiche une erreur 404

Verifier `welcomeFile` dans `approuter/xs-app.json` et la presence du module
`sepur-home-ui` dans `mta.yaml`.

### L'API OData ne repond pas

Verifier la destination dynamique `route-management-api` et les logs du module
`Sepur_tours_management-srv`.

### Le build MBT echoue sur Windows

GNU Make est requis. Construire le MTAR dans BAS est la solution recommandee.

### Une route est deja utilisee

```bash
cf routes
cf map-route Sepur_tours_management-approuter cfapps.us10-001.hana.ondemand.com \
  --hostname b3754953trial-dev-sepur-tours-management-approuter
```

Ne supprimer une route existante qu'apres avoir verifie qu'elle n'est pas
utilisee par une autre application.

## 11. Securite de production

Le login applicatif actuel convient a une demonstration PFE. Pour une mise en
production, remplacer cette session par SAP Cloud Identity Services et XSUAA,
puis appliquer les roles Planificateur et Superviseur directement aux actions
CAP. Ne jamais placer de secret ou de mot de passe dans le frontend.
