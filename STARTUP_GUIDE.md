# FLUX Startup Guide

How to run the Flux application. Assumes you've already installed dependencies once (see [README.md](./README.md) for first-time install).

---

## Start the App

You need **two terminals** running side by side.

### Terminal 1 — Backend

```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```

> **macOS / Linux / Git Bash:** use `source venv/Scripts/activate` (Windows venv) or `source venv/bin/activate`.

Backend is up when you see `Uvicorn running on http://127.0.0.1:8000`.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Frontend is up when you see `Local: http://localhost:5173/`.

### Open the app

Visit **http://localhost:5173** in your browser and log in.

---

## URLs

| What | URL |
|------|-----|
| App | http://localhost:5173 |
| Backend API | http://127.0.0.1:8000 |
| API docs (Swagger) | http://127.0.0.1:8000/docs |

---

## Stop the App

Press `Ctrl+C` in each terminal.

---

## If Something Goes Wrong

| Problem | Fix |
|---------|-----|
| `uvicorn: command not found` | Activate the venv first (`venv\Scripts\activate`). |
| `prisma client not generated` | Run `prisma generate` inside `backend/` with venv active. |
| `Port 8000 already in use` | Use `--port 8001` and update `VITE_API_URL` in `frontend/.env`. |
| `Port 5173 already in use` | Run `npm run dev -- --port 5174`. |
| Frontend shows `Network Error` | Backend isn't running, or wrong URL. Check Terminal 1. |
| `GEMINI_API_KEY` errors | Check `backend/.env` is filled in, restart the backend. |
| Database connection error | Check `DATABASE_URL` in `backend/.env`. |

For full installation steps, deployment, and troubleshooting, see [README.md](./README.md) and [docs/DEPLOY_GUIDE.md](./docs/DEPLOY_GUIDE.md).
