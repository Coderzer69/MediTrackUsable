@echo off
cd /d "%~dp0Backend"
timeout /t 6 /nobreak >nul
node test-medical-records.mjs > "%~dp0logs\medical-records-test.log" 2>&1
