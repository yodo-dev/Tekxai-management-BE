module.exports = {
  apps: [{
    name: 'tekxai-be',
    script: 'src/server.js',
    node_args: '--max-old-space-size=512',
    interpreter: 'node',
    env_production: {
      NODE_ENV: 'production',
    },
    max_restarts: 10,
    restart_delay: 3000,
    max_memory_restart: '450M',
    error_file: '/root/.pm2/logs/tekxai-be-error.log',
    out_file: '/root/.pm2/logs/tekxai-be-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
