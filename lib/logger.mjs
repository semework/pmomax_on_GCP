// lib/logger.mjs - Structured logging for Cloud Logging compliance
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'pmomax-pid-architect',
    version: '1.0.18',
    environment: process.env.NODE_ENV || 'production'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in non-production
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/app.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

export default logger;
