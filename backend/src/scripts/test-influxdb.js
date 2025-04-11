// test-influxdb.js
const { InfluxDB } = require('@influxdata/influxdb-client');

// Replace with your actual InfluxDB credentials
const url = process.env.INFLUXDB_URL || 'your-influxdb-url';
const token = process.env.INFLUXDB_TOKEN || 'Vy57uArV5tf17mCqoqPCbzL4xXnMM0uQIcqglnA4d8vWEJSoc66WJJu37ntxTK8PF4XA9SYQ9u1nhIaBkZMKug==';
const org = process.env.INFLUXDB_ORG || 'v2u';
const bucket = process.env.INFLUXDB_BUCKET || 'trafficjam';

async function testInfluxDBConnection() {
  try {
    const influxDB = new InfluxDB({ url, token });
    
    // Check health
    const health = await influxDB.health();
    console.log('InfluxDB connection successful!');
    console.log('Health status:', health);
    
    // Query to check if bucket exists
    const queryApi = influxDB.getQueryApi(org);
    const query = `buckets() |> filter(fn: (r) => r.name == "${bucket}")`;
    
    const results = [];
    for await (const {values, tableMeta} of queryApi.iterateRows(query)) {
      const o = tableMeta.toObject(values);
      results.push(o);
    }
    
    if (results.length > 0) {
      console.log(`Bucket '${bucket}' exists!`);
    } else {
      console.log(`Bucket '${bucket}' not found.`);
    }
    
    return true;
  } catch (error) {
    console.error('InfluxDB connection failed:', error.message);
    return false;
  }
}

testInfluxDBConnection();
