// api/test-connections.js
const { testSupabaseConnection } = require('../scripts/test-supabase');
// const testMongoDBConnection = require('../scripts/test-mongodb');
// const testInfluxDBConnection = require('../scripts/test-nfluxdb');

module.exports = async (req, res) => {
  try {
    // Now call the function correctly
    const supabaseResult = await testSupabaseConnection();
    
    res.status(200).json({
      success: true,
      supabase: supabaseResult ? "Connected" : "Failed",
      message: 'API is working!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
