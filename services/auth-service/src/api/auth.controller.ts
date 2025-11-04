import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../data/db';
import { config } from '../config';

export const authController = {
  /**
   * Register a new user.
   */
  register: async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // --- Basic Validation ---
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    try {
      // --- Check if user already exists ---
      const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
        return res.status(409).json({ message: 'User with this email already exists.' });
      }

      // --- Hash the password ---
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // --- Insert new user into the database ---
      const newUserQuery = `
        INSERT INTO users (name, email, password_hash) 
        VALUES ($1, $2, $3) 
        RETURNING public_id, name, email;
      `;
      const newUser = await pool.query(newUserQuery, [name, email, passwordHash]);

      res.status(201).json({
        message: 'User registered successfully.',
        user: newUser.rows[0],
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error during registration.' });
    }
  },

  /**
   * Login an existing user.
   */
  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      // --- Find the user by email ---
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        // Use a generic error message to prevent email enumeration attacks.
        return res.status(401).json({ message: 'Invalid credentials.' });
      }
      const user = userResult.rows[0];

      // --- Compare the provided password with the stored hash ---
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      // --- Generate a JWT ---
      const payload = {
        userId: user.public_id,
        email: user.email,
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' }); // Token expires in 1 hour

      res.status(200).json({
        message: 'Login successful.',
        token: token,
        user: {
            public_id: user.public_id,
            name: user.name,
            email: user.email,
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error during login.' });
    }
  },
};