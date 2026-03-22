// Auto-generated file - do not edit by hand
export default {
    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — SPREAD & PRICE
    // ═══════════════════════════════════════════════════════
    OB_SPREAD: { category: 'OB', name: 'Spread (Bps)', icon: '↔️', path: 'raw.OB.spreadBps', operators: ['>', '<', '>=', '<='], defaultThreshold: 5, description: 'Bid-ask spread in basis points. Lower = tighter market.' },
    OB_SPREAD_ABS: { category: 'OB', name: 'Spread (Abs)', icon: '📏', path: 'raw.OB.spread', operators: ['>', '<'], defaultThreshold: 10, description: 'Absolute bid-ask spread in quote currency.' },
    OB_MID_PRICE: { category: 'OB', name: 'Mid Price', icon: '🎯', path: 'raw.OB.midPrice', operators: ['>', '<', '>=', '<='], defaultThreshold: 1, description: 'Mid price: (bestBid + bestAsk) / 2.' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — DEPTH (USD & BASE)
    // ═══════════════════════════════════════════════════════
    OB_DEPTH_USD: { category: 'OB', name: 'Total Depth (USD)', icon: '💵', path: 'raw.OB.depthUSD', operators: ['>', '<'], defaultThreshold: 500000, description: 'Two-sided depth in USD: (bidDepth + askDepth) × midPrice.' },
    OB_BID_DEPTH: { category: 'OB', name: 'Bid Depth', icon: '🟢', path: 'raw.OB.bidDepth', operators: ['>', '<'], defaultThreshold: 10, description: 'Total bid-side depth in base currency across all tracked levels.' },
    OB_ASK_DEPTH: { category: 'OB', name: 'Ask Depth', icon: '🔴', path: 'raw.OB.askDepth', operators: ['>', '<'], defaultThreshold: 10, description: 'Total ask-side depth in base currency across all tracked levels.' },

    OB_DEPTH_1PCT_BID: { category: 'OB', name: 'Depth 1% Bid', icon: '🟩', path: 'raw.OB.depth1pct_bid', operators: ['>', '<'], defaultThreshold: 5, description: 'Cumulative bid depth within 1% of mid price (base currency).' },
    OB_DEPTH_1PCT_ASK: { category: 'OB', name: 'Depth 1% Ask', icon: '🟥', path: 'raw.OB.depth1pct_ask', operators: ['>', '<'], defaultThreshold: 5, description: 'Cumulative ask depth within 1% of mid price (base currency).' },
    OB_DEPTH_2PCT_BID: { category: 'OB', name: 'Depth 2% Bid', icon: '🟩', path: 'raw.OB.depth2pct_bid', operators: ['>', '<'], defaultThreshold: 10, description: 'Cumulative bid depth within 2% of mid price (base currency).' },
    OB_DEPTH_2PCT_ASK: { category: 'OB', name: 'Depth 2% Ask', icon: '🟥', path: 'raw.OB.depth2pct_ask', operators: ['>', '<'], defaultThreshold: 10, description: 'Cumulative ask depth within 2% of mid price (base currency).' },
    OB_DEPTH_5PCT_BID: { category: 'OB', name: 'Depth 5% Bid', icon: '🟩', path: 'raw.OB.depth5pct_bid', operators: ['>', '<'], defaultThreshold: 20, description: 'Cumulative bid depth within 5% of mid price (base currency).' },
    OB_DEPTH_5PCT_ASK: { category: 'OB', name: 'Depth 5% Ask', icon: '🟥', path: 'raw.OB.depth5pct_ask', operators: ['>', '<'], defaultThreshold: 20, description: 'Cumulative ask depth within 5% of mid price (base currency).' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — IMBALANCE (range −1 to +1)
    // ═══════════════════════════════════════════════════════
    OB_IMBALANCE: { category: 'OB', name: 'OBI (Raw)', icon: '⚖️', path: 'raw.OB.obi', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.2, description: 'Order Book Imbalance: (bidDepth − askDepth) / total. −1 to +1. Positive = more bids.' },
    OB_IMBALANCE_EMA: { category: 'OB', name: 'OBI (EMA)', icon: '📉', path: 'raw.OB.obi_ema', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.2, description: 'Smoothed OBI via EMA (α=0.5). Filters out momentary spikes. −1 to +1.' },
    OB_WEIGHTED_OBI: { category: 'OB', name: 'Weighted OBI', icon: '🏋️', path: 'raw.OB.weightedOBI', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.2, description: 'OBI with top-of-book bias (weight = 1/level). More sensitive to level-1 pressure. −1 to +1.' },

    OB_IMB_1PCT: { category: 'OB', name: 'Imbalance 1% Band', icon: '🔬', path: 'raw.OB.depth1pct_imb', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, description: 'Bid/ask imbalance within 1% of mid. −1 to +1. Positive = more bid depth near mid.' },
    OB_IMB_2PCT: { category: 'OB', name: 'Imbalance 2% Band', icon: '🔭', path: 'raw.OB.depth2pct_imb', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, description: 'Bid/ask imbalance within 2% of mid. −1 to +1.' },
    OB_IMB_5PCT: { category: 'OB', name: 'Imbalance 5% Band', icon: '🌐', path: 'raw.OB.depth5pct_imb', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, description: 'Bid/ask imbalance within 5% of mid. −1 to +1.' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — SLIPPAGE
    // ═══════════════════════════════════════════════════════
    OB_SLIPPAGE_1K: { category: 'OB', name: 'Slippage $1k Buy', icon: '💸', path: 'raw.OB.slippage1k', operators: ['>', '<'], defaultThreshold: 0.05, description: 'Estimated slippage (%) for a $1,000 market buy against the ask.' },
    OB_SLIPPAGE_10K: { category: 'OB', name: 'Slippage $10k Buy', icon: '💸', path: 'raw.OB.slippage10k', operators: ['>', '<'], defaultThreshold: 0.1, description: 'Estimated slippage (%) for a $10,000 market buy against the ask.' },
    OB_SLIPPAGE_100K: { category: 'OB', name: 'Slippage $100k Buy', icon: '💸', path: 'raw.OB.slippage100k', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Estimated slippage (%) for a $100,000 market buy against the ask. Key liquidity indicator.' },
    OB_SLIPPAGE_SELL_10K: { category: 'OB', name: 'Slippage $10k Sell', icon: '💰', path: 'raw.OB.slippageSell10k', operators: ['>', '<'], defaultThreshold: 0.1, description: 'Estimated slippage (%) for a $10,000 market sell against the bid.' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — MARKET IMPACT
    // ═══════════════════════════════════════════════════════
    OB_IMPACT_10PCT: { category: 'OB', name: 'Impact 10% Depth', icon: '💥', path: 'raw.OB.impact10pct', operators: ['>', '<'], defaultThreshold: 0.2, description: 'Price impact (%) to consume 10% of total ask depth.' },
    OB_IMPACT_25PCT: { category: 'OB', name: 'Impact 25% Depth', icon: '💥', path: 'raw.OB.impact25pct', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Price impact (%) to consume 25% of total ask depth.' },
    OB_IMPACT_50PCT: { category: 'OB', name: 'Impact 50% Depth', icon: '💥', path: 'raw.OB.impact50pct', operators: ['>', '<'], defaultThreshold: 1.0, description: 'Price impact (%) to consume 50% of total ask depth. Measures thin-book risk.' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — LIQUIDITY SCORE & TIER
    // ═══════════════════════════════════════════════════════
    OB_LIQ_SCORE: { category: 'OB', name: 'Liquidity Score', icon: '🏅', path: 'raw.OB.liquidityScore', operators: ['>', '<', '>=', '<='], defaultThreshold: 60, description: 'Composite liquidity score 0–100: 40% depth + 20% spread + 30% slippage + 10% balance.' },
    OB_LIQ_TIER: { category: 'OB', name: 'Liquidity Tier', icon: '🏆', path: 'raw.OB.liquidityTier', operators: ['==', '!=', '<=', '>=', '<', '>'], defaultThreshold: 3, description: 'Tier 1 (best, score ≥ 80) to Tier 5 (worst). One-sided books are floored at Tier 4.' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — CONCENTRATION & WALLS
    // ═══════════════════════════════════════════════════════
    OB_WALL_SCORE: { category: 'OB', name: 'Wall Score', icon: '🏗️', path: 'raw.OB.wallScore', operators: ['>', '<'], defaultThreshold: 0.1, description: 'Fraction of book levels classified as walls (size > 3× avg). 0–1. High = clustered liquidity.' },
    OB_LIQ_CONCENTRATION: { category: 'OB', name: 'Liq. Concentration', icon: '🎰', path: 'raw.OB.liqConcentration', operators: ['>', '<'], defaultThreshold: 0.3, description: 'Average of top-1-bid and top-1-ask concentration. High = most liquidity piled at the touch.' },
    OB_TOP1_BID_PCT: { category: 'OB', name: 'Top-1 Bid %', icon: '🔝', path: 'raw.OB.top1BidPct', operators: ['>', '<'], defaultThreshold: 0.25, description: 'Fraction of total bid depth sitting at the best bid. High = fragile bid side.' },
    OB_TOP1_ASK_PCT: { category: 'OB', name: 'Top-1 Ask %', icon: '🔝', path: 'raw.OB.top1AskPct', operators: ['>', '<'], defaultThreshold: 0.25, description: 'Fraction of total ask depth sitting at the best ask. High = fragile ask side.' },

    // ═══════════════════════════════════════════════════════
    // ORDERBOOK — BOOK HEALTH & METADATA
    // ═══════════════════════════════════════════════════════

    OB_BOOK_AGE: { category: 'OB', name: 'Book Age (ms)', icon: '⏱️', path: 'raw.OB.bookAge', operators: ['>', '<'], defaultThreshold: 5000, description: 'Milliseconds since the last WebSocket update. High value may indicate a stale/disconnected feed.' },
    OB_UPDATE_COUNT: { category: 'OB', name: 'Update Count', icon: '🔄', path: 'raw.OB.updateCount', operators: ['>', '<'], defaultThreshold: 10, description: 'Cumulative WebSocket updates since book initialisation. Low count = newly opened book.' },
    OB_BID_LEVELS: { category: 'OB', name: 'Bid Levels', icon: '📊', path: 'raw.OB.bidLevels', operators: ['>', '<', '>='], defaultThreshold: 10, description: 'Number of bid price levels present in the snapshot. Low = thin book.' },
    OB_ASK_LEVELS: { category: 'OB', name: 'Ask Levels', icon: '📊', path: 'raw.OB.askLevels', operators: ['>', '<', '>='], defaultThreshold: 10, description: 'Number of ask price levels present in the snapshot. Low = thin book.' },
};