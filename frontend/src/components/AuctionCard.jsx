import { useState, useEffect } from 'react';
import './AuctionCard.css';

function AuctionCard({ auction, serverTime, onPlaceBid, currentBidder }) {
    const [bidAmount, setBidAmount] = useState('');
    const [remainingTime, setRemainingTime] = useState(0);
    const [message, setMessage] = useState(null);

    // Calculate remaining time based on server time
    useEffect(() => {
        const updateTimer = () => {
            const timeLeft = auction.endTime - serverTime;
            setRemainingTime(Math.max(0, timeLeft));
        };

        updateTimer();

        // Update every second
        const interval = setInterval(() => {
            const now = Date.now();
            const serverOffset = serverTime - now;
            const currentServerTime = now + serverOffset;
            const timeLeft = auction.endTime - currentServerTime;
            setRemainingTime(Math.max(0, timeLeft));
        }, 1000);

        return () => clearInterval(interval);
    }, [auction.endTime, serverTime]);

    const isEnded = remainingTime <= 0;
    const isWinning = auction.highestBidder === currentBidder && !isEnded;
    const isOutbid = auction.highestBidder && auction.highestBidder !== currentBidder && !isEnded;

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSubmitBid = (e) => {
        e.preventDefault();
        const amount = parseFloat(bidAmount);

        if (isNaN(amount) || amount <= auction.currentBid) {
            setMessage({
                type: 'error',
                text: `Bid must be higher than $${auction.currentBid}`
            });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        if (isEnded) {
            setMessage({
                type: 'error',
                text: 'Auction has ended'
            });
            setTimeout(() => setMessage(null), 3000);
            return;
        }

        // Place bid
        onPlaceBid(auction.id, amount);

        setMessage({
            type: 'success',
            text: 'Bid placed! Waiting for confirmation...'
        });

        setBidAmount('');
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className={`auction-card ${isEnded ? 'ended' : ''} ${isWinning ? 'winning' : ''} ${isOutbid ? 'outbid' : ''}`}>
            <div className="auction-image">
                <img src={auction.image} alt={auction.title} />
                {isEnded && <div className="ended-overlay">ENDED</div>}
            </div>

            <div className="auction-content">
                <h3>{auction.title}</h3>
                <p className="auction-description">{auction.description}</p>

                <div className="auction-stats">
                    <div className="current-bid">
                        <span className="label">Current Bid</span>
                        <span className="amount">${auction.currentBid}</span>
                    </div>
                    <div className="timer">
                        <span className="label">Time Left</span>
                        <span className={`time ${isEnded ? 'ended' : ''}`}>
                            {isEnded ? 'Ended' : formatTime(remainingTime)}
                        </span>
                    </div>
                </div>

                {auction.highestBidder && (
                    <div className="highest-bidder">
                        Leading: {auction.highestBidder}
                    </div>
                )}

                {isWinning && (
                    <div className="status-banner winning-banner">
                        🎉 You're winning!
                    </div>
                )}

                {isOutbid && (
                    <div className="status-banner outbid-banner">
                        ⚠️ You've been outbid
                    </div>
                )}

                <form onSubmit={handleSubmitBid} className="bid-form">
                    <div className="bid-input-group">
                        <span className="currency-symbol">$</span>
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder={`Min: ${auction.currentBid + auction.minimumIncrement}`}
                            step="1"
                            min={auction.currentBid + auction.minimumIncrement}
                            disabled={isEnded}
                        />
                        <button type="submit" disabled={isEnded || !bidAmount}>
                            {isEnded ? 'Auction Ended' : 'Place Bid'}
                        </button>
                    </div>
                </form>

                {message && (
                    <div className={`message ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuctionCard;
