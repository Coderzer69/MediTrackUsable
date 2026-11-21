@echo off
cd /d "%~dp0"
if not exist logs mkdir logs
echo Stopping anything listening on ports 3000, 5173, 5174...
for %%P in (3000 5173 5174) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo  - port %%P : killing PID %%A
    taskkill /PID %%A /F >nul 2>&1
  )
)
timeout /t 2 /nobreak >nul
start "" "%~dp0run-backend.bat"
start "" "%~dp0run-frontend.bat"
start "" "%~dp0run-admin.bat"
echo Done. Main app: http://localhost:5173   Admin: http://localhost:5174
timeout /t 5 >nul
