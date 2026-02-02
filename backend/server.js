const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Express
app.use(cors());
app.use(express.json());

// Configure Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// ============================================================================
// IN-MEMORY DATA STORE
// ============================================================================
// All auction data is stored in memory. No database required for this prototype.

const auctionItems = [
  {
    id: 1,
    title: "Vintage Camera",
    description: "Classic 35mm film camera in excellent condition",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400",
    currentBid: 150,
    minimumIncrement: 10,
    endTime: Date.now() + 900000, // 15 minutes
    highestBidder: null,
    bidHistory: []
  },
  {
    id: 2,
    title: "Designer Watch",
    description: "Luxury timepiece with leather strap",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
    currentBid: 500,
    minimumIncrement: 10,
    endTime: Date.now() + 1200000, // 20 minutes
    highestBidder: null,
    bidHistory: []
  },
  {
    id: 3,
    title: "Rare Book Collection",
    description: "First edition classics in pristine condition",
    image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400",
    currentBid: 200,
    minimumIncrement: 10,
    endTime: Date.now() + 1500000, // 25 minutes
    highestBidder: null,
    bidHistory: []
  },
  {
    id: 4,
    title: "Antique Desk Lamp",
    description: "Art deco brass lamp from the 1930s",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400",
    currentBid: 80,
    minimumIncrement: 5,
    endTime: Date.now() + 1800000, // 30 minutes
    highestBidder: null,
    bidHistory: []
  }
];

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Get all auction items
app.get('/api/auctions', (req, res) => {
  res.json({
    serverTime: Date.now(),
    auctions: auctionItems
  });
});

// Alias endpoint for items (same as auctions)
app.get('/api/items', (req, res) => {
  res.json({
    serverTime: Date.now(),
    auctions: auctionItems
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send initial server time sync and auction data
  socket.emit('initial-sync', {
    serverTime: Date.now(),
    auctions: auctionItems
  });

  // ============================================================================
  // RACE CONDITION HANDLING - SINGLE-THREADED ATOMIC UPDATE
  // ============================================================================
  // Node.js event loop is single-threaded, so synchronous operations are atomic.
  // When two clients bid simultaneously via Socket.io:
  //   1. Both events enter the event queue
  //   2. First event handler STARTS and COMPLETES entirely (reads, validates, updates)
  //   3. Second event handler then STARTS (sees updated price from step 2)
  //   4. Second validates against NEW price - if insufficient, it's rejected
  //
  // Key insight: No async gaps between read-validate-update means no race condition.
  // This works because:
  //   - In-memory data access is synchronous
  //   - No await/callbacks between validation and update
  //   - Event handlers execute to completion before next handler starts
  // ============================================================================

  socket.on('place-bid', (data) => {
    const { auctionId, bidAmount, bidderName } = data;

    // Find auction item (synchronous read)
    const auction = auctionItems.find(item => item.id === auctionId);

    if (!auction) {
      socket.emit('bid-error', {
        message: 'Auction not found',
        auctionId
      });
      return;
    }

    // Check if auction has ended (synchronous validation)
    if (Date.now() >= auction.endTime) {
      socket.emit('bid-error', {
        message: 'Auction has ended',
        auctionId
      });
      return;
    }

    // Validate bid amount (synchronous validation)
    const minimumBid = auction.currentBid + auction.minimumIncrement;
    if (bidAmount < minimumBid) {
      socket.emit('bid-error', {
        message: `Bid must be at least $${minimumBid}`,
        auctionId,
        minimumBid
      });
      return;
    }

    // ATOMIC UPDATE: All validations passed, update in-memory data immediately
    // No async operations between validation and update = no race condition
    auction.currentBid = bidAmount;
    auction.highestBidder = bidderName || socket.id;
    auction.bidHistory.push({
      amount: bidAmount,
      bidder: bidderName || socket.id,
      timestamp: Date.now()
    });

    console.log(`Bid accepted: $${bidAmount} on "${auction.title}" by ${auction.highestBidder}`);

    // Broadcast successful bid to ALL clients
    io.emit('auction-update', {
      auctionId,
      currentBid: auction.currentBid,
      highestBidder: auction.highestBidder,
      bidHistory: auction.bidHistory
    });

    // Confirm to the bidder
    socket.emit('bid-success', {
      auctionId,
      currentBid: auction.currentBid
    });
  });

  // ============================================================================
  // TIMER SYNCHRONIZATION
  // ============================================================================
  // Server maintains authoritative time. Clients receive:
  //   1. Server timestamp on connection
  //   2. Auction end times (absolute timestamps)
  //   3. Periodic sync updates to prevent drift
  //
  // Client calculates remaining time as: endTime - currentServerTime
  // This approach ensures all clients see consistent countdowns
  // ============================================================================

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Broadcast time sync every 10 seconds to all connected clients
setInterval(() => {
  io.emit('time-sync', {
    serverTime: Date.now()
  });
}, 10000);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Auction server running on http://localhost:${PORT}`);
  console.log(`✅ Socket.io ready for real-time bidding`);
  console.log(`✅ ${auctionItems.length} auction items available`);
});
