import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";
// import { DATABASE_URL } from "@shared/config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect if we're using Neon (contains neon.tech) or regular PostgreSQL
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon.database');
const isProduction = process.env.NODE_ENV === 'production';

let db: any;
let pool: any;

if (isNeonDatabase) {
  // Use Neon serverless driver for Replit/Neon
  neonConfig.webSocketConstructor = ws;
  neonConfig.poolQueryViaFetch = true; // Use fetch for better reliability
  pool = new NeonPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: true
  });
  db = drizzle({ client: pool, schema });
} else {
  // Use regular PostgreSQL driver for local Docker/traditional PostgreSQL
  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    // Additional config for local development
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  db = pgDrizzle(pool, { schema });
}

// Test database connection
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Initialize connection test
testConnection();

export { db, pool };