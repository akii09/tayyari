import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';

// Database file path - stores in project root/data directory
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tayyari.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = 1000000');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('temp_store = MEMORY');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize database (run migrations)
export function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Run migrations
    migrate(db, { 
      migrationsFolder: path.join(process.cwd(), 'src/lib/database/migrations') 
    });
    
    console.log('✅ Database initialized successfully');
    console.log(`📁 Database location: ${DB_PATH}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Export the SQLite instance for advanced operations
export { sqlite };

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Closing database connection...');
  sqlite.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Closing database connection...');
  sqlite.close();
  process.exit(0);
});
