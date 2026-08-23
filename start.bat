@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo   FleetOps AI - Autonomous Fleet Operations Platform
echo ================================================================
echo.

set "MODE=%~1"

if "%MODE%"=="" (
    echo Select launch mode:
    echo   [1] Local Dev Server (Python FastAPI + React Vite on :3000)
    echo   [2] Docker Container Stack (FastAPI + Bundled SPA on :8000)
    echo   [3] Enterprise Production Stack (Docker + PostgreSQL + Redis + Caddy)
    echo.
    set /p "CHOICE=Enter choice [1-3] (Default: 1): "
    if "!CHOICE!"=="2" set "MODE=docker"
    if "!CHOICE!"=="3" set "MODE=prod"
    if "!CHOICE!"=="" set "MODE=local"
    if "!CHOICE!"=="1" set "MODE=local"
)

if /i "%MODE%"=="docker" goto launch_docker
if /i "%MODE%"=="prod" goto launch_prod
goto launch_local

:launch_docker
echo.
echo [Docker] Launching Local Containerized Stack...
docker compose up --build
goto end

:launch_prod
echo.
echo [Docker Prod] Launching Full Production Stack with PostgreSQL, Redis, and Caddy...
docker compose -f docker-compose.prod.yml up --build -d
echo.
echo Production Stack Running in Background!
echo App: http://localhost:8000
echo Metrics: http://localhost:8000/api/metrics
echo Gateway: http://localhost
goto end

:launch_local
echo.
echo [Local Dev] Starting FastAPI Backend (Port 8000)...
start cmd /k "title FleetOps Backend && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

ping -n 3 127.0.0.1 >nul

echo [Local Dev] Starting React + MapLibre Frontend (Port 3000)...
start cmd /k "title FleetOps Frontend && cd frontend && npm run dev"

echo.
echo Systems initialized!
echo Dashboard UI: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
echo Prometheus Metrics: http://localhost:8000/api/metrics
echo.

:end
echo ================================================================
