# Guía de Despliegue en VPS Contabo (Ubuntu 22.04/24.04)

Esta guía detalla los pasos para desplegar el CRM de WhatsApp en un servidor Contabo.

## 1. Preparación del Servidor

Conéctate a tu servidor vía SSH:
```bash
ssh root@tu_ip_servidor
```

### Actualización del sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### Instalación de Node.js (v20+)
Recomendamos usar NVM para gestionar versiones de Node:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### Instalación de Nginx y PM2
```bash
sudo apt install nginx -y
npm install -g pm2
```

## 2. Preparación de la Aplicación

### Clonar el repositorio o subir archivos
Si usas Git:
```bash
cd /var/www
git clone https://github.com/appprexup-alt/prexwhatsapp.git
cd crm-whatsapp
```

### Instalación de dependencias
```bash
# Frontend
npm install --legacy-peer-deps

# Backend (WhatsApp Server)
cd whatsapp-server
npm install
cd ..
```

### Configuración de Variables de Entorno
Crea el archivo `.env` en la raíz con tus credenciales de Supabase y APIs:
```bash
nano .env
```
Copia el contenido de `.env.example` y rellena con tus datos reales.

### Construcción del Frontend
Desde la raíz del proyecto:
```bash
npm run build
```

## 3. Configuración de PM2 (Bakend)

Inicia el servidor de WhatsApp con PM2 para que se mantenga ejecutando:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
*(Sigue las instrucciones que PM2 te dé para habilitar el inicio automático).*

## 4. Configuración de Nginx

Edita el archivo de configuración de Nginx:
```bash
sudo nano /etc/nginx/sites-available/crm-whatsapp
```

Pega lo siguiente (ajusta `server_name` y rutas):
```nginx
server {
    listen 80;
    server_name tu-dominio.com; # Cambia por tu dominio

    root /var/www/crm-whatsapp/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para el Servidor de WhatsApp (si habilitas API externa)
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

Habilita el sitio y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/crm-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 5. Firewall y SSL (Certbot)

### Configurar Firewall (UFW)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### Instalar Certificado SSL (HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com
```

## 6. Verificación

1. Ingresa a `https://tu-dominio.com`.
2. Verifica que el login cargue.
3. Entra a la sección de WhatsApp y confirma que el servidor esté activo (debería mostrar el QR o estado de conexión).
