// api/test-connections.js
// const testSupabaseConnection = require('../scripts/test-supabase');
// const testMongoDBConnection = require('../scripts/test-mongodb');
// const testInfluxDBConnection = require('../scripts/test-nfluxdb');

module.exports = async (req, res) => {
  try {
    module.exports = (req, res) => {
      res.status(200).json({ message: 'Simple test response' });
    };

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
