# Validation fonctionnelle

Ce document sert de fiche de recette pour la soutenance. Les controles sont
effectues par le service CAP; les applications UI5 affichent les resultats et
rafraichissent leur modele OData apres chaque action.

## Parcours d'acces

| Etape | Action | Resultat attendu |
|---|---|---|
| 1 | Ouvrir l'URL de l'Application Router | La page d'accueil est affichee |
| 2 | Choisir un espace protege | La page de connexion est ouverte avec le retour memorise |
| 3 | Se connecter avec `planificateur` / `1234` | Le dashboard planificateur est affiche |
| 4 | Se connecter avec `superviseur` / `1234` | Le dashboard superviseur est affiche |
| 5 | Tenter d'ouvrir un espace d'un autre role | L'acces est refuse avec un message en francais |

## Planificateur

| Ecran | Action | Regle et synchronisation |
|---|---|---|
| Dashboard | Actualiser | Recharge tournees, feuilles de route, KPI, notifications et graphiques |
| Dashboard | Creer une tournee | Ouvre la liste Fiori et son action de creation |
| Tournees | Creer / modifier | Les champs obligatoires sont controles; les codes et statuts restent en lecture seule |
| Tournees | Creer une feuille de route | Une seule tournee validee et non affectee est acceptee; la liste est rafraichie |
| Feuilles de route | Affecter automatiquement | Selectionne les tournees validees du meme client et de la meme periode |
| Feuilles de route | Generer la feuille | Ouvre une feuille HTML imprimable sans bloquer la fenetre du navigateur |
| Toutes les listes | Retour | Revient au dashboard ou a l'ecran precedent |

## Superviseur

| Ecran | Action | Regle et synchronisation |
|---|---|---|
| Dashboard | Actualiser | Recharge KPI, historique, commandes SAP et notifications |
| Tournees | Valider | Accepte une ou plusieurs tournees au statut `CREATED` et rafraichit la liste |
| Tournees | Rejeter | Exige un motif, historise la decision et rafraichit la liste |
| Feuilles de route | Valider | Exige le statut `CREATED` et au moins une tournee affectee |
| Feuilles de route | Rejeter | Exige un motif et rafraichit la liste sans rechargement complet de la page |

## Regles de donnees

- Une tournee validee ou rejetee ne peut pas recevoir une seconde decision.
- Une tournee ne peut appartenir qu'a une seule feuille de route.
- Une feuille de route validee ou rejetee n'est plus modifiable par les actions metier.
- L'affectation automatique respecte le client, le mois, l'annee et la disponibilite.
- Les motifs de rejet sont obligatoires et conserves dans le suivi.
- Les statistiques planificateur utilisent l'auteur lorsque les donnees le permettent;
  les anciennes bases sans auteur restent compatibles.

## Verification technique avant deploiement

```bash
npx cds deploy --to sqlite::memory:
npx cds compile srv --to csn
npx cds build --production
npm run build --workspace=tours
npm run build --workspace=roadmaps
npm run build --workspace=supervisor-tours
npm run build --workspace=supervisor-roadmaps
npx mbt mtad-gen --platform cf --target gen/mtad-validation
```

Le guide de deploiement complet est dans
[`BAS_CLOUD_FOUNDRY_DEPLOYMENT.md`](BAS_CLOUD_FOUNDRY_DEPLOYMENT.md).
