// backend/direct-fix.js
const fs = require('fs');

// 1. Fix database.js - Replace with direct connection URL
const databaseJs = `
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
`;

// 2. Fix passport.js - Add hardcoded JWT secret
// First read the current passport.js file
let passportJs = fs.readFileSync('./src/config/passport.js', 'utf8');

// Replace the JWT options with hardcoded secret
passportJs = passportJs.replace(
  /const jwtOptions = {[\s\S]*?secretOrKey: process\.env\.JWT_SECRET[\s\S]*?};/,
  `const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: 'Jsb8va+rlHbnyTSr3716BQ==ytOwTrPS8gkZPq89dz2KOYll5S1PGiRM57WWKPCn' // Hardcoded secret
};
console.log('Using hardcoded JWT secret');`
);

// Write the updated files
fs.writeFileSync('./src/config/database.js', databaseJs);
fs.writeFileSync('./src/config/passport.js', passportJs);

console.log('✅ Files updated successfully!');
console.log('- database.js: Now using direct Supabase connection URL');
console.log('- passport.js: Now using hardcoded JWT secret');
console.log('');
console.log('Next steps:');
console.log('1. Commit these changes');
console.log('2. Deploy to Vercel with: vercel --prod');
