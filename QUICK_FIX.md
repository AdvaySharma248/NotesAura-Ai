# Quick Fix for Internal Server Error

## Immediate Actions to Fix Your Deployment

### 1. Check Environment Variables (MOST COMMON ISSUE)

In your deployment platform, ensure these are set:

```env
DATABASE_URL=file:./prisma/dev.db
NEXTAUTH_SECRET=any-random-string-here
NEXTAUTH_URL=https://your-actual-domain.com
```

### 2. Rebuild with Updated Build Script

The build script has been updated to:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

**Action:** Trigger a new deployment/rebuild in your platform.

### 3. Check Database Connection

Visit: `https://your-domain.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "database": {
    "configured": true,
    "connected": true
  }
}
```

If `connected: false`, the database is not accessible.

### 4. Platform-Specific Quick Fixes

#### **Vercel** (SQLite won't work on Vercel!)
- Switch to PostgreSQL (Vercel Postgres)
- Update `DATABASE_URL` to PostgreSQL connection string
- Redeploy

#### **Railway/Render/Heroku**
- Add `DATABASE_URL` environment variable
- Add `NEXTAUTH_SECRET` environment variable
- Trigger redeploy

#### **VPS/Server**
```bash
# SSH into server
cd /path/to/your/project

# Pull latest changes
git pull

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Restart server
pm2 restart all
# or
npm start
```

### 5. Check Server Logs

Look for these messages:
- ✅ `Database connected successfully` - Good!
- ❌ `Database connection failed` - Check DATABASE_URL
- ❌ `PrismaClient initialization error` - Run `prisma generate`

### 6. Test API Endpoints

```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Test check-user endpoint
curl -X POST https://your-domain.com/api/check-user \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Most Likely Cause

**Missing `DATABASE_URL` environment variable** - Add it in your deployment platform's environment settings and redeploy.

## Still Not Working?

1. Check deployment logs for error details
2. Ensure `prisma generate` ran during build
3. Verify database file exists and has write permissions (for SQLite)
4. Consider switching to PostgreSQL for production deployments

See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting.
