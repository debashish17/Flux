# Flux: AI Document Authoring Platform

Flux is a full-stack application for creating, editing, and managing documents and presentations with AI assistance. It features a modern React frontend and a FastAPI backend, integrating advanced AI content generation and real-time LaTeX/Markdown preview.

## Features
- AI-powered content generation (Google Gemini)
- Real-time LaTeX and Markdown preview
- Project and document management
- Presentation and document editors
- User authentication and secure API

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI, Prisma, Google Generative AI, Python
- **Database:** Prisma ORM (SQLite/Postgres)

## Getting Started
1. Clone the repository
2. Install dependencies in both `backend` and `frontend`
3. Set up environment variables (`.env` files)
4. Run backend and frontend servers

## Development
- Frontend: `cd frontend && npm install && npm run dev`
- Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`

## License
MIT License
