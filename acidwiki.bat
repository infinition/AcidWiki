@echo off
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  Lance le wiki d'AcidWiki lui-meme (le contenu de wiki\ dans ce depot).
rem
rem    acidwiki.bat          port 8770
rem    acidwiki.bat 9000     autre port
rem
rem  Pour servir un coffre exterieur ou lancer les controles : check.bat
rem ---------------------------------------------------------------------------

set "PORT=%~1"
if not defined PORT set "PORT=8770"

where python >nul 2>&1
if errorlevel 1 (
    echo [ECHEC] python introuvable dans le PATH.
    pause
    exit /b 1
)

rem Sans catalogue, index.html le demande en 404 et la page s'affiche sans
rem aucun theme. Il est genere, donc absent d'un depot fraichement clone.
if not exist "wiki\themes.js" (
    echo Catalogue des themes absent, generation...
    where node >nul 2>&1
    if errorlevel 1 (
        echo [ECHEC] node introuvable : impossible de generer wiki\themes.js
        pause
        exit /b 1
    )
    node tools\build-themes.mjs
    echo.
)

echo AcidWiki sur http://127.0.0.1:%PORT%
echo Ctrl+C pour arreter.
echo.

python tools\serve.py --self --port %PORT%
