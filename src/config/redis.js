const Redis = require('ioredis');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('Redis connection has been established successfully.');
});

redisClient.on('error', (error) => {
  console.error('Unable to connect to Redis:', error);
});

module.exports = redisClient;
