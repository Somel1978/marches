// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'thebnb-frontend',
      script: 'apps/frontend/build/index.js',
      cwd: '/home/marches/space',
      node_args: '--env-file=/home/marches/space/.env',
      env: {
        PORT: '5173',
        HOST: '0.0.0.0',
      },
    },
    {
      name: 'thebnb-admin',
      script: 'apps/admin/build/index.js',
      cwd: '/home/marches/space',
      node_args: '--env-file=/home/marches/space/.env',
      env: {
        PORT: '5174',
        HOST: '0.0.0.0',
      },
    },
  ],
};