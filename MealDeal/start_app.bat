@echo off
echo ========================================
echo   MealDeal — App starten
echo ========================================
echo.

cd app

:: Pruefen ob node_modules existiert
if not exist "node_modules" (
    echo Installiere Pakete... (das dauert beim ersten Mal etwas)
    call npm install
    echo.
)

echo Starte MealDeal App...
echo Scanne den QR-Code mit Expo Go auf deinem Handy!
echo.
call npx expo start

pause
