const { pool } = require('../db/database');
const { sendEmail } = require('../utils/emailService');

// Self-assign to shift
const assignShift = async (req, res) => {
  const { shift_id, hours_volunteered } = req.body;
  const user_id = req.user.id;

  if (!shift_id) {
    return res.status(400).json({ error: 'Shift ID required' });
  }

  try {
    // Check if already assigned
    const existingAssignment = await pool.query(
      'SELECT id FROM assignments WHERE shift_id = $1 AND user_id = $2',
      [shift_id, user_id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({ error: 'Already assigned to this shift' });
    }

    // Create assignment
    const result = await pool.query(
      'INSERT INTO assignments (shift_id, user_id, hours_volunteered, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [shift_id, user_id, hours_volunteered, 'assigned']
    );

    // Get shift and user details for email
    const shiftDetails = await pool.query(
      'SELECT s.*, l.name as location_name FROM shifts s JOIN locations l ON s.location_id = l.id WHERE s.id = $1',
      [shift_id]
    );

    const userDetails = await pool.query('SELECT email, name FROM users WHERE id = $1', [user_id]);

    // Send confirmation email
    const shift = shiftDetails.rows[0];
    const user = userDetails.rows[0];
    const startTime = new Date(shift.start_time).toLocaleString();

    await sendEmail(
      user.email,
      '✅ Shift Assignment Confirmed',
      `Hi ${user.name},\n\nYou've been assigned to a shift!\n\nLocation: ${shift.location_name}\nTime: ${startTime}\nDuration: ${shift.hours_volunteered || 'TBD'} hours\n\nThank you for volunteering!`
    );

    res.status(201).json({ message: 'Assigned to shift', assignment: result.rows[0] });
  } catch (err) {
    console.error('Assign shift error:', err);
    res.status(500).json({ error: 'Failed to assign shift' });
  }
};

// Cancel assignment (until 2 hours before shift)
const cancelAssignment = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // Check if assignment exists and belongs to user
    const assignmentResult = await pool.query(
      'SELECT a.*, s.start_time FROM assignments a JOIN shifts s ON a.shift_id = s.id WHERE a.id = $1',
      [id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const assignment = assignmentResult.rows[0];

    if (assignment.user_id !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if within 2 hours of shift start
    const shiftStartTime = new Date(assignment.start_time).getTime();
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (shiftStartTime - now < twoHoursMs && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cannot cancel within 2 hours of shift start' });
    }

    // Update status to cancelled
    const result = await pool.query(
      'UPDATE assignments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    res.json({ message: 'Assignment cancelled', assignment: result.rows[0] });
  } catch (err) {
    console.error('Cancel assignment error:', err);
    res.status(500).json({ error: 'Failed to cancel assignment' });
  }
};

// Get user's assignments
const getUserAssignments = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT a.*, s.start_time, s.end_time, l.name as location_name
       FROM assignments a
       JOIN shifts s ON a.shift_id = s.id
       JOIN locations l ON s.location_id = l.id
       WHERE a.user_id = $1
       ORDER BY s.start_time DESC`,
      [user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

module.exports = { assignShift, cancelAssignment, getUserAssignments };
