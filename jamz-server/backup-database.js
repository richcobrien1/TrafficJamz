#!/usr/bin/env node
/**
 * TrafficJamz Database Backup Script
 * Uses pg_dump via spawned process or exports data via SQL queries
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Supabase connection details
const DB_HOST = 'db.nrlaqkpojtvvheosnpaz.supabase.co';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'tMRyyxjADUl63z44';

const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'database');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const BACKUP_FILE = `trafficjamz_backup_${TIMESTAMP}.sql`;

console.log('🔐 TrafficJamz Database Backup Script');
console.log('======================================\n');

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✅ Created backup directory: ${BACKUP_DIR}\n`);
}

console.log('📦 Backup Configuration:');
console.log(`   Host: ${DB_HOST}`);
console.log(`   Port: ${DB_PORT}`);
console.log(`   Database: ${DB_NAME}`);
console.log(`   User: ${DB_USER}`);
console.log(`   Output: ${path.join(BACKUP_DIR, BACKUP_FILE)}\n`);

// Initialize Sequelize connection
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

/**
 * Get all table names from the database
 */
async function getAllTables() {
  const [results] = await sequelize.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
    ORDER BY table_name;
  `);
  return results.map(r => r.table_name);
}

/**
 * Get table schema (CREATE TABLE statement)
 */
async function getTableSchema(tableName) {
  const [results] = await sequelize.query(`
    SELECT 
      'CREATE TABLE ' || quote_ident(table_name) || ' (' ||
      string_agg(
        quote_ident(column_name) || ' ' || 
        data_type || 
        CASE 
          WHEN character_maximum_length IS NOT NULL 
          THEN '(' || character_maximum_length || ')'
          ELSE ''
        END ||
        CASE 
          WHEN is_nullable = 'NO' THEN ' NOT NULL'
          ELSE ''
        END ||
        CASE 
          WHEN column_default IS NOT NULL 
          THEN ' DEFAULT ' || column_default
          ELSE ''
        END,
        ', '
      ) || ');' as create_statement
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
      AND table_schema = 'public'
    GROUP BY table_name;
  `);
  return results[0]?.create_statement || '';
}

/**
 * Get table data as INSERT statements
 */
async function getTableData(tableName) {
  try {
    const [rows] = await sequelize.query(`SELECT * FROM "${tableName}"`);
    if (rows.length === 0) return '';

    const insertStatements = [];
    
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return val;
      });
      
      insertStatements.push(
        `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`
      );
    }
    
    return insertStatements.join('\n');
  } catch (error) {
    console.error(`⚠️  Error exporting data for table ${tableName}:`, error.message);
    return '';
  }
}

/**
 * Main backup function
 */
async function backupDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully!\n');

    console.log('🚀 Starting backup process...\n');

    let backupContent = '';
    
    // Add header
    backupContent += `-- TrafficJamz Database Backup\n`;
    backupContent += `-- Generated: ${new Date().toISOString()}\n`;
    backupContent += `-- Database: ${DB_NAME}@${DB_HOST}\n\n`;
    backupContent += `SET client_encoding = 'UTF8';\n`;
    backupContent += `SET standard_conforming_strings = on;\n\n`;

    // Get all tables
    console.log('📋 Fetching table list...');
    const tables = await getAllTables();
    console.log(`✅ Found ${tables.length} tables\n`);

    // Backup each table
    for (let i = 0; i < tables.length; i++) {
      const tableName = tables[i];
      console.log(`📦 [${i + 1}/${tables.length}] Backing up table: ${tableName}`);
      
      // Add DROP TABLE statement
      backupContent += `\n-- Table: ${tableName}\n`;
      backupContent += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n\n`;
      
      // Get and add CREATE TABLE statement
      try {
        const schema = await getTableSchema(tableName);
        backupContent += schema + '\n\n';
        
        // Get and add INSERT statements
        const data = await getTableData(tableName);
        if (data) {
          backupContent += data + '\n\n';
        }
        
        console.log(`   ✅ Done`);
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message}`);
      }
    }

    // Get functions and triggers
    console.log('\n📦 Backing up functions and triggers...');
    try {
      const [functions] = await sequelize.query(`
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        ORDER BY routine_name;
      `);
      
      if (functions.length > 0) {
        backupContent += `\n-- Functions\n`;
        for (const func of functions) {
          backupContent += `-- Function: ${func.routine_name}\n`;
          backupContent += `${func.routine_definition}\n\n`;
        }
        console.log(`✅ Backed up ${functions.length} functions`);
      }
    } catch (error) {
      console.log(`⚠️  Error backing up functions: ${error.message}`);
    }

    // Write backup file
    console.log('\n💾 Writing backup file...');
    const backupPath = path.join(BACKUP_DIR, BACKUP_FILE);
    fs.writeFileSync(backupPath, backupContent, 'utf8');
    
    const stats = fs.statSync(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Backup file written successfully!\n');
    console.log('📊 Backup Summary:');
    console.log(`   File: ${BACKUP_FILE}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Location: ${backupPath}\n`);
    
    // List recent backups
    console.log('📋 Recent backups:');
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('trafficjamz_backup_'))
      .sort()
      .reverse()
      .slice(0, 5);
    
    backupFiles.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const fileStats = fs.statSync(filePath);
      const sizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
      console.log(`   - ${file} (${sizeMB} MB)`);
    });
    
    console.log('\n✅ BACKUP COMPLETE!\n');
    console.log('💡 To restore this backup:');
    console.log(`   psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -f "${backupPath}"\n`);
    console.log('🎉 Done!');

  } catch (error) {
    console.error('\n❌ ERROR: Backup failed!');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\n📋 Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run backup
backupDatabase();
