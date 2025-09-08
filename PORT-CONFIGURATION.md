# Port Configuration Guide

## Flexible Development Ports

Your Secure Asset Portal now supports adaptable ports for both development and deployment scenarios.

## Development Options

### Option 1: Standard Development (Current Setup)
```bash
npm run dev
```
- **Frontend**: Port 3001
- **Backend**: Port 3000
- Uses fixed ports as configured in `.env` files

### Option 2: Auto-Detection Development (New!)
```bash
npm run dev:auto
```
- **Frontend**: Automatically finds available port starting from 3001
- **Backend**: Automatically finds available port starting from 3000
- Dynamically configures API URLs
- Shows which ports are being used

## Manual Port Configuration

### Backend Port
Set in root `.env` file:
```env
PORT=3000  # or any other port
```

### Frontend Port
Set in `frontend/.env` file:
```env
PORT=3001  # or any other port
```

### API URL Override
Set in `frontend/.env` file:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

## Smart Port Detection

The frontend now automatically detects the backend API URL based on:

1. **Environment Variable**: `REACT_APP_API_URL` (highest priority)
2. **Smart Detection**: Based on current frontend port
   - Frontend on 3001 → Backend on 3000
   - Frontend on 3000 → Backend on 5000
   - Other ports → Smart fallback logic
3. **Production**: Uses relative URLs (`/api`)

## Deployment (Production)

For platforms like Render, Heroku, Netlify:

- **Backend**: Automatically uses `process.env.PORT` from platform
- **Frontend**: Uses relative API URLs (`/api`) when built
- **No configuration needed** - works automatically

## Debugging Port Issues

Run in development mode to see port detection info:
```bash
# Check browser console for:
🔧 API Configuration: {
  baseURL: "http://localhost:3000/api",
  environment: "development",
  portDetection: {
    currentURL: "http://localhost:3001",
    hostname: "localhost", 
    port: "3001",
    detectedAPIURL: "http://localhost:3000/api"
  }
}
```

## Commands Summary

| Command | Description |
|---------|-------------|
| `npm run dev` | Standard fixed ports (3000/3001) |
| `npm run dev:auto` | Auto-detect available ports |
| `npm run setup` | Initial setup with port configuration |
| `npm run dev:brave` | Use Brave browser specifically |

## Environment Variables Priority

1. **Explicit URLs**: `REACT_APP_API_URL` (overrides everything)
2. **Port Variables**: `PORT` in respective `.env` files
3. **Auto-Detection**: Smart port detection logic
4. **Defaults**: Backend 3000, Frontend 3001
