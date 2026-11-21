@echo off
rem Step 2: run the reviewed, additive SQL (logs\schema-diff.sql) and copy the
rem existing uploaded files into the database. Inserts only; nothing is deleted.
cd /d "%~dp0Backend"
echo Applying reviewed schema SQL... > "%~dp0logs\deploy-2.log"
call npx prisma db execute --file "%~dp0logs\schema-diff.sql" --schema prisma\schema.prisma >> "%~dp0logs\deploy-2.log" 2>&1
echo Schema exit code %ERRORLEVEL% >> "%~dp0logs\deploy-2.log"
echo Importing existing files... >> "%~dp0logs\deploy-2.log"
call npx tsx scripts\import-files-to-db.ts >> "%~dp0logs\deploy-2.log" 2>&1
echo Import exit code %ERRORLEVEL% >> "%~dp0logs\deploy-2.log"
