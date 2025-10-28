# Backend

Simple JSON-file based backend for the website.

## Run locally

Open a terminal in `d:/app/website/backend` and run:

```powershell
npm install
npm start
```

The server will run on http://localhost:5000 and expose the following endpoints:

- GET /api — health check
- POST /api/signup — body: { username, email, password }
- POST /api/login — body: { email, password }
- POST /api/projects — body: { title, description, category, tags, owner }
- GET /api/projects
- POST /api/comments — body: { projectId, user, timecode, text }
- GET /api/comments/:projectId

Data is stored in `db.json` next to the server.
