# Architecture SEPUR Tours Management

## Separation des responsabilites

```text
Navigateur
    |
    v
approuter/                 Point d'entree unique en production
    |-- /home, /login      Interfaces publiques
    |-- /...-dashboard     Interfaces propres aux roles
    `-- /odata             Proxy vers le service CAP
              |
              v
srv/                       API OData et regles metier
    |-- *.cds              Contrat public
    |-- *.js               Validations et workflow
    `-- handlers/          Cas d'utilisation isoles
              |
              v
db/                        Modele persistant et donnees initiales
```

`app/` contient exclusivement le frontend UI5/Fiori. Les fichiers
`*.controller.js` qui s'y trouvent sont des controleurs de presentation: ils
gerent les clics, la navigation, les modeles de vue et les messages. Ils ne
doivent contenir ni requete SQL, ni regle de statut, ni acces direct a la base.

`srv/` est le backend. Toute validation metier doit etre repetee ici, meme si
le frontend masque une action. `db/` n'est jamais appele directement par le
navigateur.

## Parcours fonctionnel

1. `/` ouvre `/home/webapp/index.html`.
2. L'accueil presente les espaces Planificateur et Superviseur.
3. Une action protegee envoie vers `/login/webapp/index.html`.
4. Le backend verifie le mot de passe chiffre et retourne le profil actif.
5. Le role determine le dashboard et les ecrans accessibles.
6. Toutes les donnees metier passent par `/odata/v4/route-management/`.

## Deploiement Cloud Foundry

Le module `Sepur_tours_management-approuter` embarque les huit applications
UI5 utiles. Il sert leurs fichiers statiques et transmet `/odata` au module
CAP via la destination `route-management-api`. La destination `ui5` fournit
les bibliotheques SAPUI5.

Le dashboard `supervisor-dashboard-fiori` reste dans le depot comme prototype,
mais il n'est pas inclus dans le MTAR afin d'eviter deux interfaces superviseur
concurrentes.

Commandes:

```bash
npm run build
cf deploy mta_archives/archive.mtar --retries 1
```

Pour une mise en production au-dela d'une soutenance, remplacer la session
applicative de demonstration par les roles XSUAA/IAS. Les mots de passe ne sont
plus exposes par OData et sont stockes sous forme de hash scrypt.
