import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger.js';
import cluster from 'cluster';

class DatabaseConnection {
  constructor() {
    this.connections = {};
    this.currentType = null;
    this.workerId = cluster.isPrimary ? 'primary' : cluster.worker.id;
  }

  // Initialize database based on type
  async init(type) {
    this.currentType = type;

    if (this.connections[type]) {
      return this.connections[type];
    }

    switch (type) {
      case 'mongodb':
        return await this.initMongoDB();
      case 'mysql':
        return await this.initMySQL();
      case 'dynamodb':
        return await this.initDynamoDB();
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  // MongoDB initialization
  async initMongoDB() {
    try {
      if (!this.connections.mongodb) {
        logger.info(`Worker ${this.workerId}: Connecting to MongoDB`);
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 10, // Adjust based on your needs
          minPoolSize: 2
        });
        
        mongoose.connection.on('error', (error) => {
          logger.error(`Worker ${this.workerId}: MongoDB connection error:`, error);
        });

        mongoose.connection.on('disconnected', () => {
          logger.info(`Worker ${this.workerId}: MongoDB disconnected`);
        });

        this.connections.mongodb = connection;
        logger.info(`Worker ${this.workerId}: MongoDB connected successfully`);
      }
      return this.connections.mongodb;
    } catch (error) {
      logger.error(`Worker ${this.workerId}: MongoDB connection error:`, error);
      throw error;
    }
  }

  // MySQL initialization
  async initMySQL() {
    try {
      if (!this.connections.mysql) {
        logger.info(`Worker ${this.workerId}: Connecting to MySQL`);
        const connection = await mysql.createPool({
          host: process.env.MYSQL_HOST,
          user: process.env.MYSQL_USER,
          password: process.env.MYSQL_PASSWORD,
          database: process.env.MYSQL_DATABASE,
          waitForConnections: true,
          connectionLimit: 10, // Adjust per worker
          queueLimit: 0
        });

        // Test the connection
        await connection.getConnection();
        this.connections.mysql = connection;
        logger.info(`Worker ${this.workerId}: MySQL connected successfully`);
      }
      return this.connections.mysql;
    } catch (error) {
      logger.error(`Worker ${this.workerId}: MySQL connection error:`, error);
      throw error;
    }
  }

  // DynamoDB initialization
  async initDynamoDB() {
    try {
      if (!this.connections.dynamodb) {
        logger.info(`Worker ${this.workerId}: Connecting to DynamoDB`);
        const client = new DynamoDBClient({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          },
          maxAttempts: 3
        });

        const docClient = DynamoDBDocumentClient.from(client);
        this.connections.dynamodb = docClient;
        logger.info(`Worker ${this.workerId}: DynamoDB connected successfully`);
      }
      return this.connections.dynamodb;
    } catch (error) {
      logger.error(`Worker ${this.workerId}: DynamoDB connection error:`, error);
      throw error;
    }
  }

  // Get current connection
  async getConnection() {
    if (!this.currentType || !this.connections[this.currentType]) {
      throw new Error('No active database connection');
    }
    return this.connections[this.currentType];
  }

  // Close all connections
  async closeAll() {
    try {
      logger.info(`Worker ${this.workerId}: Closing all database connections`);
      if (this.connections.mongodb) {
        await mongoose.disconnect();
      }
      if (this.connections.mysql) {
        await this.connections.mysql.end();
      }
      // DynamoDB doesn't require explicit connection closing
      
      this.connections = {};
      this.currentType = null;
      logger.info(`Worker ${this.workerId}: All database connections closed`);
    } catch (error) {
      logger.error(`Worker ${this.workerId}: Error closing database connections:`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const db_connection = new DatabaseConnection();

export default db_connection; 