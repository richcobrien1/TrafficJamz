const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const dotenv = require('dotenv');

// Load environment variables (removed - already loaded in index.js)
// dotenv.config();

// InfluxDB connection configuration
// Strip surrounding quotes if present (can happen with some .env parsers)
const stripQuotes = (str) => str && str.replace(/^["']|["']$/g, '');
const url = stripQuotes(process.env.INFLUXDB_URL);
const token = stripQuotes(process.env.INFLUXDB_TOKEN);
const org = stripQuotes(process.env.INFLUXDB_ORG);
const bucket = stripQuotes(process.env.INFLUXDB_BUCKET);

// Check if InfluxDB is configured
const isConfigured = url && token && org && bucket;

let influxClient = null;
let writeApi = null;
let queryApi = null;

if (isConfigured) {
  // Create InfluxDB client
  influxClient = new InfluxDB({ url, token });

  // Get write API for the specified org and bucket
  writeApi = influxClient.getWriteApi(org, bucket);
  writeApi.useDefaultTags({ host: 'trafficjamz-server' });

  // Get query API for the specified org
  queryApi = influxClient.getQueryApi(org);

  // Test connection by writing a test point
  const testConnection = async () => {
    try {
      const point = new Point('system')
        .tag('test', 'connection')
        .floatField('value', 1.0);
      
      writeApi.writePoint(point);
      await writeApi.flush();
      console.log('✅ InfluxDB connection established successfully.');
    } catch (error) {
      console.error('⚠️ Unable to connect to InfluxDB:', error.message);
    }
  };

  // Call the test function
  testConnection();
} else {
  console.log('ℹ️ InfluxDB disabled - metrics will not be collected (missing credentials)');
}

module.exports = {
  influxClient,
  writeApi,
  queryApi,
  Point,
  isConfigured
};
