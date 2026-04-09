@echo off
echo ========================================
echo   MealDeal App starten
echo ========================================
echo.

cd /d "C:\Users\job99\angebotskoch-v2\MealDeal\app"

:: Cache und kaputte node_modules loeschen
echo [1/3] Cache loeschen...
rmdir /s /q .expo 2>nul
rmdir /s /q node_modules\.cache 2>nul
rmdir /s /q node_modules\.bin 2>nul
echo Fertig.
echo.

:: Pakete installieren
echo [2/3] Pakete installieren...
call npm install 2>nul
echo Fertig.
echo.

echo [3/3] Starte MealDeal im Browser...
echo.
echo ========================================
echo   Browser oeffnet auf localhost:8081
echo   Dieses Fenster NICHT schliessen!
echo ========================================
echo.

call npx expo start --web --clear

pause
