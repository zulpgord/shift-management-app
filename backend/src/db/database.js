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
        role VARCHAR(50) NOT NULL DEFAULT 'volunteer', -- 'volunteer' or 'admin'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Locations table
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Shifts table
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        location_id INTEGER REFERENCES locations(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        required_count INTEGER DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Assignments table
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        hours_volunteered DECIMAL(4,2) DEFAULT NULL,
        status VARCHAR(50) DEFAULT 'assigned', -- 'assigned', 'completed', 'cancelled'
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_id, user_id)
      );

      -- Notifications table
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL, -- 'assignment', 'reminder', 'alert'
        subject VARCHAR(255),
        message TEXT,
        email_sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_shifts_location ON shifts(location_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_user ON assignments(user_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_shift ON assignments(shift_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);

    -- Migrations: add columns safely if they don't exist
    ALTER TABLE shifts ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 1;
    `);
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
