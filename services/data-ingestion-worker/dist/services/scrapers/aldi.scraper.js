"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAldi = void 0;
const axios_1 = __importDefault(require("axios"));
const API_URL = 'https://api.aldi.com.au/v3/product-search';
const PAGE_SIZE = 30; // Based on the HAR file analysis
/**
 * Creates a URL-friendly slug from a string.
 * e.g., "My Product Name!" -> "my-product-name"
 * @param text The text to slugify.
 * @returns A URL-friendly slug.
 */
const createSlug = (text) => {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .trim().replace(/\s+/g, '-'); // Replace spaces with hyphens
};
/**
 * Scrapes ALDI products by directly calling their public search API.
 * This is much more efficient than a full browser scrape.
 */
const scrapeAldi = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const allProducts = [];
    let offset = 0;
    let hasMorePages = true;
    console.log(`[AldiScraper] Starting scrape for query: "${query}"`);
    while (hasMorePages) {
        try {
            console.log(`[AldiScraper] Fetching page with offset ${offset}...`);
            const response = yield axios_1.default.get(API_URL, {
                params: {
                    q: query,
                    limit: PAGE_SIZE,
                    offset: offset,
                    sort: 'relevance',
                    // These other params seem to be static but are included for completeness
                    currency: 'AUD',
                    serviceType: 'walk-in',
                    testVariant: 'A',
                    servicePoint: 'G107', // This might be a store ID, but seems to work generally
                },
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                },
            });
            const { data: products, meta } = response.data;
            if (!products || products.length === 0) {
                hasMorePages = false;
                continue;
            }
            const mappedProducts = products.map(p => {
                var _a;
                const slug = createSlug(p.name);
                const imageUrl = ((_a = p.assets[0]) === null || _a === void 0 ? void 0 : _a.url.replace('{width}', '300').replace('{slug}', slug)) || '';
                return {
                    gtin: p.sku,
                    name: p.name,
                    brand: p.brandName || 'ALDI',
                    price: p.price.amount / 100,
                    imageUrl: imageUrl,
                    size: p.sellingSize || 'N/A',
                    store: 'Aldi',
                    categories: [], // No category data in this simple API response
                };
            });
            allProducts.push(...mappedProducts);
            // Check if there are more pages
            offset += PAGE_SIZE;
            hasMorePages = offset < meta.pagination.totalCount;
        }
        catch (error) {
            console.error(`[AldiScraper] An error occurred during fetch: ${error.message}`);
            hasMorePages = false; // Stop pagination on error
        }
    }
    console.log(`[AldiScraper] Scraping complete. Total products found: ${allProducts.length}.`);
    return allProducts;
});
exports.scrapeAldi = scrapeAldi;
