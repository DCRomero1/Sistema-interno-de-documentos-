@echo off
title Sistema de Registro - MESA DE PARTES
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
