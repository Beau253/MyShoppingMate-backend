import amqp from 'amqplib';
import { scraperService } from './services/scraper.service';

const RABBITMQ_URI = process.env.RABBITMQ_URI;

if (!RABBITMQ_URI) {
  console.error('RABBITMQ_URI environment variable is not set.');
  process.exit(1);
}

async function startWorker() {
  console.log('Starting data ingestion worker...');
  try {
    const connection = await amqp.connect(RABBITMQ_URI as string);
    const channel = await connection.createChannel();
    console.log('Successfully connected to RabbitMQ.');

    const queue = 'scrape_jobs';
    await channel.assertQueue(queue, { durable: true });

    // Process one job at a time to avoid overwhelming the system
    channel.prefetch(1);

    console.log(`[*] Waiting for messages in queue: ${queue}.`);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const jobPayload = msg.content.toString();
        console.log(`[x] Received job: ${jobPayload}`);

        try {
          const { target, query } = JSON.parse(jobPayload);

          if (!target || !query) {
            throw new Error('Invalid job payload. "target" and "query" are required.');
          }

          // --- CALL THE SCRAPER SERVICE ---
          const scrapedData = await scraperService.scrape(target, query);
          console.log('Scraping completed. Result:', scrapedData);

          // In a real implementation, you would now publish this scrapedData
          // to a different queue for the price-data-service to process.

        } catch (error) {
          console.error('Error processing job:', error);
          // Here you might want to send the message to a "dead-letter" queue
          // for later inspection.
        } finally {
          // Acknowledge the message so RabbitMQ knows it has been processed.
          channel.ack(msg);
        }
      }
    });

  } catch (error) {
    console.error('Failed to connect to RabbitMQ, retrying in 5s...', error);
    setTimeout(startWorker, 5000);
  }
}

startWorker();