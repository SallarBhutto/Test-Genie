
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';
import path from 'path';

const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('neon.database');

export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const migrationsFolder = path.join(process.cwd(), 'migrations');
    
    if (isNeonDatabase) {
      // Use Neon serverless migrator
      await migrate(db, { migrationsFolder });
    } else {
      // Use regular PostgreSQL migrator
      await pgMigrate(db, { migrationsFolder });
    }
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running database migrations:', error);
    
    // Don't exit the process, just log the error
    // This allows the app to continue running even if migrations fail
    console.warn('⚠️ App will continue running despite migration errors');
  }
}
