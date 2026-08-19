#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kb',
  user: process.env.DB_USER || 'kb_user',
  password: process.env.DB_PASSWORD || 'kb_password',
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running migrations...');

    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error: any) {
        // Check if it's a "already exists" error - these are safe to ignore
        if (error.code === '42P07' || error.code === '42710' || error.message.includes('already exists')) {
          console.log(`⚠️  Migration ${file} - objects already exist (skipping)`);
        } else {
          console.error(`❌ Migration ${file} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
