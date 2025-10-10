// backend/src/config/database.js
const { Sequelize } = require('sequelize');
require('pg'); // Explicitly require pg

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
console.log('Current environment:', isProduction ? 'Production' : 'Development');

// Configure database based on environment
let sequelize;

if (isProduction) {
  // Production: Use Supabase connection pooler with SSL parameters
  const connectionUrl = 'postgres://postgres.nrlaqkpojtvvheosnpaz:tMRyyxjADUl63z44@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&supa=base-pooler.x';

  console.log('=====     Using production database connection with pooler     =====');

  sequelize = new Sequelize(connectionUrl, {
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: console.log
  });

} else {
  // Development: Use Supabase connection pooler (same as production for now)
  console.log('=====     Using development database connection (Supabase pooler)     =====');

  const connectionUrl = 'postgres://postgres.nrlaqkpojtvvheosnpaz:tMRyyxjADUl63z44@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&supa=base-pooler.x';

  sequelize = new Sequelize(connectionUrl, {
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: console.log,
    // Make connection more resilient
    retry: {
      max: 3
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

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
