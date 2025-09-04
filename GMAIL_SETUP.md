# Gmail SMTP Setup Instructions

To enable real email sending with Gmail, you need to set up an App Password. Follow these steps:

## 📧 Step 1: Enable 2-Factor Authentication on Gmail

1. Go to your Google Account settings: https://myaccount.google.com/
2. Click on "Security" in the left menu
3. Under "Signing in to Google", enable "2-Step Verification" if not already enabled
4. Follow the prompts to set up 2FA with your phone

## 🔑 Step 2: Generate an App Password

1. Go to: https://myaccount.google.com/apppasswords
   (Or: Google Account Settings → Security → App passwords)
2. You may need to sign in again
3. Select "Mail" as the app
4. Select "Other (custom name)" as the device
5. Enter "Secure Asset Portal" as the custom name
6. Click "Generate"
7. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

## ⚙️ Step 3: Update Your .env File

Replace the placeholder password in your `.env` file:

```bash
# Replace this line:
SMTP_PASS=your-gmail-app-password-here

# With your actual app password (remove spaces):
SMTP_PASS=abcdefghijklmnop
```

## 🔐 Security Notes

- ✅ App passwords are more secure than using your regular Gmail password
- ✅ App passwords can be revoked anytime from your Google Account settings
- ✅ Each app gets its own unique password
- ❌ Never share or commit your app password to version control

## 🧪 Testing

Once configured, restart the application and create a new account. You should receive actual emails at your Gmail address!

## 🚨 Troubleshooting

If you get authentication errors:
1. Make sure 2FA is enabled on your Google account
2. Double-check the app password (no spaces)
3. Try generating a new app password
4. Check that "Less secure app access" is NOT needed (app passwords bypass this)

## 📱 Alternative: OAuth2 (More Secure)

For production applications, consider using OAuth2 instead of app passwords:
- More secure and follows Google's recommended practices
- Requires more setup but provides better long-term security
- Can be implemented later if needed
