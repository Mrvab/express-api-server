import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import config from '../config/index.js';
import logger from './logger.js';

class DatabaseProxy {
  constructor() {
    this.connections = {
      mongodb: null,
      mysql: null,
      dynamodb: null,
    };
  }

  async connectMongoDB() {
    try {
      if (!this.connections.mongodb) {
        this.connections.mongodb = await mongoose.connect(config.mongodb.uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        logger.info('MongoDB connection established');
      }
      return this.connections.mongodb;
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async connectMySQL() {
    try {
      if (!this.connections.mysql) {
        this.connections.mysql = await mysql.createPool({
          host: config.mysql.host,
          port: config.mysql.port,
          user: config.mysql.user,
          password: config.mysql.password,
          database: config.mysql.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
        logger.info('MySQL connection pool established');
      }
      return this.connections.mysql;
    } catch (error) {
      logger.error('MySQL connection error:', error);
      throw error;
    }
  }

  connectDynamoDB() {
    try {
      if (!this.connections.dynamodb) {
        const client = new DynamoDBClient({
          region: config.dynamodb.region,
          credentials: config.dynamodb.credentials,
        });
        this.connections.dynamodb = DynamoDBDocumentClient.from(client);
        logger.info('DynamoDB connection established');
      }
      return this.connections.dynamodb;
    } catch (error) {
      logger.error('DynamoDB connection error:', error);
      throw error;
    }
  }

  async closeAll() {
    try {
      if (this.connections.mongodb) {
        await mongoose.disconnect();
        this.connections.mongodb = null;
      }
      if (this.connections.mysql) {
        await this.connections.mysql.end();
        this.connections.mysql = null;
      }
      if (this.connections.dynamodb) {
        // DynamoDB doesn't require explicit connection closing
        this.connections.dynamodb = null;
      }
      logger.info('All database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }
}

const db = new DatabaseProxy();
export default db; 