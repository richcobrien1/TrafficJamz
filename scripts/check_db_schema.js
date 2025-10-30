#!/usr/bin/env node
/**
 * scripts/check_db_schema.js
 *
 * Script to check the actual database schema for the users table
 */

const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('postgres://postgres.nrlaqkpojtvvheosnpaz:tMRyyxjADUl63z44@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=no-verify&supa=base-pooler.x', {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false
});

async function checkSchema() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get table information
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== USERS TABLE SCHEMA ===');
    results.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });

    // Check if social_accounts column exists
    const socialAccountsExists = results.some(col => col.column_name === 'social_accounts');
    console.log(`\nSocial accounts column exists: ${socialAccountsExists ? 'YES' : 'NO'}`);

    // Check if mfa_methods column exists
    const mfaMethodsExists = results.some(col => col.column_name === 'mfa_methods');
    console.log(`MFA methods column exists: ${mfaMethodsExists ? 'YES' : 'NO'}`);

    // Check if mfa_enabled column exists
    const mfaEnabledExists = results.some(col => col.column_name === 'mfa_enabled');
    console.log(`MFA enabled column exists: ${mfaEnabledExists ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();