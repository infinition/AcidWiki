@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  AcidWiki - controles et lancement local
rem
rem  Usage :
rem    check.bat                    controles, puis sert le wiki du depot
rem    check.bat "D:\Mon Coffre"    controles, puis sert ce coffre
rem    check.bat --check            controles seulement, ne lance rien
rem    check.bat --sync "D:\cible"  controles, puis met a jour un deploiement
rem ---------------------------------------------------------------------------

set "ECHEC=0"
set "MODE=serve"
set "CIBLE="

if /i "%~1"=="--check" set "MODE=check"
if /i "%~1"=="--sync"  ( set "MODE=sync" & set "CIBLE=%~2" )
if not defined CIBLE if /i not "%~1"=="--check" if /i not "%~1"=="--sync" set "CIBLE=%~1"

echo.
echo ===========================================
echo   AcidWiki - controles
echo ===========================================
echo.

rem --- outils requis -----------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ECHEC] node introuvable dans le PATH.
    echo         Les controles et la generation du catalogue en dependent.
    exit /b 1
)
where python >nul 2>&1
if errorlevel 1 (
    echo [ECHEC] python introuvable dans le PATH.
    echo         Le serveur local en depend.
    exit /b 1
)

rem --- 1. catalogue des themes -------------------------------------------
echo [1/4] Catalogue des themes
node tools\build-themes.mjs
if errorlevel 1 ( echo       ^-^-^> ECHEC & set "ECHEC=1" ) else ( echo       ^-^-^> ok )
echo.

rem --- 2. syntaxe ---------------------------------------------------------
echo [2/4] Syntaxe des fichiers du moteur
node tools\check-syntax.mjs
if errorlevel 1 ( echo       ^-^-^> ECHEC & set "ECHEC=1" ) else ( echo       ^-^-^> ok )
echo.

rem --- 3. tests des modules ----------------------------------------------
echo [3/4] Tests des modules ^(obsidian, quizz, flashcards^)
node tools\test-modules.mjs
if errorlevel 1 ( echo       ^-^-^> ECHEC & set "ECHEC=1" ) else ( echo       ^-^-^> ok )
echo.

rem --- 4. coherence de la synchronisation ---------------------------------
rem  La liste des fichiers du moteur est deduite d'index.html : ce controle
rem  signale une ressource referencee mais absente du depot, qui partirait en
rem  404 chez le deploiement sans rien casser ici.
echo [4/4] Coherence du moteur
node tools\sync-engine.mjs --check
if errorlevel 1 ( echo       ^-^-^> ECHEC & set "ECHEC=1" ) else ( echo       ^-^-^> ok )
echo.

if "%ECHEC%"=="1" (
    echo ===========================================
    echo   Au moins un controle a echoue.
    echo ===========================================
    exit /b 1
)

echo ===========================================
echo   Tous les controles passent.
echo ===========================================
echo.

if /i "%MODE%"=="check" exit /b 0

if /i "%MODE%"=="sync" (
    if not defined CIBLE (
        echo [ECHEC] --sync attend un dossier de destination.
        exit /b 1
    )
    echo Apercu de la synchronisation vers "%CIBLE%" :
    echo.
    node tools\sync-engine.mjs --target "%CIBLE%" --dry-run
    if errorlevel 1 exit /b 1
    echo.
    set /p "REPONSE=Appliquer ces changements ? [o/N] "
    if /i not "!REPONSE!"=="o" ( echo Abandon, rien n'a ete modifie. & exit /b 0 )
    node tools\sync-engine.mjs --target "%CIBLE%"
    exit /b !errorlevel!
)

rem --- lancement ----------------------------------------------------------
if defined CIBLE (
    echo Coffre : "%CIBLE%"
    python tools\serve.py --vault "%CIBLE%"
) else (
    echo Coffre : le wiki du depot ^(aucun chemin fourni^)
    python tools\serve.py
)

endlocal
