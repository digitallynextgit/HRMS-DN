@echo off
echo Stopping HRMS Docker containers...
wsl docker stop hrms-postgres hrms-redis hrms-minio
echo Done. Containers stopped.
pause
