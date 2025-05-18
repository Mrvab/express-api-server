import cluster from 'cluster';
import { logger } from '../utils/logger.js';

class WorkerMonitor {
  constructor() {
    this.stats = {
      requests: 0,
      errors: 0,
      lastReport: Date.now()
    };

    // Report stats every 10 seconds
    setInterval(() => this.reportStats(), 10000);

    // Report health metrics every 5 seconds
    setInterval(() => this.reportHealth(), 5000);

    // Handle shutdown signal
    process.on('message', (msg) => {
      if (msg.type === 'shutdown') {
        this.gracefulShutdown();
      }
    });
  }

  middleware() {
    return (req, res, next) => {
      const startTime = process.hrtime();

      // Count request
      this.stats.requests++;

      // Inject worker ID into response headers
      res.set('X-Worker-ID', cluster.worker.id);

      // Override res.end to track response
      const originalEnd = res.end;
      res.end = (...args) => {
        // Calculate request duration
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        // Track errors
        if (res.statusCode >= 400) {
          this.stats.errors++;
        }

        // Log request details
        logger.info({
          workerId: cluster.worker.id,
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration.toFixed(2)}ms`
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  reportStats() {
    if (!process.send) return;

    process.send({
      type: 'metrics',
      data: {
        requests: this.stats.requests,
        errors: this.stats.errors
      }
    });

    // Reset counters
    this.stats.requests = 0;
    this.stats.errors = 0;
  }

  reportHealth() {
    if (!process.send) return;

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    process.send({
      type: 'health',
      data: {
        healthy: true,
        memoryUsage,
        cpuUsage,
        timestamp: Date.now()
      }
    });
  }

  async gracefulShutdown() {
    logger.info(`Worker ${cluster.worker.id} starting graceful shutdown...`);

    // Report final stats
    this.reportStats();

    // Wait for ongoing requests to complete (adjust timeout as needed)
    await new Promise(resolve => setTimeout(resolve, 5000));

    logger.info(`Worker ${cluster.worker.id} shutting down`);
    process.exit(0);
  }
}

const workerMonitor = new WorkerMonitor();
export default workerMonitor.middleware.bind(workerMonitor); 