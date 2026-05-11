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

    const shiftsWithDetails = await Promise.all(
      result.rows.map(async (shift) => {
        const [countRes, usersRes] = await Promise.all([
          pool.query(
            'SELECT COUNT(*) as count FROM assignments WHERE shift_id = $1 AND status = $2',
            [shift.id, 'assigned']
          ),
          pool.query(
            'SELECT u.name FROM assignments a JOIN users u ON a.user_id = u.id WHERE a.shift_id = $1 AND a.status = $2',
            [shift.id, 'assigned']
          ),
        ]);
        return {
          ...shift,
          assigned_count: parseInt(countRes.rows[0].count),
          assigned_users: usersRes.rows.map((r) => r.name),
          coverage_status:
            parseInt(countRes.rows[0].count) >= shift.required_count ? 'covered' : 'uncovered',
        };
      })
    );

    res.json(shiftsWithDetails);
  } catch (err) {
    console.error('Get shifts error:', err);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};

// Create shift (admin only)
const createShift = async (req, res) => {
  const { location_id, start_time, end_time, required_count } = req.body;
  if (!location_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
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
      'UPDATE shifts SET location_id=$1, start_time=$2, end_time=$3, required_count=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [location_id, start_time, end_time, required_count, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
    res.json({ message: 'Shift updated', shift: result.rows[0] });
  } catch (err) {
    console.error('Update shift error:', err);
    res.status(500).json({ error: 'Failed to update shift' });
  }
};

// Cancel / reactivate shift (toggle) — admin only
const cancelShift = async (req, res) => {
  const { id } = req.params;
  try {
    const current = await pool.query('SELECT cancelled FROM shifts WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
    const newVal = !current.rows[0].cancelled;
    await pool.query('UPDATE shifts SET cancelled=$1, updated_at=NOW() WHERE id=$2', [newVal, id]);
    res.json({ message: newVal ? 'Shift cancelled' : 'Shift reactivated', cancelled: newVal });
  } catch (err) {
    console.error('Cancel shift error:', err);
    res.status(500).json({ error: 'Failed to cancel shift' });
  }
};

// Delete shift (admin only)
const deleteShift = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM shifts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Shift not found' });
    res.json({ message: 'Shift deleted' });
  } catch (err) {
    console.error('Delete shift error:', err);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
};

module.exports = { getShifts, createShift, updateShift, cancelShift, deleteShift };
