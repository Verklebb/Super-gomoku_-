@echo off
setlocal

echo Starting Super Gomoku: Skill Battle...

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm not found. Please install npm first.
  pause
  exit /b 1
)

rem Move to the script directory so installs happen in the project
cd /d "%~dp0"

echo Installing dependencies...
npm install
if errorlevel 1 (
  echo Dependency install failed. Please check your network connection.
  pause
  exit /b 1
)

echo Launching dev server at http://localhost:3000/
start "" http://localhost:3000/
npm run dev

endlocal
