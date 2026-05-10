const express = require('express');
const { getUsers, updateUserRole, resetUserPassword, getStats, fixFutureShifts } = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/users', authMiddleware, adminOnly, getUsers);
router.put('/users/:id/role', authMiddleware, adminOnly, updateUserRole);
router.put('/users/:id/password', authMiddleware, adminOnly, resetUserPassword);
router.get('/stats', authMiddleware, adminOnly, getStats);
router.post('/fix-shifts', authMiddleware, adminOnly, fixFutureShifts);

module.exports = router;
