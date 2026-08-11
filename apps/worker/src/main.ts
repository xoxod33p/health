import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://:redis_dev_only@localhost:6379', {
  maxRetriesPerRequest: null,
});
const queueNames = ['sensor-expiration', 'notifications', 'email', 'reports', 'audit', 'cleanup'] as const;

for (const queueName of queueNames) {
  new Queue(queueName, { connection });
  new Worker(queueName, async (job) => {
    console.info(JSON.stringify({ event: 'job_processed', queue: queueName, jobId: job.id }));
  }, { connection });
}

console.info(JSON.stringify({ event: 'worker_started', queues: queueNames }));
