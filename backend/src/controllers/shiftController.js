const { pool } = require('../db/database');

// Get all shifts with filters
const getShifts = async (req, res) => {
  const { location_id, start_date, end_date } = req.query;
  let query = 'SELECT s.*, l.name as location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE 1=1';
  const params = [];

  if (location_id) {
    params.push(location_id);
    query += ` AND s.location_id = $${params.length}`;
  }
  if (start_date) {
    params.push(start_date);
    query += ` AND s.start_time >= $${params.length}`;
  }
  if (end_date) {
    params.push(end_date);
    query += ` AND s.end_time <= $${params.length}`;
  }
  query += ' ORDER BY s.start_time ASC';

  try {
    const result = await pool.query(query, params);
    const shiftsWithCounts = await Promise.all(
      result.rows.map(async (shift) => {
        const countResult = await pool.query(
          'SELECT COUNT(*) as count FROM assignments WHERE shift_id = $1 AND status = $2',
          [shift.id, 'assigned']
        );
        const usersResult = await pool.query(
          'SELECT u.name FROM assignments a JOIN users u ON a.user_id = u.id WHERE a.shift_id = $1 AND a.status = $2',
          [shift.id, 'assigned']
        );
        return {
          ...shift,
          assigned_count: parseInt(countResult.rows[0].count),
          coverage_status: parseInt(countResult.rows[0].count) >= shift.required_count ? 'covered' : 'uncovered',
          assigned_users: usersResult.rows.map(u => u.name),
        };
      })
    );
    res.json(shiftsWithCounts);
  } catch (err) {
    console.error('Get shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

// Create shift (admin only)
const createShift = async (req, res) => {
  const { location_id, start_time, end_time, required_count } = req.body;
  if (!location_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields: location_id, start_time, end_time' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO shifts (location_id, start_time, end_time, required_count, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [location_id, start_time, end_time, required_count || 1, req.user.id]
    );
    res.status(201).json({ message: 'Shift created', shift: result.rows[0] });
  } catch (err) {
    console.error('Create shift error:', err);
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

// Update shift (admin only)
const updateShift = async (req, res) => {
  const { id } = req.params;
  const { location_id, start_time, end_time, required_count } = req.body;
  try {
    const result = await pool.query(
      'UPDATE shifts SET location_id = COALESCE($1, location_id), start_time = COALESCE($2, start_time), end_time = COALESCE($3, end_time), required_count = COALESCE($4, required_count) WHERE id = $5 RETURNING *',
      [location_id, start_time, end_time, required_count, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift updated', shift: result.rows[0] });
  } catch (err) {
    console.error('Update shift error:', err);
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

// Delete shift (admin only)
const deleteShift = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted' });
  } catch (err) {
    console.error('Delete shift error:', err);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
};

module.exports = { getShifts, createShift, updateShift, deleteShift };
