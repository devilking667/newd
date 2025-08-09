Dashboard (backend + static frontend) - Railway-ready ZIP
=======================================================

What this package contains:
- package.json         (Node.js deps with multer fixed)
- server.js            (Express + Socket.IO backend)
- data.json            (simple persistence file)
- uploads/             (uploaded media storage)
- public/              (static frontend files: index.html, style.css, script.js)

How to deploy on Railway (zero extra config):
1. Create a new GitHub repo and push the contents of this ZIP.
2. In Railway, New Project -> Deploy from GitHub -> choose this repo.
3. Railway will run 'npm ci' and then 'npm start' (server.js will run and serve the dashboard).
4. Visit the Railway URL to open the dashboard. The frontend is served from the same app.

Local run:
1. Node 18+ recommended
2. npm ci
3. npm start
4. Open http://localhost:3000

Notes:
- This package contains a simple in-memory + file backed store (data.json) — it's demo-ready.
- For production, secure uploads, add auth (JWT or similar), and use a proper database.
- multer dependency fixed to 1.4.5-lts.1 to avoid Railway build error.

