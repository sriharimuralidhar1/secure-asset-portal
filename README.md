# 🛡️ Secure Asset Portal

A simple financial asset tracker with biometric login—because remembering passwords is annoying.

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

## Getting Started

Quick setup:
```bash
git clone https://github.com/yourusername/secure-asset-portal.git
cd secure-asset-portal
npm run setup && npm run dev
```

Then open [http://localhost:3001](http://localhost:3001), sign up, set up 2FA, and add biometric login.

The setup script handles dependencies, database setup, email config, and port management automatically.

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
