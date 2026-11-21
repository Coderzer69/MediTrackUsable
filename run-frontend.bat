@echo off
title MediTrack Frontend (:5173)
cd /d "%~dp0Frontend"
echo Starting frontend... > "%~dp0logs\frontend.log"
call npx vite --port 5173 >> "%~dp0logs\frontend.log" 2>&1
pause
