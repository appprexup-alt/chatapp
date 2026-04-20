module.exports = {
    apps: [
        {
            name: 'whatsapp-server',
            script: './index.js',
            cwd: './whatsapp-server',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                // Asegúrate de definir estas variables en tu archivo .env en el VPS
            },
        },
    ],
};
