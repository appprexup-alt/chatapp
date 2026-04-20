# Guía de Instalación y Modo Demo

Esta guía te ayudará a instalar y ejecutar el proyecto localmente para que puedas ver el **Modo Demo**.

## Requisitos Previos

- **Node.js**: Asegúrate de tener instalado Node.js (versión 18 o superior).

## Pasos para la Instalación

1.  **Instalar dependencias**:
    Abre una terminal en la carpeta del proyecto y ejecuta:
    ```bash
    npm install --legacy-peer-deps
    ```
    *(Nota: Se usa `--legacy-peer-deps` para evitar conflictos de versiones entre React y otras librerías).*

2.  **Ejecutar el proyecto**:
    Una vez instaladas las dependencias, inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```

3.  **Acceder a la aplicación**:
    Abre tu navegador y ve a:
    [http://localhost:3000](http://localhost:3000)

## Cómo ver el Modo Demo

1.  En la pantalla de inicio de sesión (Login), busca el botón que dice:
    **"Iniciar Demo (Sin contraseña)"**.
2.  Haz clic en ese botón.
3.  El sistema te permitirá ingresar con un usuario de prueba y ver el dashboard, los leads (prospectos), el calendario y las propiedades sin necesidad de configurar una base de datos propia inicialmente.

> [!NOTE]
> El proyecto ya viene pre-configurado con una conexión a Supabase, por lo que podrás ver datos de ejemplo si la base de datos está activa.

---

Si tienes problemas al instalar, asegúrate de que no haya otros procesos usando el puerto 3000 o cambia el puerto en el archivo `package.json` si es necesario.
