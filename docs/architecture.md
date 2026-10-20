# Architecture

Client React (SPA) → API REST Express (`/api/v1`) → MongoDB (Mongoose). Authentification par cookie HttpOnly (JWT). Fichiers dans un stockage privé local (`server/uploads`, hors dossier public) derrière l'interface `services/storage.js`, remplaçable par un stockage objet. En développement, Vite relaie `/api` vers le port 5000 (même origine, pas de CORS).

Serveur : `routes/` (HTTP + contrôle d'accès), `services/` (workflow, statistiques, stockage), `middlewares/` (authentification, rôles), `models/` (Mongoose).

## Modèle de données
```mermaid
erDiagram
  USER ||--o{ APPLICATION_REQUEST : "dépose / traite"
  PROCEDURE ||--o{ APPLICATION_REQUEST : "définit"
  ADMINISTRATIVE_SERVICE ||--o{ PROCEDURE : "responsable de"
  ADMINISTRATIVE_SERVICE }o--o{ USER : "agents rattachés"
  APPLICATION_REQUEST ||--o{ DOCUMENT : "pièces"
  USER ||--o{ NOTIFICATION : "reçoit"
  USER ||--o{ AUDIT_LOG : "agit"
```
`APPLICATION_REQUEST` contient l'historique des transitions et un instantané de la procédure figé à la soumission.

## Workflow des dossiers
BROUILLON → SOUMIS → (EN_ATTENTE) → EN_COURS → COMPLEMENT_REQUIS ↔ EN_COURS → ACCEPTE | REJETE → CLOTURE. Transitions, rôles et motifs obligatoires : `server/src/services/workflow.js` (vérifiés côté serveur).
```mermaid
sequenceDiagram
  Citoyen->>API: POST /requests (brouillon) puis /documents
  Citoyen->>API: PATCH /requests/:id/status SOUMIS
  API->>MongoDB: référence unique, instantané, historique, audit
  Admin->>API: POST /requests/:id/assign (agent du service)
  Agent->>API: PATCH status EN_COURS / COMPLEMENT_REQUIS / ACCEPTE / REJETE (motif)
  API-->>Citoyen: notification
```
Indicateurs : dossiers soumis = hors brouillons ; délai moyen = soumission → décision (ACCEPTE/REJETE) sur les dossiers ayant les deux dates ; sans donnée, la valeur est `null`.
