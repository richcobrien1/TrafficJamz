// backend/src/config/database.js
const { Sequelize } = require('sequelize');
require('pg'); // Explicitly require pg

// Add debug logging to see what values are being used
console.log('Database connection config:', {
  host: process.env.POSTGRES_USER_POSTGRES_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || '6543',
  database: process.env.POSTGRES_USER_POSTGRES_DATABASE || process.env.POSTGRES_DB || 'audiogroupapp',
  user: process.env.POSTGRES_USER_POSTGRES_USER || process.env.POSTGRES_USER || 'postgres',
  environment: process.env.NODE_ENV
});

// Check if we have a complete connection URL
if (process.env.POSTGRES_USER_POSTGRES_URL) {
  console.log('Using connection URL from POSTGRES_USER_POSTGRES_URL');
  const sequelize = new Sequelize(process.env.POSTGRES_USER_POSTGRES_URL, {
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: console.log
  });
  module.exports = sequelize;
} else {
  // Determine if we're in production (Vercel) or development (localhost)
  const isProduction = process.env.NODE_ENV === 'production' || 
                      (process.env.POSTGRES_HOST && process.env.POSTGRES_HOST !== 'localhost') ||
                      (process.env.POSTGRES_USER_POSTGRES_HOST && process.env.POSTGRES_USER_POSTGRES_HOST !== 'localhost');

  // Configure SSL based on environment
  const dialectOptions = isProduction ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {};

  console.log('Using SSL for database connection:', isProduction);

  const sequelize = new Sequelize(
    process.env.POSTGRES_USER_POSTGRES_DATABASE || process.env.POSTGRES_DB || 'audiogroupapp',
    process.env.POSTGRES_USER_POSTGRES_USER || process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_USER_POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD || 'topgun',
    {
      host: process.env.POSTGRES_USER_POSTGRES_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      dialect: 'postgres',
      dialectModule: require('pg'), // Explicitly pass pg module
      logging: console.log,
      dialectOptions: dialectOptions,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  module.exports = sequelize;
}
