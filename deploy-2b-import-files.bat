@echo off
rem Re-runs the additive file import (safe to repeat: existing files are skipped).
cd /d "%~dp0Backend"
echo Importing existing files... > "%~dp0logs\deploy-2b.log"
call "%~dp0Backend\node_modules\.bin\tsx.cmd" scripts\import-files-to-db.ts < nul >> "%~dp0logs\deploy-2b.log" 2>&1
echo Import exit code %ERRORLEVEL% >> "%~dp0logs\deploy-2b.log"
