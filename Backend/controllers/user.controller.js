// controllers/user.controller.js
const bcrypt = require('bcryptjs');
const { findByEmail, createUser, createOtp } = require('../models/user.model');
const sendEmail = require('../utils/email');

exports.createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, role = 'User', sendOtp = true } = req.body;
    // role validation - DB values: Admin, Manager, User
    if (!['Manager', 'User'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only Manager or User allowed.' });
    }

    const exists = await findByEmail(email);
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const isVerified = sendOtp ? 0 : 1;
    const userId = await createUser({ name, email, passwordHash: hash, role, isVerified });

    if (sendOtp) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + (Number(process.env.OTP_EXPIRE_MIN || 10) * 60 * 1000));
      await createOtp({ user_id: userId, email, otp_code: otp, type: 'register', expires_at: expiresAt });
      await sendEmail(email, 'Your Billing App - Verify your email', `Hello ${name}, your OTP is ${otp}`);
    }

    return res.json({ message: `${role} created successfully`, userId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
