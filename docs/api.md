# API REST (`/api/v1`)

Écritures : en-tête `X-Requested-With: sunuadmin` obligatoire (protection CSRF). Réponses d'erreur : `{ "message": "..." }`. Listes paginées : `?page=&limit=` → `{ data, page, total }`.
Codes : 200, 201, 204, 401, 403, 404 (aussi pour un dossier d'autrui), 409 (conflit, transition interdite), 413, 415, 422, 429, 500.

| Méthode et chemin | Rôles | Rôle de la route |
|---|---|---|
| POST /auth/register, /auth/login | public | inscription citoyen, connexion |
| POST /auth/logout | tous | déconnexion, révocation du jeton |
| GET /auth/me ; PATCH /auth/me | connecté | profil ; modifier nom, prénom |
| POST /auth/password | connecté | changer le mot de passe (ferme les autres sessions) |
| GET /procedures, /procedures/:id | public | catalogue des procédures actives (`q`, `categorie`) |
| GET /procedures/admin/all | ADMIN | toutes les procédures |
| POST /procedures ; PATCH /procedures/:id | ADMIN | créer ; modifier, activer/désactiver (version incrémentée si contenu modifié) |
| GET /services | connecté | services (tous pour l'admin) |
| POST /services ; PATCH /services/:id | ADMIN | créer ; modifier, désactiver |
| GET /users, /users/:id ; POST /users | ADMIN | lister, lire, créer un agent ou citoyen |
| PATCH /users/:id ; PATCH /users/:id/status | ADMIN | nom, prénom, services de l'agent ; activer/désactiver |
| GET /requests | connecté | dossiers visibles (citoyen : les siens ; agent : les siens attribués ; admin : tous) ; `?statut=` |
| POST /requests | CITOYEN | créer un brouillon (`procedure`, `reponses`) |
| GET /requests/stats/me | AGENT | statistiques personnelles |
| GET /requests/:id ; GET /requests/:id/history | propriétaire, agent affecté, admin | détail ; historique |
| PATCH /requests/:id/status | selon transition | `{ statut, motif }` |
| POST /requests/:id/assign | ADMIN | `{ agent }` (l'agent doit être rattaché au service de la démarche) |
| POST /requests/:id/documents ; GET /requests/:id/documents | propriétaire (envoi) ; ayant droit (liste) | pièce `fichier` (PDF, PNG, JPEG, 4 Mo) |
| GET /documents/:id, /documents/:id/download | ayant droit | métadonnées ; téléchargement |
| PATCH /documents/:id/verification | AGENT, ADMIN | `{ verification: VALIDE\|REFUSE }` |
| GET /notifications ; PATCH /notifications/read-all, /:id/read | connecté | notifications personnelles |
| GET /admin/dashboard, /admin/statistics?jours= ; GET /admin/audit-logs | ADMIN | indicateurs, tendances (max 90 jours), journal (`action`) |

**Non implémenté** : PATCH /requests/:id (le formulaire est fixé à la création du brouillon), POST /requests/:id/complements (le complément passe par dépôt de pièces puis statut EN_COURS), /auth/refresh, DELETE (désactivation logique uniquement), /admin/reports, spécification OpenAPI.
