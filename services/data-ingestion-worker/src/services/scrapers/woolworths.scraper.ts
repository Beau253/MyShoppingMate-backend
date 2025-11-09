import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from 'puppeteer';
import { Product, WoolworthsFilter, ScraperFunction } from './types';

puppeteer.use(StealthPlugin());

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SEARCH_API_URL = 'https://www.woolworths.com.au/apis/ui/Search/products';

interface RawScrapedData {
  products: any[];
  aggregations: any[];
  facetFilters: string[];
}

function buildCategoryKeywordMap(aggregations: any[], facetFilters: string[]): Map<string, string[]> {
  const categoryMap = new Map<string, string[]>();
  const knownSynonyms: { [key: string]: string[] } = {
    'Full Fat': ['full fat', 'full cream', 'whole milk'],
  };

  const allFilterTerms = new Set<string>(facetFilters);

  const relevantAggregations = ['Allergens', 'Lifestyle'];
  aggregations.forEach(agg => {
    if (relevantAggregations.includes(agg.Name) && agg.ResultsGrouped) {
      agg.ResultsGrouped.forEach((group: any) => {
        group.Filters.forEach((filter: any) => allFilterTerms.add(filter.Name));
      });
    }
  });

  allFilterTerms.forEach(term => {
    const keywords = knownSynonyms[term] || [term.toLowerCase()];
    categoryMap.set(term, keywords);
  });

  return categoryMap;
}

function assignCategoriesToProduct(product: any, categoryMap: Map<string, string[]>): string[] {
  const assignedCategories = new Set<string>();
  const searchableText = [
    product.DisplayName,
    product.AdditionalAttributes?.description,
    product.AdditionalAttributes?.sapsegmentname,
    product.AdditionalAttributes?.piessubcategorynamesjson,
    product.AdditionalAttributes?.lifestyleanddietarystatement,
    product.AdditionalAttributes?.allergystatement,
  ]
    .join(' ')
    .toLowerCase();

  for (const [category, keywords] of categoryMap.entries()) {
    for (const keyword of keywords) {
      if (searchableText.includes(keyword)) {
        assignedCategories.add(category);
        break;
      }
    }
  }

  if (assignedCategories.has('Low Fat') && assignedCategories.has('Full Fat')) {
    const productName = (product.DisplayName || '').toLowerCase();
    if (productName.includes('low fat') || productName.includes('skim') || productName.includes('lite')) {
      assignedCategories.delete('Full Fat');
    }
  }

  return Array.from(assignedCategories);
}

export const scrapeWoolworths: ScraperFunction = async (query: string, filters: WoolworthsFilter[] = []): Promise<Product[]> => {
  let browser: Browser | null = null;
  const allEnrichedProducts: Product[] = [];
  console.log(`[WoolworthsScraper] Launching browser for query: "${query}" with ${filters.length} filters.`);

  try {
    browser = await puppeteer.launch({
      headless: process.env.NODE_ENV === 'production',
      dumpio: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    if (!browser) {
      throw new Error('[WoolworthsScraper] Failed to launch Puppeteer browser.');
    }

    const browserPage = await browser.newPage();
    await browserPage.setUserAgent(USER_AGENT);
    await browserPage.setViewport({ width: 1920, height: 1080 });

    console.log('[WoolworthsScraper] Navigating to homepage to establish session...');
    await browserPage.goto('https://www.woolworths.com.au', { waitUntil: 'domcontentloaded' });

    let currentPage = 1;
    let hasMorePages = true;
    let previousPageGtins = new Set<string>();

    while (hasMorePages) {
      console.log(`[WoolworthsScraper] Scraping page ${currentPage}...`);
      const rawData: RawScrapedData = await browserPage.evaluate(
        (apiUrl, searchTerm, filterList, pageNum) => {
          return fetch(apiUrl, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              SearchTerm: searchTerm, PageNumber: pageNum, PageSize: 36, SortType: 'TraderRelevance', Filters: filterList,
            }),
          })
          .then(response => {
            if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
            return response.json();
          })
          .then(data => {
            const outerProducts = data.Products || [];
            const allInnerProducts: any[] = [];
            outerProducts.forEach((group: any) => {
              if (group && group.Products) allInnerProducts.push(...group.Products);
            });
            return {
              products: allInnerProducts,
              aggregations: data.Aggregations || [],
              facetFilters: data.FacetFilters || [],
            };
          });
        },
        SEARCH_API_URL, query, filters, currentPage
      );

      if (rawData.products.length === 0) {
        hasMorePages = false;
        console.log(`[WoolworthsScraper] Page ${currentPage} has no products. Ending pagination.`);
        continue;
      }

      const currentPageGtins = new Set(rawData.products.map(p => p.Barcode).filter(Boolean));
      if (currentPageGtins.size > 0 && Array.from(currentPageGtins).every(gtin => previousPageGtins.has(gtin))) {
        hasMorePages = false;
        console.log(`[WoolworthsScraper] Page ${currentPage} contains only duplicate products. Ending pagination.`);
        continue;
      }

      if (currentPageGtins.size > 0) {
        previousPageGtins = currentPageGtins;
      }

      const categoryMap = buildCategoryKeywordMap(rawData.aggregations, rawData.facetFilters);

      const enrichedProducts: Product[] = rawData.products.map(product => ({
          gtin: product.Barcode || 'N/A',
          name: product.DisplayName,
          brand: product.Brand || 'N/A',
          price: product.Price,
          imageUrl: product.MediumImageFile,
          size: product.PackageSize,
          store: 'Woolworths' as const,
          categories: assignCategoriesToProduct(product, categoryMap),
      }));

      allEnrichedProducts.push(...enrichedProducts);
      currentPage++;
    }

    console.log(`[WoolworthsScraper] Pagination complete. Total enriched products: ${allEnrichedProducts.length}.`);
    return allEnrichedProducts;

  } catch (error) {
    const err = error as Error;
    console.error(`[WoolworthsScraper] An error occurred: ${err.message}`);
    return allEnrichedProducts;
  } finally {
    if (browser) {
      console.log('[WoolworthsScraper] Closing browser.');
      await browser.close();
    }
  }
}

