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
const amqplib_1 = __importDefault(require("amqplib"));
const scraper_service_1 = require("./services/scraper.service");
const RABBITMQ_URI = process.env.RABBITMQ_URI;
if (!RABBITMQ_URI) {
    console.error('RABBITMQ_URI environment variable is not set.');
    process.exit(1);
}
function startWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting data ingestion worker...');
        try {
            const connection = yield amqplib_1.default.connect(RABBITMQ_URI);
            const channel = yield connection.createChannel();
            console.log('Successfully connected to RabbitMQ.');
            const queue = 'scrape_jobs';
            yield channel.assertQueue(queue, { durable: true });
            // Process one job at a time to avoid overwhelming the system
            channel.prefetch(1);
            console.log(`[*] Waiting for messages in queue: ${queue}.`);
            channel.consume(queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                if (msg !== null) {
                    const jobPayload = msg.content.toString();
                    console.log(`[x] Received job: ${jobPayload}`);
                    try {
                        const { target, query } = JSON.parse(jobPayload);
                        if (!target || !query) {
                            throw new Error('Invalid job payload. "target" and "query" are required.');
                        }
                        // --- CALL THE SCRAPER SERVICE ---
                        const scrapedData = yield scraper_service_1.scraperService.scrape(target, query);
                        console.log('Scraping completed. Result:', scrapedData);
                        // In a real implementation, you would now publish this scrapedData
                        // to a different queue for the price-data-service to process.
                    }
                    catch (error) {
                        console.error('Error processing job:', error);
                        // Here you might want to send the message to a "dead-letter" queue
                        // for later inspection.
                    }
                    finally {
                        // Acknowledge the message so RabbitMQ knows it has been processed.
                        channel.ack(msg);
                    }
                }
            }));
        }
        catch (error) {
            console.error('Failed to connect to RabbitMQ, retrying in 5s...', error);
            setTimeout(startWorker, 5000);
        }
    });
}
startWorker();
