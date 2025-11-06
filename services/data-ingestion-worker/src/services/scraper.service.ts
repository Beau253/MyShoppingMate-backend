import puppeteer from 'puppeteer';

// A placeholder interface for the scraped data.
interface ScrapedProduct {
  name: string;
  price: string;
  // Add other fields as needed, e.g., brand, imageUrl
}

/**
 * Scrapes Woolworths for a given search query.
 * NOTE: CSS Selectors are EXTREMELY brittle and will break when the website changes.
 * These are examples and will need to be updated by inspecting the live website.
 */
async function scrapeWoolworths(query: string): Promise<ScrapedProduct[]> {
  console.log(`[ScraperService] Starting scrape for "${query}" on Woolworths.`);
  const browser = await puppeteer.launch({
    // These args are crucial for running in a Docker container
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  try {
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.goto('https://www.woolworths.com.au/', { waitUntil: 'networkidle2' });

    // Type the query into the search bar
    // The selector '#wx-header-search-bar' is an example and might change.
    await page.type('#wx-header-search-bar', query, { delay: 100 });
    
    // Click the search button and wait for navigation
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    console.log(`[ScraperService] Navigated to results page for "${query}".`);

    // Now, execute code inside the browser to extract the data
    const products = await page.evaluate(() => {
      const results: ScrapedProduct[] = [];
      // This selector is also an example. You must inspect the live site to find the correct one.
      const productTiles = document.querySelectorAll('div.product-tile-v2');

      productTiles.forEach(tile => {
        const nameElement = tile.querySelector('.product-title-link') as HTMLElement;
        const priceElement = tile.querySelector('.price') as HTMLElement;

        if (nameElement && priceElement) {
          results.push({
            name: nameElement.innerText.trim(),
            price: priceElement.innerText.trim(),
          });
        }
      });
      return results;
    });

    console.log(`[ScraperService] Found ${products.length} products for "${query}".`);
    return products;
  } catch (error) {
    console.error('[ScraperService] Error during scraping:', error);
    return []; // Return an empty array on failure
  } finally {
    await browser.close();
    console.log(`[ScraperService] Browser closed for "${query}".`);
  }
}

export const scraperService = {
  scrape: (target: string, query: string) => {
    switch (target.toLowerCase()) {
      case 'woolworths':
        return scrapeWoolworths(query);
      // Add cases for 'coles', 'aldi', etc. here
      default:
        console.warn(`[ScraperService] No scraper found for target: ${target}`);
        return Promise.resolve([]);
    }
  }
};