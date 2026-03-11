// lib/usageMetrics.mjs - Usage tracking for billing compliance
import logger from './logger.mjs';

class UsageMetrics {
  constructor() {
    this.metrics = {
      documentsParsed: 0,
      chatQueries: 0,
      exportsGenerated: 0,
      apiCalls: 0,
      errors: 0,
      rateLimited: 0,
      sessionStart: new Date().toISOString()
    };
    
    // Periodically log metrics every 5 minutes
    setInterval(() => this.logMetrics(), 5 * 60 * 1000);
  }
  
  increment(metricName) {
    if (this.metrics.hasOwnProperty(metricName)) {
      this.metrics[metricName]++;
      logger.debug('Usage metric incremented', { metric: metricName, value: this.metrics[metricName] });
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }
  
  logMetrics() {
    logger.info('Usage metrics snapshot', this.getMetrics());
  }
  
  // Audit log for compliance
  auditLog(event, details = {}) {
    logger.info('Audit event', {
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

export default new UsageMetrics();
