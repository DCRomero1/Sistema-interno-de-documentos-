@echo off
title Restablecer Contrasena de Administrador
color 0A
echo ========================================================
echo      SISTEMA DE GESTION DE DOCUMENTOS
echo ========================================================
echo.
echo  [!] ESTA ACCION RESTABLECERA LA CONTRASENA DEL ADMINISTRADOR
echo.
echo  Usuario Objetivo: admin
echo  Nueva Contrasena: admin
echo.
echo  Procesando...
echo.
node scripts/reset_admin_password.js
echo.
echo ========================================================
echo  PROCESO TERMINADO.
echo  Ahora puede ingresar useando:
echo  Usuario: admin
echo  Clave:   admin
echo ========================================================
echo.
pause
