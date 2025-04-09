// test-all-connections.js
require('dotenv').config(); // Load environment variables from .env file if needed

// Import test functions from individual scripts
const testSupabaseConnection = require('./test-supabase');
const testMongoDBConnection = require('./test-mongodb');
const testInfluxDBConnection = require('./test-influxdb');

async function testAllConnections() {
  console.log('Testing all database connections...');
  
  const supabaseResult = await testSupabaseConnection();
  const mongoDBResult = await testMongoDBConnection();
  const influxDBResult = await testInfluxDBConnection();
  
  console.log('\nSummary:');
  console.log('Supabase: ' + (supabaseResult ? '✅ Connected' : '❌ Failed'));
  console.log('MongoDB: ' + (mongoDBResult ? '✅ Connected' : '❌ Failed'));
  console.log('InfluxDB: ' + (influxDBResult ? '✅ Connected' : '❌ Failed'));
}

testAllConnections();
