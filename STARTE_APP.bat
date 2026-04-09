@echo off
echo ========================================
echo   MealDeal Web-App starten
echo ========================================
echo.

cd /d "C:\Users\job99\angebotskoch-v2"

echo Starte App im Browser...
echo.
echo ========================================
echo   Browser oeffnet auf localhost:5173
echo   Dieses Fenster NICHT schliessen!
echo ========================================
echo.

call npm run dev

pause
