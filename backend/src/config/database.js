// backend/src/config/database.js
const { Sequelize } = require('sequelize');
require('pg'); // Explicitly require pg

// Add debug logging to see what values are being used
console.log('Database connection config:', {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || '5432',
  database: process.env.POSTGRES_DB || 'audiogroupapp',
  user: process.env.POSTGRES_USER || 'postgres'
});

const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'audiogroupapp',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'topgun',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    dialect: 'postgres',
    dialectModule: require('pg'), // Explicitly pass pg module
    logging: console.log,
    // Add SSL configuration for Supabase
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
