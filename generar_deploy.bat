@echo off
chcp 65001 >nul
title Empaquetando modulos de produccion — Sitios Hidalgo
setlocal EnableDelayedExpansion

set "RAIZ=%~dp0"
set "OUT=%RAIZ%_DEPLOY"

echo.
echo  =====================================================
echo   SITIOS HIDALGO A.C. — Empaquetado de Produccion
echo   Base Central  /  Conductor  /  App Usuario
echo  =====================================================
echo.

:: Limpiar y crear carpeta de salida
if exist "%OUT%" rd /s /q "%OUT%"
mkdir "%OUT%"

:: ══════════════════════════════════════════════════════
:: MODULO 1 — BASE CENTRAL
:: Destino: base.shidalgogps.com
:: ══════════════════════════════════════════════════════
echo [1/3] Empaquetando BASE CENTRAL...

set "TMP=%OUT%\tmp_base"
mkdir "%TMP%"
mkdir "%TMP%\public"

copy "%RAIZ%base\index.html"                    "%TMP%\"         >nul
copy "%RAIZ%base\sos-base.js"                   "%TMP%\"         >nul
copy "%RAIZ%base\panel-calificaciones-base.js"  "%TMP%\"         >nul
copy "%RAIZ%base\geocercas.js"                  "%TMP%\"         >nul
copy "%RAIZ%base\.htaccess"                     "%TMP%\"         >nul
copy "%RAIZ%base\public\track.html"             "%TMP%\public\"  >nul

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%TMP%\*' -DestinationPath '%OUT%\BASE_CENTRAL.zip' -Force"

rd /s /q "%TMP%"
echo     OK ^> _DEPLOY\BASE_CENTRAL.zip


:: ══════════════════════════════════════════════════════
:: MODULO 2 — CONDUCTOR
:: Destino: conductor.shidalgogps.com
:: ══════════════════════════════════════════════════════
echo [2/3] Empaquetando CONDUCTOR...

set "TMP=%OUT%\tmp_conductor"
mkdir "%TMP%"
mkdir "%TMP%\js"

copy "%RAIZ%conductor\index.html"              "%TMP%\"    >nul
copy "%RAIZ%conductor\manifest.json"           "%TMP%\"    >nul
copy "%RAIZ%conductor\sw.js"                   "%TMP%\"    >nul
copy "%RAIZ%conductor\sw-conductor.js"         "%TMP%\"    >nul
copy "%RAIZ%conductor\.htaccess"               "%TMP%\"    >nul
copy "%RAIZ%conductor\js\firebase-config.js"   "%TMP%\js\" >nul
copy "%RAIZ%conductor\js\gps.js"               "%TMP%\js\" >nul
copy "%RAIZ%conductor\js\ui.js"                "%TMP%\js\" >nul
copy "%RAIZ%conductor\js\sos.js"               "%TMP%\js\" >nul
copy "%RAIZ%conductor\js\viaje.js"             "%TMP%\js\" >nul

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%TMP%\*' -DestinationPath '%OUT%\CONDUCTOR.zip' -Force"

rd /s /q "%TMP%"
echo     OK ^> _DEPLOY\CONDUCTOR.zip


:: ══════════════════════════════════════════════════════
:: MODULO 3 — APP USUARIO
:: Destino: shidalgogps.com (dominio principal)
:: ══════════════════════════════════════════════════════
echo [3/3] Empaquetando APP USUARIO...

set "TMP=%OUT%\tmp_usuario"
mkdir "%TMP%"
mkdir "%TMP%\css"
mkdir "%TMP%\js"
mkdir "%TMP%\config"
mkdir "%TMP%\assets"

copy "%RAIZ%APP_USUARIO\index.html"               "%TMP%\"         >nul
copy "%RAIZ%APP_USUARIO\sw.js"                    "%TMP%\"         >nul
copy "%RAIZ%APP_USUARIO\sw-usuario.js"            "%TMP%\"         >nul
copy "%RAIZ%APP_USUARIO\.htaccess"                "%TMP%\"         >nul
copy "%RAIZ%APP_USUARIO\css\styles.css"           "%TMP%\css\"     >nul
copy "%RAIZ%APP_USUARIO\js\app.js"                "%TMP%\js\"      >nul
copy "%RAIZ%APP_USUARIO\js\mapa.js"               "%TMP%\js\"      >nul
copy "%RAIZ%APP_USUARIO\js\utils.js"              "%TMP%\js\"      >nul
copy "%RAIZ%APP_USUARIO\js\sos.js"                "%TMP%\js\"      >nul
copy "%RAIZ%APP_USUARIO\js\rating.js"             "%TMP%\js\"      >nul
copy "%RAIZ%APP_USUARIO\js\notifications.js"      "%TMP%\js\"      >nul
copy "%RAIZ%APP_USUARIO\config\firebase.js"       "%TMP%\config\"  >nul
copy "%RAIZ%APP_USUARIO\config\bases.js"          "%TMP%\config\"  >nul
copy "%RAIZ%APP_USUARIO\assets\logo.png"          "%TMP%\assets\"  >nul
copy "%RAIZ%APP_USUARIO\assets\logo-small.png"    "%TMP%\assets\"  >nul
copy "%RAIZ%APP_USUARIO\assets\logo-header.png"   "%TMP%\assets\"  >nul

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%TMP%\*' -DestinationPath '%OUT%\USUARIO.zip' -Force"

rd /s /q "%TMP%"
echo     OK ^> _DEPLOY\USUARIO.zip


:: ══════════════════════════════════════════════════════
:: RESULTADO FINAL
:: ══════════════════════════════════════════════════════
echo.
echo  =====================================================
echo   LISTO. Tres archivos ZIP en:
echo   %OUT%\
echo.
echo   BASE_CENTRAL.zip  →  base.shidalgogps.com
echo   CONDUCTOR.zip     →  conductor.shidalgogps.com
echo   USUARIO.zip       →  shidalgogps.com
echo  =====================================================
echo.

:: Abrir la carpeta automaticamente
explorer "%OUT%"
pause
