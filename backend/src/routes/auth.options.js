// routes/auth.options.js
module.exports = (req, res)  => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://trafficjam.v2u.us') ;
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Respond to OPTIONS request
  res.status(200).end();
};