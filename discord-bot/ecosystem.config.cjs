module.exports = {
  apps: [
    {
      name: 'perp-discord-bot',
      script: './index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '150M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
