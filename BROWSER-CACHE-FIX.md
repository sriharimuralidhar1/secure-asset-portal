# Browser Cache Fix for HTTP Setup

If Safari or other browsers are trying to force HTTPS on localhost, follow these steps:

## Safari Fix

1. **Close Safari completely**
2. **Clear HSTS cache:**
   ```bash
   # Delete Safari's HSTS cache
   rm ~/Library/Cookies/HSTS.plist
   
   # Or use Safari's developer menu:
   # Safari > Develop > Empty Caches
   ```

3. **Clear all Safari data for localhost:**
   - Safari > Develop > Show Web Inspector
   - Go to Storage tab
   - Delete all localhost entries

4. **Restart Safari and go to:** `http://localhost:3001` (not https)

## Chrome Fix

1. Go to `chrome://net-internals/#hsts`
2. In "Delete domain security policies" section
3. Enter: `localhost`
4. Click "Delete"
5. Clear browser cache: Chrome > Clear Browsing Data

## Firefox Fix

1. Go to `about:config`
2. Search for: `security.tls.insecure_fallback_hosts`
3. Add value: `localhost`
4. Clear cache: Firefox > Clear Recent History

## Force HTTP Access

Always access the app via:
- ✅ `http://localhost:3001` (correct)
- ❌ `https://localhost:3001` (wrong - will fail)

The app is configured for HTTP only and works perfectly without HTTPS complexity.
