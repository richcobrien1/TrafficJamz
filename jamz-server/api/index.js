import app from '../server/app'; // adjust path to your Express app

export default function handler(req, res) {
  app(req, res);
}

// api/index.js
const app = require('../src/index'); // import your Express app
module.exports = app;