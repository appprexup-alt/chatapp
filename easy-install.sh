#!/bin/bash
# Script de Instalación Rápida para CRM-WhatsApp

echo "🚀 Iniciando instalación rápida..."

# 1. Instalar Docker si no existe
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 2. Levantar la aplicación
echo "🏗️ Construyendo y levantando contenedores..."
sudo docker compose up -d --build

echo "✅ ¡Todo listo! Tu aplicación debería estar corriendo en el puerto 80."
echo "Recuerda configurar tu dominio en el archivo nginx.conf si es necesario."
