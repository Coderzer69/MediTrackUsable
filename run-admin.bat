@echo off
title MediTrack Admin (:5174)
cd /d "%~dp0admin"
echo Starting admin... > "%~dp0logs\admin.log"
call npx vite --port 5174 >> "%~dp0logs\admin.log" 2>&1
pause
