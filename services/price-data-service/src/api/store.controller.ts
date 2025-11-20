import { Request, Response } from 'express';
import { pool } from '../data/db';

export const getStores = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM stores ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const addStore = async (req: Request, res: Response) => {
    const { name, chain } = req.body;

    if (!name || !chain) {
        return res.status(400).json({ message: 'Name and chain are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO stores (name, chain) VALUES ($1, $2) RETURNING *',
            [name, chain]
        );
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error('Error adding store:', error);
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ message: 'Store already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};
