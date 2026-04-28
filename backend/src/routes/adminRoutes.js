const express = require('express');
const { getUsers, updateUserRole, getStats } = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authMiddleware, adminOnly, getUsers);
router.put('/users/:id/role', authMiddleware, adminOnly, updateUserRole);
router.get('/stats', authMiddleware, adminOnly, getStats);

module.exports = router;
