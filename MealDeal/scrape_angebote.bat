@echo off
echo ========================================
echo   MealDeal — Angebote laden
echo ========================================
echo.

:: Python finden
set PYTHON_CMD=
python --version >nul 2>&1
if %errorlevel% equ 0 (set PYTHON_CMD=python& goto :run)
py --version >nul 2>&1
if %errorlevel% equ 0 (set PYTHON_CMD=py& goto :run)
python3 --version >nul 2>&1
if %errorlevel% equ 0 (set PYTHON_CMD=python3& goto :run)

echo Python nicht gefunden!
pause
exit /b 1

:run
set /p PLZ="Deine PLZ eingeben [56281]: "
if "%PLZ%"=="" set PLZ=56281

echo.
%PYTHON_CMD% scrape_angebote.py --plz %PLZ%

echo.
pause
