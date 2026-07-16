@echo off
REM ============================================================
REM  MediCore HMS — One-Click Start (Windows)
REM  Builds the app, downloads cloudflared if missing, starts
REM  the local server + Cloudflare tunnel, and emails you the link.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo  ========================================
echo   MediCore HMS - One-Click Start
echo  ========================================
echo.

REM --- 1. Install dependencies if needed ---
if not exist "node_modules" (
  echo  [1/4] Installing dependencies...
  call npm install
  if errorlevel 1 ( echo  npm install failed. & pause & exit /b 1 )
) else (
  echo  [1/4] Dependencies OK.
)

REM --- 2. Build the web app ---
echo  [2/4] Building app...
call npm run build
if errorlevel 1 ( echo  Build failed. & pause & exit /b 1 )

REM --- 3. Ensure cloudflared is present ---
if not exist "cloudflared.exe" (
  echo  [3/4] Downloading cloudflared...
  powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' } catch { Write-Host 'Download failed - tunnel will be skipped. You can still use the LAN link.' }"
) else (
  echo  [3/4] cloudflared OK.
)

REM --- 4. Start local server + tunnel ---
echo  [4/4] Starting server + tunnel...
echo.
node local-server/serve.mjs

pause
