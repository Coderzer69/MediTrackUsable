@echo off
cd /d "%~dp0Backend"
timeout /t 6 /nobreak >nul
node test-signup-roles.mjs > "%~dp0logs\signup-test.log" 2>&1
