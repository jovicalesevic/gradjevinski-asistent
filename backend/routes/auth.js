import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// POST /api/auth/register - Create a new user (password hashed via User model pre-save hook)
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Korisnik sa ovim emailom već postoji.' });
    }

    const user = new User({ email, password });
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Korisnik sa ovim emailom već postoji.' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login - Authenticate user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen. Molimo registrujte se.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      user: { id: user._id, email: user.email },
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

