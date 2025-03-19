const { Kafka } = require('kafkajs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Kafka connection configuration
const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'audiogroupapp';
const groupId = process.env.KAFKA_GROUP_ID || 'audiogroupapp-group';

// Create Kafka client
const kafka = new Kafka({
  clientId,
  brokers,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create producer
const producer = kafka.producer();

// Create consumer
const consumer = kafka.consumer({ groupId });

// Test connection
const testConnection = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connection has been established successfully.');
    
    await consumer.connect();
    console.log('Kafka consumer connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to Kafka:', error);
  }
};

// Initialize Kafka topics
const initializeTopics = async () => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    
    // Define topics to create
    const topics = [
      { topic: 'location-updates', numPartitions: 3, replicationFactor: 1 },
      { topic: 'audio-events', numPartitions: 3, replicationFactor: 1 },
      { topic: 'user-status', numPartitions: 3, replicationFactor: 1 },
      { topic: 'group-events', numPartitions: 3, replicationFactor: 1 },
      { topic: 'notifications', numPartitions: 3, replicationFactor: 1 }
    ];
    
    // Create topics
    await admin.createTopics({
      topics,
      waitForLeaders: true
    });
    
    console.log('Kafka topics have been created successfully.');
    await admin.disconnect();
  } catch (error) {
    console.error('Error creating Kafka topics:', error);
  }
};

// Call the test function
// testConnection().then(() => initializeTopics());

module.exports = {
  kafka,
  producer,
  consumer,
  testConnection,
  initializeTopics
};
