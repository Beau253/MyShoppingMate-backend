import amqp from 'amqplib';

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://myuser:mypassword@rabbitmq';

async function startWorker() {
  console.log('Starting data ingestion worker...');
  try {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    console.log('Successfully connected to RabbitMQ.');

    const queue = 'scrape_jobs';
    await channel.assertQueue(queue, { durable: true });

    console.log(`[*] Waiting for messages in queue: ${queue}. To exit press CTRL+C`);

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        console.log("[x] Received job:", msg.content.toString());
        // In a real implementation, you would do the scraping here.
        // For now, we just acknowledge the message.
        channel.ack(msg);
      }
    });

  } catch (error) {
    console.error('Failed to connect to RabbitMQ, retrying in 5s...', error);
    setTimeout(startWorker, 5000);
  }
}

startWorker();