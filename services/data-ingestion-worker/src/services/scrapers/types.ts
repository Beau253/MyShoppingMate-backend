// A unified data model for a product, regardless of the source.
export interface Product {
  gtin: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  size: string;
  store: 'Woolworths' | 'Coles' | 'Aldi';
  categories: string[];
}

// Interface for the filter structure the Woolworths API expects.
export interface WoolworthsFilter {
  Key: string;
  Items: { Term: string }[];
}

export type ScraperFunction = (query: string, filters?: WoolworthsFilter[]) => Promise<Product[]>;