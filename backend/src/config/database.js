
const { Sequelize } = require('sequelize');
require('pg');

// Direct Supabase connection URL
const connectionUrl = 'postgres://postgres.nrlaqkpojtvvheosnpaz:tMRyyxjADUl63z44@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x';

console.log('Using direct Supabase connection URL');

const sequelize = new Sequelize(connectionUrl, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: console.log
});

module.exports = sequelize;
