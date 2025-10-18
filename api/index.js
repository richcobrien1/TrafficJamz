const app = require('../jamz-server/src/index'); // adjust path if needed

module.exports = (req, res) => {
  app(req, res);
};