// PM2 config — keeps the Next.js app running 24/7 and restarts it on crash/reboot.
// Usage on the VPS (from the project folder):
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//   pm2 startup   (then run the command it prints, once)
//
// Next.js automatically loads your secrets from the .env.local file you place
// in the project root on the server — so keep that file there.

module.exports = {
  apps: [
    {
      name: 'interviewaceai',
      // Run the production Next.js server on port 3000 (Nginx proxies to it).
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname + '/..',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },
  ],
};
