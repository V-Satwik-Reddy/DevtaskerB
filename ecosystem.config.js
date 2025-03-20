module.exports = {
  apps: [
    {
      name: "dev-server",
      script: "npm",
      args: "run dev",
      watch: true,
      autorestart: true,
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
