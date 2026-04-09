@echo off
echo ========================================
echo   MealDeal — Edge Function deployen
echo ========================================
echo.

:: Supabase CLI installieren falls noetig
where supabase >nul 2>&1
if %errorlevel% neq 0 (
    echo Installiere Supabase CLI...
    call npm install -g supabase
    echo.
)

:: Login
echo Bitte bei Supabase einloggen:
call supabase login
echo.

:: Projekt verlinken
echo Verlinke Projekt...
call supabase link --project-ref wnmozcorrizjvrpduzgw
echo.

:: Secrets setzen (Marktguru Keys werden automatisch extrahiert,
:: aber als Backup koennen sie hier gesetzt werden)
:: supabase secrets set MARKTGURU_API_KEY=dein-key MARKTGURU_CLIENT_KEY=dein-key

:: Edge Function deployen
echo Deploye scrape-offers Function...
call supabase functions deploy scrape-offers
echo.

echo ========================================
echo   Fertig! Die Edge Function ist live.
echo ========================================
echo.
pause
