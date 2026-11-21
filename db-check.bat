@echo off
cd /d "%~dp0Backend"
call npx tsx db-check.ts > "%~dp0logs\db-check.log" 2>&1
