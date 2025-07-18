// backend/src/config/database.js
const { Sequelize } = require('sequelize');
require('pg'); // Explicitly require pg

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
console.log('Current environment:', isProduction ? 'Production' : 'Development');

// Add debug logging to see what values are being used
console.log('Database connection config:', {
  host: isProduction ? (process.env.POSTGRES_USER_POSTGRES_HOST || 'db.nrlaqkpojtvvheosnpaz.supabase.co') : 'localhost',
  port: isProduction ? '6543' : '5432',
  database: isProduction ? 'postgres' : 'audiogroupapp',
  user: 'postgres',
  environment: process.env.NODE_ENV
});

// Configure SSL based on environment
const dialectOptions = isProduction ? {
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
} : {};

console.log('=====     Using SSL for database connection:', isProduction);

// Create the appropriate connection based on environment
let sequelize;

if (isProduction) {
  // Direct connection instead of pooler
  // const connectionUrl = 'postgres://postgres:tMRyyxjADUl63z44@db.nrlaqkpojtvvheosnpaz.supabase.co:5432/postgres?sslmode=no-verify';
  // console.log('=====     Using production database connection     =====');

  // Production: Use Supabase connection pooler with SSL parameters
  const connectionUrl = 'postgres://postgres.nrlaqkpojtvvheosnpaz:tMRyyxjADUl63z44@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify';

  console.log('=====     Using production database connection with pooler     =====');

  sequelize = new Sequelize(connectionUrl, {
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: console.log
  });
  
  // sequelize = new Sequelize(connectionUrl, {
  //   dialect: 'postgres',
  //   dialectModule: require('pg'),
  //   logging: console.log,
  //   dialectOptions: {  // Add this line to include the SSL options
  //     ssl: {
  //       require: true,
  //       rejectUnauthorized: false
  //     }
  //   }
  // });

} else {
  // Development: Use localhost connection
  console.log('=====     Using development database connection     =====');
  
  sequelize = new Sequelize(
    'audiogroupapp',
    'postgres',
    'topgun', // Your local password
    {
      host: 'localhost',
      port: 5432,
      dialect: 'postgres',
      dialectModule: require('pg'),
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;
