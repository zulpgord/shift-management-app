const express = require('express');
const { getShifts, createShift, updateShift, deleteShift } = require('../controllers/shiftController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', authMiddleware, getShifts);
router.post('/', authMiddleware, adminOnly, createShift);
router.put('/:id', authMiddleware, adminOnly, updateShift);
router.delete('/:id', authMiddleware, adminOnly, deleteShift);

module.exports = router;
