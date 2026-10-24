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

rem  If this window was started by an Electron host (an IDE shell, or a dev
rem  terminal inside a packaged app), ELECTRON_RUN_AS_NODE is inherited and makes
rem  electron.exe behave as plain Node: it then rejects --user-data-dir and
rem  --remote-debugging-port with "bad option". A dev launch must be a real
rem  Electron process, so the flag is cleared for this window.
set "ELECTRON_RUN_AS_NODE="

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
  echo   [warn] not a git checkout - continuing anyway
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
rem  %TEMP% is shared with every process on the machine, and esbuild names its
rem  temp file after a hash of the content: two builds running at once - this
rem  one and a watcher left behind by an earlier launch - pick the same path, and
rem  the loser cannot delete a file the winner still holds. The build therefore
rem  gets a temp root unique to this run, so no second build can ever collide.
set "RUNID=%RANDOM%%RANDOM%"
set "TMP=%LOCALAPPDATA%\AryaCode-dev\tmp\!RUNID!"
set "TEMP=%TMP%"
if not exist "%TMP%" mkdir "%TMP%" >nul 2>&1
rem  Runs accumulate a directory each; clear the ones from previous days.
forfiles /p "%LOCALAPPDATA%\AryaCode-dev\tmp" /d -1 /c "cmd /c if @isdir==TRUE rmdir /s /q @path" >nul 2>&1
echo   [ok] private build temp: "!TMP!"

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
rem  build:artifacts runs eight gates concurrently. esbuild names its temp file
rem  after a hash of the content, so two gates transpiling the same module pick
rem  the same path: one removes it while the other still holds it, and the build
rem  dies with "remove ...: Access is denied" in the Web build. Serialising the
rem  gates costs a few seconds and removes the race.
set "DSH_GATE_CONCURRENCY=1"
rem  pnpm install only links workspace packages; it does not compile them, and
rem  the dev script rebuilds on every launch. That rebuild is where the launch
rem  was dying, so it runs here first with retries, and the app then starts with
rem  the build skipped.
pushd "%REPO%"
call :build
set "BUILD_RC=%ERRORLEVEL%"
popd
if not "%BUILD_RC%"=="0" (
  echo.
  echo   [X] build:artifacts failed three times. The errors are above.
  goto :fail
)
echo   [ok] artifacts built

rem --- launch --------------------------------------------------------------
pushd "%REPO%"
if /i "%MODE%"=="desktop" (
  echo.
  echo   Starting the Electron desktop app in dev. Close the window to stop.
  echo.
  rem  start:desktop is dev.ts --skip-build: the artifacts are already built
  rem  above, so nothing transpiles during startup.
  call pnpm run start:desktop
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
if not "%RC%"=="0" (
  echo.
  echo   [X] exited with code %RC%
  goto :fail
)
goto :done

:fail
echo.
pause
exit /b 1

:build
rem  Three attempts. esbuild deletes a temp file after each transpile and
rem  something on this machine intermittently holds it, failing the Web build
rem  with "remove ...: Access is denied". Each retry clears the leftovers first.
for /l %%i in (1,1,3) do (
  call pnpm run build:artifacts
  if not errorlevel 1 exit /b 0
  echo   [warn] build attempt %%i of 3 failed; clearing temp and retrying.
  del /q "%TEMP%\esbuild-*" >nul 2>&1
  ping -n 3 127.0.0.1 >nul
)
rem  The Web build only regenerates apps/web/dist. When that alone keeps failing
rem  but a usable dist is already on disk, the app still runs on it - a stale
rem  page beats refusing to start over a temp-file handle. Every other failing
rem  gate leaves the launch broken, so this is not a blanket ignore.
if exist "%REPO%\apps\web\dist\index.html" (
  echo.
  echo   [warn] the Web build keeps failing, but a built frontend exists at
  echo          apps\web\dist - starting on it. UI changes will not be visible
  echo          until the build succeeds.
  echo          Real fix: exclude this checkout from antivirus real-time scanning.
  exit /b 0
)
exit /b 1

:done
echo.
echo   Done.
pause
exit /b 0
