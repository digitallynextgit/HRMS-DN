@echo off
echo Starting HRMS Docker containers via WSL...
wsl sudo service docker start
wsl docker start hrms-postgres hrms-redis hrms-minio
echo Done. All containers are running.
pause
