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
        return {
          ...shift,
          assigned_count: parseInt(countResult.rows[0].count),
          coverage_status: parseInt(countResult.rows[0].count) >= shift.required_count ? 'covered' : 'uncovered',
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
  const { title, start_time, end_time, required_count } = req.body;
  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields: title, start_time, end_time' });
  }
  try {
    const locationResult = await pool.query(
      'INSERT INTO locations (name) VALUES ($1) RETURNING id',
      [title]
    );
    const location_id = locationResult.rows[0].id;
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
  const { title, start_time, end_time, required_count } = req.body;
  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const shiftResult = await pool.query('SELECT location_id FROM shifts WHERE id = $1', [id]);
    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    const location_id = shiftResult.rows[0].location_id;
    await pool.query('UPDATE locations SET name = $1 WHERE id = $2', [title, location_id]);
    const result = await pool.query(
      'UPDATE shifts SET start_time = $1, end_time = $2, required_count = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [start_time, end_time, required_count || 1, id]
    );
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
