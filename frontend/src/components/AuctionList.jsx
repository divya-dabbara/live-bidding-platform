import AuctionCard from './AuctionCard';
import './AuctionList.css';

function AuctionList({ auctions, serverTime, onPlaceBid, currentBidder }) {
    if (!auctions || auctions.length === 0) {
        return (
            <div className="auction-list-empty">
                <p>No auctions available at the moment.</p>
            </div>
        );
    }

    return (
        <div className="auction-list">
            {auctions.map(auction => (
                <AuctionCard
                    key={auction.id}
                    auction={auction}
                    serverTime={serverTime}
                    onPlaceBid={onPlaceBid}
                    currentBidder={currentBidder}
                />
            ))}
        </div>
    );
}

export default AuctionList;
