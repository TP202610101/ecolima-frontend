@echo off
REM ============================================================
REM  EcoLima - instalacion de dependencias (correr UNA vez)
REM  Instala: pip backend + ML API, npm frontend, DB Docker + migraciones + seeds
REM ============================================================
cd /d "%~dp0"

set PY=C:\Users\nikole.garcia\miniconda3\python.exe
if not exist "%PY%" set PY=python

echo.
echo [1/4] Dependencias Python del backend...
"%PY%" -m pip install -r "%~dp0..\ecolima-backend\requirements.txt"

echo.
echo [2/4] Dependencias Python de la API ML...
"%PY%" -m pip install -r "%~dp0..\ecolima-ml\requirements-api.txt"

echo.
echo [3/4] Dependencias del frontend (npm)...
call npm install

echo.
echo [4/4] Base de datos: Docker (puerto 5433) + migraciones + seeds...
docker compose -f "%~dp0..\ecolima-backend\docker-compose.yml" up -d db
if errorlevel 1 (
    echo [AVISO] Docker no disponible. Configura DATABASE_URL en ecolima-backend\.env
    echo         apuntando a tu Postgres y corre las migraciones a mano.
    goto fin
)
timeout /t 6 /nobreak >nul
pushd "%~dp0..\ecolima-backend"
"%PY%" -m alembic upgrade head
"%PY%" alembic\seeds\seed_districts.py
"%PY%" alembic\seeds\seed_admin.py
popd

:fin
echo.
echo Listo. Ahora puedes usar iniciar_ecolima.bat
pause
