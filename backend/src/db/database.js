const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => console.error('Unexpected error on idle client', err));

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'volunteer',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Locations table
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Shifts table
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        required_count INTEGER DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Assignments table
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        hours_volunteered DECIMAL(4,2) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'assigned',
        assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_id, user_id)
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255),
        message TEXT,
        email_sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_shifts_location ON shifts(location_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_shift ON assignments(shift_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);

      -- Indici per performance query critiche
      CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
      CREATE INDEX IF NOT EXISTS idx_assignments_shift_status ON assignments(shift_id, status);
      CREATE INDEX IF NOT EXISTS idx_assignments_user_status ON assignments(user_id, status);
    `);

    // Migration: add cancelled column if missing
    await client.query(`
      ALTER TABLE shifts ADD COLUMN IF NOT EXISTS cancelled BOOLEAN DEFAULT false;
    `);

    // Migration: tables created before the switch still have naive timestamps. Their
    // values were written as UTC wall-clock, so interpret them as UTC while converting.
    await client.query(`
      DO $$
      DECLARE
        col RECORD;
      BEGIN
        FOR col IN
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('users', 'locations', 'shifts', 'assignments', 'notifications')
            AND data_type = 'timestamp without time zone'
        LOOP
          EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
            col.table_name, col.column_name, col.column_name
          );
        END LOOP;
      END $$;
    `);

    console.log('✅ Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
