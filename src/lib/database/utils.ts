/**
 * Database Utility Functions
 * 
 * Common database operations and helpers used throughout the application.
 */

import { db } from './config';
import { sql } from 'drizzle-orm';

export class DatabaseUtils {
  /**
   * Check database health and connectivity
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'error';
    message: string;
    details?: any;
  }> {
    try {
      // Simple query to test connectivity
      const result = await db.execute(sql`SELECT 1 as test`);
      
      if (result) {
        return {
          status: 'healthy',
          message: 'Database is connected and responding',
          details: {
            timestamp: new Date().toISOString(),
          }
        };
      } else {
        return {
          status: 'error',
          message: 'Database query returned no results',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'Database connection failed',
        details: error,
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<{
    users: number;
    conversations: number;
    messages: number;
    studySessions: number;
    databaseSize: string;
  }> {
    try {
      const [userCount] = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
      const [convCount] = await db.execute(sql`SELECT COUNT(*) as count FROM conversations`);
      const [msgCount] = await db.execute(sql`SELECT COUNT(*) as count FROM messages`);
      const [sessionCount] = await db.execute(sql`SELECT COUNT(*) as count FROM study_sessions`);
      
      // Get database file size
      const [sizeResult] = await db.execute(sql`SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`);
      const sizeBytes = (sizeResult as any)?.size || 0;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

      return {
        users: (userCount as any)?.count || 0,
        conversations: (convCount as any)?.count || 0,
        messages: (msgCount as any)?.count || 0,
        studySessions: (sessionCount as any)?.count || 0,
        databaseSize: `${sizeMB} MB`,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        users: 0,
        conversations: 0,
        messages: 0,
        studySessions: 0,
        databaseSize: '0 MB',
      };
    }
  }

  /**
   * Clean up old data (for maintenance)
   */
  static async cleanup(options: {
    deleteOldConversations?: boolean;
    deleteExpiredSessions?: boolean;
    vacuumDatabase?: boolean;
    daysOld?: number;
  } = {}): Promise<{
    conversationsDeleted: number;
    sessionsDeleted: number;
    success: boolean;
  }> {
    const { 
      deleteOldConversations = false, 
      deleteExpiredSessions = false,
      vacuumDatabase = false,
      daysOld = 30 
    } = options;

    let conversationsDeleted = 0;
    let sessionsDeleted = 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      if (deleteOldConversations) {
        const result = await db.execute(
          sql`DELETE FROM conversations WHERE created_at < ${cutoffISO} AND last_message_at < ${cutoffISO}`
        );
        conversationsDeleted = (result as any)?.changes || 0;
      }

      if (deleteExpiredSessions) {
        const result = await db.execute(
          sql`DELETE FROM study_sessions WHERE created_at < ${cutoffISO}`
        );
        sessionsDeleted = (result as any)?.changes || 0;
      }

      if (vacuumDatabase) {
        await db.execute(sql`VACUUM`);
      }

      return {
        conversationsDeleted,
        sessionsDeleted,
        success: true,
      };
    } catch (error) {
      console.error('Error during database cleanup:', error);
      return {
        conversationsDeleted: 0,
        sessionsDeleted: 0,
        success: false,
      };
    }
  }

  /**
   * Optimize database performance
   */
  static async optimize(): Promise<boolean> {
    try {
      // Analyze tables for better query planning
      await db.execute(sql`ANALYZE`);
      
      // Checkpoint WAL file
      await db.execute(sql`PRAGMA wal_checkpoint(FULL)`);
      
      // Update table statistics
      await db.execute(sql`PRAGMA optimize`);
      
      console.log('✅ Database optimization completed');
      return true;
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      return false;
    }
  }

  /**
   * Create database backup
   */
  static async backup(backupPath: string): Promise<boolean> {
    try {
      await db.execute(sql`VACUUM INTO ${backupPath}`);
      console.log(`✅ Database backup created: ${backupPath}`);
      return true;
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      return false;
    }
  }

  /**
   * Check database integrity
   */
  static async integrityCheck(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const result = await db.execute(sql`PRAGMA integrity_check`);
      const checks = Array.isArray(result) ? result : [result];
      
      const errors = checks
        .map((row: any) => row?.integrity_check)
        .filter(check => check && check !== 'ok');

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Integrity check failed: ${error}`],
      };
    }
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate secure random ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Stringify JSON safely
 */
export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}
