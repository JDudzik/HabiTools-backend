const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer();

proxy.on('error', (error, req, res) => {
  res.status(500).send('Failed to collect metrics');
  throw [ error, 'posthogProxy', { skipRes: true }];
});

const posthogProxy = {
  static: (req, res) => {
    proxy.web(req, res, {
      target: 'https://us-assets.i.posthog.com/static',
      changeOrigin: true,
      secure: true,
      xfwd: true,
      headers: {
        'X-Real-IP': req.ip,
        'X-Forwarded-For': req.ip,
        'X-Forwarded-Host': req.hostname,
      },
    });
  },
  ingest: (req, res) => {
    proxy.web(req, res, {
      target: 'https://us.i.posthog.com',
      changeOrigin: true,
      secure: true,
      xfwd: true,
      headers: {
        'X-Real-IP': req.ip,
        'X-Forwarded-For': req.ip,
        'X-Forwarded-Host': req.hostname,
      },
    });
  },
};

module.exports = posthogProxy;
