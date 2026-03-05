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

// Use URI with ?pgBouncer=true so PgBouncer uses password auth (not SCRAM-SHA-256)
// This avoids "SCRAM-SERVER-FINAL-MESSAGE: server signature is missing" error
const pgUri = `postgres://${encodeURIComponent(pgUser)}:${encodeURIComponent(pgPassword)}@${pgHost}:${pgPort}/${pgDb}?pgBouncer=true`;

const sequelizeOptions = {
  dialect: 'postgres',
  dialectModule: require('pg'),
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
  },
  logging: isProduction ? false : console.log
};

console.log(`=====     Using database: ${pgHost}:${pgPort}/${pgDb} (user: ${pgUser})     =====`);
sequelize = new Sequelize(pgUri, sequelizeOptions);

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
