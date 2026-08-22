@echo off
echo ===================================================
echo   FleetOps AI - Autonomous Fleet Operations System
echo ===================================================
echo Starting FastAPI Backend (Port 8000)...
start cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

ping -n 3 127.0.0.1 >nul

echo Starting React + MapLibre Frontend (Port 3000)...
start cmd /k "cd frontend && npm run dev"

echo.
echo Systems initialized!
echo UI: http://localhost:3000
echo API: http://localhost:8000/docs
echo ===================================================
