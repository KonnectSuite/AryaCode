@echo off
rem ---------------------------------------------------------------------------
rem  AryaCode dev launcher
rem
rem  Usage:  AryaCode-dev.bat            start the Electron desktop app in dev
rem          AryaCode-dev.bat web        start the web GUI in a browser instead
rem          AryaCode-dev.bat check      verify node, pnpm and the checkout only
rem
rem  Override the checkout with:  set ARYACODE_REPO=D:\path\to\AryaCode
rem ---------------------------------------------------------------------------
setlocal EnableExtensions EnableDelayedExpansion

set "MODE=%~1"
if "%MODE%"=="" set "MODE=desktop"

set "REPO=%ARYACODE_REPO%"
if "%REPO%"=="" set "REPO=C:\Users\KNPhu\.arya\github\KonnectSuite\AryaCode"

echo.
echo   AryaCode dev launcher  (mode: %MODE%)
echo   repo: %REPO%
echo.

if not exist "%REPO%\package.json" (
  echo   [X] No package.json at "%REPO%".
  echo       Set ARYACODE_REPO to the AryaCode checkout and try again.
  goto :fail
)

rem --- prerequisites -------------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo   [X] Node.js not found on PATH. Install Node ^>= 24.9.0.
  goto :fail
)
for /f "delims=" %%v in ('node --version') do set "NODEV=%%v"
echo   [ok] node !NODEV!   (package requires ^>= 24.9.0)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo   [X] pnpm not found on PATH. Install it with:  npm i -g pnpm
  goto :fail
)
for /f "delims=" %%v in ('pnpm --version') do set "PNPMV=%%v"
echo   [ok] pnpm !PNPMV!   (repo declares pnpm@11.28.5)

git -C "%REPO%" rev-parse --abbrev-ref HEAD >"%TEMP%\aryacode-branch.txt" 2>nul
if not errorlevel 1 (
  set /p BRANCH=<"%TEMP%\aryacode-branch.txt"
  echo   [ok] branch !BRANCH!
  del "%TEMP%\aryacode-branch.txt" >nul 2>&1
) else (
  echo   [!] not a git checkout - continuing anyway
)

if /i "%MODE%"=="check" (
  echo.
  echo   [i] inherited DSH_HOME: "!DSH_HOME!"
  echo   [ok] would isolate this run to: "%LOCALAPPDATA%\AryaCode-dev\home"
  echo   Check mode: prerequisites look fine. Nothing was installed or started.
  goto :done
)

rem --- isolation -----------------------------------------------------------
rem  DSH keeps every profile, plugin and session under DSH_HOME, and this
rem  machine has DSH_HOME set at user level. Inheriting it would point the dev
rem  run at data the installed instance also uses, so this run gets its own
rem  root and touches nothing outside it.
set "INHERITED_HOME=!DSH_HOME!"
set "DEVHOME=%LOCALAPPDATA%\AryaCode-dev\home"
set "DSH_HOME=%DEVHOME%"
if not exist "%DEVHOME%" mkdir "%DEVHOME%" >nul 2>&1
echo.
echo   [i] inherited DSH_HOME: "!INHERITED_HOME!"
echo   [ok] this run is isolated to: "!DSH_HOME!"
echo        profiles, plugins and sessions stay out of the installed instance
echo   [i] Electron userData for dev is kept inside the checkout by
echo        apps/desktop/scripts/dev.ts (override: DSH_DESKTOP_USER_DATA_DIR)

rem --- dependencies --------------------------------------------------------
if not exist "%REPO%\node_modules" (
  echo.
  echo   [..] node_modules is missing. First install, this takes several minutes.
  pushd "%REPO%"
  call pnpm install --prefer-offline
  if errorlevel 1 (
    popd
    echo.
    echo   [X] pnpm install failed. Scroll up for the first error.
    goto :fail
  )
  popd
  echo   [ok] dependencies installed
) else (
  echo   [ok] node_modules present
)

rem --- build artifacts ------------------------------------------------------
rem  pnpm install only links workspace packages; it does not compile them. The
rem  desktop host imports built libraries (dsh-app-boot/lib/index.js and its
rem  siblings), so a dev launch without artifacts fails at the first import.
rem  app-boot's lib is the canary: if it is absent nothing else is built either.
if not exist "%REPO%\packages\boot\app-boot\lib\index.js" (
  echo.
  echo   [..] workspace artifacts are missing. Building them - this takes several minutes.
  pushd "%REPO%"
  call pnpm run build:artifacts
  if errorlevel 1 (
    popd
    echo.
    echo   [X] build:artifacts failed. Scroll up for the first error.
    goto :fail
  )
  popd
  echo   [ok] artifacts built
) else (
  echo   [ok] workspace artifacts present
)

rem --- launch --------------------------------------------------------------
pushd "%REPO%"
if /i "%MODE%"=="desktop" (
  echo.
  echo   Starting the Electron desktop app in dev. Close the window to stop.
  echo.
  call pnpm run dev:desktop
) else if /i "%MODE%"=="web" (
  echo.
  echo   Starting the web GUI. Watch for the local URL it prints, then open it.
  echo   Press Ctrl+C in this window to stop.
  echo.
  call pnpm run start:web
) else (
  popd
  echo   [X] Unknown mode "%MODE%". Use: web ^| desktop ^| check
  goto :fail
)
set "RC=%ERRORLEVEL%"
popd
if not "%RC%"=="0" echo. & echo   [X] exited with code %RC%
goto :done

:fail
echo.
pause
exit /b 1

:done
echo.
echo   Done.
pause
exit /b 0
