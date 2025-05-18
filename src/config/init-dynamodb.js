import { CreateTableCommand } from '@aws-sdk/client-dynamodb';
import db_connection from './database.js';
import { logger } from '../utils/logger.js';

const createUsersTable = async () => {
  try {
    const client = await db_connection.init('dynamodb');
    
    const params = {
      TableName: 'Users',
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
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
      ]
    };

    await client.send(new CreateTableCommand(params));
    logger.info('DynamoDB Users table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      logger.info('DynamoDB Users table already exists');
    } else {
      logger.error('Error creating DynamoDB table:', error);
      throw error;
    }
  }
};

export { createUsersTable }; 