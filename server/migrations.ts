
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';
import path from 'path';

const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('neon.database');

export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    console.log('🔍 Database type:', isNeonDatabase ? 'Neon' : 'PostgreSQL');
    
    const migrationsFolder = path.join(process.cwd(), 'migrations');
    console.log('🔍 Migrations folder:', migrationsFolder);
    
    if (isNeonDatabase) {
      console.log('🔄 Using Neon serverless migrator...');
      await migrate(db, { migrationsFolder });
    } else {
      console.log('🔄 Using PostgreSQL migrator...');
      await pgMigrate(db, { migrationsFolder });
    }
    
    console.log('✅ Database migrations completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error running database migrations:', error);
    console.error('❌ Migration details:', {
      isNeonDatabase,
      migrationsFolder: path.join(process.cwd(), 'migrations'),
      databaseUrl: process.env.DATABASE_URL?.substring(0, 20) + '...'
    });
    
    // Check if error is about tables already existing
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('⚠️ Tables already exist, skipping migrations');
      return true;
    }
    
    // In production, we should fail fast if migrations don't work
    throw error;
  }
}
