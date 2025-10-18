const app = require('../src/index'); // or wherever your Express app is defined

module.exports = (req, res) => {
  app(req, res);
};