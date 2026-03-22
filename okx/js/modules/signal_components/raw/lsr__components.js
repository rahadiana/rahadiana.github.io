// Auto-generated file - do not edit by hand
export default {

    // ═══════════════════════════════════════════════════════
    // LSR — RATIO (5m / latest)
    // path: raw.LSR.timeframes_5min.*
    // ═══════════════════════════════════════════════════════
    LSR_RATIO: { category: 'LSR', name: 'L/S Ratio (5m)', icon: '📐', path: 'raw.LSR.timeframes_5min.longShortRatio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long/Short account ratio at 5m timeframe. >1 = more longs; <1 = more shorts.' },
    LSR_LONG_PCT: { category: 'LSR', name: 'Long % (5m)', icon: '📈', path: 'raw.LSR.timeframes_5min.longRatio', operators: ['>', '<'], defaultThreshold: 0.55, description: 'Fraction of accounts long at 5m (0–1). Derived from ratio / (1 + ratio).' },
    LSR_SHORT_PCT: { category: 'LSR', name: 'Short % (5m)', icon: '📉', path: 'raw.LSR.timeframes_5min.shortRatio', operators: ['>', '<'], defaultThreshold: 0.45, description: 'Fraction of accounts short at 5m (0–1). Equals 1 − longRatio.' },

    LSR_RATIO_15M: { category: 'LSR', name: 'L/S Ratio (15m)', icon: '📐', path: 'raw.LSR.timeframes_15min.longShortRatio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long/Short ratio aggregated to the 15-minute timeframe.' },
    LSR_RATIO_1H: { category: 'LSR', name: 'L/S Ratio (1H)', icon: '📐', path: 'raw.LSR.timeframes_1hour.longShortRatio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long/Short ratio aggregated to the 1-hour timeframe.' },
    LSR_RATIO_4H: { category: 'LSR', name: 'L/S Ratio (4H)', icon: '📐', path: 'raw.LSR.timeframes_4hour.longShortRatio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long/Short ratio aggregated to the 4-hour timeframe.' },
    LSR_RATIO_1D: { category: 'LSR', name: 'L/S Ratio (1D)', icon: '📐', path: 'raw.LSR.timeframes_1day.longShortRatio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long/Short ratio aggregated to the daily timeframe.' },

    // ═══════════════════════════════════════════════════════
    // LSR — Z-SCORE (anomaly detection)
    // z: standard deviations from 24h mean; z_clipped: clamped to ±3; z_norm: z_clipped / 3 → (−1 to +1)
    // ═══════════════════════════════════════════════════════
    LSR_ZSCORE: { category: 'LSR', name: 'Z-Score (5m)', icon: '📊', path: 'raw.LSR.timeframes_5min.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Z-score of current 5m ratio vs 24h distribution. ±2 = 2 standard deviations from mean.' },
    LSR_ZSCORE_CLIPPED: { category: 'LSR', name: 'Z-Score Clipped (5m)', icon: '✂️', path: 'raw.LSR.timeframes_5min.z_clipped', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Z-score clamped to ±3 to reduce outlier noise.' },
    LSR_ZSCORE_NORM: { category: 'LSR', name: 'Z-Score Norm (5m)', icon: '🔢', path: 'raw.LSR.timeframes_5min.z_norm', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.66, description: 'Normalised z-score (z_clipped / 3). Range: −1 to +1. Useful as a universal signal input.' },

    LSR_ZSCORE_15M: { category: 'LSR', name: 'Z-Score (15m)', icon: '📊', path: 'raw.LSR.timeframes_15min.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Z-score of 15m aggregated ratio vs the same 24h 5m-based distribution.' },
    LSR_ZSCORE_1H: { category: 'LSR', name: 'Z-Score (1H)', icon: '📊', path: 'raw.LSR.timeframes_1hour.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Z-score of 1H aggregated ratio vs the 24h distribution.' },
    LSR_ZSCORE_4H: { category: 'LSR', name: 'Z-Score (4H)', icon: '📊', path: 'raw.LSR.timeframes_4hour.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Z-score of 4H aggregated ratio vs the 24h distribution.' },
    LSR_ZSCORE_1D: { category: 'LSR', name: 'Z-Score (1D)', icon: '📊', path: 'raw.LSR.timeframes_1day.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Z-score of 1D aggregated ratio vs the 24h distribution.' },

    // ═══════════════════════════════════════════════════════
    // LSR — RATE OF CHANGE (% vs one timeframe ago)
    // ═══════════════════════════════════════════════════════
    LSR_CHANGE_5M: { category: 'LSR', name: 'LSR Change (5m)', icon: '🔀', path: 'raw.LSR.timeframes_5min.lsrChange', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: '% change in L/S ratio vs the point ~5 minutes ago. Positive = ratio rising (more longs).' },
    LSR_CHANGE_15M: { category: 'LSR', name: 'LSR Change (15m)', icon: '🔀', path: 'raw.LSR.timeframes_15min.lsrChange', operators: ['>', '<', 'ABS>'], defaultThreshold: 3.0, description: '% change in L/S ratio vs the point ~15 minutes ago.' },
    LSR_CHANGE_1H: { category: 'LSR', name: 'LSR Change (1H)', icon: '🔀', path: 'raw.LSR.timeframes_1hour.lsrChange', operators: ['>', '<', 'ABS>'], defaultThreshold: 5.0, description: '% change in L/S ratio vs the point ~1 hour ago.' },
    LSR_CHANGE_4H: { category: 'LSR', name: 'LSR Change (4H)', icon: '🔀', path: 'raw.LSR.timeframes_4hour.lsrChange', operators: ['>', '<', 'ABS>'], defaultThreshold: 8.0, description: '% change in L/S ratio vs the point ~4 hours ago.' },
    LSR_CHANGE_1D: { category: 'LSR', name: 'LSR Change (1D)', icon: '🔀', path: 'raw.LSR.timeframes_1day.lsrChange', operators: ['>', '<', 'ABS>'], defaultThreshold: 15.0, description: '% change in L/S ratio vs the point ~24 hours ago.' },

    // ═══════════════════════════════════════════════════════
    // LSR — SENTIMENT & CONTRARIAN SIGNALS
    // Sentiment enum: VERY_BULLISH | BULLISH | NEUTRAL | BEARISH | VERY_BEARISH
    // Contrarian enum: BEARISH_CONTRARIAN | SLIGHTLY_BEARISH | NONE | SLIGHTLY_BULLISH | BULLISH_CONTRARIAN
    // sentimentScore: 80 | 60 | 50 | 40 | 20
    // ═══════════════════════════════════════════════════════
    LSR_SENTIMENT: { category: 'LSR', name: 'Sentiment (5m)', icon: '🧠', path: 'raw.LSR.timeframes_5min.sentiment', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['VERY_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'VERY_BEARISH'], description: 'Market sentiment from 5m LSR. Values: VERY_BULLISH, BULLISH, NEUTRAL, BEARISH, VERY_BEARISH.' },
    LSR_SENTIMENT_SCORE: { category: 'LSR', name: 'Sentiment Score (5m)', icon: '🏆', path: 'raw.LSR.timeframes_5min.sentimentScore', operators: ['>', '<', '>=', '<='], defaultThreshold: 60, description: 'Numeric sentiment score: 80=VERY_BULLISH, 60=BULLISH, 50=NEUTRAL, 40=BEARISH, 20=VERY_BEARISH.' },
    LSR_CONTRARIAN: { category: 'LSR', name: 'Contrarian Signal (5m)', icon: '🔄', path: 'raw.LSR.timeframes_5min.contrarian', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NONE', valueType: 'select', options: ['NONE', 'BEARISH_CONTRARIAN', 'SLIGHTLY_BEARISH', 'SLIGHTLY_BULLISH', 'BULLISH_CONTRARIAN'], description: 'Contrarian signal derived from extreme sentiment. BEARISH_CONTRARIAN when ratio >1.5 (crowd too long). Values: BEARISH_CONTRARIAN, SLIGHTLY_BEARISH, NONE, SLIGHTLY_BULLISH, BULLISH_CONTRARIAN.' },

    LSR_SENTIMENT_1H: { category: 'LSR', name: 'Sentiment (1H)', icon: '🧠', path: 'raw.LSR.timeframes_1hour.sentiment', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['VERY_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'VERY_BEARISH'], description: 'Market sentiment derived from the 1H aggregated L/S ratio.' },
    LSR_SENTIMENT_SCORE_1H: { category: 'LSR', name: 'Sentiment Score (1H)', icon: '🏆', path: 'raw.LSR.timeframes_1hour.sentimentScore', operators: ['>', '<', '>=', '<='], defaultThreshold: 60, description: 'Numeric sentiment score at 1H timeframe (same scale as 5m).' },
    LSR_CONTRARIAN_1H: { category: 'LSR', name: 'Contrarian Signal (1H)', icon: '🔄', path: 'raw.LSR.timeframes_1hour.contrarian', defaultThreshold: 'NONE', valueType: 'select', options: ['NONE', 'BEARISH_CONTRARIAN', 'SLIGHTLY_BEARISH', 'SLIGHTLY_BULLISH', 'BULLISH_CONTRARIAN'], description: 'Contrarian signal at 1H timeframe. Useful for swing-level crowd fade setups.' },

    // ═══════════════════════════════════════════════════════
    // LSR — SUMMARY (cross-timeframe, top-level)
    // ═══════════════════════════════════════════════════════
    LSR_SUMMARY_SENTIMENT: { category: 'LSR', name: 'Summary Sentiment', icon: '🌡️', path: 'raw.LSR.summary.sentiment', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'NEUTRAL', valueType: 'select', options: ['VERY_BULLISH', 'BULLISH', 'NEUTRAL', 'BEARISH', 'VERY_BEARISH'], description: 'Top-level sentiment label based on the latest 5m data point (same as 5m sentiment).' },
    LSR_SUMMARY_SCORE: { category: 'LSR', name: 'Summary Score', icon: '💯', path: 'raw.LSR.summary.sentimentScore', operators: ['>', '<', '>=', '<='], defaultThreshold: 60, description: 'Top-level sentiment score (20–80). Quick filter without parsing timeframes.' },
    LSR_DATA_POINTS: { category: 'LSR', name: 'Data Points', icon: '🗂️', path: 'raw.LSR.summary.dataPoints', operators: ['>', '<', '>='], defaultThreshold: 30, description: 'Number of 5m samples collected for this instrument. <30 means z-scores may be null (insufficient history).' },

};