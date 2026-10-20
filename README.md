# SunuAdmin

Plateforme de dématérialisation des démarches administratives au Sénégal : **projet de conception indépendant**, non relié à une administration, à un registre national ou à un système de paiement public. Les données de démonstration sont fictives.

Stack : React + Vite + Tailwind (client), Express + Mongoose + MongoDB (serveur). Trois espaces : citoyen, agent, administrateur.

## Prérequis
Node.js 18+ ; MongoDB 7 (service local, ou `docker compose up -d`) ; PowerShell ou autre terminal.

## Installation (Windows / PowerShell)
```powershell
cd server
copy .env.example .env      # puis éditez .env : JWT_SECRET = une longue chaîne aléatoire
npm install
cd ..\client
npm install
```
Générer un secret : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Premier administrateur (aucun compte n'est créé automatiquement)
```powershell
cd server
$env:ADMIN_EMAIL = Read-Host "E-mail"        # une commande à la fois
$env:ADMIN_PASSWORD = Read-Host "Mot de passe (12 caractères minimum)"
npm run create-admin
Remove-Item Env:ADMIN_PASSWORD
```

## Données de démonstration (développement uniquement, facultatif)
```powershell
cd server
$env:DEMO_PASSWORD = Read-Host "Mot de passe démo (12 caractères minimum)"
npm run seed
Remove-Item Env:DEMO_PASSWORD
```
Crée des services et procédures « (démo) » ainsi que `agent.demo@sunuadmin.test` et `citoyen.demo@sunuadmin.test`. Refusé si `NODE_ENV=production`.

## Lancer
Deux fenêtres : `cd server; npm run dev` (API, port 5000) et `cd client; npm run dev` (http://localhost:5173). Ou, depuis la racine après `npm install` : `npm run dev`.

## Tests
`cd server; npm test` (5 tests unitaires + tests d'API sur la base `sunuadmin_test`, vidée à chaque lancement : le nom doit finir par `_test`).

## Documentation
`docs/architecture.md`, `docs/api.md`, `docs/security.md`, `docs/deployment.md`.
