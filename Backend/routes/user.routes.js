// routes/user.routes.js
const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role.middleware');

router.post('/create', authMiddleware, roleMiddleware(['Admin']), userCtrl.createUserByAdmin);

// test protected route
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({ message: 'protected user route', user: req.user });
});

module.exports = router;
