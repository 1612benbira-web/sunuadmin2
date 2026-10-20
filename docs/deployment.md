# Déploiement et sauvegarde

**État** : prévu pour le développement local. Rien n'a été déployé ni testé en production.

## Variables d'environnement (serveur)
`PORT`, `MONGODB_URI`, `JWT_SECRET` (long, aléatoire, jamais versionné), `CLIENT_ORIGIN` (origine exacte du site), `UPLOAD_DIR`, `NODE_ENV=production`. Aucun secret côté client.

## Construction
`cd client; npm run build` produit `client/dist`, à servir par un serveur web (HTTPS) qui relaie `/api` vers l'API : même origine, donc cookies et protection CSRF fonctionnent comme en développement. Si le front et l'API sont sur des sous-domaines différents, il faut revoir CORS, SameSite et l'en-tête CSRF.

## Sauvegarde MongoDB (exemple)
```powershell
mongodump --db sunuadmin --archive=sunuadmin.archive --gzip
mongorestore --archive=sunuadmin.archive --gzip --drop     # restauration : écrase la base
```
Sauvegarder aussi le dossier `UPLOAD_DIR` (les pièces ne sont pas dans MongoDB). Tester régulièrement une restauration.
