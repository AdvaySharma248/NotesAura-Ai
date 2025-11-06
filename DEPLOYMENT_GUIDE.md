# Deployment Guide

This guide will help you deploy your Next.js application successfully.

## Common Deployment Issues and Solutions

### Issue: Internal Server Error on `/api/signup` and `/api/check-user`

**Causes:**
1. Missing `DATABASE_URL` environment variable
2. Prisma Client not generated
3. Database migrations not applied
4. Database file/connection not accessible

**Solutions:**

### 1. Environment Variables Configuration

Ensure all required environment variables are set in your deployment platform:

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
GEMINI_API_KEY="your-api-key"
NODE_ENV="production"
```

**For different platforms:**

- **Vercel/Netlify:** Add in dashboard under Environment Variables
- **Docker:** Use `.env` file or `-e` flags
- **VPS/Server:** Create `.env` file in project root

### 2. Database Configuration

**For SQLite (Development/Small Production):**
```bash
# Ensure the prisma directory exists
mkdir -p prisma

# Set proper permissions
chmod 755 prisma

# Set DATABASE_URL
DATABASE_URL="file:./prisma/dev.db"
```

**For Production (Recommended):**
Consider using PostgreSQL or MySQL:
```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/database"

# MySQL
DATABASE_URL="mysql://user:password@host:3306/database"
```

### 3. Build Process

The updated build script now includes:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

This ensures:
- ✅ Prisma Client is generated
- ✅ Database migrations are applied
- ✅ Next.js build is created

### 4. Deployment Steps

#### **Step 1: Install Dependencies**
```bash
npm install
```

#### **Step 2: Generate Prisma Client**
```bash
npm run db:generate
```

#### **Step 3: Run Migrations**
```bash
npx prisma migrate deploy
```

#### **Step 4: Build Application**
```bash
npm run build
```

#### **Step 5: Start Production Server**
```bash
npm start
```

### 5. Platform-Specific Instructions

#### **Vercel**
1. Connect your GitHub repository
2. Add environment variables in Settings → Environment Variables
3. Add build command override: `prisma generate && prisma migrate deploy && next build`
4. Deploy

**Note:** SQLite doesn't work well on Vercel. Use PostgreSQL from Vercel Postgres or external provider.

#### **Railway/Render**
1. Connect repository
2. Add environment variables
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Deploy

#### **Docker**
```dockerfile
# Add to Dockerfile after npm install
RUN npx prisma generate
RUN npx prisma migrate deploy
```

#### **VPS/Dedicated Server**
```bash
# Clone repository
git clone <your-repo>
cd <project>

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Generate Prisma Client
npm run db:generate

# Run migrations
npx prisma migrate deploy

# Build
npm run build

# Start with PM2 (recommended)
pm2 start npm --name "my-app" -- start

# Or start directly
npm start
```

### 6. Verify Deployment

After deployment, check:

1. **Server logs** for database connection:
   ```
   ✅ Database connected successfully
   ```

2. **Test the endpoints:**
   ```bash
   # Health check
   curl https://your-domain.com/api/health
   
   # Check user endpoint
   curl -X POST https://your-domain.com/api/check-user \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

3. **Browser console** - Should see no errors when loading the page

### 7. Troubleshooting

#### Check Server Logs
Look for detailed error messages:
```bash
# The updated API routes now log:
# - Full error message
# - Stack trace
# - Database connection status
```

#### Common Errors:

**"PrismaClient is unable to be run in the browser"**
- Ensure API routes are server-side only
- Check you're not importing Prisma in client components

**"Can't reach database server"**
- Verify `DATABASE_URL` is set correctly
- Check database server is running
- Verify network/firewall settings

**"Migration failed"**
- Run `npx prisma migrate deploy` manually
- Check database permissions
- For fresh start: `npx prisma migrate reset --force`

**"Table does not exist"**
- Migrations weren't applied
- Run `npx prisma migrate deploy`

### 8. Database Backup (Important!)

For SQLite:
```bash
# Backup
cp prisma/dev.db prisma/dev.db.backup

# Restore
cp prisma/dev.db.backup prisma/dev.db
```

For PostgreSQL/MySQL:
```bash
# Use your database's backup tools
pg_dump, mysqldump, etc.
```

## Production Checklist

- [ ] Environment variables configured
- [ ] `NEXTAUTH_SECRET` is strong and unique
- [ ] `NEXTAUTH_URL` points to production domain
- [ ] Database is accessible and migrations applied
- [ ] Build script includes `prisma generate`
- [ ] Server has write permissions for SQLite file (if using SQLite)
- [ ] Logs are being monitored
- [ ] SSL/HTTPS is configured
- [ ] Backup strategy in place

## Need Help?

Check server logs for detailed error messages. The updated API routes provide extensive error logging to help diagnose issues.
