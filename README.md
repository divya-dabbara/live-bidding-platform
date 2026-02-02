# Real-Time Auction Platform

A local-only, real-time auction platform featuring live bidding, atomic bid processing, and synchronized countdown timers. Built to demonstrate race condition handling and websocket communication without the need for a database.

## 🚀 Features

- **Real-Time Bidding**: Instant updates across all connected clients via Socket.io.
- **Race Condition Handling**: Server-side atomic processing ensures data integrity during simultaneous bids.
- **Synchronized Timers**: Server-authoritative time management prevents client-side drift or manipulation.
- **Live Updates**: Visual feedback for winning states, outbid notifications, and auction completion.

## 🛠️ Local Setup

### Prerequisites
- Node.js (v16+)
- npm

### 1. Backend Setup
Navigate to the backend directory and start the server:

```bash
cd backend
npm install
npm start
```
*Runs on http://localhost:3000*

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and start the development server:

```bash
cd frontend
npm install
npm run dev
```
*Runs on http://localhost:5173*

## 🧠 Technical Highlights

### Race Condition Handling
To prevent multiple users from placing conflicting bids simultaneously (e.g., two users bidding $100 at the exact same millisecond), the system relies on **Node.js's single-threaded event loop**.

1. **Atomic Processing**: Each "place-bid" event is processed synchronously from start to finish.
2. **No Async Interruption**: The server reads the current price, validates the new bid, and updates the state in one continuous execution block.
3. **Outcome**: Even with simultaneous requests, the event loop creates a strictly sequential queue. The first bid processed wins; the second sees the updated price and is correctly rejected if it's too low.

### Timer Synchronization
Client-side Javascript timers are unreliable and can drift or be manipulated. This platform uses a **Server-Authoritative** approach:

1. **Server Time**: The backend holds the "true" auction end time.
2. **Synchronization**: On connection (and periodically every 10s), the server sends its current timestamp.
3. **Adjustment**: The client calculates the offset (`serverTime - clientTime`) and adjusts its countdown display locally.
4. **Validation**: Regardless of what the client displays, the server performs a final timestamp check before accepting any bid.

## 🏗️ Architecture
- **Backend**: Node.js, Express, Socket.io (In-memory storage)
- **Frontend**: React, Vite, Socket.io Client
