const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use('/custom.html', createProxyMiddleware({ target: 'http://localhost:8082', changeOrigin: true }));
};