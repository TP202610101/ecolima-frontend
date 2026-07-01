@echo off
REM ============================================================
REM  EcoLima - datos DEMO para probar el flujo ML en local
REM  Inserta 250 zonas candidatas sinteticas y registra/activa
REM  la version de modelo "v1-local-demo".
REM  Requiere: DB levantada (iniciar_ecolima.bat o Docker corriendo).
REM ============================================================
cd /d "%~dp0"

set PY=C:\Users\nikole.garcia\miniconda3\python.exe
if not exist "%PY%" set PY=python

pushd "%~dp0..\ecolima-backend"
"%PY%" scripts\seed_demo_zones.py
popd

echo.
echo Siguiente paso: en el Panel ML presiona "Actualizar modelo desde
echo storage" y ejecuta la inferencia. Luego revisa Reportes.
pause
