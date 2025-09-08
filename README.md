# 🛡️ Secure Asset Portal

A simple financial asset tracker with biometric login—because remembering passwords is annoying. Using WARP (https://www.warp.dev/)

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)  
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)  
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)  
[![fido2-lib](https://img.shields.io/badge/fido2--lib-Passkeys-purple.svg)](https://github.com/webauthn-open-source/fido2-lib)  

---

## Features

- **Biometric Login**: Use fingerprint, face, or device passkey. Password login is also available.
- **Two-Factor Authentication**: Secure with authenticator apps.
- **Track Anything**: Investments, crypto, real estate, collectibles—organized however you like.
- **Privacy & Security**: Each user sees only their own info, full activity logs, and protection against attacks.
- **Helpful Emails**: Welcome messages, security alerts, and 2FA setup instructions.

## What You Can Track

- Real estate  
- Investment & bank accounts  
- Cryptocurrency  
- Physical assets (gold, collectibles, cars)  
- Business ownership  
- Insurance policies  

# 🚀 Quick Start:

## One Command Setup

Run this single command and you're done:

```bash
npm run setup
```

That's it! The script will:

✅ Install all dependencies  
✅ Configure your environment  
✅ Set up the database  
✅ Build the application   
✅ Open your browser automatically

## What You'll Need

- **Node.js** (18+)
- **PostgreSQL** (running locally)
- **5 minutes** for setup

## Access Your Portal

After setup, your Secure Asset Portal will open automatically at http://localhost:3001`

## Features Ready to Use

🔐 **Secure Authentication** with 2FA  
👆 **Passkey/Biometric Login** (TouchID, FaceID)  
💰 **Asset Management** (stocks, crypto, real estate)  
📊 **Portfolio Reports** and analytics  
📧 **Email Notifications** (Gmail integration)  
🔒 **Bank-level Security** with audit trails  

---

## Tech Stack

- Backend: Node.js, Express, **fido2-lib** for passkeys  
- Frontend: React 18  
- Database: PostgreSQL 14+ with row-level security  
- Session storage: Redis (prod) / memory (dev)  
- Email: Nodemailer with Gmail/SMTP  

## Development & Testing

- Run development server (frontend + backend):  
  `npm run dev`
- Run all tests:  
  `npm test`  
- Manage DB and users with utility scripts in `/scripts/`

## Troubleshooting

- Conflicting ports or hung servers? Run: 
pkill -f "react-scripts"; pkill -f "nodemon"
npm run dev
- Missing frontend files? Run setup again:  
`npm run setup`
- Check `.env` and port settings if frontend or backend doesn’t start properly.
