# CryptoWallet

SmartWallet Pro is a full-stack dark fintech crypto wallet dashboard. It demonstrates three distinct responsibilities:

- Blockchain: Sepolia ETH transaction execution and transaction verification through Ethers.js.
- DBMS: PostgreSQL user profiles, wallets, transaction history, verification logs, notifications, and price cache.
- API: CoinGecko live ETH, BTC, and USDC pricing for balances and portfolio values.

## Stack

- Frontend: React, Vite, Tailwind CSS, Recharts, QRCode, Lucide icons
- Backend: Node.js, Express, PostgreSQL, Ethers.js
- Blockchain: Solidity smart contract for `sendPayment(address receiver)`
- Network: Ethereum Sepolia testnet
- Prices: CoinGecko simple price API

## Project Structure

```text
CryptoWallet/
  backend/
    src/server.js
    src/store.js
    db/schema.sql
    .env.example
  contracts/
    SmartWalletPro.sol
  frontend/
    src/main.jsx
    src/styles.css
  package.json
```

## Quick Start

Install dependencies:

```bash
npm install
```

Run frontend and backend together:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The app works immediately with demo auth, demo wallet data, cached fallback prices, and mock transaction history. Configure PostgreSQL and Sepolia keys to enable persistence and real blockchain calls.

## Environment

Copy the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Set values:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cryptowallet
DATABASE_SSL=false
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
WALLET_PRIVATE_KEY=
```

`WALLET_PRIVATE_KEY` is optional. If omitted, send requests are stored as mocked pending transactions. Add a funded Sepolia private key to send real testnet ETH.

## Database Setup

Create a PostgreSQL database named `cryptowallet`, then run:

```bash
npm run db:setup
```

This applies `backend/db/schema.sql` and recreates the deterministic demo dataset from `backend/db/seed.sql`.

Useful database commands:

```bash
npm run db:schema  # schema only
npm run db:seed    # demo data only
npm run db:setup   # schema + demo data
```

Demo logins are listed in `USERS.md`. The seeded data includes one admin and three wallet users, fixed wallet addresses, balances, transaction history, notifications, and mempool records so another machine can reproduce the same project state.

Tables:

- `users`
- `wallets`
- `coin_assets`
- `wallet_balances`
- `transactions`
- `mempool_transactions`
- `mined_blocks`
- `block_transactions`
- `transaction_verifications`
- `notifications`
- `price_cache`

## API Endpoints

Base URL:

```text
http://localhost:4000/api
```

Endpoints:

- `POST /users/register`
- `POST /users/login`
- `GET /users/me`
- `GET /wallet`
- `GET /transactions`
- `POST /transactions`
- `POST /verify`
- `GET /prices`
- `GET /notifications`
- `GET /health`

## Blockchain Contract

Contract:

```solidity
function sendPayment(address payable receiver) external payable
```

Event:

```solidity
event PaymentSent(address indexed sender, address indexed receiver, uint256 amount, uint256 timestamp);
```

Compile and deploy `contracts/SmartWalletPro.sol` with Remix, Hardhat, or Foundry on Sepolia. The backend currently supports native ETH transfer through Ethers.js; the contract is included for a deployable payment event workflow.

## Frontend Features

- Login and register screens
- Dashboard with wallet address, ETH balance, USD equivalent, price cards, portfolio ring, and quick actions
- Send ETH form with live USD conversion
- Receive page with QR code and copyable wallet address
- Transaction history table with status filters
- Transaction verifier with Etherscan link
- Notifications
- Analytics charts
- Settings screen
- Responsive dark fintech dashboard inspired by the supplied screenshot

## Production Notes

- Encrypt wallet private keys before storing them.
- Use a wallet provider such as MetaMask for user-signed transfers in production.
- Never expose private keys in frontend code.
- Add rate limiting and stricter CORS for public deployments.
- Use managed secrets for RPC keys and JWT secrets.
- Confirm CoinGecko API usage limits for your deployment tier.
