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
      // We are only inserting into the 'users' table for now.
      const newUserQuery = `
        INSERT INTO users (name, email, password_hash) 
        VALUES ($1, $2, $3) 
        RETURNING public_id, name, email;
      `;
      const newUser = await pool.query(newUserQuery, [name, email, passwordHash]);
      
      // We would also need a `user_credentials` table in a full implementation,
      // but this is sufficient for now.

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
    // --- Placeholder for now ---
    res.status(200).json({ message: 'Login placeholder' });
  },
};