"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.scrapeColes = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const COLES_IMAGE_BASE_URL = 'https://productimages.coles.com.au/productimages';
/** Converts a string from SNAKE_CASE or kebab-case to Title Case. */
const toTitleCase = (str) => {
    return str.replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};
/**
 * Scrapes Coles products by fetching the search page and parsing the embedded
 * __NEXT_DATA__ JSON object from the initial HTML response.
 */
const scrapeColes = (query) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const searchUrl = `https://www.coles.com.au/search/products?q=${encodeURIComponent(query)}`;
    console.log(`[ColesScraper] Fetching data for query "${query}" from: ${searchUrl}`);
    try {
        // 1. Fetch the HTML content of the search page
        const { data: html } = yield axios_1.default.get(searchUrl, {
            headers: { 'User-Agent': USER_AGENT },
        });
        // 2. Parse the HTML and find the __NEXT_DATA__ script tag
        const $ = cheerio.load(html);
        const scriptTag = $('#__NEXT_DATA__');
        if (scriptTag.length === 0) {
            console.error('[ColesScraper] Error: Could not find the "__NEXT_DATA__" script tag. The website structure may have changed.');
            return [];
        }
        // 3. Extract and parse the JSON data
        const scriptContent = scriptTag.html();
        if (!scriptContent) {
            console.error('[ColesScraper] Error: The "__NEXT_DATA__" script tag is empty.');
            return [];
        }
        const pageData = JSON.parse(scriptContent);
        if (!pageData || !((_b = (_a = pageData.props) === null || _a === void 0 ? void 0 : _a.pageProps) === null || _b === void 0 ? void 0 : _b.searchResults)) {
            console.log('[ColesScraper] Could not find __NEXT_DATA__ or searchResults. No products found.');
            return [];
        }
        // 4. Navigate the JSON object and extract product data
        const results = pageData.props.pageProps.searchResults.results || [];
        const mappedProducts = results
            .filter((p) => p && p._type === 'PRODUCT') // Ensure we only process product items
            .map((product) => {
            var _a, _b, _c, _d;
            const categories = new Set();
            // 1. Extract from merchandise hierarchy (e.g., "DAIRY", "WHOLE WHITE")
            if (product.merchandiseHeir) {
                Object.values(product.merchandiseHeir).forEach((value) => {
                    if (typeof value === 'string' && value.trim()) {
                        categories.add(toTitleCase(value.trim()));
                    }
                });
            }
            // 2. Extract from online heirs/tags (e.g., "Lactose Free", "Gluten Free")
            if ((_a = product.onlineHeirs) === null || _a === void 0 ? void 0 : _a.tags) {
                product.onlineHeirs.tags.forEach((tag) => {
                    if (tag === null || tag === void 0 ? void 0 : tag.description) {
                        categories.add(toTitleCase(tag.description));
                    }
                });
            }
            const imageUrl = (product.imageUris && product.imageUris.length > 0)
                ? `${COLES_IMAGE_BASE_URL}${product.imageUris[0].uri}`
                : '';
            return {
                gtin: String(product.id || 'N/A'),
                name: ((_b = product.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'N/A',
                brand: ((_c = product.brand) === null || _c === void 0 ? void 0 : _c.trim()) || 'N/A',
                price: ((_d = product.pricing) === null || _d === void 0 ? void 0 : _d.now) || 0,
                imageUrl,
                size: product.size || 'N/A',
                store: 'Coles',
                categories: Array.from(categories),
            };
        });
        console.log(`[ColesScraper] Scraping complete. Total products found: ${mappedProducts.length}.`);
        return mappedProducts;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error(`[ColesScraper] HTTP Error: ${error.message}`);
            console.error(`[ColesScraper] Status: ${(_c = error.response) === null || _c === void 0 ? void 0 : _c.status} | URL: ${searchUrl}`);
        }
        else if (error instanceof SyntaxError) {
            console.error(`[ColesScraper] JSON Parsing Error: ${error.message}. The data structure may have changed.`);
        }
        else {
            console.error(`[ColesScraper] An unexpected error occurred: ${error.message}`);
        }
        // It's helpful to log the error stack for debugging
        console.error(error);
        return []; // Return an empty array on any failure
    }
});
exports.scrapeColes = scrapeColes;
