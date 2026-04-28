@echo off
title Iniciando ChatApp - Modo Local
echo ========================================
echo   INICIANDO SERVIDOR DE DESARROLLO
echo ========================================
cd /d %~dp0
npm run dev
pause
