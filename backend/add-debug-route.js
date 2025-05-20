// backend/add-debug-routes.js
const fs = require('fs');

try {
  const indexPath = './src/index.js';
  if (fs.existsSync(indexPath)) {
    let indexJs = fs.readFileSync(indexPath, 'utf8');
    
    // Add debug endpoints
    const debugEndpoints = `
// Debug endpoints to verify routing
app.get('/debug-routes', (req, res) => {
  const routes = [];
  
  // Extract routes from Express app
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Router middleware
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: middleware.regexp.toString() + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  
  res.json({
    success: true,
    message: 'Debug routes',
    routes: routes,
    env: process.env.NODE_ENV,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Simple test endpoint at root level
app.get('/hello', (req, res) => {
  res.json({
    message: 'Hello from API',
    timestamp: new Date().toISOString()
  });
});
`;
    
    // Insert before the 404 handler
    indexJs = indexJs.replace(
      /app\.use\(\(req, res\) => {[\s\S]*?res\.status\(404\)[\s\S]*?}\);/,
      `${debugEndpoints}\n$&`
    );
    
    fs.writeFileSync(indexPath, indexJs);
    console.log('✅ Added debug endpoints');
  }
} catch (error) {
  console.error('Error adding debug endpoints:', error);
}

console.log('\n🔧 Debug routes added!');
console.log('Deploy with: vercel --prod');
console.log('Then test with: https://your-vercel-url.vercel.app/hello') ;
console.log('And: https://your-vercel-url.vercel.app/debug-routes') ;
