module.exports = {
  apps: [
    {
      name: "api-gateway",
      cwd: "/opt/node/job-platform/api-gateway",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
