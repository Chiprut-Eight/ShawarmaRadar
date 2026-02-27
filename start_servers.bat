@echo off
echo Starting ShawarmaRadar Local Environment...

echo [1/2] Starting Python Backend with Auto-Worker...
start "Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 >nul

echo [2/2] Starting React Frontend...
start "Frontend (Vite)" cmd /k "cd frontend && npm run dev -- --host"

echo Done! The website will be available at http://localhost:5173
echo You can keep these two black windows open to see live activity.
exit
