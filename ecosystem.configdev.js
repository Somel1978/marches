// ecosystem.configdev.js
module.exports = {
  apps: [
    {
      name: 'dev-frontend',
      script: 'apps/frontend/build/index.js',
      cwd: '/home/marches/dev',
      node_args: '--env-file=/home/marches/dev/.env',
      env: { PORT: '5273', HOST: '0.0.0.0' },
    },
    {
      name: 'dev-admin',
      script: 'apps/admin/build/index.js',
      cwd: '/home/marches/dev',
      node_args: '--env-file=/home/marches/dev/.env',
      env: { PORT: '5274', HOST: '0.0.0.0' },
    },
    {
      name: 'dev-discord',
      script: 'node_modules/.bin/tsx',
      args: '--env-file=/home/marches/dev/.env apps/discord/src/index.ts',
      cwd: '/home/marches/dev',
      interpreter: 'none',
      env: { NODE_ENV: 'development' },
    },
  ],
}