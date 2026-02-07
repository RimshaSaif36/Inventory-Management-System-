# Environment Configuration Setup

This document explains how to set up the environment files for the Inventory Management System.

## Environment Files Created

### Server Environment (`.env`)
Located in: `server/.env`

**Required Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 8000)
- `NODE_ENV`: Environment mode (development/production)

**Optional Variables:**
- `AWS_ACCESS_KEY_ID`: AWS access key for S3
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for S3
- `AWS_REGION`: AWS region (default: us-east-2)
- `S3_BUCKET_NAME`: S3 bucket name for file uploads
- `JWT_SECRET`: Secret key for JWT authentication
- `ALLOWED_ORIGINS`: CORS allowed origins

### Client Environment (`.env.local`)
Located in: `client/.env.local`

**Required Variables:**
- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (default: http://localhost:8000)

**Optional Variables:**
- `NEXT_PUBLIC_APP_NAME`: Application name
- `NEXT_PUBLIC_APP_VERSION`: Application version
- `NODE_ENV`: Environment mode

## Setup Instructions

### 1. Database Setup (PostgreSQL)

1. Install PostgreSQL on your system
2. Create a new database named `inventory_management`
3. Update the `DATABASE_URL` in `server/.env` with your database credentials:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/inventory_management
   ```

### 2. Server Configuration

1. Navigate to the `server` directory
2. Copy `.env.example` to `.env` if needed
3. Update the environment variables with your actual values
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database with sample data:
   ```bash
   npm run seed
   ```

### 3. Client Configuration

1. Navigate to the `client` directory
2. Copy `.env.example` to `.env.local` if needed
3. Update `NEXT_PUBLIC_API_BASE_URL` to match your server URL
4. The client should automatically connect to the backend

### 4. AWS S3 Configuration (Optional)

If you plan to use AWS S3 for file uploads:

1. Create an AWS account and S3 bucket
2. Create an IAM user with S3 permissions
3. Add the AWS credentials to `server/.env`:
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-2
   S3_BUCKET_NAME=your-bucket-name
   ```

## Running the Application

### Development Mode

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the client (in a new terminal):
   ```bash
   cd client
   npm run dev
   ```

3. Access the application:
   - Client: http://localhost:3000 (or 3001 if 3000 is in use)
   - Server API: http://localhost:8000

### Production Mode

Refer to the AWS EC2 deployment instructions in `server/aws-ec2-instructions.md`

## Important Notes

- Never commit actual environment files (`.env`, `.env.local`) to version control
- Use `.env.example` files as templates for required variables
- Update `NEXT_PUBLIC_API_BASE_URL` when deploying to production
- Ensure database is running before starting the server
- The server must be running before starting the client for API calls to work