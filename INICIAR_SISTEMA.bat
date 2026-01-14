@echo off
title Sistema de Registro - Oficina de Administración
echo ==========================================
echo      INICIANDO SISTEMA...
echo ==========================================
echo.
echo No cierre esta ventana negra mientras use el sistema.
echo.

:: Abrir navegador despues de 2 segundos
timeout /t 2 >nul
start http://localhost:3000

:: Iniciar servidor
npm start



// en la carpeta src se encuentra el archivo seed_workers.js 
// que va servir para inicializar la aplicacion en modo escritorio.