import cluster from 'cluster';
import os from 'os';
import logger from './utils/logger.js';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  logger.info(`Primary ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Log when a worker dies
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker...');
    cluster.fork();
  });

  // Log worker status changes
  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

  // Handle worker messages
  cluster.on('message', (worker, message) => {
    logger.debug(`Message from worker ${worker.process.pid}:`, message);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Primary process received shutdown signal');
    
    // Disconnect all workers
    for (const id in cluster.workers) {
      cluster.workers[id].disconnect();
    }

    // Exit after all workers are disconnected
    cluster.on('disconnect', (worker) => {
      logger.info(`Worker ${worker.process.pid} disconnected`);
      
      if (Object.keys(cluster.workers).length === 0) {
        logger.info('All workers disconnected. Shutting down primary process...');
        process.exit(0);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

} else {
  // Worker process
  logger.info(`Worker ${process.pid} started`);
  
  // Import and start the application
  import('./index.js').catch((error) => {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  });

  // Handle uncaught exceptions in worker
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in worker:', error);
    process.exit(1);
  });

  // Handle unhandled rejections in worker
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection in worker:', reason);
    process.exit(1);
  });
} 