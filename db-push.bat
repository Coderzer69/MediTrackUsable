@echo off
cd /d "%~dp0Backend"
echo Syncing database schema (adds missing tables, never deletes data)... > "%~dp0logs\dbpush.log"
call npx prisma db push --skip-generate >> "%~dp0logs\dbpush.log" 2>&1
echo Exit code %ERRORLEVEL% >> "%~dp0logs\dbpush.log"
