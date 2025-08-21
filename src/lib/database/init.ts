#!/usr/bin/env node

/**
 * Database Initialization Script
 * 
 * This script initializes the SQLite database for TayyarAI.
 * It creates the database file, applies migrations, and sets up initial data.
 * 
 * Usage:
 *   npm run db:init
 *   node -r ts-node/register src/lib/database/init.ts
 */

import { initializeDatabase } from './config';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🚀 Starting TayyarAI Database Initialization...\n');

  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    // Initialize database
    const success = initializeDatabase();
    
    if (success) {
      console.log('\n✅ Database initialization completed successfully!');
      console.log('\n📋 What was set up:');
      console.log('   - SQLite database file created');
      console.log('   - All tables created with proper indexes');
      console.log('   - Foreign key constraints enabled');
      console.log('   - WAL mode enabled for better performance');
      console.log('   - Ready for user onboarding data');
      
      console.log('\n🔧 Next steps:');
      console.log('   - Run `npm run dev` to start the application');
      console.log('   - Run `npm run db:studio` to view the database');
      console.log('   - Run `npm run db:seed` to add sample data (optional)');
      
      console.log('\n📁 Database location: ./data/tayyarai.db');
    } else {
      console.log('❌ Database initialization failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
