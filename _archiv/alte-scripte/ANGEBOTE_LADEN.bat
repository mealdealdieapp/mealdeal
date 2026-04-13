@echo off
echo ========================================
echo   MealDeal - Angebote laden
echo ========================================
echo.

cd /d "C:\Users\job99\angebotskoch-v2"

:: Node.js pruefen
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js nicht gefunden!
    echo.
    echo Bitte Node.js installieren:
    echo   1. Oeffne https://nodejs.org
    echo   2. Klick auf "Download"
    echo   3. Installieren
    echo   4. Dieses Fenster schliessen und nochmal starten
    echo.
    pause
    exit /b 1
)

echo Node.js gefunden!
echo.

:: Scraper starten
node scrape_angebote.cjs

pause
