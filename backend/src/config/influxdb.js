const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// InfluxDB connection configuration
const url = process.env.INFLUXDB_URL || 'http://localhost:8086';
const token = process.env.INFLUXDB_TOKEN || 'your_influxdb_token';
const org = process.env.INFLUXDB_ORG || 'audiogroupapp';
const bucket = process.env.INFLUXDB_BUCKET || 'location_data';

// Create InfluxDB client
const influxClient = new InfluxDB({ url, token });

// Get write API for the specified org and bucket
const writeApi = influxClient.getWriteApi(org, bucket);
writeApi.useDefaultTags({ host: 'host1' });

// Get query API for the specified org
const queryApi = influxClient.getQueryApi(org);

// Test connection by writing a test point
const testConnection = async () => {
  try {
    const point = new Point('system')
      .tag('test', 'connection')
      .floatField('value', 1.0);
    
    writeApi.writePoint(point);
    await writeApi.flush();
    console.log('InfluxDB connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to InfluxDB:', error);
  }
};

// Call the test function
testConnection();

module.exports = {
  influxClient,
  writeApi,
  queryApi,
  Point
};
