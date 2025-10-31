# Google OAuth Setup Guide for NotesAura AI

## Overview
Your application already has Google OAuth fully implemented! You just need to configure the credentials from Google Cloud Console.

## Step-by-Step Instructions

### 1. Access Google Cloud Console
- Go to: https://console.cloud.google.com/
- Sign in with your Google account

### 2. Create a New Project
1. Click on the project dropdown at the top of the page
2. Click "New Project"
3. Enter project name: **NotesAura AI** (or any name you prefer)
4. Click "Create"
5. Wait for the project to be created, then select it

### 3. Enable Required APIs
1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "**Google+ API**" or "**Google Identity**"
3. Click on it and press "**Enable**"

### 4. Configure OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** as the user type
3. Click "Create"
4. Fill in the required information:
   - **App name**: NotesAura AI
   - **User support email**: Your email address
   - **App logo**: (Optional) Upload your app logo
   - **Application home page**: http://localhost:3000
   - **Authorized domains**: (Leave empty for localhost testing)
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Add: `userinfo.email`
   - Add: `userinfo.profile`
   - Click "Update" then "Save and Continue"
7. **Test users** (Optional): Add your email for testing
8. Click "Save and Continue" and then "Back to Dashboard"

### 5. Create OAuth 2.0 Client ID
1. Go to **APIs & Services** > **Credentials**
2. Click "**Create Credentials**" > "**OAuth client ID**"
3. Choose Application type: "**Web application**"
4. Enter name: **NotesAura AI Web Client**
5. **Authorized JavaScript origins**:
   - Add: `http://localhost:3000`
   - For production, add: `https://yourdomain.com`
6. **Authorized redirect URIs**:
   - Add: `http://localhost:3000/api/auth/callback/google`
   - For production, add: `https://yourdomain.com/api/auth/callback/google`
7. Click "**Create**"

### 6. Copy Your Credentials
After creation, you'll see a dialog with:
- **Client ID**: A long string ending in `.apps.googleusercontent.com`
- **Client Secret**: A shorter secret string

**Important**: Copy both values immediately!

### 7. Update Your Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

3. Save the file

### 8. Generate NextAuth Secret (if not already done)

Run this command in your terminal:
```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

Update your `.env`:
```env
NEXTAUTH_SECRET=the_generated_secret_here
```

### 9. Restart Your Development Server

```bash
npm run dev
```

### 10. Test Google Login

1. Navigate to http://localhost:3000
2. You should be redirected to the sign-in page
3. Click "**Continue with Google**"
4. Select your Google account
5. Grant permissions
6. You should be redirected back to the app and logged in!

## Troubleshooting

### "Redirect URI mismatch" Error
- Make sure your redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- No trailing slashes
- Check for http vs https

### "Invalid client" Error
- Verify your Client ID and Secret are correctly copied to `.env`
- Make sure there are no extra spaces
- Restart the development server after updating `.env`

### "Access blocked" Error
- Add yourself as a test user in the OAuth consent screen
- Make sure the app is not in "Production" mode if you haven't verified it

### Environment Variables Not Loading
- Make sure your `.env` file is in the root directory
- Restart your development server after changes
- Check for duplicate variable declarations

## Production Deployment

When deploying to production:

1. Update `NEXTAUTH_URL` in your `.env` to your production URL:
   ```env
   NEXTAUTH_URL=https://yourdomain.com
   ```

2. Add production URLs to Google OAuth:
   - JavaScript origins: `https://yourdomain.com`
   - Redirect URI: `https://yourdomain.com/api/auth/callback/google`

3. Set environment variables in your hosting platform (Vercel, Netlify, etc.)

4. Publish your OAuth consent screen (if needed for public users)

## Security Notes

- **Never commit `.env` to git** - it's already in `.gitignore`
- Keep your Client Secret confidential
- Rotate secrets if compromised
- Use different credentials for development and production
- Enable 2FA on your Google Cloud account

## Current Implementation

Your app already has:
- ✅ Google OAuth provider configured in NextAuth
- ✅ Google sign-in button on the login page
- ✅ Google sign-up button on the registration page
- ✅ Proper session management
- ✅ User data storage in database
- ✅ Secure authentication flow

You just need to add the credentials!

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all URLs match exactly
3. Ensure APIs are enabled in Google Cloud Console
4. Check the NextAuth documentation: https://next-auth.js.org/

---

**Created for NotesAura AI** - Your AI-powered study assistant
