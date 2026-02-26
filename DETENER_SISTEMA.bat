@echo off
title Deteniendo Sistema de Reportes
echo Buscando proceso en el puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Matando proceso con PID: %%a
    taskkill /f /pid %%a
)
echo Sistema detenido correctamente.
pause
