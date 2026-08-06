@echo off
REM ============================================================
REM  EcoLima - arranque completo local
REM  Abre: DB (Docker), API ML (8001), Backend (8000), Frontend (5173)
REM  Requisito previo (una sola vez): instalar_dependencias.bat
REM ============================================================
cd /d "%~dp0"

set PY=C:\Users\nikole.garcia\miniconda3\python.exe
if not exist "%PY%" set PY=python

REM --- 1. Base de datos (Docker, puerto 5433). Si no hay Docker, se omite. ---
docker compose -f "%~dp0..\ecolima-backend\docker-compose.yml" up -d db 2>nul
if errorlevel 1 echo [AVISO] Docker no disponible: usando DATABASE_URL de ecolima-backend\.env tal cual.

REM --- 2. API ML (ecolima-ml, puerto 8001) ---
start "EcoLima ML API (8001)" cmd /k "cd /d %~dp0..\ecolima-ml && set PYTHONPATH=src&& %PY% -m uvicorn ml.api.app:app --port 8001"

REM --- 3. Backend (ecolima-backend, puerto 8000) ---
start "EcoLima Backend (8000)" cmd /k "cd /d %~dp0..\ecolima-backend && %PY% -m uvicorn main:app --reload --port 8000"

REM --- 4. Frontend (puerto 5173) ---
start "EcoLima Frontend (5173)" cmd /k "cd /d %~dp0 && npm run dev"

REM --- 5. Abrir navegador ---
timeout /t 8 /nobreak >nul
start "" http://localhost:5173
start "" http://localhost:8000/docs
exit
