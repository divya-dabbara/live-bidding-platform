# Backend - Real-Time Auction Platform

Node.js backend server for real-time bidding with Express and Socket.io.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### REST API

- `GET /api/auctions` - Fetch all auction items with server time
- `GET /health` - Health check endpoint

### Socket.io Events

**Client → Server:**
- `place-bid` - Submit a bid
  ```javascript
  {
    auctionId: number,
    bidAmount: number,
    bidderName: string
  }
  ```

**Server → Client:**
- `initial-sync` - Sent on connection with server time and all auctions
- `auction-update` - Broadcast when a bid is accepted
- `bid-success` - Confirmation to the bidder
- `bid-error` - Error message when bid is rejected
- `time-sync` - Periodic server time updates (every 10 seconds)

## Race Condition Handling

### Single-Threaded Atomic Update Approach

This implementation uses **synchronous atomic updates** to handle race conditions when multiple users bid simultaneously. Here's how it works:

**Key Insight:** Node.js event loop is single-threaded. Synchronous operations complete atomically without interruption.

**When two clients bid at the same time:**

1. **Both bid events** enter the Socket.io event queue
2. **First bid handler executes completely:**
   - Reads current bid amount (e.g., $150)
   - Validates new bid (e.g., $160 > $150 + $10 ✓)
   - Updates in-memory data to $160
   - Broadcasts update to all clients
3. **Second bid handler then starts:**
   - Reads **updated** bid amount ($160)
   - Validates new bid (e.g., $165)
   - If valid: Updates and broadcasts
   - If invalid (e.g., tried to bid $160): Rejects with error

**Why this works:**
- ✅ In-memory data access is synchronous
- ✅ No `await` or callbacks between read → validate → update
- ✅ Each event handler runs to completion before the next starts
- ✅ No version counters or locks needed

**Critical implementation detail:**
```javascript
// SYNCHRONOUS - No async gaps
const auction = auctionItems.find(...);  // Read
if (bidAmount < minimumBid) { ... }       // Validate
auction.currentBid = bidAmount;           // Update
```

If we had used `await` or callbacks between these steps, race conditions could occur. By keeping everything synchronous, the event loop guarantees atomic execution.

## Timer Synchronization

### Server-Authoritative Time Approach

**Problem:** Client-side timers drift and can't be trusted for auction deadlines.

**Solution:** Server maintains authoritative time, clients sync continuously.

**Implementation:**

1. **On connection:** Server sends current server timestamp
   ```javascript
   socket.emit('initial-sync', {
     serverTime: Date.now(),
     auctions: auctionItems  // Each has endTime timestamp
   });
   ```

2. **Client calculation:**
   ```javascript
   const remainingMs = auction.endTime - serverTime;
   ```

3. **Periodic sync:** Every 10 seconds, server broadcasts updated time
   ```javascript
   setInterval(() => {
     io.emit('time-sync', { serverTime: Date.now() });
   }, 10000);
   ```

4. **Server enforcement:** Even if client timer shows time remaining, server validates:
   ```javascript
   if (Date.now() >= auction.endTime) {
     // Reject bid - auction ended
   }
   ```

**Benefits:**
- ✅ All clients see consistent countdown (within sync interval)
- ✅ Server has final authority on auction end time
- ✅ Prevents client-side timer manipulation
- ✅ Automatic correction for clock drift

## Sample Auction Data

The server initializes with 4 sample auctions:
- Vintage Camera (3 min, starting at $150)
- Designer Watch (4 min, starting at $500)
- Rare Book Collection (5 min, starting at $200)
- Antique Desk Lamp (6 min, starting at $80)

All auction end times are set relative to server start time.
