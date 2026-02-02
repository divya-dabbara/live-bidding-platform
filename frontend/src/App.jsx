import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import AuctionList from './components/AuctionList';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

function App() {
  const [socket, setSocket] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [serverTime, setServerTime] = useState(Date.now());
  const [bidderName, setBidderName] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.io connection
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to auction server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from auction server');
      setConnected(false);
    });

    // Receive initial sync data from server
    newSocket.on('initial-sync', (data) => {
      console.log('Received initial sync:', data);
      setServerTime(data.serverTime);
      setAuctions(data.auctions);
    });

    // Listen for auction updates (when anyone places a bid)
    newSocket.on('auction-update', (data) => {
      console.log('Auction update:', data);
      setAuctions(prevAuctions =>
        prevAuctions.map(auction =>
          auction.id === data.auctionId
            ? { ...auction, currentBid: data.currentBid, highestBidder: data.highestBidder }
            : auction
        )
      );
    });

    // Receive time sync updates from server (every 10 seconds)
    newSocket.on('time-sync', (data) => {
      setServerTime(data.serverTime);
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const handlePlaceBid = (auctionId, bidAmount) => {
    if (!socket) return;

    const bidderNameToUse = bidderName.trim() || 'Anonymous';

    socket.emit('place-bid', {
      auctionId,
      bidAmount,
      bidderName: bidderNameToUse
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔨 Live Auction Platform</h1>
        <div className="connection-status">
          <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </header>

      <div className="bidder-section">
        <label htmlFor="bidder-name">Your Name (optional):</label>
        <input
          id="bidder-name"
          type="text"
          placeholder="Enter your name"
          value={bidderName}
          onChange={(e) => setBidderName(e.target.value)}
          maxLength={30}
        />
      </div>

      <AuctionList
        auctions={auctions}
        serverTime={serverTime}
        onPlaceBid={handlePlaceBid}
        currentBidder={bidderName.trim() || 'Anonymous'}
      />
    </div>
  );
}

export default App;
