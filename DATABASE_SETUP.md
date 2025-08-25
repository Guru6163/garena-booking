# Database Setup with Neon PostgreSQL

This guide will help you set up your Neon PostgreSQL database and connect it to your Garena Booking System.

## Step 1: Create a Neon Account and Database

1. Go to [Neon.tech](https://neon.tech) and sign up for a free account
2. Click "Create Project" or "New Project"
3. Choose a project name (e.g., "garena-booking")
4. Select your preferred region
5. Click "Create Project"

## Step 2: Get Your Database Connection String

1. In your Neon dashboard, go to the "Dashboard" tab
2. Find the "Connection string" section
3. Copy the connection string that looks like:
   ```
   postgresql://username:password@ep-cool-darkness-123456.us-east-1.aws.neon.tech/dbname?sslmode=require
   ```

## Step 3: Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the `DATABASE_URL` with your actual Neon connection string:
   ```env
   DATABASE_URL="postgresql://your-username:your-password@your-host.neon.tech/your-dbname?sslmode=require"
   ```

## Step 4: Push Database Schema

Run the following command to create the database tables:

```bash
npx prisma db push
```

This will create the `bookings` table in your Neon database.

## Step 5: (Optional) View Your Database

You can use Prisma Studio to view your database:

```bash
npx prisma studio
```

This will open a web interface where you can see and manage your data.

## Step 6: Test the Connection

Start your development server:

```bash
npm run dev
```

Try creating a booking through the web interface to verify everything is working.

## Troubleshooting

### Connection Issues
- Make sure your `.env` file is in the project root
- Verify the connection string format is correct
- Check that you have an internet connection (Neon is cloud-hosted)

### Schema Issues
If you need to reset your database:
```bash
npx prisma db push --force-reset
```

### Environment Variables Not Loading
- Restart your development server after updating `.env`
- Make sure `.env` is not in `.gitignore` (but don't commit sensitive data)

## Data Migration from localStorage

If you had existing bookings in localStorage, they won't automatically transfer to the database. The new system starts fresh with the database as the source of truth.

## Production Deployment

For production, make sure to:
1. Use environment variables for the database URL
2. Never commit the `.env` file to version control
3. Consider using Neon's connection pooling for better performance
