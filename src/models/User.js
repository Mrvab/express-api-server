import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, CreateTableCommand } from '@aws-sdk/lib-dynamodb';
import db from '../utils/database.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// MongoDB Schema
const mongooseSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
mongooseSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
mongooseSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update timestamps on save
mongooseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const MongoUser = mongoose.model('User', mongooseSchema);

// MySQL table creation query
const mysqlTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX email_index (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

// DynamoDB table name
const dynamoTableName = `${config.dynamodb.tablePrefix}users`;

class User {
  constructor(data) {
    this.data = data;
  }

  static async initializeTables() {
    try {
      // Initialize MySQL table
      const mysqlConnection = await db.connectMySQL();
      await mysqlConnection.query(mysqlTableQuery);
      logger.info('MySQL users table initialized');

      // Initialize DynamoDB table
      const dynamodb = db.connectDynamoDB();
      if (db.connections.dynamodb) {
        const createTableCommand = new CreateTableCommand({
          TableName: dynamoTableName,
          AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' },
            { AttributeName: 'email', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: 'EmailIndex',
              KeySchema: [
                { AttributeName: 'email', KeyType: 'HASH' }
              ],
              Projection: {
                ProjectionType: 'ALL'
              },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
              }
            }
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        });
        
        try {
          await db.connections.dynamodb.send(createTableCommand);
          logger.info('DynamoDB users table created');
        } catch (error) {
          if (error.name === 'ResourceInUseException') {
            logger.info('DynamoDB users table already exists');
          } else {
            throw error;
          }
        }
      }
      
      logger.info('Database tables initialized');
    } catch (error) {
      logger.error('Error initializing database tables:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      // MongoDB
      if (db.connections.mongodb) {
        return await MongoUser.findOne({ email });
      }
      
      // MySQL
      if (db.connections.mysql) {
        const [rows] = await db.connections.mysql.query(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );
        return rows[0];
      }
      
      // DynamoDB
      if (db.connections.dynamodb) {
        const command = new QueryCommand({
          TableName: dynamoTableName,
          IndexName: 'EmailIndex',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email
          }
        });
        
        const result = await db.connections.dynamodb.send(command);
        return result.Items[0];
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  async save() {
    try {
      // Hash password if it's new or modified
      if (this.data.password && !this.data.password.startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        this.data.password = await bcrypt.hash(this.data.password, salt);
      }

      // MongoDB
      if (db.connections.mongodb) {
        const user = new MongoUser(this.data);
        return await user.save();
      }
      
      // MySQL
      if (db.connections.mysql) {
        const { id, ...userData } = this.data;
        if (id) {
          const [result] = await db.connections.mysql.query(
            'UPDATE users SET ? WHERE id = ?',
            [userData, id]
          );
          return result;
        } else {
          const [result] = await db.connections.mysql.query(
            'INSERT INTO users SET ?',
            userData
          );
          return { ...userData, id: result.insertId };
        }
      }
      
      // DynamoDB
      if (db.connections.dynamodb) {
        const command = new PutCommand({
          TableName: dynamoTableName,
          Item: {
            ...this.data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
        
        await db.connections.dynamodb.send(command);
        return this.data;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      logger.error('Error saving user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // MongoDB
      if (db.connections.mongodb) {
        return await MongoUser.findById(id);
      }
      
      // MySQL
      if (db.connections.mysql) {
        const [rows] = await db.connections.mysql.query(
          'SELECT * FROM users WHERE id = ?',
          [id]
        );
        return rows[0];
      }
      
      // DynamoDB
      if (db.connections.dynamodb) {
        const command = new GetCommand({
          TableName: dynamoTableName,
          Key: { id }
        });
        
        const result = await db.connections.dynamodb.send(command);
        return result.Item;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      logger.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // MongoDB
      if (db.connections.mongodb) {
        return await MongoUser.findByIdAndDelete(id);
      }
      
      // MySQL
      if (db.connections.mysql) {
        const [result] = await db.connections.mysql.query(
          'DELETE FROM users WHERE id = ?',
          [id]
        );
        return result;
      }
      
      // DynamoDB
      if (db.connections.dynamodb) {
        const command = new DeleteCommand({
          TableName: dynamoTableName,
          Key: { id }
        });
        
        return await db.connections.dynamodb.send(command);
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  static async list(options = {}) {
    const { page = 1, limit = 10, sort = 'desc', sortBy = 'createdAt' } = options;
    
    try {
      // MongoDB
      if (db.connections.mongodb) {
        return await MongoUser.find()
          .sort({ [sortBy]: sort })
          .skip((page - 1) * limit)
          .limit(limit);
      }
      
      // MySQL
      if (db.connections.mysql) {
        const [rows] = await db.connections.mysql.query(
          `SELECT * FROM users ORDER BY ${sortBy} ${sort} LIMIT ? OFFSET ?`,
          [limit, (page - 1) * limit]
        );
        return rows;
      }
      
      // DynamoDB
      if (db.connections.dynamodb) {
        const command = new QueryCommand({
          TableName: dynamoTableName,
          Limit: limit,
          ScanIndexForward: sort === 'asc'
        });
        
        const result = await db.connections.dynamodb.send(command);
        return result.Items;
      }
      
      throw new Error('No database connection available');
    } catch (error) {
      logger.error('Error listing users:', error);
      throw error;
    }
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.data.password);
  }
}

export default User; 