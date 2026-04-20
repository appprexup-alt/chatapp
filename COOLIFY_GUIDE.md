# Guía de Despliegue con Coolify 🚀

Coolify es como tu propio Heroku o Vercel privado. Es ideal si prefieres una interfaz visual para gestionar tus aplicaciones, dominios y bases de datos.

## 1. Instalación de Coolify en tu VPS Contabo

Conéctate a tu servidor via SSH y ejecuta el comando oficial de instalación:

```bash
curl -fsSL https://get.coollabs.io/coolify/install.sh | bash
```

Una vez termine, podrás acceder a la interfaz web en:
`http://tu_ip_servidor:8000`

---

## 2. Configuración Inicial
1. Crea tu cuenta de administrador al entrar por primera vez.
2. Ve a **Sources** y añade tu cuenta de **GitHub**.
   - Sigue los pasos para autorizar la App de Coolify en tu GitHub.

---

## 3. Desplegar el Proyecto (crm-whatsapp)

### Paso A: Crear un nuevo Proyecto
1. Ve a **Projects** -> **Create New Project**.
2. Dale un nombre (ej. `PREX-WhatsApp`).

### Paso B: Añadir Recurso de GitHub
1. Dentro del proyecto, haz clic en **+ New Resource** -> **Public/Private Repository**.
2. Selecciona tu repositorio: `appprexup-alt/prexwhatsapp`.
3. Selecciona la rama: `main`.

### Paso C: Configuración de Docker (Importante)
Coolify detectará automáticamente los archivos que creamos.
1. En **Build Pack**, asegúrate de que esté seleccionado **Docker Compose**.
2. Coolify leerá el archivo `docker-compose.yml` que ya está en tu repositorio.

### Paso D: Variables de Entorno (.env)
1. Ve a la pestaña **Environment Variables**.
2. Pega aquí el contenido de tu archivo `.env` (Supabase URL, Anon Key, etc.).
3. Coolify las inyectará automáticamente en los contenedores.

### Paso E: Configurar Dominios
1. En la configuración del servicio **frontend**, busca el campo **Domains**.
2. Escribe tu dominio o subdominio: `https://app.prexup.com`.
3. Coolify gestionará el certificado SSL (HTTPS) por ti automáticamente via Let's Encrypt.

---

## 4. Desplegar
Haz clic en **Deploy** y espera a que termine el build.
- Podrás ver los logs en tiempo real.
- Una vez termine, tu CRM estará disponible en tu dominio con HTTPS activo.

---

## Ventajas de usar Coolify
- **Auto-Update**: Cada vez que hagas un `git push` a tu repo, Coolify redesplegará la app automáticamente.
- **SSL automático**: No tienes que pelear con Certbot.
- **Monitoreo**: Verás el uso de CPU y RAM de tus contenedores desde el panel.
