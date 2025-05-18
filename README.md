# Express API Server Template

A modern, secure, and scalable Express.js API server template with multi-database support, authentication, authorization, and comprehensive security features.

## Features

- **Modern JavaScript (ES Modules)**
  - Full ES Modules support
  - Clean and modular code structure

- **Multi-Database Support**
  - MongoDB with Mongoose
  - MySQL with mysql2
  - Amazon DynamoDB
  - Database connection proxy pattern
  - Easy to extend for other databases

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control
  - Token refresh mechanism
  - Secure password hashing with bcrypt

- **Security Features**
  - Helmet security headers
  - Rate limiting
  - CORS configuration
  - XSS protection
  - CSRF protection
  - Request validation with Joi
  - ID encryption for sensitive data

- **Logging & Monitoring**
  - Winston logger
  - Morgan HTTP request logging
  - Detailed error logging
  - Worker process monitoring

- **Scalability**
  - Cluster mode support
  - Zero-downtime restarts
  - Graceful shutdown
  - Load balancing across CPU cores

- **Developer Experience**
  - Environment-based configuration
  - Comprehensive error handling
  - Request/Response validation
  - API documentation
  - Easy to extend and customize

## Prerequisites

- Node.js 18.x or later
- One of the following databases:
  - MongoDB 4.x or later
  - MySQL 8.x or later
  - AWS DynamoDB access

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/express-api-server.git
   cd express-api-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update environment variables in `.env` with your configuration.

## Configuration

The server can be configured using environment variables. See `.env.example` for all available options.

### Required Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=24h
ENCRYPTION_KEY=your_32_char_encryption_key

# Database Configuration (choose one)
# MongoDB
MONGODB_URI=mongodb://localhost:27017/express_api_server

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=express_api_server

# AWS DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
DYNAMODB_TABLE_PREFIX=express_api_
```

## Running the Server

### Development Mode

```bash
# Single process
npm run dev

# Cluster mode
npm run dev:cluster
```

### Production Mode

```bash
# Single process
npm start

# Cluster mode (recommended)
npm run start:cluster
```

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "user"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### User Endpoints

#### Get All Users (Admin only)
```http
GET /api/v1/users
Authorization: Bearer <token>
```

#### Get User by ID
```http
GET /api/v1/users/:id
Authorization: Bearer <token>
```

#### Update User
```http
PUT /api/v1/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### Delete User (Admin only)
```http
DELETE /api/v1/users/:id
Authorization: Bearer <token>
```

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` file
   - Use strong, unique secrets
   - Rotate secrets regularly

2. **Authentication**
   - Use HTTPS in production
   - Implement rate limiting
   - Set secure cookie options
   - Implement token refresh

3. **Database**
   - Use connection pooling
   - Implement query timeouts
   - Sanitize all inputs
   - Use prepared statements

4. **Error Handling**
   - Never expose stack traces
   - Log errors securely
   - Return safe error messages

## Project Structure

```
express-api-server/
├── src/
│   ├── config/
│   │   └── index.js
│   ├── controllers/
│   │   └── user.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── security.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   └── index.js
│   ├── utils/
│   │   ├── database.js
│   │   ├── logger.js
│   │   └── encryption.js
│   ├── cluster.js
│   └── index.js
├── .env.example
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- Express.js team
- Security middleware contributors
- Database driver maintainers
- Open source community 