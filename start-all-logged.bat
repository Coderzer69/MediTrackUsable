@echo off
cd /d "%~dp0"
if not exist logs mkdir logs
start "" "%~dp0run-backend.bat"
start "" "%~dp0run-frontend.bat"
start "" "%~dp0run-admin.bat"
