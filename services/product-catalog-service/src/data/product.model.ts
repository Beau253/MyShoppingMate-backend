import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  gtin: string; // Global Trade Item Number (Barcode)
  name: string;
  brand: string;
  category_path: string[];
  image_urls: string[];
}

const ProductSchema: Schema = new Schema(
  {
    gtin: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    category_path: { type: [String], default: [] },
    image_urls: { type: [String], default: [] },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create a text index for efficient searching on name and brand
ProductSchema.index({ name: 'text', brand: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);