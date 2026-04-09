@echo off
echo ========================================
echo   MealDeal Setup
echo ========================================
echo.

:: Python pruefen - verschiedene Varianten
set PYTHON_CMD=
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :found
)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :found
)
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    goto :found
)

echo Python nicht gefunden! Bitte installiere Python von:
echo https://www.python.org/downloads/
echo.
echo WICHTIG: Bei der Installation "Add to PATH" ankreuzen!
pause
exit /b 1

:found
echo Python gefunden: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

:: Pakete installieren
echo [1/2] Installiere Pakete...
%PYTHON_CMD% -m pip install -r requirements.txt
echo.

:: Setup starten
echo [2/2] Starte MealDeal Setup...
echo.
%PYTHON_CMD% setup_mealdeal.py

echo.
pause
