import mongoose from 'mongoose';
import { createPool } from 'mysql2/promise';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);

// Database connections
let mongoConnection;
let mysqlPool;
let dynamoClient;

// Setup hooks
beforeAll(async () => {
  // MongoDB setup
  if (process.env.MONGODB_URI) {
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI);
  }

  // MySQL setup
  if (process.env.MYSQL_HOST) {
    mysqlPool = createPool({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT
    });
  }

  // DynamoDB setup
  if (process.env.AWS_REGION) {
    dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      endpoint: process.env.DYNAMODB_ENDPOINT
    });
  }
});

afterAll(async () => {
  // Cleanup connections
  if (mongoConnection) {
    await mongoose.disconnect();
  }
  if (mysqlPool) {
    await mysqlPool.end();
  }
  if (dynamoClient) {
    await dynamoClient.destroy();
  }
});

// Global test utilities
global.createTestUser = async (userData) => {
  // Implementation will be added when we create auth tests
};

// Mock implementations for external services
jest.mock('../src/services/email.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
})); 