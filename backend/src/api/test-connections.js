// api/test-connections.js
const testSupabaseConnection = require('../scripts/test-supabase');
const testMongoDBConnection = require('../scripts/test-mongodb');
const testInfluxDBConnection = require('../scripts/test-nfluxdb');

module.exports = async (req, res) => {
  try {
    const results = {
      supabase: await testSupabaseConnection(),
      mongodb: await testMongoDBConnection(),
      influxdb: await testInfluxDBConnection()
    };
    
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
