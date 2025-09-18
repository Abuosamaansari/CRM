// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');

router.post('/send-otp', authCtrl.sendOtp);      // body: { email, type } type: register|login|forgot
router.post('/verify-otp', authCtrl.verifyOtp);  // body: { email, otp }
router.post('/login', authCtrl.login);           // body: { email, password }
router.post('/refresh-token', authCtrl.refreshToken); // body: { refreshToken }
router.post('/logout', authCtrl.logout);         // body: { refreshToken }

module.exports = router;
