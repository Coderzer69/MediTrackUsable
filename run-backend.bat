@echo off
title MediTrack Backend (:3000)
cd /d "%~dp0Backend"
echo Starting backend... > "%~dp0logs\backend.log"
call npm start >> "%~dp0logs\backend.log" 2>&1
echo Backend exited with code %ERRORLEVEL% >> "%~dp0logs\backend.log"
pause
