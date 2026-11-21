@echo off
cd /d "%~dp0Backend"
timeout /t 6 /nobreak >nul
call npx tsx test-missing-doctor-profile.ts > "%~dp0logs\doctor-profile-test.log" 2>&1
