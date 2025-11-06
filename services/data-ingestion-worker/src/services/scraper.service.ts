import axios from 'axios';

// Define interfaces to type the incoming JSON data from the API.
// This provides type safety and autocompletion.
interface WoolworthsProduct {
  Name: string;
  DisplayName: string;
  Price: number;
  InstorePrice: number;
  Barcode: string;
  Brand: string;
  SmallImageFile: string;
  PackageSize: string;
}

interface WoolworthsResponse {
  Products: {
    Products: WoolworthsProduct[];
  }[];
  SearchResultsCount: number;
}

/**
 * Scrapes Woolworths for a given search query by calling their private API.
 */
async function scrapeWoolworthsAPI(query: string, page: number = 1): Promise<any[]> {
  const url = 'https://www.woolworths.com.au/apis/ui/Search/products';

  const payload = {
    SearchTerm: query,
    PageNumber: page,
    PageSize: 36, // As seen in the provided data
    SortType: "TraderRelevance",
    // Add other payload fields if necessary
  };

  const headers = {
    'Content-Type': 'application/json',
    // Mimic a real browser user-agent
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  };

  console.log(`[ScraperService] Posting to Woolworths API for query: "${query}", page: ${page}`);

  try {
    const response = await axios.post<WoolworthsResponse>(url, payload, { headers });
    
    // The response is nested, so we need to extract the relevant product array.
    const products = response.data.Products.flatMap(p => p.Products);

    console.log(`[ScraperService] Found ${products.length} products on page ${page}. Total results: ${response.data.SearchResultsCount}`);

    // Map the complex API response to our simpler, unified data model.
    const formattedProducts = products.map(p => ({
        gtin: p.Barcode,
        name: p.DisplayName,
        brand: p.Brand,
        price: p.InstorePrice, // Use InstorePrice as it's the most relevant
        imageUrl: p.SmallImageFile,
        size: p.PackageSize,
        store: 'Woolworths',
    }));

    return formattedProducts;

  } catch (error) {
    console.error('[ScraperService] Error calling Woolworths API:', error);
    return [];
  }
}


export const scraperService = {
  scrape: (target: string, query: string) => {
    switch (target.toLowerCase()) {
      case 'woolworths':
        // For now, we are only fetching the first page. Pagination logic can be added here.
        return scrapeWoolworthsAPI(query, 1);
      
      // Cases for 'coles', 'aldi' would be added here. They would likely
      // require the Puppeteer approach if they don't have a clear API like this.
      default:
        console.warn(`[ScraperService] No scraper found for target: ${target}`);
        return Promise.resolve([]);
    }
  }
};