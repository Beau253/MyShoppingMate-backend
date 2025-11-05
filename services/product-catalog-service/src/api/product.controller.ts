import { Request, Response } from 'express';
import Product from '../data/product.model';

export const productController = {
  /**
   * Search for products using a text query.
   */
  searchProducts: async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: 'Search query "q" is required.' });
    }
    try {
      // Use the text index for a "Google-like" search.
      const products = await Product.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }); // Sort by relevance

      res.status(200).json(products);
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },

  /**
   * Add a new product to the catalog.
   */
  addProduct: async (req: Request, res: Response) => {
    const { gtin, name, brand } = req.body;
    if (!gtin || !name || !brand) {
      return res.status(400).json({ message: 'gtin, name, and brand are required.' });
    }
    try {
      const existingProduct = await Product.findOne({ gtin });
      if (existingProduct) {
        return res.status(409).json({ message: 'Product with this GTIN already exists.' });
      }
      const newProduct = new Product({ gtin, name, brand });
      await newProduct.save();
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Add product error:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  },
};