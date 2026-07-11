<div align="center">
  <img src="./tradesim-logo.svg" alt="TradeSim Logo" width="100" />
  
  # TradeSim 📈
  
  A full-stack paper trading platform for the Indian stock market (NSE)
</div>
# TradeSim 📈

A full-stack **paper trading platform** for the Indian stock market (NSE), built with the MERN stack. Practice trading real, live-priced stocks in ₹ (INR) without risking real money.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- 🔐 **Multi-method authentication** — Email/password, Google OAuth, and mobile OTP login
- 📊 **Live NSE stock data** — Real-time prices in ₹ (INR) sourced from Yahoo Finance
- 💰 **Realistic paper trading** — Buy/sell market and limit orders against live prices, with atomic wallet/holdings updates
- 📁 **Portfolio tracking** — Live P&L, average cost basis, holdings valuation, and net worth breakdown
- ⭐ **Watchlist** — Track favorite stocks with live price updates
- 🏢 **Stock Details page** — Company fundamentals (Market Cap, P/E, P/B, EPS, 52-week high/low), price history charts
- 💵 **Add Funds** — Top up your simulated wallet balance anytime
- 📜 **Transaction ledger** — Full history of every trade and deposit
- ⚡ **Real-time updates** — WebSocket-powered live price ticking and instant balance sync, no manual refresh
- 📈 **Dashboard analytics** — Net worth history chart, top

  PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=your_jwt_access_secret
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret
STARTING_BALANCE=1000000
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id

You'll also need a Firebase service account key JSON file placed in `server/` (e.g. `firebase-service-account.json`) — download it from Firebase Console → Project Settings → Service Accounts. This file is git-ignored and must never be committed.

### Running locally

From the project root:

```bash
npm run dev
```

This starts both the client (`localhost:5173`) and server (`localhost:5000`) concurrently.

## Project Structure
TradeSim/
├── client/          # React frontend (Vite + TypeScript + TailwindCSS)
└── server/          # Express backend
├── config/
├── controllers/
├── middleware/
├── models/       # User, Holding, Order, Transaction, Watchlist, PortfolioSnapshot
├── routes/
├── services/     # stockDataService (Yahoo Finance integration)
└── utils/

## Screenshots

<img width="1366" height="720" alt="image" src="https://github.com/user-attachments/assets/f02ea871-9f13-4601-8887-45ce2e47bbb9" />
<img width="1366" height="720" alt="image" src="https://github.com/user-attachments/assets/08151e39-131f-499b-9b14-c985db22ccf3" />
<img width="1366" height="720" alt="image" src="https://github.com/user-attachments/assets/dfcff197-2dc4-4b95-ad3e-3bebefa00750" />
<img width="1366" height="720" alt="image" src="https://github.com/user-attachments/assets/d6f6e22d-d624-4dca-9136-c6fb5717dd45" />


## Known Limitations

- Prices reflect NSE trading hours (9:15 AM–3:30 PM IST, Mon–Fri). Outside these hours, prices are static at the last close — this is expected behavior, matching the real market.
- `yahoo-finance2` is an unofficial wrapper around Yahoo Finance's internal API — reliable for this use case, but not an official/guaranteed public API.

## Disclaimer

This is a **paper trading / simulation platform only**. No real money, real orders, or real brokerage execution is involved. Stock prices are sourced from Yahoo Finance for educational and demonstration purposes only, and should not be used for actual investment decisions.

## License

MIT
