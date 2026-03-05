// backend/src/config/database.js
const { Sequelize } = require('sequelize');
require('pg'); // Explicitly require pg

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
console.log('Current environment:', isProduction ? 'Production' : 'Development');

// Configure database based on environment
let sequelize;

// Build connection from env vars (falls back to known values if not set)
const pgHost = process.env.POSTGRES_HOST || 'aws-0-us-east-1.pooler.supabase.com';
const pgPort = parseInt(process.env.POSTGRES_PORT || '5432', 10);
const pgUser = process.env.POSTGRES_USER || 'postgres.nrlaqkpojtvvheosnpaz';
const pgPassword = process.env.POSTGRES_PASSWORD || '';
const pgDb = process.env.POSTGRES_DB || 'postgres';

console.log(`=====     Using database: ${pgHost}:${pgPort}/${pgDb} (user: ${pgUser})     =====`);
sequelize = new Sequelize(pgDb, pgUser, pgPassword, {
  host: pgHost,
  port: pgPort,
  dialect: 'postgres',
  dialectModule: require('pg'),
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: isProduction ? false : console.log
});

// Test the connection asynchronously (don't block module loading)
sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL connection established successfully');
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.warn('⚠️  Application will continue with limited PostgreSQL functionality');
  });

module.exports = sequelize;
