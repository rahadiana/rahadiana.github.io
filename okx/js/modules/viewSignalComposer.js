/**
 * 🎼 SIGNAL COMPOSER v2.0
 * Advanced custom trading signals with FULL Global & Details integration
 * Configure weights, thresholds, logic operators, and multi-timeframe analysis
 * Includes: Matrix Views, Detail Drilldown, Live Scanner
 */

import * as ViewSimulation from './viewSimulation.js';
import * as Utils from '../utils.js';
import OkxClient from '../okx_client.js';
import { showToast } from './toast.js';
import { computeData } from '../data_helpers.js';
import TradeSafety from './tradeSafety.js';
import { StrategyAllocator } from './strategyAllocator.js';

const STORAGE_KEY = 'bb_signal_composer';

// ======================== GLOBAL TAB MATRIX VIEWS ========================
const MATRIX_VIEWS = {
    OVERVIEW: { name: 'Overview', icon: '📊', desc: 'All main metrics at a glance' },
    DECISION: { name: 'Decision', icon: '🎯', desc: 'Buy/Sell signals and recommendations' },
    SMART: { name: 'Smart Money', icon: '🧠', desc: 'Institutional activity tracking' },
    SYNTHESIS: { name: 'Synthesis', icon: '🧬', desc: 'Flow, efficiency, momentum' },
    VOLATILITY: { name: 'Volatility', icon: '🌋', desc: 'ATR, Range, Squeeze' },
    MICROSTRUCTURE: { name: 'Micro', icon: '🔬', desc: 'VPIN, OFI, Toxicity' },
    LIQUIDITY: { name: 'Liquidity', icon: '💧', desc: 'Spread, depth, slippage' },
    DERIVATIVES: { name: 'Derivatives', icon: '📈', desc: 'OI, Funding, LSR' },
    REGIME: { name: 'Regime', icon: '🌡️', desc: 'Market phase detection' },
    SENTIMENT: { name: 'Sentiment', icon: '😊', desc: 'Fear & greed indicators' }
};

// ======================== GLOBAL TAB FILTER CHIPS ========================
const FILTER_CHIPS = {
    ALL: { name: 'All', icon: '🌐' },
    TRENDING: { name: 'Trending', icon: '📈', filter: (d) => Math.abs(d.raw?.PRICE?.percent_change_1JAM || 0) > 2 },
    HIGH_VOL: { name: 'High Volume', icon: '🔊', filter: (d) => (d.raw?.VOL?.vol_total_1JAM || 0) > 1000000 },
    BUY_SIGNAL: { name: 'Buy Signals', icon: '🟢', filter: (d) => d.signals?.masterSignal?.action === 'LONG' },
    SELL_SIGNAL: { name: 'Sell Signals', icon: '🔴', filter: (d) => d.signals?.masterSignal?.action === 'SHORT' },
    CONVERGENCE: { name: 'Convergence', icon: '🎯', filter: (d) => (d.signals?.masterSignal?.confirmations || 0) >= 4 },
    DISCOUNT: { name: 'Discount', icon: '🏷️', filter: (d) => (d.raw?.PRICE?.percent_change_from_top || 0) < -10 },
    WHALE_ALERT: {
        name: 'Whale Activity', icon: '🐋', filter: (d) => {
            const aggr = d.synthesis?.momentum?.aggression_level_15MENIT;
            return aggr === 'WHALE' || aggr === 'INSTITUTIONAL';
        }
    },
    HIGH_FUNDING: { name: 'Funding Arb', icon: '💰', filter: (d) => Math.abs(d.raw?.FUNDING?.fundingRate || 0) > 0.0003 },
    VOL_SPIKE: {
        name: 'Vol Spike', icon: '🚀', filter: (d) => {
            const v5m = d.raw?.VOL?.vol_total_5MENIT || 0;
            const v1h = d.raw?.VOL?.vol_total_1JAM || 1;
            return (v5m * 12) / v1h > 2.0;
        }
    }
};

// ======================== DETAILS TAB SUB-TABS ========================
const DETAIL_TABS = {
    MAIN: { name: 'Main', icon: '📋' },
    DERIVATIVES: { name: 'Derivatives', icon: '📊' },
    ANALYTICS: { name: 'Analytics', icon: '📈' },
    SIGNALS: { name: 'Signals', icon: '🎯' },
    LEVELS: { name: 'Levels', icon: '📏' },
    MICRO: { name: 'Microstructure', icon: '🔬' }
};

// ======================== COMPLETE SIGNAL COMPONENTS ========================
export const SIGNAL_COMPONENTS = {
    // ═══════════════════ PRICE METRICS ═══════════════════
    PRICE_CURRENT: { category: 'PRICE', name: 'Current Price', icon: '💲', path: 'raw.PRICE.last', operators: ['>', '<', '>=', '<='], defaultThreshold: 50000, description: 'Current market price' },
    PRICE_CHANGE_1M: { category: 'PRICE', name: 'Price Δ 1m', icon: '📈', path: 'raw.PRICE.percent_change_1MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 0.2, description: 'Price % change 1 min' },
    PRICE_CHANGE_5M: { category: 'PRICE', name: 'Price Δ 5m', icon: '📈', path: 'raw.PRICE.percent_change_5MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 0.5, description: 'Price % change 5 min' },
    PRICE_CHANGE_15M: { category: 'PRICE', name: 'Price Δ 15m', icon: '📈', path: 'raw.PRICE.percent_change_15MENIT', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 1.0, description: 'Price % change 15 min' },
    PRICE_CHANGE_1H: { category: 'PRICE', name: 'Price Δ 1h', icon: '📈', path: 'raw.PRICE.percent_change_1JAM', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 2.0, description: 'Price % change 1 hour' },
    PRICE_CHANGE_24H: { category: 'PRICE', name: 'Price Δ 24h', icon: '📈', path: 'raw.PRICE.percent_change_24JAM', operators: ['>', '<', '>=', '<=', 'ABS>'], defaultThreshold: 5.0, description: 'Price % change 24h' },
    PRICE_FROM_HIGH: { category: 'PRICE', name: 'From 24h High', icon: '🔺', path: 'raw.PRICE.percent_change_from_top', operators: ['>', '<'], defaultThreshold: -5, description: 'Distance from 24h high' },
    PRICE_FROM_LOW: { category: 'PRICE', name: 'From 24h Low', icon: '🔻', path: 'raw.PRICE.percent_change_from_bottom', operators: ['>', '<'], defaultThreshold: 5, description: 'Distance from 24h low' },

    // ═══════════════════ VOLUME METRICS ═══════════════════
    VOL_TOTAL_1M: { category: 'VOLUME', name: 'Vol 1m ($)', icon: '📊', path: 'raw.VOL.vol_total_1MENIT', operators: ['>', '<'], defaultThreshold: 50000, description: 'Volume 1 minute' },
    VOL_TOTAL_5M: { category: 'VOLUME', name: 'Vol 5m ($)', icon: '📊', path: 'raw.VOL.vol_total_5MENIT', operators: ['>', '<'], defaultThreshold: 200000, description: 'Volume 5 minutes' },
    VOL_TOTAL_15M: { category: 'VOLUME', name: 'Vol 15m ($)', icon: '📊', path: 'raw.VOL.vol_total_15MENIT', operators: ['>', '<'], defaultThreshold: 500000, description: 'Volume 15 minutes' },
    VOL_TOTAL_1H: { category: 'VOLUME', name: 'Vol 1h ($)', icon: '📊', path: 'raw.VOL.vol_total_1JAM', operators: ['>', '<'], defaultThreshold: 1000000, description: 'Volume 1 hour' },
    VOL_BUY_RATIO_1M: { category: 'VOLUME', name: 'Buy Ratio 1m', icon: '⚖️', path: 'raw.VOL.buy_sell_ratio_1MENIT', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.2, description: 'Buy/Sell ratio 1m' },
    VOL_BUY_RATIO_5M: { category: 'VOLUME', name: 'Buy Ratio 5m', icon: '⚖️', path: 'raw.VOL.buy_sell_ratio_5MENIT', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.2, description: 'Buy/Sell ratio 5m' },
    VOL_BUY_RATIO_15M: { category: 'VOLUME', name: 'Buy Ratio 15m', icon: '⚖️', path: 'raw.VOL.buy_sell_ratio_15MENIT', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.2, description: 'Buy/Sell ratio 15m' },
    VOL_SPIKE_1M: { category: 'VOLUME', name: 'Vol Spike 1m', icon: '🚀', path: '_computed.volSpike1m', operators: ['>', '<'], defaultThreshold: 2.0, computed: true, description: 'Volume spike vs hourly avg' },
    VOL_SPIKE_5M: { category: 'VOLUME', name: 'Vol Spike 5m', icon: '🚀', path: '_computed.volSpike5m', operators: ['>', '<'], defaultThreshold: 1.5, computed: true, description: 'Volume spike 5m vs hourly avg' },

    // ═══════════════════ FREQUENCY ═══════════════════
    FREQ_TOTAL_1M: { category: 'FREQ', name: 'Trades/min', icon: '⚡', path: '_computed.freqTotal1m', operators: ['>', '<'], defaultThreshold: 100, computed: true, description: 'Trades per minute' },
    FREQ_NET_RATIO: { category: 'FREQ', name: 'Freq Bias', icon: '📶', path: '_computed.freqNetRatio', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, computed: true, description: 'Buy-Sell frequency ratio' },

    // ═══════════════════ OPEN INTEREST ═══════════════════
    OI_VALUE: { category: 'OI', name: 'OI Value ($)', icon: '🔄', path: 'raw.OI.openInterest', operators: ['>', '<'], defaultThreshold: 10000000, description: 'Total open interest' },
    OI_CHANGE_15M: { category: 'OI', name: 'OI Δ 15m %', icon: '📊', path: 'raw.OI.oiChange15m', operators: ['>', '<', 'ABS>'], defaultThreshold: 1.0, description: 'OI change 15 min' },
    OI_CHANGE_1H: { category: 'OI', name: 'OI Δ 1h %', icon: '📊', path: 'raw.OI.oiChange1h', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'OI change 1 hour' },
    OI_CHANGE_4H: { category: 'OI', name: 'OI Δ 4h %', icon: '📊', path: 'raw.OI.oiChange4h', operators: ['>', '<', 'ABS>'], defaultThreshold: 5.0, description: 'OI change 4 hours' },
    OI_TIER: { category: 'OI', name: 'OI Tier', icon: '🏆', path: 'raw.OI.tier', operators: ['==', '<=', '>='], defaultThreshold: 1, description: 'OI tier (1=Large Cap)' },
    OI_DIRECTION: { category: 'OI', name: 'OI Direction', icon: '🧭', path: 'raw.OI.marketDirection', operators: ['==', '!='], defaultThreshold: 'BULLISH', valueType: 'select', options: ['BULLISH', 'BEARISH', 'NEUTRAL'], description: 'OI-based direction' },

    // ═══════════════════ FUNDING RATE ═══════════════════
    FUNDING_RATE: { category: 'FUNDING', name: 'Funding Rate', icon: '💰', path: 'raw.FUNDING.fundingRate', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.0001, description: 'Current funding rate' },
    FUNDING_APY: { category: 'FUNDING', name: 'Funding APY %', icon: '📈', path: '_computed.fundingApy', operators: ['>', '<', 'ABS>'], defaultThreshold: 10, computed: true, description: 'Annualized funding' },
    FUNDING_ZSCORE: { category: 'FUNDING', name: 'Funding Z-Score', icon: '📉', path: 'raw.FUNDING.zScore', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'Funding deviation' },
    FUNDING_BIAS: { category: 'FUNDING', name: 'Funding Bias', icon: '🎯', path: 'raw.FUNDING.marketBias', operators: ['==', '!='], defaultThreshold: 'BULLISH', valueType: 'select', options: ['BULLISH', 'BEARISH', 'NEUTRAL', 'EXTREME_BULL', 'EXTREME_BEAR'], description: 'Funding sentiment' },

    // ═══════════════════ LONG/SHORT RATIO ═══════════════════
    LSR_RATIO: { category: 'LSR', name: 'L/S Ratio', icon: '📐', path: 'raw.LSR.ratio', operators: ['>', '<', '>=', '<='], defaultThreshold: 1.0, description: 'Long vs Short ratio' },
    LSR_LONG_PCT: { category: 'LSR', name: 'Long %', icon: '📈', path: 'raw.LSR.longAccountRatio', operators: ['>', '<'], defaultThreshold: 55, description: '% accounts long' },
    LSR_SHORT_PCT: { category: 'LSR', name: 'Short %', icon: '📉', path: 'raw.LSR.shortAccountRatio', operators: ['>', '<'], defaultThreshold: 45, description: '% accounts short' },
    LSR_ZSCORE: { category: 'LSR', name: 'LSR Z-Score', icon: '📊', path: 'raw.LSR.z', operators: ['>', '<', 'ABS>'], defaultThreshold: 2.0, description: 'LSR deviation' },
    LSR_PERCENTILE: { category: 'LSR', name: 'LSR Percentile', icon: '📏', path: 'raw.LSR.percentile', operators: ['>', '<'], defaultThreshold: 80, description: 'Historical percentile' },

    // ═══════════════════ LIQUIDATIONS ═══════════════════
    LIQ_RATE: { category: 'LIQ', name: 'Liq Rate', icon: '💥', path: 'raw.LIQ.liqRate', operators: ['>', '<'], defaultThreshold: 2.0, description: 'Liquidation intensity' },
    LIQ_DOMINANT: { category: 'LIQ', name: 'Liq Side', icon: '🎯', path: 'raw.LIQ.dominantSide', operators: ['==', '!='], defaultThreshold: 'BALANCED', valueType: 'select', options: ['LONG LIQ', 'SHORT LIQ', 'BALANCED'], description: 'Dominant liq side' },

    // ═══════════════════ MASTER SIGNAL ═══════════════════
    MASTER_SCORE: { category: 'MASTER', name: 'Master Score', icon: '🎯', path: 'signals.masterSignal.normalizedScore', operators: ['>', '<', '>=', '<='], defaultThreshold: 65, description: 'Composite score 0-100' },
    MASTER_CONFIDENCE: { category: 'MASTER', name: 'Confidence', icon: '💪', path: 'signals.masterSignal.confidence', operators: ['>', '>='], defaultThreshold: 70, description: 'Confidence level' },
    MASTER_ACTION: { category: 'MASTER', name: 'Action', icon: '🚦', path: 'signals.masterSignal.action', operators: ['==', '!='], defaultThreshold: 'BUY', valueType: 'select', options: ['BUY', 'SELL', 'WAIT'], description: 'Signal direction' },
    MASTER_CONFIRMS: { category: 'MASTER', name: 'Confirmations', icon: '✅', path: 'signals.masterSignal.confirmations', operators: ['>=', '>', '=='], defaultThreshold: 3, description: 'Confirming signals' },
    MASTER_MTF: { category: 'MASTER', name: 'MTF Aligned', icon: '🔗', path: 'signals.masterSignal.mtfAligned', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Multi-timeframe aligned' },

    // ═══════════════════ DASHBOARD ═══════════════════
    DASH_BULL: { category: 'DASH', name: 'Bull Score', icon: '🟢', path: 'dashboard.bullishScore', operators: ['>', '<', '>='], defaultThreshold: 70, description: 'Bullish sentiment' },
    DASH_BEAR: { category: 'DASH', name: 'Bear Score', icon: '🔴', path: 'dashboard.bearishScore', operators: ['>', '<', '>='], defaultThreshold: 70, description: 'Bearish sentiment' },
    DASH_TOTAL: { category: 'DASH', name: 'Dashboard Score', icon: '📊', path: 'dashboard.totalScore', operators: ['>', '<', '>=', '<='], defaultThreshold: 60, description: 'Combined score' },
    DASH_REC: { category: 'DASH', name: 'Recommendation', icon: '💡', path: 'dashboard.recommendation', operators: ['==', '!='], defaultThreshold: 'STRONG_BUY', valueType: 'select', options: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'], description: 'Dashboard rec' },

    // ═══════════════════ MICROSTRUCTURE ═══════════════════
    MICRO_VPIN: { category: 'MICRO', name: 'VPIN', icon: '🔬', path: 'signals.micro.vpin.rawValue', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Informed trading prob' },
    MICRO_VPIN_DIR: { category: 'MICRO', name: 'VPIN Direction', icon: '🧭', path: 'signals.micro.vpin.direction', operators: ['==', '!='], defaultThreshold: 'BULLISH', valueType: 'select', options: ['BULLISH', 'BEARISH', 'NEUTRAL'], description: 'VPIN flow direction' },
    MICRO_OFI: { category: 'MICRO', name: 'OFI Score', icon: '💧', path: 'signals.micro.ofi.normalizedScore', operators: ['>', '<'], defaultThreshold: 65, description: 'Order flow imbalance' },
    MICRO_SPREAD: { category: 'MICRO', name: 'Spread %', icon: '↔️', path: 'signals.micro.spread.rawValue', operators: ['>', '<'], defaultThreshold: 0.05, description: 'Bid-ask spread' },
    MICRO_TOXICITY: { category: 'MICRO', name: 'Toxicity', icon: '☠️', path: 'signals.micro.toxicity.rawValue', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Flow toxicity' },

    // ═══════════════════ ENHANCED SIGNALS ═══════════════════
    ENH_CVD: { category: 'ENH', name: 'CVD', icon: '📶', path: 'signals.enhanced.cvd.rawValue', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, description: 'Cumulative Vol Delta' },
    ENH_CVD_DIV: { category: 'ENH', name: 'CVD Divergence', icon: '⚠️', path: 'signals.enhanced.cvd.divergence', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Price/CVD divergence' },
    ENH_INST: { category: 'ENH', name: 'Institutional', icon: '🏛️', path: 'signals.enhanced.institutionalFootprint.rawValue', operators: ['>', '<'], defaultThreshold: 0.6, description: 'Institutional activity' },
    ENH_MOM_QUAL: { category: 'ENH', name: 'Momentum Quality', icon: '⚡', path: 'signals.enhanced.momentumQuality.rawValue', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Momentum quality' },
    ENH_BOOK_RES: { category: 'ENH', name: 'Book Resilience', icon: '🛡️', path: 'signals.enhanced.bookResilience.rawValue', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Order book recovery' },
    ENH_PRESSURE: { category: 'ENH', name: 'Pressure Accel', icon: '🚀', path: 'signals.enhanced.pressureAcceleration.rawValue', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, description: 'Pressure acceleration' },
    ENH_AMIHUD: { category: 'ENH', name: 'Amihud Illiq', icon: '🧊', path: 'signals.enhanced.amihudIlliquidity.rawValue', operators: ['>', '<'], defaultThreshold: 0.5, description: 'Illiquidity measure' },

    // ═══════════════════ ORDER BOOK ═══════════════════
    OB_IMBALANCE: { category: 'OB', name: 'OB Imbalance', icon: '⚖️', path: 'raw.ORDERBOOK.imbalance', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.2, description: 'Bid/Ask imbalance (-1 to 1)' },
    OB_DEPTH_RATIO: { category: 'OB', name: 'Depth Ratio', icon: '📊', path: 'raw.ORDERBOOK.depthRatio', operators: ['>', '<'], defaultThreshold: 1.0, description: 'Bid/Ask depth ratio' },
    OB_WALL: { category: 'OB', name: 'Wall Detected', icon: '🧱', path: 'raw.ORDERBOOK.wallDetected', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Large order wall' },
    OB_SPREAD: { category: 'OB', name: 'Spread Bps', icon: '↔️', path: 'raw.ORDERBOOK.spreadBps', operators: ['>', '<'], defaultThreshold: 5, description: 'Spread in basis points' },

    // ═══════════════════ BTC CORRELATION ═══════════════════
    BTC_BETA: { category: 'BTC', name: 'BTC Beta', icon: '🔗', path: '_computed.btcBeta', operators: ['>', '<'], defaultThreshold: 1.0, computed: true, description: 'Volatility vs BTC' },
    BTC_DIVERGENCE: { category: 'BTC', name: 'BTC Divergence', icon: '🔀', path: '_computed.btcDiverges', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Moving opposite to BTC' },
    BTC_OUTPERFORM: { category: 'BTC', name: 'Outperforming', icon: '🚀', path: '_computed.btcOutperform', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Stronger move than BTC' },

    // ═══════════════════ SYNTHESIS ═══════════════════
    SYN_FLOW_5M: { category: 'SYN', name: 'Net Flow 5m', icon: '🌊', path: 'synthesis.flow.net_flow_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Net capital flow 5m' },
    SYN_FLOW_15M: { category: 'SYN', name: 'Net Flow 15m', icon: '🌊', path: 'synthesis.flow.net_flow_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 15000, description: 'Net capital flow 15m' },
    SYN_BIAS: { category: 'SYN', name: 'Capital Bias', icon: '💰', path: 'synthesis.flow.capital_bias_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'INFLOW', valueType: 'select', options: ['STRONG_INFLOW', 'INFLOW', 'NEUTRAL', 'OUTFLOW', 'STRONG_OUTFLOW'], description: 'Capital flow direction' },
    SYN_EFF_5M: { category: 'SYN', name: 'Efficiency 5m', icon: '📏', path: 'synthesis.efficiency.efficiency_5MENIT', operators: ['>', '<'], defaultThreshold: 1.5, description: 'Movement efficiency' },
    SYN_EFF_15M: { category: 'SYN', name: 'Efficiency 15m', icon: '📏', path: 'synthesis.efficiency.efficiency_15MENIT', operators: ['>', '<'], defaultThreshold: 1.5, description: 'Movement efficiency' },
    SYN_CHAR: { category: 'SYN', name: 'Character', icon: '🎭', path: 'synthesis.efficiency.character_15MENIT', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: 'EFFORTLESS', valueType: 'select', options: ['EFFORTLESS_BULL', 'EFFORTLESS_BEAR', 'STRONG_BULL', 'STRONG_BEAR', 'STRUGGLING', 'CHOPPY', 'NORMAL'], description: 'Market character' },
    SYN_VEL_5M: { category: 'SYN', name: 'Velocity 5m', icon: '🏎️', path: 'synthesis.momentum.velocity_5MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 3000, description: 'Price momentum' },
    SYN_VEL_15M: { category: 'SYN', name: 'Velocity 15m', icon: '🏎️', path: 'synthesis.momentum.velocity_15MENIT', operators: ['>', '<', 'ABS>'], defaultThreshold: 5000, description: 'Price momentum' },
    SYN_AGGR: { category: 'SYN', name: 'Aggression', icon: '👊', path: 'synthesis.momentum.aggression_level_15MENIT', operators: ['==', '!='], defaultThreshold: 'INSTITUTIONAL', valueType: 'select', options: ['RETAIL', 'MODERATE', 'INSTITUTIONAL', 'WHALE'], description: 'Participant type' },

    // ═══════════════════ REGIME ═══════════════════
    REGIME_CURRENT: { category: 'REGIME', name: 'Market Regime', icon: '🌡️', path: 'signals.marketRegime.currentRegime', operators: ['==', '!='], defaultThreshold: 'TRENDING_UP', valueType: 'select', options: ['TRENDING_UP', 'TRENDING_DOWN', 'RANGING', 'VOLATILE', 'ACCUMULATION', 'DISTRIBUTION', 'BREAKOUT'], description: 'Current regime' },
    REGIME_VOL: { category: 'REGIME', name: 'Vol Regime', icon: '🌋', path: 'signals.marketRegime.volRegime', operators: ['==', '!='], defaultThreshold: 'NORMAL', valueType: 'select', options: ['LOW_VOL', 'NORMAL', 'HIGH_VOL', 'EXTREME_VOL'], description: 'Volatility level' },
    REGIME_TREND: { category: 'REGIME', name: 'Trend Strength', icon: '💪', path: 'signals.marketRegime.trendStrength', operators: ['>', '<'], defaultThreshold: 0.6, description: 'Trend strength 0-1' },

    // ═══════════════════ ORDERBOOK ═══════════════════
    OB_IMBALANCE: { category: 'OB', name: 'Book Imbalance', icon: '📚', path: 'raw.ORDERBOOK.imbalance', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.2, description: 'Bid/Ask imbalance' },
    OB_DEPTH: { category: 'OB', name: 'Depth Ratio', icon: '🏊', path: 'raw.ORDERBOOK.depthRatio', operators: ['>', '<'], defaultThreshold: 1.0, description: 'Bid/Ask depth' },
    OB_WALL: { category: 'OB', name: 'Wall Detected', icon: '🧱', path: 'raw.ORDERBOOK.wallDetected', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Large order wall' },

    // ═══════════════════ BTC CORRELATION / BENCHMARK ═══════════════════
    BTC_CHANGE_1M: { category: 'BTC', name: 'BTC Δ 1m', icon: '₿', path: '_computed.btcChange1m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.1, computed: true, description: 'BTC price change 1m' },
    BTC_CHANGE_5M: { category: 'BTC', name: 'BTC Δ 5m', icon: '₿', path: '_computed.btcChange5m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.3, computed: true, description: 'BTC price change 5m' },
    BTC_CHANGE_15M: { category: 'BTC', name: 'BTC Δ 15m', icon: '₿', path: '_computed.btcChange15m', operators: ['>', '<', 'ABS>'], defaultThreshold: 0.5, computed: true, description: 'BTC price change 15m' },
    BTC_CHANGE_1H: { category: 'BTC', name: 'BTC Δ 1h', icon: '₿', path: '_computed.btcChange1h', operators: ['>', '<', 'ABS>'], defaultThreshold: 1.0, computed: true, description: 'BTC price change 1h' },
    BTC_DIRECTION: { category: 'BTC', name: 'BTC Direction', icon: '🧭', path: '_computed.btcDirection', operators: ['==', '!='], defaultThreshold: 'UP', valueType: 'select', options: ['UP', 'DOWN', 'FLAT'], computed: true, description: 'BTC current direction' },
    BTC_FOLLOWS: { category: 'BTC', name: 'Follows BTC', icon: '🔗', path: '_computed.btcFollows', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Coin following BTC move' },
    BTC_DIVERGES: { category: 'BTC', name: 'Diverges BTC', icon: '↔️', path: '_computed.btcDiverges', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Coin diverging from BTC' },
    BTC_BETA: { category: 'BTC', name: 'BTC Beta', icon: '📊', path: '_computed.btcBeta', operators: ['>', '<'], defaultThreshold: 1.0, computed: true, description: 'Move ratio vs BTC (>1 = outperform)' },
    BTC_OUTPERFORM: { category: 'BTC', name: 'Outperforms BTC', icon: '🚀', path: '_computed.btcOutperform', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Coin outperforming BTC' },

    // ═══════════════════ SMART ALERTS ═══════════════════
    ALERT_CONV: { category: 'ALERT', name: 'Convergence', icon: '🎯', path: '_computed.hasConvergence', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Multiple signals align' },
    ALERT_WHALE: { category: 'ALERT', name: 'Whale Active', icon: '🐋', path: '_computed.isWhaleActive', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Institutional activity' },
    ALERT_DISCOUNT: { category: 'ALERT', name: 'Discount', icon: '🏷️', path: '_computed.isDiscount', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Trading at discount' },
    ALERT_ARB: { category: 'ALERT', name: 'Arb Opp', icon: '💱', path: '_computed.hasArbOpp', operators: ['=='], defaultThreshold: true, valueType: 'boolean', computed: true, description: 'Arbitrage opportunity' },

    // ═══════════════════ META-GUARD ═══════════════════
    GUARD_STATUS: { category: 'GUARD', name: 'Guard Status', icon: '🛡️', path: 'signals.institutional_guard.meta_guard_status', operators: ['==', '!='], defaultThreshold: 'ALLOW', valueType: 'select', options: ['ALLOW', 'DOWNGRADE', 'BLOCK', 'SCANNING'], description: 'Meta-Guard execution status' },
    GUARD_ALLOWED: { category: 'GUARD', name: 'Execution Allowed', icon: '✅', path: 'signals.institutional_guard.execution_allowed', operators: ['=='], defaultThreshold: true, valueType: 'boolean', description: 'Is execution allowed?' },
    GUARD_CONF_ADJ: { category: 'GUARD', name: 'Confidence Adjustment', icon: '📉', path: 'signals.institutional_guard.confidence_adjustment', operators: ['>', '<', '>=', '<='], defaultThreshold: 0, description: 'Guard confidence modifier' },
    GUARD_NOISE: { category: 'GUARD', name: 'Noise Level', icon: '📢', path: 'signals.institutional_guard.noise_level', operators: ['==', '!='], defaultThreshold: 'CLEAN', valueType: 'select', options: ['CLEAN', 'NOISY', 'EXTREME'], description: 'Signal noise assessment' },
    GUARD_IVS: { category: 'GUARD', name: 'Institutional Validity', icon: '🏛️', path: 'signals.institutional_guard.ivs_score', operators: ['>', '<', '>='], defaultThreshold: 50, description: 'Institutional Validity Score' },
    GUARD_BLOCK_REASON: { category: 'GUARD', name: 'Block Reason', icon: '🚫', path: 'signals.institutional_guard.block_reason', operators: ['==', '!=', 'CONTAINS'], defaultThreshold: null, valueType: 'select', options: ['NO_POSITIONING', 'HIGH_VOL', 'CAUSALITY_BROKEN', 'CROWD_CONTAMINATION', 'NO_LIQUIDITY', 'SANITY_CHECK_FAILED'], description: 'Reason for blocking execution' }
};

export const CATEGORIES = {
    PRICE: { name: 'Price', color: 'bb-gold', icon: '📈' },
    VOLUME: { name: 'Volume', color: 'bb-blue', icon: '📊' },
    FREQ: { name: 'Frequency', color: 'indigo-400', icon: '⚡' },
    OI: { name: 'Open Interest', color: 'bb-green', icon: '🔄' },
    FUNDING: { name: 'Funding', color: 'purple-400', icon: '💰' },
    LSR: { name: 'Long/Short', color: 'pink-400', icon: '📐' },
    LIQ: { name: 'Liquidations', color: 'red-400', icon: '💥' },
    MASTER: { name: 'Master Signal', color: 'bb-gold', icon: '🎯' },
    DASH: { name: 'Dashboard', color: 'amber-400', icon: '📋' },
    MICRO: { name: 'Microstructure', color: 'cyan-400', icon: '🔬' },
    ENH: { name: 'Enhanced', color: 'emerald-400', icon: '⚡' },
    SYN: { name: 'Synthesis', color: 'orange-400', icon: '🧬' },
    REGIME: { name: 'Regime', color: 'rose-400', icon: '🌡️' },
    OB: { name: 'Order Book', color: 'sky-400', icon: '📚' },
    BTC: { name: 'BTC Benchmark', color: 'yellow-500', icon: '₿' },
    ALERT: { name: 'Alerts', color: 'red-500', icon: '🚨' },
    GUARD: { name: 'Meta-Guard', color: 'emerald-500', icon: '🛡️' }
};

// Preset Templates
const PRESET_TEMPLATES = {
    // ═══════════════════ SCALPING ═══════════════════
    SCALP_AGGRESSIVE: { name: '⚡ Scalp Aggressive', description: 'Fast scalping with vol + OB Imbalance', conditions: [{ component: 'VOL_SPIKE_1M', operator: '>', value: 2.0, weight: 2 }, { component: 'OB_IMBALANCE', operator: 'ABS>', value: 0.3, weight: 1.5 }, { component: 'MICRO_VPIN', operator: '>', value: 0.5, weight: 1 }], logic: 'WEIGHTED', minScore: 65, cooldown: 60 },
    SCALP_MOMENTUM: { name: '🏎️ Momentum Scalp', description: 'Momentum + BTC Outperform', conditions: [{ component: 'SYN_VEL_5M', operator: 'ABS>', value: 5000, weight: 2 }, { component: 'BTC_OUTPERFORM', operator: '==', value: true, weight: 2 }, { component: 'VOL_BUY_RATIO_1M', operator: '>', value: 1.3, weight: 1 }], logic: 'AND', cooldown: 45 },
    SCALP_EFFICIENCY: { name: '📏 Efficient Move', description: 'Low friction price moves', conditions: [{ component: 'SYN_EFF_5M', operator: '>', value: 2.0, weight: 2 }, { component: 'SYN_CHAR', operator: 'CONTAINS', value: 'EFFORTLESS', weight: 2 }, { component: 'OB_SPREAD', operator: '<', value: 5, weight: 1 }], logic: 'AND', cooldown: 90 },

    // ═══════════════════ INSTITUTIONAL / WHALE ═══════════════════
    WHALE_TRACKER: { name: '🐋 Whale Tracker', description: 'Follow institutional flow + Walls', conditions: [{ component: 'ENH_INST', operator: '>', value: 0.6, weight: 2 }, { component: 'OB_WALL', operator: '==', value: true, weight: 2 }, { component: 'SYN_AGGR', operator: '==', value: 'WHALE', weight: 1.5 }], logic: 'AND', cooldown: 300 },
    SMART_MONEY: { name: '🧠 Smart Money', description: 'Institutional accumulation', conditions: [{ component: 'SYN_BIAS', operator: '==', value: 'ACCUMULATION', weight: 2 }, { component: 'ENH_INST', operator: '>', value: 0.5, weight: 1.5 }, { component: 'MICRO_VPIN', operator: '>', value: 0.4, weight: 1 }, { component: 'VOL_SPIKE_15M', operator: '>', value: 1.2, weight: 1 }], logic: 'WEIGHTED', minScore: 65, cooldown: 300 },
    DISTRIBUTION: { name: '📤 Distribution', description: 'Smart money selling', conditions: [{ component: 'SYN_BIAS', operator: '==', value: 'DISTRIBUTION', weight: 2 }, { component: 'ENH_INST', operator: '>', value: 0.5, weight: 1.5 }, { component: 'PRICE_CHANGE_1H', operator: '<', value: -0.5, weight: 1 }], logic: 'AND', cooldown: 300, biasLogic: 'SHORT' },

    // ═══════════════════ DERIVATIVES ═══════════════════
    FUNDING_ARB: { name: '💰 Funding Arb', description: 'Extreme funding contrarian', conditions: [{ component: 'FUNDING_ZSCORE', operator: 'ABS>', value: 2.5, weight: 2 }, { component: 'FUNDING_APY', operator: 'ABS>', value: 30, weight: 1.5 }], logic: 'AND', cooldown: 600, biasLogic: 'CONTRARIAN' },
    OI_SURGE: { name: '📈 OI Surge', description: 'New positions opening', conditions: [{ component: 'OI_CHANGE_15M', operator: '>', value: 2.5, weight: 2 }, { component: 'OI_CHANGE_1H', operator: '>', value: 4.0, weight: 1.5 }, { component: 'VOL_SPIKE_15M', operator: '>', value: 1.5, weight: 1 }], logic: 'AND', cooldown: 300 },
    OI_FLUSH: { name: '📉 OI Flush', description: 'Positions closing rapidly', conditions: [{ component: 'OI_CHANGE_15M', operator: '<', value: -2.0, weight: 2 }, { component: 'LIQ_RATE', operator: '>', value: 2.0, weight: 1.5 }, { component: 'VOL_SPIKE_5M', operator: '>', value: 2.0, weight: 1 }], logic: 'AND', cooldown: 180, biasLogic: 'CONTRARIAN' },
    LSR_EXTREME: { name: '📐 LSR Extreme', description: 'Crowded positioning', conditions: [{ component: 'LSR_ZSCORE', operator: 'ABS>', value: 2.0, weight: 2 }, { component: 'LSR_PERCENTILE', operator: '>', value: 90, weight: 1.5 }], logic: 'AND', cooldown: 600, biasLogic: 'CONTRARIAN' },

    // ═══════════════════ BREAKOUT / MOMENTUM ═══════════════════
    BREAKOUT: { name: '🚀 Breakout', description: 'Volume + OI + OB imbalance', conditions: [{ component: 'VOL_SPIKE_5M', operator: '>', value: 1.8, weight: 2 }, { component: 'OB_IMBALANCE', operator: 'ABS>', value: 0.4, weight: 2 }, { component: 'PRICE_CHANGE_5M', operator: 'ABS>', value: 1.0, weight: 1.5 }], logic: 'WEIGHTED', minScore: 70, cooldown: 180 },
    SQUEEZE_BREAK: { name: '💥 Squeeze Break', description: 'Vol expansion from consolidation', conditions: [{ component: 'REGIME_VOL', operator: '==', value: 'LOW_VOL', weight: 1 }, { component: 'VOL_SPIKE_5M', operator: '>', value: 2.5, weight: 2 }, { component: 'BTC_BETA', operator: '>', value: 1.2, weight: 1 }], logic: 'AND', cooldown: 180 },
    TREND_CONTINUATION: { name: '📈 Trend Cont', description: 'Ride trend with BTC strength', conditions: [{ component: 'REGIME_CURRENT', operator: 'CONTAINS', value: 'TRENDING', weight: 2 }, { component: 'BTC_OUTPERFORM', operator: '==', value: true, weight: 2 }, { component: 'SYN_EFF_15M', operator: '>', value: 1.3, weight: 1 }], logic: 'AND', cooldown: 300 },

    // ═══════════════════ REVERSAL / MEAN REVERSION ═══════════════════
    REVERSAL: { name: '🔄 Reversal', description: 'Contrarian divergence', conditions: [{ component: 'LSR_ZSCORE', operator: 'ABS>', value: 2.0, weight: 2 }, { component: 'BTC_DIVERGENCE', operator: '==', value: true, weight: 2 }, { component: 'ENH_CVD_DIV', operator: '==', value: true, weight: 2 }], logic: 'OR', cooldown: 600, biasLogic: 'CONTRARIAN' },
    OVERSOLD_BOUNCE: { name: '📉 Oversold Bounce', description: 'Mean reversion long', conditions: [{ component: 'PRICE_FROM_HIGH', operator: '<', value: -8, weight: 2 }, { component: 'LSR_RATIO', operator: '<', value: 0.8, weight: 1.5 }, { component: 'VOL_SPIKE_15M', operator: '>', value: 1.5, weight: 1 }], logic: 'AND', cooldown: 300, biasLogic: 'LONG' },
    OVERBOUGHT_FADE: { name: '📈 Overbought Fade', description: 'Mean reversion short', conditions: [{ component: 'PRICE_FROM_LOW', operator: '>', value: 8, weight: 2 }, { component: 'LSR_RATIO', operator: '>', value: 1.3, weight: 1.5 }, { component: 'FUNDING_RATE', operator: '>', value: 0.0003, weight: 1 }], logic: 'AND', cooldown: 300, biasLogic: 'SHORT' },

    // ═══════════════════ LIQUIDATION ═══════════════════
    LIQ_PLAY: { name: '💥 Liquidation', description: 'Trade liquidation cascade', conditions: [{ component: 'LIQ_RATE', operator: '>', value: 3.0, weight: 2 }, { component: 'VOL_SPIKE_1M', operator: '>', value: 3.0, weight: 1.5 }], logic: 'AND', cooldown: 120, biasLogic: 'CONTRARIAN' },
    LIQ_LONG_SQUEEZE: { name: '🔻 Long Squeeze', description: 'Longs getting liquidated', conditions: [{ component: 'LIQ_DOMINANT', operator: '==', value: 'LONG LIQ', weight: 2 }, { component: 'LIQ_RATE', operator: '>', value: 2.0, weight: 1.5 }, { component: 'PRICE_CHANGE_5M', operator: '<', value: -1.0, weight: 1 }], logic: 'AND', cooldown: 120, biasLogic: 'CONTRARIAN' },
    LIQ_SHORT_SQUEEZE: { name: '🔺 Short Squeeze', description: 'Shorts getting rekt', conditions: [{ component: 'LIQ_DOMINANT', operator: '==', value: 'SHORT LIQ', weight: 2 }, { component: 'LIQ_RATE', operator: '>', value: 2.0, weight: 1.5 }, { component: 'PRICE_CHANGE_5M', operator: '>', value: 1.0, weight: 1 }], logic: 'AND', cooldown: 120, biasLogic: 'LONG' },

    // ═══════════════════ MICROSTRUCTURE ═══════════════════
    TOXIC_FLOW: { name: '☠️ Toxic Flow', description: 'Informed trading detected', conditions: [{ component: 'MICRO_VPIN', operator: '>', value: 0.7, weight: 2 }, { component: 'MICRO_TOXICITY', operator: '>', value: 0.6, weight: 1.5 }, { component: 'VOL_SPIKE_5M', operator: '>', value: 1.5, weight: 1 }], logic: 'AND', cooldown: 180 },
    BOOK_IMBALANCE: { name: '📚 Book Imbalance', description: 'Order book pressure', conditions: [{ component: 'OB_IMBALANCE', operator: 'ABS>', value: 0.3, weight: 2 }, { component: 'OB_DEPTH', operator: '>', value: 1.5, weight: 1.5 }, { component: 'MICRO_OFI', operator: '>', value: 60, weight: 1 }], logic: 'WEIGHTED', minScore: 60, cooldown: 120 },
    WALL_BREAK: { name: '🧱 Wall Break', description: 'Breaking order wall', conditions: [{ component: 'OB_WALL', operator: '==', value: true, weight: 1 }, { component: 'VOL_SPIKE_1M', operator: '>', value: 2.5, weight: 2 }, { component: 'PRICE_CHANGE_1M', operator: 'ABS>', value: 0.3, weight: 1.5 }], logic: 'AND', cooldown: 90 },

    // ═══════════════════ CONVERGENCE / HIGH CONVICTION ═══════════════════
    CONVERGENCE: { name: '🎯 Convergence', description: 'Multiple signals aligning', conditions: [{ component: 'MASTER_SCORE', operator: '>=', value: 70, weight: 2 }, { component: 'MASTER_CONFIRMS', operator: '>=', value: 4, weight: 1.5 }, { component: 'DASH_TOTAL', operator: '>=', value: 65, weight: 1 }], logic: 'WEIGHTED', minScore: 70, cooldown: 300 },
    FULL_ALIGNMENT: { name: '✨ Full Alignment', description: 'Everything agrees', conditions: [{ component: 'MASTER_MTF', operator: '==', value: true, weight: 2 }, { component: 'MASTER_CONFIRMS', operator: '>=', value: 5, weight: 2 }, { component: 'SYN_CHAR', operator: 'CONTAINS', value: 'EFFORTLESS', weight: 1.5 }, { component: 'ENH_INST', operator: '>', value: 0.5, weight: 1 }], logic: 'AND', cooldown: 300 },
    HIGH_CONFIDENCE: { name: '💪 High Confidence', description: 'Strong conviction setup', conditions: [{ component: 'MASTER_CONFIDENCE', operator: '>=', value: 80, weight: 2 }, { component: 'MASTER_SCORE', operator: '>=', value: 75, weight: 2 }, { component: 'REGIME_TREND', operator: '>', value: 0.6, weight: 1 }], logic: 'AND', cooldown: 300 },

    // ═══════════════════ BTC CORRELATION ═══════════════════
    BTC_FOLLOW: { name: '₿ BTC Follower', description: 'Trade alts that follow BTC', conditions: [{ component: 'BTC_FOLLOWS', operator: '==', value: true, weight: 2 }, { component: 'BTC_CHANGE_5M', operator: 'ABS>', value: 0.3, weight: 1.5 }, { component: 'MASTER_SCORE', operator: '>=', value: 60, weight: 1 }], logic: 'AND', cooldown: 180 },
    BTC_DIVERGE: { name: '↔️ BTC Divergence', description: 'Alts diverging from BTC', conditions: [{ component: 'BTC_DIVERGES', operator: '==', value: true, weight: 2 }, { component: 'BTC_OUTPERFORM', operator: '==', value: true, weight: 1.5 }, { component: 'VOL_SPIKE_5M', operator: '>', value: 1.5, weight: 1 }], logic: 'AND', cooldown: 300 },
    BTC_BETA_PLAY: { name: '📊 High Beta', description: 'High beta alts when BTC moves', conditions: [{ component: 'BTC_BETA', operator: '>', value: 1.5, weight: 2 }, { component: 'BTC_CHANGE_5M', operator: 'ABS>', value: 0.5, weight: 2 }, { component: 'BTC_FOLLOWS', operator: '==', value: true, weight: 1 }], logic: 'AND', cooldown: 180 },
    BTC_DIP_BUY: { name: '₿ BTC Dip Buy', description: 'Buy alts when BTC dips', conditions: [{ component: 'BTC_CHANGE_15M', operator: '<', value: -1.0, weight: 2 }, { component: 'BTC_FOLLOWS', operator: '==', value: true, weight: 1.5 }, { component: 'MASTER_ACTION', operator: '==', value: 'LONG', weight: 1 }], logic: 'AND', cooldown: 300, biasLogic: 'LONG' },

    // ═══════════════════ SPECIAL CONDITIONS ═══════════════════
    DISCOUNT_HUNTER: { name: '🏷️ Discount Hunter', description: 'Buy significant pullbacks', conditions: [{ component: 'PRICE_FROM_HIGH', operator: '<', value: -10, weight: 2 }, { component: 'ALERT_DISCOUNT', operator: '==', value: true, weight: 1 }, { component: 'SYN_BIAS', operator: '==', value: 'ACCUMULATION', weight: 1.5 }], logic: 'AND', cooldown: 600, biasLogic: 'LONG' },
    VOLATILITY_PLAY: { name: '🌋 Vol Spike', description: 'High volatility opportunities', conditions: [{ component: 'REGIME_VOL', operator: '==', value: 'HIGH_VOL', weight: 2 }, { component: 'VOL_SPIKE_5M', operator: '>', value: 2.0, weight: 1.5 }, { component: 'MASTER_CONFIDENCE', operator: '>=', value: 65, weight: 1 }], logic: 'AND', cooldown: 120 },
    QUIET_ACCUMULATION: { name: '🤫 Quiet Accum', description: 'Stealth accumulation', conditions: [{ component: 'REGIME_VOL', operator: '==', value: 'LOW_VOL', weight: 1 }, { component: 'OI_CHANGE_1H', operator: '>', value: 2.0, weight: 2 }, { component: 'SYN_BIAS', operator: '==', value: 'ACCUMULATION', weight: 2 }], logic: 'AND', cooldown: 600, biasLogic: 'LONG' },

    // ═══════════════════ ADVANCED STRATEGIES (from Strategy Tab) ═══════════════════
    STRAT_FLASH: { name: '⚡ Flash Pump Detector', description: 'Mendeteksi koin SEBELUM pompa signifikan. Masuk di 30 detik pertama pergerakan impulsif. Lev: 5-10x, Hold: 5m-30m', conditions: [{ component: 'VOL_SPIKE_1M', operator: '>', value: 1.5, weight: 2 }, { component: 'MASTER_SCORE', operator: '>', value: 52, weight: 1.5 }, { component: 'SYN_FLOW_1M', operator: '>', value: 5000, weight: 1 }], logic: 'AND', cooldown: 300 },
    STRAT_GAMMA: { name: '🎲 Gamma Exposure', description: 'Mendeteksi Gamma Squeeze. Korelasi OI dan Volatilitas sebagai proxy hedging dealer options. Lev: 5-10x, Hold: 1h-4h', conditions: [{ component: 'OI_CHANGE_1H', operator: 'ABS>', value: 5.0, weight: 2 }, { component: 'OI_ZSCORE', operator: 'ABS>', value: 2.5, weight: 1.5 }], logic: 'OR', cooldown: 600 },
    STRAT_CLUSTER: { name: '🎯 Volume Cluster', description: 'Zona harga institusi akumulasi diam-diam (Volume Profile Nodes). High Vol + Low Price Change. Lev: 3-5x, Hold: 4h-12h', conditions: [{ component: 'VOL_SPIKE_1H', operator: '>', value: 1.5, weight: 2 }, { component: 'PRICE_CHANGE_1H', operator: 'ABS<', value: 0.5, weight: 1.5 }], logic: 'AND', cooldown: 600, biasLogic: 'LONG' },
    STRAT_TAPE: { name: '📜 Tape Reading', description: 'Agresivitas Tape (Trade Feed). Urutan order beli/jual agresif. Lev: 10-20x, Hold: 1m-5m', conditions: [{ component: 'SYN_AGGR', operator: '==', value: 'INSTITUTIONAL', weight: 2 }, { component: 'MICRO_VPIN', operator: '>', value: 0.55, weight: 1.5 }], logic: 'AND', cooldown: 120 },
    STRAT_ANOMALY: { name: '⚠️ Statistical Anomaly', description: 'Pergerakan 3-Sigma menyimpang statistik. Mean reversion atau breakout ekstrim. Lev: 2-5x, Hold: 1h-6h', conditions: [{ component: 'LSR_ZSCORE', operator: 'ABS>', value: 3.0, weight: 2 }, { component: 'OI_ZSCORE', operator: 'ABS>', value: 3.0, weight: 2 }], logic: 'OR', cooldown: 600 },
    STRAT_COMPOSITE: { name: '👑 Composite Alpha (God Signal)', description: 'Framework paling advanced: Bobot adaptif, Net Flow massif, Institutional Footprint, Konfluensi MTF. Lev: 5-15x, Hold: 15m-1h', conditions: [{ component: 'MASTER_SCORE', operator: '>', value: 67, weight: 2 }, { component: 'SYN_FLOW_15M', operator: 'ABS>', value: 30000, weight: 2 }, { component: 'MASTER_MTF', operator: '==', value: true, weight: 2 }, { component: 'ENH_INST', operator: '>', value: 0.6, weight: 1.5 }], logic: 'AND', cooldown: 600 },
    STRAT_BLITZ: { name: '⚡ Institutional Blitz', description: 'Konfluensi sempurna: Net Flow besar, EFFORTLESS MOVE, CVD konfirmasi. Setup sniper paling murni. Lev: 10-25x, Hold: 2m-10m', conditions: [{ component: 'SYN_FLOW_15M', operator: 'ABS>', value: 22500, weight: 2 }, { component: 'SYN_CHAR', operator: 'CONTAINS', value: 'EFFORTLESS', weight: 2 }, { component: 'SYN_AGGR', operator: '==', value: 'INSTITUTIONAL', weight: 1.5 }], logic: 'AND', cooldown: 300 },
    STRAT_MTF_PRO: { name: '📡 MTF Confluence Pro', description: 'Trigger saat 1M, 5M, 15M, 1H sama arah dengan Momentum Quality tinggi. Lev: 3-10x, Hold: 1h-4h', conditions: [{ component: 'MASTER_MTF', operator: '==', value: true, weight: 3 }, { component: 'ENH_MOM_QUALITY', operator: '>', value: 0.4, weight: 2 }], logic: 'AND', cooldown: 600 },
    STRAT_BREAKOUT: { name: '💥 Institutional Breakout', description: 'Ledakan harga divalidasi VPIN tinggi, Book Resilience kuat. Menghindari False Breakout. Lev: 10x, Hold: 15m-1h', conditions: [{ component: 'MICRO_VPIN', operator: '>', value: 0.45, weight: 2 }, { component: 'SYN_FLOW_15M', operator: 'ABS>', value: 15000, weight: 2 }, { component: 'ENH_BOOK_RES', operator: '>', value: 0.5, weight: 1.5 }], logic: 'AND', cooldown: 300 },
    STRAT_ALPHA: { name: '🏹 Independent Alpha', description: 'Koin Outlier bergerak independen (BTC Decorrelated). Efektif saat BTC sideways. Lev: 5x, Hold: 4h-12h', conditions: [{ component: 'BTC_CORR', operator: '<', value: 0.4, weight: 2 }, { component: 'MASTER_SCORE', operator: '>', value: 52, weight: 1.5 }], logic: 'AND', cooldown: 600 },
    STRAT_FLOW: { name: '🌊 Net Flow Directional', description: 'Murni mengikuti arus modal dengan konfirmasi CVD. Trade sesuai Dominant Capital Bias. Lev: 3-10x, Hold: 1h-4h', conditions: [{ component: 'SYN_FLOW_15M', operator: 'ABS>', value: 15000, weight: 2 }, { component: 'SYN_BIAS', operator: '!=', value: 'NEUTRAL', weight: 1.5 }], logic: 'AND', cooldown: 300 },
    STRAT_SMART_MONEY: { name: '🏦 Smart Money Divergence', description: 'Volume per koin meledak TAPI frekuensi transaksi stabil/turun (Large orders hidden). Lev: 5x, Hold: 4h-24h', conditions: [{ component: 'ENH_INST', operator: '>', value: 0.4, weight: 2 }, { component: 'MASTER_ACTION', operator: '!=', value: 'WAIT', weight: 1 }], logic: 'AND', cooldown: 600 },
    STRAT_WHALE: { name: '🐋 Whale Shadow Tracker', description: 'Membuntuti Whale-Pace dengan Institutional Footprint Score + Amihud Ratio rendah. Lev: 10x, Hold: 30m-1h', conditions: [{ component: 'ENH_INST', operator: '>', value: 0.7, weight: 2 }, { component: 'SYN_VEL_15M', operator: '>', value: 3000, weight: 1.5 }], logic: 'AND', cooldown: 300 },
    STRAT_DIVERGE: { name: '📈 Price-Flow Divergence', description: 'Harga turun tapi Net Flow naik tajam (Hidden Accumulation) atau sebaliknya. Lev: 5-10x, Hold: 1h-2h', conditions: [{ component: 'PRICE_CHANGE_24H', operator: '<', value: -2, weight: 1 }, { component: 'SYN_FLOW_15M', operator: '>', value: 20000, weight: 2 }], logic: 'AND', cooldown: 300, biasLogic: 'LONG' },
    STRAT_ICEBERG: { name: '🧊 Iceberg Detection', description: 'Pesanan raksasa dipecah-pecah di order book (OFI dan Lambda). Lev: 10x, Hold: 30m-1h', conditions: [{ component: 'OB_IMBALANCE', operator: 'ABS>', value: 0.5, weight: 2 }, { component: 'MICRO_LAMBDA', operator: '>', value: 0.01, weight: 1.5 }, { component: 'ENH_INST', operator: '>', value: 0.3, weight: 1 }], logic: 'AND', cooldown: 300 },
    STRAT_ABSORB: { name: '🧲 Whale Absorption', description: 'Volume meledak tapi harga tidak bergerak (Paku) + Book Resilience tinggi. Paus menyerap ritel. Lev: 10x, Hold: 1h-3h', conditions: [{ component: 'SYN_CHAR', operator: 'CONTAINS', value: 'ABSORPTION', weight: 2 }, { component: 'SYN_FLOW_15M', operator: 'ABS>', value: 15000, weight: 1.5 }, { component: 'ENH_BOOK_RES', operator: '>', value: 0.5, weight: 1.5 }], logic: 'AND', cooldown: 300 },
    STRAT_SWEEP: { name: '🧹 Liquidity Sweep', description: 'Pembersihan likuiditas (wick panjang) sebelum harga berbalik. Snipe di atas/bawah konsolidasi. Lev: 20x, Hold: 5m-15m', conditions: [{ component: 'LSR_ZSCORE', operator: 'ABS>', value: 2.5, weight: 2 }, { component: 'LIQ_RATE', operator: '>', value: 2.0, weight: 1.5 }], logic: 'AND', cooldown: 180 },
    STRAT_TRAP: { name: '🚨 Liquidation Reversal', description: 'Titik jenuh likuidasi ritel (Absorption). Masuk saat Washout dengan CVD berlawanan. Lev: 10x, Hold: 1h-2h', conditions: [{ component: 'SYN_CHAR', operator: 'CONTAINS', value: 'ABSORPTION', weight: 2 }, { component: 'LSR_ZSCORE', operator: 'ABS>', value: 2.0, weight: 1.5 }], logic: 'OR', cooldown: 300, biasLogic: 'CONTRARIAN' },
    STRAT_VOL: { name: '🌩️ Volatility Breakout', description: 'Transisi konsolidasi sepi ke ledakan volatilitas + Volume Spike + Momentum Quality. Lev: 3-5x, Hold: 4h-8h', conditions: [{ component: 'ENH_MOM_QUALITY', operator: '>', value: 0.4, weight: 2 }, { component: 'VOL_SPIKE_15M', operator: '>', value: 1.5, weight: 1.5 }], logic: 'AND', cooldown: 600 },
    STRAT_EFFICIENCY: { name: '🧬 Efficiency-Momentum', description: 'Efficiency, momentum quality, dan pressure acceleration. Harga bergerak efisien dengan momentum bersih. Lev: 5-10x, Hold: 30m-2h', conditions: [{ component: 'SYN_EFF_15M', operator: '>', value: 0.8, weight: 2 }, { component: 'SYN_VEL_15M', operator: '>', value: 3000, weight: 1.5 }, { component: 'ENH_MOM_QUALITY', operator: '>', value: 0.5, weight: 1.5 }], logic: 'AND', cooldown: 300 },
    STRAT_SWING: { name: '🏛️ Swing Accumulation', description: 'Aset sedang diakumulasi institusi dengan Institutional Footprint tinggi. Hold 1-3 hari mengikuti uang pintar. Lev: 3-5x', conditions: [{ component: 'MASTER_SCORE', operator: '>', value: 52, weight: 1 }, { component: 'SYN_FLOW_15M', operator: '>', value: 4500, weight: 1.5 }, { component: 'ENH_INST', operator: '>', value: 0.5, weight: 2 }], logic: 'AND', cooldown: 900, biasLogic: 'LONG' },
    STRAT_BASIS: { name: '💎 Delta-Neutral Basis', description: 'Selisih harga Futures vs Spot + funding raksasa. Resiko harga nol, murni bunga inap. Lev: 1x, Hold: 7d-30d', conditions: [{ component: 'FUNDING_RATE', operator: 'ABS>', value: 0.001, weight: 2 }], logic: 'AND', cooldown: 3600, biasLogic: 'CONTRARIAN' },
    STRAT_WALLS: { name: '🧱 Wall Defender', description: 'Harga tertahan tembok pesanan raksasa. Strategi rebound dengan resiko rendah. Lev: 5-12x, Hold: 1h-4h', conditions: [{ component: 'OB_WALL', operator: '==', value: true, weight: 2 }], logic: 'AND', cooldown: 300 },
    STRAT_FISHER: { name: '🌊 Liquidity Fisher', description: 'Titik jenuh pembalikan saat likuiditas kosong dan menyentuh tembok institusi. Pantulan ekstrim. Lev: 5-10x, Hold: 15m-45m', conditions: [{ component: 'OB_SPREAD', operator: '>', value: 20, weight: 2 }, { component: 'OB_DEPTH', operator: '>', value: 2, weight: 1.5 }], logic: 'AND', cooldown: 300, biasLogic: 'LONG' },
    STRAT_VOID: { name: '🕳️ Order Book Vacuum', description: 'Lubang likuiditas antara harga saat ini dengan tembok berikutnya. Pergerakan kilat zona kosong. Lev: 20x, Hold: 5m-10m', conditions: [{ component: 'OB_SPREAD', operator: '>', value: 6.0, weight: 2 }], logic: 'AND', cooldown: 120 },
    STRAT_SENTIMENT: { name: '⚖️ Sentiment Contrarian', description: 'Posisi berlawanan dengan kerumunan ritel optimis/pesimis. Anti-herd entry. Lev: 10x, Hold: 1h-4h', conditions: [{ component: 'LSR_ZSCORE', operator: 'ABS>', value: 1.8, weight: 2 }], logic: 'AND', cooldown: 600, biasLogic: 'CONTRARIAN' },
    STRAT_MEAN_REV: { name: '🔄 Mean Reversion', description: 'Titik jenuh harga jauh dari VWAP + Net Flow stabil/reverse. Snap-back ke rata-rata. Lev: 5-10x, Hold: 30m-1h', conditions: [{ component: 'PRICE_FROM_HIGH', operator: 'ABS>', value: 3, weight: 2 }], logic: 'AND', cooldown: 300, biasLogic: 'CONTRARIAN' },
    STRAT_PATIENCE: { name: '⌛ Patience Sniper', description: 'Setup Perfect Storm. Semua enhanced signals alignment: MTF Pro, Net Flow, Inst Footprint, Mom Quality, Book Res. Lev: 2-5x, Hold: 12h-48h', conditions: [{ component: 'MASTER_SCORE', operator: '>', value: 72, weight: 2 }, { component: 'SYN_FLOW_15M', operator: 'ABS>', value: 45000, weight: 2 }, { component: 'ENH_INST', operator: '>', value: 0.7, weight: 2 }, { component: 'ENH_MOM_QUALITY', operator: '>', value: 0.6, weight: 1.5 }, { component: 'ENH_BOOK_RES', operator: '>', value: 0.6, weight: 1.5 }], logic: 'AND', cooldown: 900 },
    STRAT_IGNITION: { name: '📈 Momentum Ignition', description: 'Awal trend sehat: OI naik tajam + Net Capital Inflow + Pressure Acceleration + Momentum Quality. Lev: 3x, Hold: 3d-7d', conditions: [{ component: 'MASTER_SCORE', operator: '>', value: 52, weight: 1 }, { component: 'SYN_FLOW_15M', operator: '>', value: 12000, weight: 1.5 }, { component: 'ENH_MOM_QUALITY', operator: '>', value: 0.5, weight: 2 }], logic: 'AND', cooldown: 600 },
    STRAT_FUNDING: { name: '💸 Funding Rate Arb', description: 'Selisih ekstrim Funding Rate vs Premium Index. Long saat funding negatif, Short saat positif tinggi. Lev: 1-3x, Hold: 8h-24h', conditions: [{ component: 'FUNDING_RATE', operator: 'ABS>', value: 0.0008, weight: 2 }], logic: 'AND', cooldown: 1800, biasLogic: 'CONTRARIAN' },
    STRAT_SAFETY: { name: '🛡️ Toxic Flow Filter', description: 'Sistem pelindung modal. Identifikasi koin dimanipulasi robot HFT. JANGAN TRADE. Risk Guard.', conditions: [{ component: 'MICRO_VPIN', operator: '>', value: 0.8, weight: 2 }], logic: 'AND', cooldown: 60, biasLogic: 'STAY_AWAY', maxPositions: 0 }
};

// State
let compositions = [];
let activeComposition = null;
let currentTab = 'LIST';       // LIST, EDITOR, SCANNER
let currentMatrix = 'OVERVIEW';
let currentFilter = 'ALL';
let currentCatFilter = 'ALL';
let scannerResults = [];
let selectedCoin = null;
let composerProfile = 'GLOBAL';   // GLOBAL, AGGRESSIVE, MODERATE, CONSERVATIVE, SCALPER
let composerTimeframe = 'GLOBAL'; // GLOBAL, 1MENIT, 5MENIT, 15MENIT, 30MENIT, 1JAM
let currentDetailTab = 'MAIN';
let scannerSignalId = null;
let sigPosMapping = new Map(); // sigId -> array of coins
const STORAGE_KEY_MAPPING = STORAGE_KEY + '_mapping';

// ⚡ Helper: Get active profile/timeframe (resolve GLOBAL from main settings)
function getActiveProfileTimeframe() {
    // Import global settings if GLOBAL is selected
    const globalProfile = window.globalViewSettings?.profile || 'AGGRESSIVE';
    const globalTimeframe = window.globalViewSettings?.timeframe || '15MENIT';

    const profile = composerProfile === 'GLOBAL' ? globalProfile : composerProfile;
    const timeframe = composerTimeframe === 'GLOBAL' ? globalTimeframe : composerTimeframe;

    return { profile, timeframe };
}

// ⚡ Helper: Get profile/timeframe from a signal (respects signal's own setting or falls back to global)
function getSignalProfileTimeframe(sig) {
    const globalProfile = window.globalViewSettings?.profile || 'AGGRESSIVE';
    const globalTimeframe = window.globalViewSettings?.timeframe || '15MENIT';

    const sigProfile = sig?.profile || 'GLOBAL';
    const sigTimeframe = sig?.timeframe || 'GLOBAL';

    const profile = sigProfile === 'GLOBAL' ? globalProfile : sigProfile;
    const timeframe = sigTimeframe === 'GLOBAL' ? globalTimeframe : sigTimeframe;

    return { profile, timeframe };
}

export function render(container) {
    loadState();
    // Sync local selection with global app selection so Details panel reflects global coin
    if (window.selectedCoin) selectedCoin = window.selectedCoin;
    // No forced detail tab — render normally

    container.innerHTML = `
        <div class="h-full flex flex-col bg-bb-black font-mono overflow-hidden">
            <!-- HEADER -->
            <div class="p-2 border-b border-bb-border bg-gradient-to-r from-bb-panel/50 to-transparent shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">🎼</span>
                        <div>
                            <h1 class="text-base font-black text-white">SIGNAL COMPOSER</h1>
                            <p class="text-[8px] text-bb-muted">${Object.keys(SIGNAL_COMPONENTS).length} components • ${Object.keys(CATEGORIES).length} categories • ${Object.keys(MATRIX_VIEWS).length} views</p>
                        </div>
                    </div>

                    <!-- TAB SWITCHER -->
                    <div class="flex gap-1 bg-bb-panel/30 p-0.5 rounded">
                        ${['LIST', 'EDITOR', 'SCANNER'].map(t => `
                            <button class="tab-btn px-3 py-1 text-[9px] font-bold rounded transition-all ${currentTab === t ? 'bg-bb-gold text-black' : 'text-bb-muted hover:text-white'}" data-tab="${t}">
                                ${t === 'LIST' ? '📋' : t === 'EDITOR' ? '✏️' : '📡'} ${t}
                            </button>
                        `).join('')}
                    </div>

                    <div class="flex gap-2">
                        <button id="btn-presets" class="px-2 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] font-black hover:bg-purple-500/20 rounded">📋 PRESETS</button>
                        <button id="btn-new" class="px-2 py-1 bg-bb-gold/10 border border-bb-gold/30 text-bb-gold text-[9px] font-black hover:bg-bb-gold/20 rounded">+ NEW</button>
                    </div>
                </div>

                <!-- DATA SOURCE CONFIG -->
                <div class="flex items-center gap-4 mt-2 px-2 py-1.5 bg-black/30 rounded border border-white/5">
                    <span class="text-[8px] text-bb-muted uppercase font-black">📊 Data Source:</span>
                    <div class="flex items-center gap-2">
                        <span class="text-[7px] text-bb-muted uppercase">Profile:</span>
                        <select id="composer-profile" class="bg-bb-black border border-bb-border text-[9px] text-white px-2 py-0.5 rounded focus:border-bb-gold outline-none">
                            <option value="GLOBAL" ${composerProfile === 'GLOBAL' ? 'selected' : ''}>🌐 GLOBAL</option>
                            <option value="AGGRESSIVE" ${composerProfile === 'AGGRESSIVE' ? 'selected' : ''}>🔥 AGGRESSIVE</option>
                            <option value="MODERATE" ${composerProfile === 'MODERATE' ? 'selected' : ''}>⚖️ MODERATE</option>
                            <option value="CONSERVATIVE" ${composerProfile === 'CONSERVATIVE' ? 'selected' : ''}>🛡️ CONSERVATIVE</option>
                            <option value="SCALPER" ${composerProfile === 'SCALPER' ? 'selected' : ''}>⚡ SCALPER</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[7px] text-bb-muted uppercase">Timeframe:</span>
                        <select id="composer-timeframe" class="bg-bb-black border border-bb-border text-[9px] text-white px-2 py-0.5 rounded focus:border-bb-gold outline-none">
                            <option value="GLOBAL" ${composerTimeframe === 'GLOBAL' ? 'selected' : ''}>🌐 GLOBAL</option>
                            <option value="1MENIT" ${composerTimeframe === '1MENIT' ? 'selected' : ''}>1m</option>
                            <option value="5MENIT" ${composerTimeframe === '5MENIT' ? 'selected' : ''}>5m</option>
                            <option value="15MENIT" ${composerTimeframe === '15MENIT' ? 'selected' : ''}>15m</option>
                            <option value="30MENIT" ${composerTimeframe === '30MENIT' ? 'selected' : ''}>30m</option>
                            <option value="1JAM" ${composerTimeframe === '1JAM' ? 'selected' : ''}>1H</option>
                        </select>
                    </div>
                    <span class="text-[7px] text-bb-muted/50 italic ml-2">GLOBAL = inherit from Global tab</span>
                </div>
            </div>

            <!-- MAIN CONTENT -->
            <div class="flex-1 flex overflow-hidden">
                ${currentTab === 'LIST' ? renderListTab() :
            currentTab === 'EDITOR' ? renderEditorTab() :
                renderScannerTab()}
            </div>

            <!-- FOOTER: LIVE MONITOR -->
            <div class="border-t border-bb-border bg-gradient-to-r from-bb-panel/30 to-transparent p-1.5 shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1">
                            <div class="w-1.5 h-1.5 rounded-full bg-bb-green animate-pulse"></div>
                            <span class="text-[8px] font-black text-bb-muted uppercase">Live</span>
                        </div>
                        <div id="live-triggers" class="flex items-center gap-1 flex-wrap max-w-[70%]">
                            <span class="text-[8px] text-bb-muted">Waiting...</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <span id="active-count" class="text-[8px] text-bb-green font-bold">${compositions.filter(c => c.active).length} active</span>
                        <span id="total-triggers" class="text-[8px] text-bb-muted">0 triggers</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    attachEvents(container);
}

function renderListTab() {
    return `
        <!-- LEFT: SIGNAL LIST -->
        <div class="w-[25%] border-r border-bb-border flex flex-col overflow-hidden bg-bb-panel/10">
            <div class="p-2 border-b border-bb-border bg-black/30 flex items-center justify-between">
                <span class="text-[8px] font-black text-bb-muted uppercase">My Signals (${compositions.length})</span>
            </div>
            <div id="signals-list" class="flex-1 overflow-y-auto p-2 space-y-1">
                ${renderSignalsList()}
            </div>
        </div>

        <!-- CENTER: MATRIX VIEW (GLOBAL STYLE) -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- MATRIX TABS -->
            <div class="p-2 border-b border-bb-border bg-black/30 flex gap-1 flex-wrap">
                ${Object.entries(MATRIX_VIEWS).map(([k, v]) => `
                    <button class="matrix-tab px-2 py-0.5 text-[8px] font-bold rounded ${currentMatrix === k ? 'bg-bb-gold text-black' : 'bg-white/5 text-bb-muted hover:bg-white/10'}" data-matrix="${k}" title="${v.desc}">
                        ${v.icon} ${v.name}
                    </button>
                `).join('')}
            </div>

            <!-- FILTER CHIPS -->
            <div class="p-2 border-b border-bb-border bg-black/20 flex gap-1 flex-wrap">
                ${Object.entries(FILTER_CHIPS).map(([k, v]) => `
                    <button class="filter-chip px-2 py-0.5 text-[7px] font-bold rounded ${currentFilter === k ? 'bg-bb-gold text-black' : 'bg-white/5 text-bb-muted hover:bg-white/10'}" data-filter="${k}">
                        ${v.icon} ${v.name}
                    </button>
                `).join('')}
            </div>

            <!-- RESULTS TABLE -->
            <div id="matrix-table" class="flex-1 overflow-auto p-2">
                ${renderMatrixTable()}
            </div>
        </div>

        <!-- RIGHT: DETAILS VIEW -->
        <div class="w-[28%] border-l border-bb-border flex flex-col overflow-hidden bg-bb-panel/10">
            <div class="p-2 border-b border-bb-border bg-black/30">
                <span class="text-[8px] font-black text-bb-muted uppercase">Coin Details</span>
            </div>
                    <div id="detail-view" class="flex-1 overflow-auto">
                        ${selectedCoin ? renderCoinDetail(selectedCoin) : renderNoSelection()}
                    </div>
        </div>
    `;
}

function renderEditorTab() {
    return `
        <!-- LEFT: SIGNAL LIST (smaller) -->
        <div class="w-[18%] border-r border-bb-border flex flex-col overflow-hidden bg-bb-panel/10">
            <div class="p-2 border-b border-bb-border bg-black/30">
                <span class="text-[8px] font-black text-bb-muted uppercase">Signals</span>
            </div>
            <div id="signals-list" class="flex-1 overflow-y-auto p-1 space-y-1">
                ${renderSignalsList()}
            </div>
        </div>

        <!-- CENTER: EDITOR -->
        <div class="w-[50%] flex flex-col overflow-hidden">
            <div id="editor-area" class="flex-1 overflow-y-auto">
                ${activeComposition ? renderEditor() : renderEmptyEditor()}
            </div>
        </div>

        <!-- RIGHT: COMPONENTS PALETTE -->
        <div class="w-[32%] border-l border-bb-border flex flex-col overflow-hidden bg-bb-panel/10">
            <div class="p-2 border-b border-bb-border bg-black/30 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-black text-bb-muted uppercase">Components</span>
                    <span class="text-[7px] text-bb-muted">${Object.keys(SIGNAL_COMPONENTS).length}</span>
                </div>
                <input id="comp-search" type="text" placeholder="Search..." 
                       class="w-full bg-black/50 border border-white/10 text-[8px] text-white px-2 py-0.5 rounded focus:border-bb-gold outline-none">
                <div class="flex flex-wrap gap-0.5" id="category-filters">
                    <button class="cat-filter px-1 py-0.5 rounded text-[7px] font-bold ${currentCatFilter === 'ALL' ? 'bg-bb-gold text-black' : 'bg-white/5 text-bb-muted'}" data-cat="ALL">ALL</button>
                    ${Object.entries(CATEGORIES).map(([k, c]) => `
                        <button class="cat-filter px-1 py-0.5 rounded text-[6px] ${currentCatFilter === k ? 'bg-bb-gold text-black' : 'bg-white/5 text-bb-muted'}" data-cat="${k}">${c.icon}</button>
                    `).join('')}
                </div>
            </div>
            <div id="palette" class="flex-1 overflow-y-auto p-2 space-y-2">
                ${renderPalette()}
            </div>
        </div>
    `;
}

function renderScannerTab() {
    return `
        <!-- FULL WIDTH SCANNER -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- SCANNER CONTROLS -->
            <div class="p-2 border-b border-bb-border bg-black/30 flex items-center justify-between">
                <div class="flex gap-2 items-center">
                    <span class="text-[9px] font-black text-bb-muted uppercase">Active Signal Scanner</span>
                    <select id="scanner-signal" class="bg-bb-black border border-white/20 text-[9px] text-white px-2 py-1 rounded">
                        <option value="">Select composition...</option>
                        ${compositions.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                    <button id="btn-scan-all" class="px-3 py-1 bg-bb-green/20 border border-bb-green/30 text-bb-green text-[9px] font-bold rounded hover:bg-bb-green/30">🔍 SCAN ALL</button>
                </div>
                <div class="text-[8px] text-bb-muted">
                    Found: <span id="scan-count" class="text-bb-gold font-bold">${scannerResults.length}</span> matches
                </div>
            </div>

            <!-- SCANNER RESULTS -->
            <div class="flex-1 overflow-auto p-2">
                ${renderScannerResults()}
            </div>
        </div>
    `;
}

function renderSignalsList() {
    if (!compositions.length) {
        return `<div class="text-center py-4 opacity-50"><div class="text-2xl mb-1">🎼</div><p class="text-[8px] text-bb-muted">No signals</p></div>`;
    }

    return compositions.map(c => `
        <div class="signal-item p-1.5 rounded border ${activeComposition?.id === c.id ? 'border-bb-gold bg-bb-gold/10' : 'border-white/10 hover:border-white/20 bg-black/30'} cursor-pointer transition-all group" data-id="${c.id}">
            <div class="flex items-center gap-1.5">
                <button class="toggle-active shrink-0 w-3 h-3 rounded-full flex items-center justify-center text-[7px] ${c.active ? 'bg-bb-green' : 'bg-white/10'}">${c.active ? '✓' : ''}</button>
                <div class="min-w-0 flex-1">
                    <div class="text-[9px] font-bold text-white truncate">${c.name}</div>
                    <div class="text-[7px] text-bb-muted">${c.conditions?.length || 0} cond</div>
                </div>
                <button class="del-btn p-0.5 opacity-0 group-hover:opacity-100 hover:bg-bb-red/20 rounded text-bb-red text-[8px]">✕</button>
            </div>
        </div>
    `).join('');
}

function renderMatrixTable() {
    const mkt = window.marketState || {};
    const coins = Object.keys(mkt);

    if (!coins.length) {
        return `<div class="text-center py-8 text-bb-muted/50 text-[9px]">No market data available</div>`;
    }

    // Apply filter
    const { profile, timeframe } = getActiveProfileTimeframe();
    let filtered = coins.map(c => ({ coin: c, data: computeData(mkt[c], profile, timeframe) }));
    if (currentFilter !== 'ALL' && FILTER_CHIPS[currentFilter]?.filter) {
        filtered = filtered.filter(x => FILTER_CHIPS[currentFilter].filter(x.data));
    }

    if (!filtered.length) {
        return `<div class="text-center py-8 text-bb-muted/50 text-[9px]">No coins match filter</div>`;
    }

    // Get columns based on matrix view
    const cols = getMatrixColumns(currentMatrix);

    return `
        <table class="w-full text-[8px]">
            <thead class="sticky top-0 bg-bb-black">
                <tr class="text-bb-muted border-b border-white/10">
                    <th class="text-left p-1">Coin</th>
                    ${cols.map(c => `<th class="text-right p-1">${c.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${filtered.slice(0, 50).map(({ coin, data }) => `
                    <tr class="coin-row border-b border-white/5 hover:bg-white/5 cursor-pointer ${selectedCoin === coin ? 'bg-bb-gold/10' : ''}" data-coin="${coin}">
                        <td class="p-1 font-bold text-white">${coin.replace('-USDT', '')}</td>
                        ${cols.map(c => `<td class="text-right p-1 ${c.color ? c.color(getNestedValue(data, c.path)) : 'text-white/80'}">${c.format(getNestedValue(data, c.path))}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function getMatrixColumns(view) {
    const fmtNum = (v, d = 2) => v != null ? Utils.safeFixed(Number(v), d) : '-';
    const fmtPct = v => v != null ? `${v >= 0 ? '+' : ''}${Utils.safeFixed(Number(v), 2)}%` : '-';
    const fmtUsd = v => v != null ? `$${Utils.safeFixed(v / 1000, 0)}k` : '-';
    const pctCol = v => v > 0 ? 'text-bb-green' : v < 0 ? 'text-bb-red' : 'text-white/60';

    const views = {
        OVERVIEW: [
            { name: 'Price', path: 'raw.PRICE.last', format: v => fmtNum(v, 2) },
            { name: '1m%', path: 'raw.PRICE.percent_change_1MENIT', format: fmtPct, color: pctCol },
            { name: '5m%', path: 'raw.PRICE.percent_change_5MENIT', format: fmtPct, color: pctCol },
            { name: '1h%', path: 'raw.PRICE.percent_change_1JAM', format: fmtPct, color: pctCol },
            { name: 'Vol 1h', path: 'raw.VOL.vol_total_1JAM', format: fmtUsd },
            { name: 'B/S', path: 'raw.VOL.buy_sell_ratio_5MENIT', format: v => fmtNum(v, 2) }
        ],
        DECISION: [
            { name: 'Score', path: 'signals.masterSignal.normalizedScore', format: v => fmtNum(v, 0) },
            { name: 'Action', path: 'signals.masterSignal.action', format: v => v || '-', color: v => v === 'LONG' ? 'text-bb-green' : v === 'SHORT' ? 'text-bb-red' : 'text-white/60' },
            { name: 'Conf', path: 'signals.masterSignal.confirmations', format: v => v ?? '-' },
            { name: 'Dashboard', path: 'dashboard.totalScore', format: v => fmtNum(v, 0) },
            { name: 'Rec', path: 'dashboard.recommendation', format: v => v || '-' }
        ],
        SMART: [
            { name: 'Aggression', path: 'synthesis.momentum.aggression_level_15MENIT', format: v => v || '-' },
            { name: 'Inst', path: 'signals.enhanced.institutionalFootprint.rawValue', format: v => fmtNum(v, 2) },
            { name: 'VPIN', path: 'signals.micro.vpin.rawValue', format: v => fmtNum(v, 2) },
            { name: 'CVD', path: 'signals.enhanced.cvd.rawValue', format: v => fmtNum(v, 2), color: pctCol }
        ],
        SYNTHESIS: [
            { name: 'Flow 5m', path: 'synthesis.flow.net_flow_5MENIT', format: fmtUsd, color: pctCol },
            { name: 'Flow 15m', path: 'synthesis.flow.net_flow_15MENIT', format: fmtUsd, color: pctCol },
            { name: 'Eff 15m', path: 'synthesis.efficiency.efficiency_15MENIT', format: v => fmtNum(v, 2) },
            { name: 'Char', path: 'synthesis.efficiency.character_15MENIT', format: v => (v || '-').substring(0, 8) },
            { name: 'Vel', path: 'synthesis.momentum.velocity_15MENIT', format: fmtUsd, color: pctCol }
        ],
        VOLATILITY: [
            { name: 'ATR%', path: 'signals.volatility.atr.pct', format: v => fmtNum(v, 2) + '%' },
            { name: '24h Range', path: '_computed.range24h', format: v => fmtNum(v, 1) + '%' },
            { name: 'From High', path: 'raw.PRICE.percent_change_from_top', format: fmtPct, color: pctCol },
            { name: 'From Low', path: 'raw.PRICE.percent_change_from_bottom', format: fmtPct, color: pctCol }
        ],
        MICROSTRUCTURE: [
            { name: 'VPIN', path: 'signals.micro.vpin.rawValue', format: v => fmtNum(v, 3) },
            { name: 'OFI', path: 'signals.micro.ofi.normalizedScore', format: v => fmtNum(v, 0) },
            { name: 'Spread', path: 'signals.micro.spread.rawValue', format: v => fmtNum(v, 3) + '%' },
            { name: 'Toxicity', path: 'signals.micro.toxicity.rawValue', format: v => fmtNum(v, 2) }
        ],
        LIQUIDITY: [
            { name: 'OI ($)', path: 'raw.OI.openInterest', format: v => fmtUsd(v / 1000) },
            { name: 'Tier', path: 'raw.OI.tier', format: v => v ?? '-' },
            { name: 'Book Imb', path: 'raw.ORDERBOOK.imbalance', format: v => fmtNum(v, 2), color: pctCol }
        ],
        DERIVATIVES: [
            { name: 'OI Δ15m', path: 'raw.OI.oiChange15m', format: fmtPct, color: pctCol },
            { name: 'OI Δ1h', path: 'raw.OI.oiChange1h', format: fmtPct, color: pctCol },
            { name: 'Funding', path: 'raw.FUNDING.fundingRate', format: v => fmtNum(v * 100, 4) + '%', color: pctCol },
            { name: 'LSR', path: 'raw.LSR.ratio', format: v => fmtNum(v, 2) },
            { name: 'LSR Z', path: 'raw.LSR.z', format: v => fmtNum(v, 2), color: pctCol }
        ],
        REGIME: [
            { name: 'Regime', path: 'signals.marketRegime.currentRegime', format: v => (v || '-').substring(0, 10) },
            { name: 'Vol Regime', path: 'signals.marketRegime.volRegime', format: v => v || '-' },
            { name: 'Trend Str', path: 'signals.marketRegime.trendStrength', format: v => fmtNum(v, 2) }
        ],
        SENTIMENT: [
            { name: 'Bull', path: 'dashboard.bullishScore', format: v => fmtNum(v, 0) },
            { name: 'Bear', path: 'dashboard.bearishScore', format: v => fmtNum(v, 0) },
            { name: 'Fund Bias', path: 'raw.FUNDING.marketBias', format: v => v || '-' },
            { name: 'OI Dir', path: 'raw.OI.marketDirection', format: v => v || '-' }
        ]
    };

    return views[view] || views.OVERVIEW;
}

function renderCoinDetail(coin) {
    const mkt = window.marketState || {};
    const { profile, timeframe } = getActiveProfileTimeframe();
    const data = computeData(mkt[coin], profile, timeframe);
    if (!data) return `<div class="p-4 text-center text-bb-muted text-[9px]">No data for ${coin}</div>`;

    const raw = data.raw || {};
    const sig = data.signals || {};
    const syn = data.synthesis || {};

    return `
        <div class="p-2 space-y-3">
            <!-- DETAIL SUB-TABS -->
            <div class="flex gap-1 mb-2">
                ${Object.entries(DETAIL_TABS).map(([k, v]) => `
                    <button class="detail-tab px-2 py-0.5 text-[8px] font-bold rounded ${currentDetailTab === k ? 'bg-bb-gold text-black' : 'bg-white/5 text-bb-muted'}" data-detail="${k}">${v.icon} ${v.name}</button>
                `).join('')}
            </div>
            <!-- HEADER -->
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <div>
                    <div class="text-lg font-black text-white">${coin.replace('-USDT', '')}</div>
                    <div class="text-[9px] text-bb-muted">USDT Perpetual</div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-black ${(raw.PRICE?.percent_change_1JAM || 0) >= 0 ? 'text-bb-green' : 'text-bb-red'}">
                        $${(raw.PRICE?.last || 0).toLocaleString()}
                    </div>
                    <div class="text-[9px] ${(raw.PRICE?.percent_change_1JAM || 0) >= 0 ? 'text-bb-green' : 'text-bb-red'}">
                        ${(raw.PRICE?.percent_change_1JAM || 0) >= 0 ? '+' : ''}${Utils.safeFixed(raw.PRICE?.percent_change_1JAM || 0, 2)}%
                    </div>
                </div>
            </div>

            <!-- MASTER SIGNAL -->
            <div class="p-2 rounded bg-black/30 border border-white/10">
                <div class="text-[8px] font-black text-bb-muted uppercase mb-1">Master Signal</div>
                <div class="flex items-center gap-2">
                    <span class="text-2xl font-black ${sig.masterSignal?.action === 'LONG' ? 'text-bb-green' : sig.masterSignal?.action === 'SHORT' ? 'text-bb-red' : 'text-white/50'}">
                        ${sig.masterSignal?.action || 'WAIT'}
                    </span>
                    <div>
                        <div class="text-[9px] text-white">Score: ${Utils.safeFixed(sig.masterSignal?.normalizedScore || 0, 0)}</div>
                        <div class="text-[8px] text-bb-muted">${sig.masterSignal?.confirmations || 0} confirmations</div>
                    </div>
                </div>
            </div>

            <!-- DERIVATIVES -->
            <div class="grid grid-cols-3 gap-2">
                <div class="p-1.5 rounded bg-black/30 border border-white/10 text-center">
                    <div class="text-[7px] text-bb-muted">OI</div>
                    <div class="text-[10px] font-bold text-white">${Utils.safeFixed((raw.OI?.openInterest || 0) / 1e6, 1)}M</div>
                </div>
                <div class="p-1.5 rounded bg-black/30 border border-white/10 text-center">
                    <div class="text-[7px] text-bb-muted">Funding</div>
                    <div class="text-[10px] font-bold ${(raw.FUNDING?.fundingRate || 0) >= 0 ? 'text-bb-green' : 'text-bb-red'}">${Utils.safeFixed((raw.FUNDING?.fundingRate || 0) * 100, 4)}%</div>
                </div>
                <div class="p-1.5 rounded bg-black/30 border border-white/10 text-center">
                    <div class="text-[7px] text-bb-muted">LSR</div>
                    <div class="text-[10px] font-bold text-white">${Utils.safeFixed(raw.LSR?.ratio || 0, 2)}</div>
                </div>
            </div>

            <!-- SYNTHESIS -->
            <div class="p-2 rounded bg-black/30 border border-white/10">
                <div class="text-[8px] font-black text-bb-muted uppercase mb-1">Synthesis</div>
                <div class="space-y-1">
                    <div class="flex justify-between text-[8px]">
                        <span class="text-bb-muted">Flow 15m</span>
                        <span class="${(syn.flow?.net_flow_15MENIT || 0) >= 0 ? 'text-bb-green' : 'text-bb-red'}">$${Utils.safeFixed((syn.flow?.net_flow_15MENIT || 0) / 1000, 0)}k</span>
                    </div>
                    <div class="flex justify-between text-[8px]">
                        <span class="text-bb-muted">Character</span>
                        <span class="text-white">${syn.efficiency?.character_15MENIT || '-'}</span>
                    </div>
                    <div class="flex justify-between text-[8px]">
                        <span class="text-bb-muted">Aggression</span>
                        <span class="text-white">${syn.momentum?.aggression_level_15MENIT || '-'}</span>
                    </div>
                </div>
            </div>

            <!-- DETAIL CONTENT -->
            ${currentDetailTab === 'COMPOSER' ? renderComposerDetail(coin, data) :
            currentDetailTab === 'SIGNALS' ? renderSignalAnalysis(coin, data) :
                renderActiveSignalsForCoin(coin, data)}
        </div>
    `;
}

function renderComposerDetail(coin, data) {
    return getComposerGroupedDetailHTML(coin);
}

// Public helper: return HTML for composer detail for a given coin
export function getComposerDetailHTML(coin) {
    const mkt = window.marketState || {};
    const data = computeData(mkt[coin], getActiveProfileTimeframe().profile, getActiveProfileTimeframe().timeframe);
    return renderComposerDetail(coin, data);
}

// Build a compact Composer panel (category filters + values) for embedding in Details
export function getComposerPanelHTML(coin) {
    const categories = Object.keys(CATEGORIES || {}).map(k => ({ key: k, icon: CATEGORIES[k].icon }));
    const catButtons = [
        `<button class="cat-filter px-1 py-0.5 rounded text-[7px] font-bold bg-bb-gold text-black" data-cat="ALL">ALL</button>`,
        ...categories.map(c => `<button class="cat-filter px-1 py-0.5 rounded text-[6px] bg-white/5 text-bb-muted" data-cat="${c.key}" title="${c.key}">${c.icon}</button>`)
    ].join('');

    const header = `
        <div class="p-2 bg-bb-panel border border-bb-border rounded w-80 shadow-gold-glow text-[10px]">
            <div class="flex items-center justify-between mb-2">
                <div class="text-[8px] font-black text-bb-muted uppercase">Composer Components</div>
                <div class="text-[8px] text-bb-muted">Action Engine v2.1</div>
            </div>
            <div class="flex flex-wrap gap-1 mb-2" id="composer-category-filters">${catButtons}</div>
            <div id="composer-components-list" class="max-h-[420px] overflow-y-auto scrollbar-thin divide-y divide-white/5"></div>
        </div>
    `;

    return header;
}

// Build a grouped table of components for a given coin (for Details->Composer)
export function getComposerGroupedDetailHTML(coin) {
    const mkt = window.marketState || {};
    const { profile, timeframe } = getActiveProfileTimeframe();
    const data = computeData(mkt[coin], profile, timeframe) || {};

    const groups = Object.entries(CATEGORIES).map(([catKey, cat]) => {
        const catComps = Object.entries(SIGNAL_COMPONENTS).filter(([, c]) => c.category === catKey);
        if (!catComps.length) return '';

        const rows = catComps.map(([id, comp]) => {
            const raw = safeGet(data, comp.path) ?? null;
            let display;
            if (raw === null) display = '-';
            else if (typeof raw === 'number') {
                const unit = detectUnitFromPath(comp.path);
                if (unit === '%') display = Utils.safeFixed(raw, comp.displayDigits || 2) + '%';
                else if (unit === '$') display = '$' + Utils.safeFixed(raw, comp.displayDigits || (Math.abs(raw) > 1000 ? 0 : 2));
                else display = Utils.safeFixed(raw, comp.displayDigits || 2);
            } else display = String(raw);

            // Determine color based on value if applicable
            let colorClass = 'text-white';
            if (typeof raw === 'number') {
                if (comp.path.includes('buy_sell_ratio') || comp.path.includes('openInterest')) {
                    // specific logic if needed
                } else {
                    if (raw > 0) colorClass = 'text-bb-green';
                    if (raw < 0) colorClass = 'text-bb-red';
                }
            }

            return `
                <tr class="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td class="px-2 py-1 text-bb-muted w-8 text-center text-[7px]">${comp.icon || ''}</td>
                    <td class="px-2 py-1 font-medium text-bb-muted">${comp.name}</td>
                    <td class="px-2 py-1 text-right font-mono font-bold ${colorClass}">${display}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="mb-3 border border-white/10 rounded bg-black/20 overflow-hidden">
                <div class="px-2 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <span class="text-[9px] font-black text-${cat.color || 'white'} uppercase flex items-center gap-1.5">
                        ${cat.icon} ${cat.name}
                    </span>
                </div>
                <table class="w-full text-[9px]">
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }).join('');

    return `
        <div class="p-2 h-full overflow-y-auto scrollbar-thin">
            <div class="grid grid-cols-1 gap-2 pb-10">
                ${groups}
            </div>
        </div>
    `;
}

// Deprecated but kept for backward compatibility if needed
export function getComposerTableHTML(coin) {
    return getComposerGroupedDetailHTML(coin);
}

export function detectUnitFromPath(path) {
    if (!path) return '';
    const p = path.toLowerCase();
    if (p.includes('funding') || p.includes('fundingrate') || p.includes('funding_rate')) return '%';
    if (p.includes('percent') || p.includes('percent_change') || p.includes('delta') || p.includes('change')) return '%';
    //    if (p.includes('price') || p.includes('last') || p.includes('openinterest') || p.includes('oi') || p.includes('vol')) return '$';
    return '';
}

// Render table rows into container element
export function renderComposerTableRows(container, coin, category = 'ALL') {
    // This function is less relevant now with grouped view but kept for the "scanner" or "editor" palette if needed
    // Implementation unchanged...
    const mkt = window.marketState || {};
    const { profile, timeframe } = getActiveProfileTimeframe();
    const data = computeData(mkt[coin], profile, timeframe) || {};

    const comps = Object.entries(SIGNAL_COMPONENTS).filter(([k, c]) => category === 'ALL' || c.category === category);
    if (!comps.length) {
        container.innerHTML = `<tr><td colspan="4" class="p-2 text-[9px] text-bb-muted">No components</td></tr>`;
        return;
    }

    const rows = comps.map(([id, comp], idx) => {
        const raw = safeGet(data, comp.path) ?? null;
        let display;
        if (raw === null) display = '-';
        else if (typeof raw === 'number') {
            const unit = detectUnitFromPath(comp.path);
            if (unit === '%') display = Utils.safeFixed(raw, comp.displayDigits || 2) + '%';
            else if (unit === '$') display = Utils.safeFixed(raw, comp.displayDigits || (Math.abs(raw) > 1000 ? 0 : 2));
            else display = Utils.safeFixed(raw, comp.displayDigits || 2);
        } else display = String(raw);

        const desc = comp.description || '';
        return `
            <tr class="border-b border-white/5">
                <td class="px-2 py-1 text-[9px] text-bb-muted">${idx + 1}</td>
                <td class="px-2 py-1"><span class="text-[12px] mr-2">${comp.icon || ''}</span>${comp.name}</td>
                <td class="px-2 py-1 text-[9px] text-bb-muted">${desc}</td>
                <td class="px-2 py-1 text-right font-mono font-bold text-white">${display}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = rows;
}

// Attach events for table category filters
export function attachComposerTableEvents(slotEl) {
    if (!slotEl) return;
    const filters = slotEl.querySelector('#composer-cat-filters');
    const body = slotEl.querySelector('#composer-components-table-body');
    const coin = window.selectedCoin || selectedCoin;
    if (!body || !filters) return;

    renderComposerTableRows(body, coin, 'ALL');

    filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.composer-cat');
        if (!btn) return;
        const cat = btn.getAttribute('data-cat') || 'ALL';
        filters.querySelectorAll('.composer-cat').forEach(b => b.classList.remove('bg-bb-gold', 'text-black'));
        btn.classList.add('bg-bb-gold', 'text-black');
        renderComposerTableRows(body, coin, cat);
    });
}

function safeGet(obj, path) {
    if (!path) return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
        if (!cur) return undefined;
        cur = cur[p];
    }
    return cur;
}

// Render list of components for coin and category into container element
export function renderComposerComponentsList(container, coin, category = 'ALL') {
    const mkt = window.marketState || {};
    const { profile, timeframe } = getActiveProfileTimeframe();
    const data = computeData(mkt[coin], profile, timeframe) || {};

    const comps = Object.entries(SIGNAL_COMPONENTS).filter(([k, c]) => category === 'ALL' || c.category === category);
    if (!comps.length) {
        container.innerHTML = `<div class="p-2 text-[9px] text-bb-muted">No components for ${category}</div>`;
        return;
    }

    const rows = comps.map(([id, comp]) => {
        const rawVal = safeGet(data, comp.path) ?? '-';
        let display;
        if (rawVal === '-') display = '-';
        else if (comp.path && comp.path.toLowerCase().includes('funding')) display = Utils.safeFixed((rawVal || 0) * 100, comp.displayDigits || 4) + '%';
        else if (comp.path && comp.path.toLowerCase().includes('percent')) display = Utils.safeFixed(rawVal, comp.displayDigits || 2) + '%';
        else if (typeof rawVal === 'number') display = Utils.safeFixed(rawVal, comp.displayDigits || (Math.abs(rawVal) > 1000 ? 0 : 2));
        else display = rawVal === null ? '-' : String(rawVal);
        return `
            <div class="flex justify-between items-center py-1 px-2 text-[10px]">
                <div class="flex items-center gap-2 text-bb-muted">
                    <div class="text-[12px]">${comp.icon || ''}</div>
                    <div class="truncate max-w-[200px]">${comp.name}</div>
                </div>
                <div class="font-mono font-bold text-white text-right ml-2">${display}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = `<div class="p-1 bg-black/20 rounded">${rows}</div>`;
}

// Attach events to composer panel (category switches)
export function attachComposerPanelEvents(slotEl) {
    if (!slotEl) return;
    const filters = slotEl.querySelector('#composer-category-filters');
    const list = slotEl.querySelector('#composer-components-list');
    const coin = window.selectedCoin || selectedCoin;
    if (!list) return;

    // initial render: ALL
    renderComposerComponentsList(list, coin, 'ALL');

    filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-filter');
        if (!btn) return;
        const cat = btn.getAttribute('data-cat');
        // update active styling
        filters.querySelectorAll('.cat-filter').forEach(b => b.classList.remove('bg-bb-gold', 'text-black'));
        btn.classList.add('bg-bb-gold', 'text-black');
        renderComposerComponentsList(list, coin, cat || 'ALL');
    });
}

function renderSignalAnalysis(coin, data) {
    if (!activeComposition) return `<div class="p-4 text-center text-bb-muted text-[9px]">Select a signal in Editor to analyze</div>`;

    const res = evaluateSignal(activeComposition, coin, data);
    const logicLabel = activeComposition.logic || 'AND';

    return `
        <div class="space-y-3">
            <div class="p-2 rounded bg-black/40 border border-bb-gold/20 shadow-inner">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[9px] font-black text-bb-gold uppercase">Current Signal Analysis</span>
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-bold ${res.triggered ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red'}">
                        ${res.triggered ? 'TRIGGERED' : 'FAILED'}
                    </span>
                </div>
                
                <div class="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5 mb-2">
                    <div class="text-[10px] text-white font-bold">${activeComposition.name}</div>
                    <div class="text-right">
                        <div class="text-[10px] text-bb-gold font-black">${Utils.safeFixed(res.score ?? 0, 1)}%</div>
                        <div class="text-[7px] text-bb-muted uppercase">${logicLabel} LOGIC</div>
                    </div>
                </div>

                <div class="space-y-1">
                    ${(res.results || []).map((r, i) => {
        const cond = activeComposition.conditions[i];
        const comp = SIGNAL_COMPONENTS[cond.component];
        const unit = detectUnitFromPath(comp?.path);
        const formatVal = (v) => {
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (typeof v === 'number') return Utils.safeFixed(v, comp?.displayDigits || 2) + unit;
            return v;
        };

        return `
                            <div class="flex items-center gap-2 p-1.5 rounded bg-black/20 border ${r.passed ? 'border-bb-green/10' : 'border-bb-red/10'} text-[8px]">
                                <span class="text-xs shrink-0">${comp?.icon || '❓'}</span>
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-center mb-0.5">
                                        <span class="font-bold text-white truncate">${comp?.name || 'Unknown'}</span>
                                        <span class="font-black ${r.passed ? 'text-bb-green' : 'text-bb-red'}">${r.passed ? 'PASS' : 'FAIL'}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-[7px] text-bb-muted">
                                        <span>Target: ${cond.operator} ${formatVal(cond.value)}</span>
                                        <span class="text-white">Actual: ${formatVal(r.actual)}</span>
                                    </div>
                                </div>
                            </div>
                        `;
    }).join('')}
                </div>
                
                ${activeComposition.logic === 'WEIGHTED' ? `
                    <div class="mt-2 pt-2 border-t border-white/5 text-[7px] text-bb-muted">
                        * Threshold for trigger: >= ${activeComposition.minScore || 70}% weighted score
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderActiveSignalsForCoin(coin, rawData) {
    const active = compositions.filter(c => c.active);
    if (!active.length) return '';

    const mkt = window.marketState || {};

    const results = active.map(sig => {
        // Re-compute data with signal's own profile/timeframe
        const { profile, timeframe } = getSignalProfileTimeframe(sig);
        const data = computeData(mkt[coin], profile, timeframe);
        const res = evaluateSignal(sig, coin, data);
        return { sig, ...res };
    });

    return `
        <div class="p-2 rounded bg-black/30 border border-white/10">
            <div class="text-[8px] font-black text-bb-muted uppercase mb-1">Signal Check</div>
            <div class="space-y-1">
                ${results.map(r => `
                    <div class="flex items-center justify-between text-[8px]">
                        <span class="text-white">${r.sig.name}</span>
                        <span class="px-1.5 py-0.5 rounded ${r.triggered ? (r.bias === 'LONG' ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red') : 'bg-white/10 text-bb-muted'}">
                            ${r.triggered ? `${r.bias} ${Utils.safeFixed(r.score ?? 0, 0)}%` : 'NO'}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderNoSelection() {
    return `<div class="h-full flex items-center justify-center"><div class="text-center opacity-40"><div class="text-4xl mb-2">👆</div><div class="text-[9px] text-bb-muted">Select a coin from table</div></div></div>`;
}

function renderEmptyEditor() {
    return `<div class="h-full flex items-center justify-center"><div class="text-center opacity-40"><div class="text-4xl mb-2">🎼</div><div class="text-[9px] text-bb-muted">Select or create a signal</div></div></div>`;
}

function renderEditor() {
    const c = activeComposition;
    if (!c) return renderEmptyEditor();

    return `
        <div class="p-3 space-y-3">
            <!-- HEADER -->
            <div class="flex items-start justify-between gap-3 pb-2 border-b border-white/10">
                <div class="flex-1">
                    <input id="edit-name" type="text" value="${c.name}" class="bg-transparent text-base font-black text-white focus:outline-none border-b border-transparent focus:border-bb-gold w-full" placeholder="Signal Name">
                    <input id="edit-desc" type="text" value="${c.description || ''}" class="bg-transparent text-[8px] text-bb-muted focus:outline-none w-full mt-0.5" placeholder="Description...">
                </div>
                <label class="flex items-center gap-1.5 cursor-pointer select-none">
                    <input id="edit-active" type="checkbox" ${c.active ? 'checked' : ''} class="sr-only peer">
                    <div class="relative w-8 h-4 bg-white/10 rounded-full peer-checked:bg-bb-green/30 transition-all">
                        <div class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white/40 peer-checked:bg-bb-green peer-checked:translate-x-4 transition-all"></div>
                    </div>
                    <span class="text-[8px] font-black ${c.active ? 'text-bb-green' : 'text-bb-muted'}">${c.active ? 'ON' : 'OFF'}</span>
                </label>
            </div>

            <!-- DATA SOURCE CONFIG -->
            <div class="p-2 bg-black/30 rounded border border-white/10 space-y-1.5">
                <label class="text-[8px] font-black text-bb-muted uppercase">📊 Data Source</label>
                <div class="flex gap-3 items-center">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[7px] text-bb-muted">Profile:</span>
                        <select id="edit-profile" class="bg-bb-black border border-white/20 text-[9px] text-white px-1.5 py-0.5 rounded">
                            <option value="GLOBAL" ${(c.profile || 'GLOBAL') === 'GLOBAL' ? 'selected' : ''}>🌐 GLOBAL</option>
                            <option value="AGGRESSIVE" ${c.profile === 'AGGRESSIVE' ? 'selected' : ''}>🔥 AGGRESSIVE</option>
                            <option value="MODERATE" ${c.profile === 'MODERATE' ? 'selected' : ''}>⚖️ MODERATE</option>
                            <option value="CONSERVATIVE" ${c.profile === 'CONSERVATIVE' ? 'selected' : ''}>🛡️ CONSERVATIVE</option>
                            <option value="SCALPER" ${c.profile === 'SCALPER' ? 'selected' : ''}>⚡ SCALPER</option>
                        </select>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[7px] text-bb-muted">Timeframe:</span>
                        <select id="edit-timeframe" class="bg-bb-black border border-white/20 text-[9px] text-white px-1.5 py-0.5 rounded">
                            <option value="GLOBAL" ${(c.timeframe || 'GLOBAL') === 'GLOBAL' ? 'selected' : ''}>🌐 GLOBAL</option>
                            <option value="1MENIT" ${c.timeframe === '1MENIT' ? 'selected' : ''}>1m</option>
                            <option value="5MENIT" ${c.timeframe === '5MENIT' ? 'selected' : ''}>5m</option>
                            <option value="15MENIT" ${c.timeframe === '15MENIT' ? 'selected' : ''}>15m</option>
                            <option value="30MENIT" ${c.timeframe === '30MENIT' ? 'selected' : ''}>30m</option>
                            <option value="1JAM" ${c.timeframe === '1JAM' ? 'selected' : ''}>1H</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- COIN FILTER -->
            <div class="p-2 bg-black/30 rounded border border-white/10 space-y-1.5">
                <label class="text-[8px] font-black text-bb-muted uppercase">Coin Filter</label>
                <div class="flex gap-1.5 items-center">
                    <select id="edit-coin-mode" class="bg-bb-black border border-white/20 text-[9px] text-white px-1.5 py-0.5 rounded">
                        <option value="ALL" ${c.coinMode === 'ALL' ? 'selected' : ''}>All</option>
                        <option value="INCLUDE" ${c.coinMode === 'INCLUDE' ? 'selected' : ''}>Include</option>
                        <option value="EXCLUDE" ${c.coinMode === 'EXCLUDE' ? 'selected' : ''}>Exclude</option>
                        <option value="TOP" ${c.coinMode === 'TOP' ? 'selected' : ''}>Top Tier</option>
                    </select>
                    <input id="edit-coins" type="text" value="${(c.coins || []).join(', ')}" placeholder="BTC-USDT, ETH-USDT..."
                           class="flex-1 bg-bb-black border border-white/20 text-[8px] text-white px-1.5 py-0.5 rounded ${c.coinMode === 'ALL' || c.coinMode === 'TOP' ? 'opacity-30' : ''}">
                </div>
            </div>

            <!-- CONDITIONS -->
            <div class="p-2 bg-black/30 rounded border border-white/10 space-y-2">
                <div class="flex items-center justify-between">
                    <label class="text-[8px] font-black text-bb-muted uppercase">Conditions (${c.conditions?.length || 0})</label>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[7px] text-bb-muted">Logic:</span>
                        <select id="edit-logic" class="bg-bb-black border border-white/20 text-[8px] text-white px-1.5 py-0.5 rounded">
                            <option value="AND" ${c.logic === 'AND' ? 'selected' : ''}>ALL (AND)</option>
                            <option value="OR" ${c.logic === 'OR' ? 'selected' : ''}>ANY (OR)</option>
                            <option value="WEIGHTED" ${c.logic === 'WEIGHTED' ? 'selected' : ''}>Weighted</option>
                        </select>
                        ${c.logic === 'WEIGHTED' ? `<input id="edit-min-score" type="number" value="${c.minScore || 70}" min="0" max="100" class="w-10 bg-bb-black border border-white/20 text-[8px] text-white px-1 py-0.5 rounded text-center"><span class="text-[7px] text-bb-muted">%</span>` : ''}
                    </div>
                </div>

                <div id="conditions-list" class="space-y-1 min-h-[60px] border-2 border-dashed border-white/10 rounded p-1.5 ${!c.conditions?.length ? 'flex items-center justify-center' : ''}">
                    ${!c.conditions?.length
            ? `<div class="text-center text-bb-muted/40 text-[8px]">Drag components or click +</div>`
            : c.conditions.map((cond, i) => renderConditionRow(cond, i)).join('')}
                </div>
            </div>

            <!-- OUTPUT -->
            <div class="p-2 bg-black/30 rounded border border-white/10 space-y-2">
                <label class="text-[8px] font-black text-bb-muted uppercase">Output</label>
                <div class="grid grid-cols-5 gap-1.5">
                    ${['SIGNAL', 'SIMULATE', 'WEBHOOK', 'OKX', 'LOG'].map(a => `
                        <label class="flex flex-col items-center gap-0.5 p-1.5 rounded border cursor-pointer transition-all ${c.outputAction === a ? 'border-bb-gold bg-bb-gold/10' : 'border-white/10 hover:bg-white/5'}">
                            <input type="radio" name="output" value="${a}" ${c.outputAction === a ? 'checked' : ''} class="sr-only">
                            <span class="text-sm">${a === 'SIGNAL' ? '📡' : a === 'SIMULATE' ? '🎮' : a === 'WEBHOOK' ? '🔗' : a === 'OKX' ? '💱' : '📝'}</span>
                            <span class="text-[7px] font-bold">${a}</span>
                        </label>
                    `).join('')}
                </div>
                ${c.outputAction === 'SIMULATE' ? renderSimConfig(c) : ''}
                ${c.outputAction === 'WEBHOOK' ? renderWebhookConfig(c) : ''}
                ${c.outputAction === 'OKX' ? renderOrderConfig(c) : ''}
            </div>

            <!-- BIAS, COOLDOWN & MAX POS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="p-2 bg-black/30 rounded border border-white/10 space-y-1.5">
                    <label class="text-[8px] font-black text-bb-muted uppercase">Bias</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${['AUTO', 'LONG', 'SHORT', 'CONTRARIAN'].map(b => `
                            <label class="flex flex-col items-center justify-center p-1.5 rounded border cursor-pointer text-[7px] font-bold ${c.biasMode === b ? 'border-bb-gold bg-bb-gold/10 text-bb-gold' : 'border-white/10 text-bb-muted hover:border-white/30'}">
                                <input type="radio" name="bias" value="${b}" ${c.biasMode === b ? 'checked' : ''} class="sr-only">
                                <span class="text-sm">${b === 'AUTO' ? '🔄' : b === 'LONG' ? '📈' : b === 'SHORT' ? '📉' : '🔀'}</span>
                                <span class="text-[6px] mt-0.5">${b}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="p-2 bg-black/30 rounded border border-white/10 flex flex-col justify-center">
                    <label class="text-[8px] font-black text-bb-muted uppercase">Cooldown</label>
                    <div class="flex items-center gap-1 mt-1">
                        <input id="edit-cooldown" type="number" value="${c.cooldown || 300}" min="0" step="30" class="flex-1 bg-bb-black border border-white/20 text-[9px] text-white px-1.5 py-0.5 rounded text-right">
                        <span class="text-[7px] text-bb-muted">s</span>
                    </div>
                </div>
                <div class="p-2 bg-black/30 rounded border border-white/10 flex flex-col justify-center">
                    <label class="text-[8px] font-black text-bb-muted uppercase">Max Pos</label>
                    <div class="flex items-center gap-1 mt-1">
                        <input id="edit-max-pos" type="number" value="${c.maxPositions ?? 1}" min="0" step="1" class="flex-1 bg-bb-black border border-white/20 text-[9px] text-white px-1.5 py-0.5 rounded text-right">
                        <span class="text-[7px] text-bb-muted">qty</span>
                    </div>
                </div>
            </div>

            <!-- OPTIONS -->
            <div class="p-2 bg-black/30 rounded border border-white/10 flex items-center justify-between">
                <div>
                    <label class="text-[8px] font-black text-white uppercase">Close on Flip</label>
                    <p class="text-[7px] text-bb-muted/60">Auto-close existing position if signal direction changes</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input id="edit-close-flip" type="checkbox" ${c.closeOnFlip ? 'checked' : ''} class="sr-only peer">
                    <div class="w-7 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-bb-gold"></div>
                </label>
            </div>

            <!-- ACTIONS -->
            <div class="flex gap-2">
                <button id="btn-save" class="flex-1 px-3 py-1.5 bg-bb-gold text-black text-[9px] font-black hover:bg-bb-gold/80 transition-all rounded">💾 SAVE</button>
                <button id="btn-test" class="px-3 py-1.5 bg-bb-green/20 border border-bb-green/30 text-bb-green text-[9px] font-black hover:bg-bb-green/30 transition-all rounded">🧪 TEST</button>
            </div>
        </div>
    `;
}

function renderConditionRow(cond, idx) {
    const comp = SIGNAL_COMPONENTS[cond.component];
    if (!comp) return '';
    const cat = CATEGORIES[comp.category];

    return `
        <div class="cond-row flex items-center gap-1.5 p-1.5 bg-black/40 rounded border border-white/5 group text-[8px]" data-idx="${idx}">
            <span class="px-1 py-0.5 bg-${cat?.color || 'bb-muted'}/20 text-${cat?.color || 'bb-muted'} rounded text-[7px] font-bold shrink-0">${comp.icon} ${comp.name}</span>
            <select class="cond-op bg-bb-black border border-white/10 px-0.5 py-0.5 rounded text-[8px] text-white">
                ${comp.operators.map(op => `<option value="${op}" ${cond.operator === op ? 'selected' : ''}>${op}</option>`).join('')}
            </select>
            ${comp.valueType === 'select' ? `
                <select class="cond-val bg-bb-black border border-white/10 px-0.5 py-0.5 rounded text-[8px] text-white">
                    ${comp.options.map(opt => `<option value="${opt}" ${cond.value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
            ` : comp.valueType === 'boolean' ? `
                <select class="cond-val bg-bb-black border border-white/10 px-0.5 py-0.5 rounded text-[8px] text-white">
                    <option value="true" ${cond.value === true ? 'selected' : ''}>TRUE</option>
                    <option value="false" ${cond.value === false ? 'selected' : ''}>FALSE</option>
                </select>
            ` : `
                <input type="number" class="cond-val w-12 bg-bb-black border border-white/10 px-0.5 py-0.5 rounded text-[8px] text-white text-center" value="${cond.value}" step="any">
            `}
            ${activeComposition?.logic === 'WEIGHTED' ? `
                <span class="text-bb-muted/50">W:</span>
                <input type="number" class="cond-weight w-8 bg-bb-black border border-white/10 px-0.5 py-0.5 rounded text-[8px] text-white text-center" value="${cond.weight || 1}" min="0" max="10" step="0.5">
            ` : ''}
            <button class="cond-remove ml-auto p-0.5 opacity-0 group-hover:opacity-100 hover:bg-bb-red/20 rounded text-bb-red text-[8px]">✕</button>
        </div>
    `;
}

function renderSimConfig(c) {
    return `
        <div class="mt-1.5 pt-1.5 border-t border-white/10 grid grid-cols-4 gap-1.5">
            <div><label class="text-[6px] text-bb-muted">Amount</label><input id="sim-amount" type="number" value="${c.simConfig?.amount || 1000}" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"></div>
            <div><label class="text-[6px] text-bb-muted">Leverage</label><input id="sim-leverage" type="number" value="${c.simConfig?.leverage || 10}" min="1" max="125" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"></div>
            <div><label class="text-[6px] text-bb-muted">TP %</label><input id="sim-tp" type="number" value="${c.simConfig?.tp || 10}" step="0.5" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"></div>
            <div><label class="text-[6px] text-bb-muted">SL %</label><input id="sim-sl" type="number" value="${c.simConfig?.sl || 5}" step="0.5" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"></div>
        </div>
    `;
}

function renderWebhookConfig(c) {
    return `
        <div class="mt-1.5 pt-1.5 border-t border-white/10 space-y-1">
            <input id="webhook-url" type="url" value="${c.webhookConfig?.url || ''}" placeholder="https://webhook.com/endpoint" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1.5 py-0.5 rounded">
        </div>
    `;
}

function renderOrderConfig(c) {
    return `
        <div class="mt-1.5 pt-1.5 border-t border-white/10 grid grid-cols-4 gap-1.5">
            <div><label class="text-[6px] text-bb-muted">Instrument</label><input id="order-inst" type="text" value="${c.orderConfig?.instId || ''}" placeholder="BTC-USD-SWAP or leave blank" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"></div>
            <div><label class="text-[6px] text-bb-muted">OrdType</label><select id="order-ordType" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"><option value="market" ${c.orderConfig?.ordType === 'market' ? 'selected' : ''}>MARKET</option><option value="limit" ${c.orderConfig?.ordType === 'limit' ? 'selected' : ''}>LIMIT</option></select></div>
            <div><label class="text-[6px] text-bb-muted">Amount ($)</label><input id="order-usd" type="number" value="${c.orderConfig?.usd || ''}" placeholder="USD" class="w-full bg-bb-black border border-white/10 text-[8px] text-white px-1 py-0.5 rounded"></div>
            <div class="flex gap-1">
                <div class="flex-1"><label class="text-[6px] text-bb-muted">TP (%)</label><input id="order-tp" type="number" value="${c.orderConfig?.tpPct || ''}" placeholder="%" class="w-full bg-bb-black border border-white/10 text-[8px] text-bb-green px-1 py-0.5 rounded"></div>
                <div class="flex-1"><label class="text-[6px] text-bb-muted">SL (%)</label><input id="order-sl" type="number" value="${c.orderConfig?.slPct || ''}" placeholder="%" class="w-full bg-bb-black border border-white/10 text-[8px] text-bb-red px-1 py-0.5 rounded"></div>
            </div>
        </div>
        <div class="mt-1 text-[7px] text-bb-muted">Notes: USD / Price | TP/SL are exchange-side (Native).</div>
    `;
}

function renderPalette(search = '', category = 'ALL') {
    let filtered = Object.entries(SIGNAL_COMPONENTS);
    if (category !== 'ALL') filtered = filtered.filter(([, c]) => c.category === category);
    if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(([k, c]) => c.name.toLowerCase().includes(s) || c.category.toLowerCase().includes(s) || k.toLowerCase().includes(s));
    }

    const grouped = {};
    filtered.forEach(([k, c]) => { if (!grouped[c.category]) grouped[c.category] = []; grouped[c.category].push({ key: k, ...c }); });

    if (!Object.keys(grouped).length) return `<div class="text-center text-bb-muted/50 text-[8px] py-4">No components</div>`;

    return Object.entries(grouped).map(([catKey, items]) => {
        const cat = CATEGORIES[catKey];
        return `
            <div class="space-y-0.5">
                <div class="flex items-center gap-1 text-[7px] font-black text-${cat?.color || 'bb-muted'} uppercase sticky top-0 bg-bb-black/90 py-0.5">${cat?.icon || '📦'} ${cat?.name || catKey} <span class="text-bb-muted/40 font-normal">(${items.length})</span></div>
                ${items.map(item => `
                    <div class="comp-item flex items-center gap-1.5 p-1 bg-black/40 rounded border border-white/5 cursor-pointer hover:bg-white/5 hover:border-${cat?.color || 'bb-muted'}/30 transition-all group" data-key="${item.key}" draggable="true">
                        <span class="text-xs shrink-0">${item.icon}</span>
                        <div class="flex-1 min-w-0"><div class="text-[8px] font-bold text-white truncate">${item.name}</div><div class="text-[6px] text-bb-muted/60 truncate">${item.description}</div></div>
                        <button class="add-comp px-1 py-0.5 text-[7px] bg-bb-gold/20 text-bb-gold rounded opacity-0 group-hover:opacity-100 hover:bg-bb-gold/40 transition-all">+</button>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

function renderScannerResults() {
    if (!scannerResults.length) return `<div class="text-center py-8 text-bb-muted/50 text-[9px]">Select a signal and click SCAN ALL</div>`;

    const sig = compositions.find(c => c.id == scannerSignalId);
    const conditions = sig?.conditions || [];

    // Helper to format values consistently
    const formatRowVal = (actual, comp) => {
        if (actual === undefined || actual === null) return '-';
        const unit = detectUnitFromPath(comp?.path);
        if (typeof actual === 'number') return Utils.safeFixed(actual, comp?.displayDigits || 2) + unit;
        return String(actual);
    };

    return `
        <table class="w-full text-[9px]">
            <thead class="sticky top-0 bg-bb-black">
                <tr class="text-bb-muted border-b border-white/10 uppercase font-black text-[7px]">
                    <th class="text-left p-1.5">Coin</th>
                    <th class="text-center p-1.5">Bias</th>
                    <th class="text-center p-1.5">Score</th>
                    ${conditions.map(c => {
        const comp = SIGNAL_COMPONENTS[c.component];
        return `<th class="text-right p-1.5">${comp?.name || 'Metric'}</th>`;
    }).join('')}
                </tr>
            </thead>
            <tbody>
                ${scannerResults.map(r => `
                    <tr class="scanner-row border-b border-white/5 hover:bg-white/5 cursor-pointer" data-coin="${r.coin}">
                        <td class="p-1.5 font-bold text-white">${r.coin.replace('-USDT', '')}</td>
                        <td class="text-center p-1.5">
                            <span class="px-1.5 py-0.5 rounded ${r.bias === 'LONG' ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red'}">
                                ${r.bias}
                            </span>
                        </td>
                        <td class="text-center p-1.5 text-bb-gold font-bold">${Utils.safeFixed(r.score ?? 0, 0)}%</td>
                        ${conditions.map((c, idx) => {
        const comp = SIGNAL_COMPONENTS[c.component];
        const res = r.evaluation?.[idx];
        return `<td class="text-right p-1.5 font-mono ${res?.passed ? 'text-white' : 'text-bb-muted/30'}">${formatRowVal(res?.actual, comp)}</td>`;
    }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function attachEvents(container) {
    // Tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => { currentTab = btn.dataset.tab; render(container); });
    });

    // Detail sub-tab delegation (attach once per container)
    if (!container._detailTabDelegationAttached) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.detail-tab');
            if (btn) {
                currentDetailTab = btn.dataset.detail;
                render(container);
            }
        });
        container._detailTabDelegationAttached = true;
    }

    // Attach Composer Table Events (if present)
    attachComposerTableEvents(container);

    // Detail sub-tab switching (Details view on right)
    container.querySelectorAll('.detail-tab').forEach(btn => {
        btn.addEventListener('click', () => { currentDetailTab = btn.dataset.detail; render(container); });
    });

    // Profile/Timeframe selectors
    container.querySelector('#composer-profile')?.addEventListener('change', (e) => {
        composerProfile = e.target.value;
        render(container);
    });
    container.querySelector('#composer-timeframe')?.addEventListener('change', (e) => {
        composerTimeframe = e.target.value;
        render(container);
    });

    // New signal
    container.querySelector('#btn-new')?.addEventListener('click', () => {
        createNewSignal();
        currentTab = 'EDITOR';
        render(container);
    });

    // Presets
    container.querySelector('#btn-presets')?.addEventListener('click', () => showPresetsModal(container));

    // Signal list
    container.querySelectorAll('.signal-item').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-active') || e.target.closest('.del-btn')) return;
            activeComposition = compositions.find(c => c.id == el.dataset.id);
            currentTab = 'EDITOR';
            render(container);
        });
        el.querySelector('.toggle-active')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const c = compositions.find(c => c.id == el.dataset.id);
            if (c) { c.active = !c.active; saveState(); render(container); }
        });
        el.querySelector('.del-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete?')) { compositions = compositions.filter(c => c.id != el.dataset.id); if (activeComposition?.id == el.dataset.id) activeComposition = null; saveState(); render(container); }
        });
    });

    // Matrix tabs
    container.querySelectorAll('.matrix-tab').forEach(btn => {
        btn.addEventListener('click', () => { currentMatrix = btn.dataset.matrix; render(container); });
    });

    // Filter chips
    container.querySelectorAll('.filter-chip').forEach(btn => {
        btn.addEventListener('click', () => { currentFilter = btn.dataset.filter; render(container); });
    });

    // Coin row selection
    container.querySelectorAll('.coin-row, .scanner-row').forEach(row => {
        row.addEventListener('click', () => {
            selectedCoin = row.dataset.coin;
            if (row.classList.contains('scanner-row')) {
                currentDetailTab = 'SIGNALS';
            }
            render(container);
        });
    });

    // Scanner
    container.querySelector('#btn-scan-all')?.addEventListener('click', () => {
        const sigId = container.querySelector('#scanner-signal')?.value;
        if (!sigId) { alert('Select a signal first'); return; }
        const sig = compositions.find(c => c.id == sigId);
        if (!sig) return;

        const mkt = window.marketState || {};
        scannerResults = [];
        scannerSignalId = sig.id;

        Object.keys(mkt).forEach(coin => {
            // Use signal's own profile/timeframe settings
            const { profile, timeframe } = getSignalProfileTimeframe(sig);
            const data = computeData(mkt[coin], profile, timeframe);
            const res = evaluateSignal(sig, coin, data);
            if (res.triggered) {
                scannerResults.push({
                    coin,
                    bias: res.bias,
                    score: res.score,
                    price: data.raw?.PRICE?.last || 0,
                    change1h: data.raw?.PRICE?.percent_change_1JAM || 0,
                    evaluation: res.results // Store condition results for dynamic columns
                });
            }
        });
        scannerResults.sort((a, b) => (b.score || 0) - (a.score || 0));
        render(container);
    });

    // Category filters
    container.querySelectorAll('.cat-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCatFilter = btn.dataset.cat;
            container.querySelector('#palette').innerHTML = renderPalette('', currentCatFilter);
            attachPaletteEvents(container);
            container.querySelectorAll('.cat-filter').forEach(b => {
                b.classList.toggle('bg-bb-gold', b.dataset.cat === currentCatFilter);
                b.classList.toggle('text-black', b.dataset.cat === currentCatFilter);
            });
        });
    });

    // Component search
    container.querySelector('#comp-search')?.addEventListener('input', (e) => {
        container.querySelector('#palette').innerHTML = renderPalette(e.target.value, currentCatFilter);
        attachPaletteEvents(container);
    });

    attachPaletteEvents(container);
    attachEditorEvents(container);
}

function attachPaletteEvents(container) {
    container.querySelectorAll('.comp-item').forEach(el => {
        el.addEventListener('dblclick', () => addComponent(el.dataset.key, container));
        el.querySelector('.add-comp')?.addEventListener('click', (e) => { e.stopPropagation(); addComponent(el.dataset.key, container); });
        el.addEventListener('dragstart', (e) => e.dataTransfer.setData('component', el.dataset.key));
    });

    const condList = container.querySelector('#conditions-list');
    if (condList) {
        condList.addEventListener('dragover', (e) => { e.preventDefault(); condList.classList.add('ring-2', 'ring-bb-gold/50'); });
        condList.addEventListener('dragleave', () => condList.classList.remove('ring-2', 'ring-bb-gold/50'));
        condList.addEventListener('drop', (e) => { e.preventDefault(); condList.classList.remove('ring-2', 'ring-bb-gold/50'); const key = e.dataTransfer.getData('component'); if (key) addComponent(key, container); });
    }
}

function attachEditorEvents(container) {
    // Always attach save and test buttons
    container.querySelector('#btn-save')?.addEventListener('click', () => {
        if (!activeComposition) { alert('No signal selected!'); return; }
        saveState();
        alert('✅ Saved!');
    });
    container.querySelector('#btn-test')?.addEventListener('click', () => testSignal(container));

    // Only attach editor field events if there's an active composition
    if (!activeComposition) return;

    container.querySelector('#edit-name')?.addEventListener('change', (e) => { activeComposition.name = e.target.value; saveState(); });
    container.querySelector('#edit-desc')?.addEventListener('change', (e) => { activeComposition.description = e.target.value; saveState(); });
    container.querySelector('#edit-active')?.addEventListener('change', (e) => { activeComposition.active = e.target.checked; saveState(); });
    container.querySelector('#edit-profile')?.addEventListener('change', (e) => { activeComposition.profile = e.target.value; saveState(); });
    container.querySelector('#edit-timeframe')?.addEventListener('change', (e) => { activeComposition.timeframe = e.target.value; saveState(); });
    container.querySelector('#edit-coin-mode')?.addEventListener('change', (e) => { activeComposition.coinMode = e.target.value; saveState(); render(container); });
    container.querySelector('#edit-coins')?.addEventListener('change', (e) => { activeComposition.coins = e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean); saveState(); });
    container.querySelector('#edit-logic')?.addEventListener('change', (e) => { activeComposition.logic = e.target.value; saveState(); render(container); });
    container.querySelector('#edit-min-score')?.addEventListener('change', (e) => { activeComposition.minScore = parseFloat(e.target.value); saveState(); });
    container.querySelector('#edit-cooldown')?.addEventListener('change', (e) => { activeComposition.cooldown = parseInt(e.target.value); saveState(); });
    container.querySelector('#edit-max-pos')?.addEventListener('change', (e) => { activeComposition.maxPositions = parseInt(e.target.value); saveState(); });

    container.querySelectorAll('input[name="output"]').forEach(r => r.addEventListener('change', (e) => { activeComposition.outputAction = e.target.value; saveState(); render(container); }));
    container.querySelectorAll('input[name="bias"]').forEach(r => r.addEventListener('change', (e) => { activeComposition.biasMode = e.target.value; saveState(); render(container); }));

    // Also handle click on bias labels directly
    container.querySelectorAll('input[name="bias"]').forEach(radio => {
        const label = radio.closest('label');
        if (label) {
            label.addEventListener('click', (e) => {
                e.preventDefault();
                radio.checked = true;
                activeComposition.biasMode = radio.value;
                render(container);
            });
        }
    });

    ['sim-amount', 'sim-leverage', 'sim-tp', 'sim-sl'].forEach(id => {
        container.querySelector(`#${id}`)?.addEventListener('change', (e) => { if (!activeComposition.simConfig) activeComposition.simConfig = {}; activeComposition.simConfig[id.replace('sim-', '')] = parseFloat(e.target.value); });
    });

    container.querySelector('#webhook-url')?.addEventListener('change', (e) => { if (!activeComposition.webhookConfig) activeComposition.webhookConfig = {}; activeComposition.webhookConfig.url = e.target.value; });

    // OKX / Order config fields
    container.querySelector('#order-inst')?.addEventListener('change', (e) => { if (!activeComposition.orderConfig) activeComposition.orderConfig = {}; activeComposition.orderConfig.instId = e.target.value.trim(); saveState(); });
    container.querySelector('#order-ordType')?.addEventListener('change', (e) => { if (!activeComposition.orderConfig) activeComposition.orderConfig = {}; activeComposition.orderConfig.ordType = e.target.value; saveState(); });
    container.querySelector('#order-usd')?.addEventListener('change', (e) => { if (!activeComposition.orderConfig) activeComposition.orderConfig = {}; activeComposition.orderConfig.usd = parseFloat(e.target.value); saveState(); });
    container.querySelector('#order-tp')?.addEventListener('change', (e) => { if (!activeComposition.orderConfig) activeComposition.orderConfig = {}; activeComposition.orderConfig.tpPct = parseFloat(e.target.value); saveState(); });
    container.querySelector('#order-sl')?.addEventListener('change', (e) => { if (!activeComposition.orderConfig) activeComposition.orderConfig = {}; activeComposition.orderConfig.slPct = parseFloat(e.target.value); saveState(); });

    container.querySelector('#edit-close-flip')?.addEventListener('change', (e) => {
        activeComposition.closeOnFlip = e.target.checked;
        console.log('[COMPOSER] Toggle closeOnFlip:', activeComposition.closeOnFlip);
        saveState();
    });

    container.querySelectorAll('.cond-row').forEach(row => {
        const idx = parseInt(row.dataset.idx);
        row.querySelector('.cond-op')?.addEventListener('change', (e) => { activeComposition.conditions[idx].operator = e.target.value; });
        row.querySelector('.cond-val')?.addEventListener('change', (e) => {
            const comp = SIGNAL_COMPONENTS[activeComposition.conditions[idx].component];
            let val = e.target.value;
            if (comp.valueType === 'boolean') val = val === 'true';
            else if (comp.valueType !== 'select') val = parseFloat(val);
            activeComposition.conditions[idx].value = val;
        });
        row.querySelector('.cond-weight')?.addEventListener('change', (e) => { activeComposition.conditions[idx].weight = parseFloat(e.target.value); });
        row.querySelector('.cond-remove')?.addEventListener('click', () => { activeComposition.conditions.splice(idx, 1); render(container); });
    });
}

function createNewSignal() {
    const newSig = {
        id: Date.now(),
        name: `Signal ${compositions.length + 1}`,
        description: '',
        active: false,
        profile: composerProfile,      // Save current profile selection
        timeframe: composerTimeframe,  // Save current timeframe selection
        coinMode: 'ALL',
        coins: [],
        logic: 'AND',
        conditions: [],
        outputAction: 'SIGNAL',
        biasMode: 'AUTO',
        closeOnFlip: false,
        cooldown: 300,
        minScore: 70,
        simConfig: { amount: 1000, leverage: 10, tp: 10, sl: 5 },
        webhookConfig: { url: '' },
        orderConfig: { ordType: 'market', usd: '', instId: '', tpPct: '', slPct: '' },
        maxPositions: 1
    };
    compositions.push(newSig);
    activeComposition = newSig;
    saveState();
}

function addComponent(key, container) {
    if (!activeComposition) { alert('Create or select a signal first'); return; }
    const comp = SIGNAL_COMPONENTS[key];
    if (!comp) return;
    if (!activeComposition.conditions) activeComposition.conditions = [];
    activeComposition.conditions.push({ component: key, operator: comp.operators[0], value: comp.defaultThreshold, weight: 1 });
    render(container);
}

function showPresetsModal(container) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-bb-panel border border-bb-border rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div class="p-3 border-b border-bb-border flex items-center justify-between">
                <h3 class="text-base font-black text-white">📋 Presets</h3>
                <button class="close-modal text-bb-muted hover:text-white text-xl">&times;</button>
            </div>
            <div class="p-3 overflow-y-auto max-h-[60vh] grid grid-cols-2 gap-2">
                ${Object.entries(PRESET_TEMPLATES).map(([key, preset]) => `
                    <div class="preset-item p-2 bg-black/30 rounded border border-white/10 hover:border-bb-gold/30 cursor-pointer" data-key="${key}">
                        <div class="text-[10px] font-bold text-white mb-0.5">${preset.name}</div>
                        <div class="text-[8px] text-bb-muted mb-1">${preset.description}</div>
                        <div class="flex flex-wrap gap-0.5">${preset.conditions.slice(0, 3).map(c => {
        const comp = SIGNAL_COMPONENTS[c.component];
        return `<span class="px-1 py-0.5 bg-white/10 rounded text-[6px] text-bb-muted">${comp?.icon || '?'}</span>`;
    }).join('')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelectorAll('.preset-item').forEach(el => {
        el.addEventListener('click', () => {
            const preset = PRESET_TEMPLATES[el.dataset.key];
            if (preset) {
                const newSig = { id: Date.now(), name: preset.name, description: preset.description, active: false, coinMode: 'ALL', coins: [], logic: preset.logic || 'AND', conditions: JSON.parse(JSON.stringify(preset.conditions)), outputAction: 'SIGNAL', biasMode: 'AUTO', biasLogic: preset.biasLogic, cooldown: preset.cooldown || 300, minScore: preset.minScore || 70, simConfig: { amount: 1000, leverage: 10, tp: 10, sl: 5 }, webhookConfig: { url: '' }, orderConfig: { ordType: 'market', usd: '', instId: '', tpPct: '', slPct: '' } };
                compositions.push(newSig);
                activeComposition = newSig;
                saveState();
                modal.remove();
                currentTab = 'EDITOR';
                render(container);
            }
        });
    });
}

function testSignal(container) {
    if (!activeComposition) return;
    const mkt = window.marketState || {};
    const results = [];
    // Use the active composition's own profile/timeframe settings
    const { profile, timeframe } = getSignalProfileTimeframe(activeComposition);
    Object.keys(mkt).forEach(coin => {
        const data = computeData(mkt[coin], profile, timeframe);
        const res = evaluateSignal(activeComposition, coin, data);
        if (res.triggered) results.push({ coin, ...res });
    });
    alert(results.length === 0 ? `No triggers across ${Object.keys(mkt).length} coins` : `Found ${results.length} triggers:\n${results.slice(0, 10).map(r => `${r.coin} → ${r.bias} ${Utils.safeFixed(r.score ?? 0, 0)}%`).join('\n')}`);
}

// === COMPUTED VALUES ===
// Normalizes the data structure to match expected paths
// (computeData imported from data_helpers.js)


// === EVALUATION ENGINE ===
function evaluateSignal(sig, coin, data) {
    if (!sig || !data) return { triggered: false };

    if (sig.coinMode === 'INCLUDE' && !sig.coins?.includes(coin)) return { triggered: false };
    if (sig.coinMode === 'EXCLUDE' && sig.coins?.includes(coin)) return { triggered: false };
    if (sig.coinMode === 'TOP') { const tier = data.raw?.OI?.tier || 3; if (tier > (sig.oiTier || 2)) return { triggered: false }; }

    const results = (sig.conditions || []).map(cond => evaluateCondition(cond, data));

    let triggered = false, score = 0;
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length || 1;

    if (sig.logic === 'AND') {
        triggered = results.every(r => r.passed);
        // Score = percentage of conditions met (100 when all pass)
        score = (passedCount / totalCount) * 100;
    }
    else if (sig.logic === 'OR') {
        triggered = results.some(r => r.passed);
        // Score = percentage of conditions met
        score = (passedCount / totalCount) * 100;
    }
    else if (sig.logic === 'WEIGHTED') {
        const totalW = sig.conditions.reduce((s, c) => s + (c.weight || 1), 0);
        const passedW = sig.conditions.reduce((s, c, i) => s + (results[i].passed ? (c.weight || 1) : 0), 0);
        score = totalW > 0 ? (passedW / totalW) * 100 : 0;
        triggered = score >= (sig.minScore || 70);
    }

    let bias = 'WAIT';
    if (triggered) {
        if (sig.biasMode === 'LONG') bias = 'LONG';
        else if (sig.biasMode === 'SHORT') bias = 'SHORT';
        else if (sig.biasMode === 'CONTRARIAN') {
            const ma = data.signals?.masterSignal?.action;
            bias = (ma === 'BUY' || ma === 'LONG') ? 'SHORT' : 'LONG';
        } else {
            const ma = data.signals?.masterSignal?.action;
            bias = (ma === 'BUY' || ma === 'LONG') ? 'LONG' : (ma === 'SELL' || ma === 'SHORT') ? 'SHORT' : 'WAIT';
        }
    }

    return { triggered, score, bias, results };
}

function evaluateCondition(cond, data) {
    const comp = SIGNAL_COMPONENTS[cond.component];
    if (!comp) return { passed: false };

    let actual = comp.path.startsWith('_computed.') ? data._computed?.[comp.path.replace('_computed.', '')] : getNestedValue(data, comp.path);
    const target = cond.value;
    const op = cond.operator;

    let passed = false;
    switch (op) {
        case '>': passed = actual > target; break;
        case '<': passed = actual < target; break;
        case '>=': passed = actual >= target; break;
        case '<=': passed = actual <= target; break;
        case '==': passed = actual == target; break;
        case '!=': passed = actual != target; break;
        case 'ABS>': passed = Math.abs(actual) > target; break;
        case 'CONTAINS': passed = String(actual || '').includes(String(target)); break;
    }
    return { passed, actual, target };
}

function getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
}

// === RUNTIME ENGINE ===
const cooldowns = new Map();
// track last triggered boolean per signal+coin to detect rising edges
const lastTriggeredState = new Map();
// simple in-memory open positions tracker: coin -> { side: 'LONG'|'SHORT', size, source, ts, id }
const openPositions = new Map();

export function getOpenPositions() { return Array.from(openPositions.entries()).map(([coin, v]) => ({ coin, ...v })); }
export function clearOpenPositions() { openPositions.clear(); }
export function getPosition(coin) { return openPositions.get(coin); }

export function upsertPositionFromOkxFill(f) {
    try {
        const coin = f.instId || f.instrumentId || f.symbol;
        if (!coin) return;
        const side = (String(f.side || f.fillSide || '').toLowerCase() === 'buy') ? 'LONG' : 'SHORT';
        const sz = Number(f.fillSz || f.sz || 0) || Number(f.sz) || 0;
        const px = Number(f.fillPx || f.px) || null;
        const existing = openPositions.get(coin);
        if (existing) {
            if (existing.side === side) {
                // increase size, weighted avg entry
                const eSize = Number(existing.size) || 0;
                const eEntry = Number(existing.entryPrice) || 0;
                const totNotional = eEntry * eSize + (px || 0) * sz;
                const newSize = eSize + sz;
                const newEntry = newSize > 0 ? (totNotional / newSize) : (px || eEntry);
                openPositions.set(coin, { ...existing, size: newSize, entryPrice: newEntry });
            } else {
                // opposite side: reduce or close
                const rem = (Number(existing.size) || 0) - sz;
                if (rem > 0) {
                    openPositions.set(coin, { ...existing, size: rem });
                } else {
                    openPositions.delete(coin);
                }
            }
        } else {
            // new position
            openPositions.set(coin, { side, size: sz, source: 'OKX', ts: Date.now(), id: f.ordId || f.clOrdId || ('fill_' + Date.now()), entryPrice: px });
        }
    } catch (e) { console.error('upsertPositionFromOkxFill error', e); }
}

export function closePosition(coin) {
    try {
        if (openPositions.has(coin)) {
            openPositions.delete(coin);
            saveState();
        }
    } catch (e) {
        console.warn('[COMPOSER] Failed to close position', coin, e);
    }
}
let totalTriggersToday = 0;
// Concurrency lock
const pendingExecutions = new Set(); // Stores "sigId:coin" keys

// Global Coin Lock to prevent "Order Storms" regardless of signal ID
const coinCooldowns = new Map();
const lastExecutions = new Map(); // coin -> { side, size, price, ts }

export function runComposerEngine(marketState) {
    if (!marketState) return;
    const active = compositions.filter(c => c.active);
    if (!active.length) return;

    const now = Date.now();
    const triggers = [];

    active.forEach(sig => {
        // Use signal's own profile/timeframe settings
        const { profile, timeframe } = getSignalProfileTimeframe(sig);

        Object.keys(marketState).forEach(coin => {
            const data = computeData(marketState[coin], profile, timeframe);
            const result = evaluateSignal(sig, coin, data);

            const key = `${sig.id}:${coin}`;
            const wasTriggered = !!lastTriggeredState.get(key);

            if (result.triggered && result.bias !== 'WAIT') {
                // only fire on rising edge (was not triggered before)
                if (!wasTriggered) {
                    const lastTrigger = cooldowns.get(key) || 0;

                    // 1. Signal Cooldown (5m default to prevent signal flickering)
                    if (now - lastTrigger > (sig.cooldown || 300) * 1000) {

                        // 2. Coin-level Concurrency Lock (Serialize executions per coin)
                        // Use 'coin' as key, so ONLY ONE signal can process for this coin at a time.

                        // 2.1 CROSS-TAB LOCK via LocalStorage (Mutex)
                        // Check if another tab or recent process locked this coin
                        const lockKey = `os_lock_${coin}`;
                        const lastLock = Number(localStorage.getItem(lockKey) || 0);
                        if (Date.now() - lastLock < 15000) { // 15s hard lock shared across tabs
                            // System is busy with this coin elsewhere
                            return;
                        }

                        if (!pendingExecutions.has(coin)) {
                            pendingExecutions.add(coin);

                            // SET LOCK IMMEDIATELY (Sync)
                            localStorage.setItem(lockKey, Date.now());

                            executeSignal(sig, coin, result, data)
                                .then(executed => {
                                    if (executed) {
                                        cooldowns.set(key, now);
                                        sig.lastTrigger = now;
                                        totalTriggersToday++;
                                        triggers.push({ sig: sig.name, coin, bias: result.bias });
                                    }
                                })
                                .catch(e => console.error(e))
                                .finally(() => {
                                    pendingExecutions.delete(coin);
                                    saveState(); // Persist updated cooldowns or triggered states
                                });
                        }
                    }
                    lastTriggeredState.set(key, true);
                    saveState(); // Persist the rising edge
                }
            } else {
                // reset state when not triggered so next true is a rising edge
                if (wasTriggered) {
                    lastTriggeredState.set(key, false);
                    saveState(); // Persist the change
                }
            }
        });
    });

    updateLiveMonitor(triggers);
}

async function executeSignal(sig, coin, result, data) {
    const price = data.raw?.PRICE?.last || 0;
    console.log(`[COMPOSER] 🎼 ${sig.name}: ${result.bias} ${coin} @ $${Utils.safeFixed(price ?? 0, 2)} ${Utils.safeFixed(result.score ?? 0, 0)}%`);

    if (sig.outputAction === 'SIGNAL') {
        if (Notification.permission === 'granted') new Notification(`🎼 ${sig.name}`, { body: `${result.bias} ${coin}` });
        return true;
    } else if (sig.outputAction === 'SIMULATE') {
        const existing = openPositions.get(coin);
        if (existing) {
            if (existing.side === result.bias) {
                // don't re-enter if we already have an open position on same side for this coin
                showToast(`Skip simulate: existing ${result.bias} position for ${coin}`, 'info');
                return false;
            } else if (sig.closeOnFlip) {
                // Direction flip + closeOnFlip enabled
                showToast(`Sim auto-close: ${coin} ${existing.side} -> ${result.bias}`, 'success');
                ViewSimulation.closePosition(coin, price);
                openPositions.delete(coin);
                saveState();
            } else {
                console.log(`[COMPOSER] Sim signal opposite to existing position. Skipping.`);
                return false;
            }
        }

        ViewSimulation.openPosition(result.bias, { coin, amount: sig.simConfig?.amount || 1000, leverage: sig.simConfig?.leverage || 10, tp: sig.simConfig?.tp || 10, sl: sig.simConfig?.sl || 5, entryPrice: price, source: 'COMPOSER', ruleName: sig.name, silent: true });
        // record a simple open position (in-memory) with entry price
        openPositions.set(coin, { side: result.bias, size: sig.simConfig?.amount || 1000, source: 'SIM', ts: Date.now(), id: 'sim_' + Date.now(), entryPrice: price });
        saveState();
        return true;
    } else if (sig.outputAction === 'WEBHOOK' && sig.webhookConfig?.url) {
        fetch(sig.webhookConfig.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'composer_signal', timestamp: new Date().toISOString(), signal: sig.name, coin, bias: result.bias, score: result.score, price }) }).catch(console.error);
        return true;
    } else if (sig.outputAction === 'OKX') {
        try {
            // 🛡️ SAFETY GATE: Check if trading is allowed
            const safetyCheck = TradeSafety.canTrade();
            if (!safetyCheck.allowed) {
                showToast(`🛡️ Safety: ${safetyCheck.reason}`, 'warning');
                return false;
            }

            const okxMode = localStorage.getItem('os_mode') || 'SIM';
            const okxCfg = (typeof OkxClient.getConfig === 'function') ? OkxClient.getConfig() : null;
            if (okxMode !== 'REAL' && !(okxMode === 'SIM' && okxCfg?.simulated)) {
                console.log(`[COMPOSER] OKX execution skipped. Mode=${okxMode}, Simulated=${okxCfg?.simulated}`);
                return false;
            }

            // 1. Fetch Positions & Check Risk
            const posRes = await OkxClient.fetchPositions();
            const positions = posRes?.data || [];
            const existing = positions.find(p => p.instId === coin);

            // 1.1 Hierarchical Max Positions Check (Only for NEW entries)
            const globalMaxPos = parseInt(localStorage.getItem('os_max_positions')) || 5;

            // Per-Signal Count and Mapping Sync
            let ownedCoins = sigPosMapping.get(sig.id) || [];
            const activeInSig = positions.filter(p => ownedCoins.includes(p.instId));

            // Sync mapping: remove coins that are no longer in the actual positions list
            const currentOwned = activeInSig.map(p => p.instId);
            if (currentOwned.length !== ownedCoins.length) {
                sigPosMapping.set(sig.id, currentOwned);
                saveMapping();
                ownedCoins = currentOwned;
            }

            const sigLimit = (sig.maxPositions !== undefined) ? sig.maxPositions : 1;

            if (!existing) {
                // Check Global Limit
                if (positions.length >= globalMaxPos) {
                    console.log(`[COMPOSER] 🛑 Global Max Positions reached (${positions.length}/${globalMaxPos}). Blocking new entry for ${coin}.`);
                    showToast(`🛡️ Global Max Pos reached: ${positions.length}/${globalMaxPos}`, 'warning');
                    return false;
                }
                // Check Signal Limit
                if (activeInSig.length >= sigLimit) {
                    console.log(`[COMPOSER] 🛑 Signal Limit reached (${activeInSig.length}/${sigLimit}) for ${sig.name}. Blocking ${coin}.`);
                    showToast(`🛡️ ${sig.name} Limit reached: ${activeInSig.length}/${sigLimit}`, 'warning');
                    return false;
                }
            }

            // 2. Calculate Size (Allocator)
            const signalContext = {
                metrics: {
                    RiskScore: 100 - (result.score || 50),
                    SignalConfidence: result.score || 50,
                    Price: price,
                    ...data.raw // Pass raw metrics for advanced sizing
                },
                instId: coin,
                price: price
            };

            // Get sizing config from signal or global settings
            const allocConfig = {
                baseUsd: sig.allocConfig?.baseUsd || Number(localStorage.getItem('os_alloc_base')) || 10,
                minUsd: sig.allocConfig?.minUsd || Number(localStorage.getItem('os_alloc_min')) || 2,
                maxUsd: sig.allocConfig?.maxUsd || Number(localStorage.getItem('os_alloc_max')) || 200,
                budgetUsd: Number(localStorage.getItem('os_alloc_budget')) || 0,
                useATR: sig.allocConfig?.useATR || false
            };

            const usdSize = await StrategyAllocator.sizeFromSignal(signalContext, positions, allocConfig);
            if (usdSize === 0) {
                console.warn(`[COMPOSER] 🛑 Allocator returned $0 size for ${coin}. Likely budget exhausted or crowd penalty.`);
                showToast(`🛡️ Sizing: $0 budget for ${coin} (Check Budget/Risk)`, 'warning');
                return false;
            }

            // Simple approximation: Coins = USD / Price
            let sz = (usdSize / price).toFixed(5);

            // 3. EXECUTION LOGIC
            const side = result.bias === 'LONG' ? 'buy' : 'sell';

            // 🛡️ SMART DUPLICATE CHECK 🛡️
            // "Jika nilai order sama, jangan order baru"
            const lastExec = lastExecutions.get(coin);
            if (lastExec) {
                const isSameSide = lastExec.side === side;
                const isSameSize = Math.abs(Number(lastExec.size) - Number(sz)) < (Number(sz) * 0.01); // 1% tolerance
                const isRecent = (Date.now() - lastExec.ts) < 5 * 60_000; // 5 min memory

                // If it's a NEW entry (not a DCA of existing position) and identical to last, BLOCK.
                // We assume if 'existing' is present, we might be doing DCA, so we check that separately.
                if (isSameSide && isSameSize && isRecent && !existing) {
                    console.log(`[COMPOSER] 🛑 Duplicate blocked for ${coin}: Side(${side}) Size(${sz}) matches last exec.`);
                    return false;
                }
            }

            if (existing) {
                // ─── SMART DCA ────────────────────────────────────────
                const posSide = (existing.posSide === 'long' || Number(existing.pos) > 0) ? 'LONG' : 'SHORT';

                // Only DCA if same direction
                if (posSide === result.bias) {
                    // Check Smart DCA vs Global Settings
                    // ... (Restore original DCA logic)
                    // Wait, original logic checked existingSide === result.bias

                    const entryPx = Number(existing.avgPx || 0);
                    if (entryPx > 0) {
                        const pnlPct = posSide === 'LONG'
                            ? (price - entryPx) / entryPx
                            : (entryPx - price) / entryPx;

                        const minDD = (sig.dcaConfig?.minDrawdownPct || -2) / 100; // e.g. -2%
                        const maxCounts = sig.dcaConfig?.maxCounts || Number(localStorage.getItem('os_max_dca_counts')) || 2;

                        const dcaKey = `dca_count_${coin}`;
                        const dcaCount = Number(localStorage.getItem(dcaKey) || 0);

                        if (pnlPct < minDD && dcaCount < maxCounts) {
                            console.log(`[COMPOSER] Smart DCA Triggered for ${coin}: PnL ${pnlPct * 100}% < ${minDD * 100}%, Count ${dcaCount}/${maxCounts}`);

                            // OPTIMISTIC UPDATE: Increment count BEFORE async call to prevent race
                            localStorage.setItem(dcaKey, dcaCount + 1);

                            try {
                                const tdMode = localStorage.getItem('okx_margin_mode') || 'cross';
                                const adj = await OkxClient.adjustSize(coin, String(sz));
                                if (parseFloat(adj) === 0) {
                                    showToast(`Order too small for ${coin} lot step (min required > $${usdSize.toFixed(2)})`, 'error');
                                } else {
                                    await OkxClient.placeOrder({ instId: coin, side: side, ordType: 'market', sz: String(adj), tdMode });
                                    // Trigger TP/SL Sync after DCA
                                    const tp = sig.orderConfig?.tpPct;
                                    const sl = sig.orderConfig?.slPct;
                                    if (tp || sl) {
                                        setTimeout(() => OkxClient.syncTpSl(coin, tp, sl).catch(e => console.error('[COMPOSER] TP/SL Sync failed after DCA', e)), 2000);
                                    }
                                }
                            } catch (e) {
                                console.error('[COMPOSER] placeOrder adjusted failed', e);
                                throw e;
                            }

                            showToast(`🧠 Smart DCA: ${coin} accumulated`, 'success');

                            lastExecutions.set(coin, { side, size: sz, price, ts: Date.now() });
                            return true;
                        } else {
                            console.log(`[COMPOSER] Smart DCA skipped: PnL ${pnlPct * 100}%, Count ${dcaCount}`);
                            return false;
                        }
                    }
                } else {
                    // Opposite-side signal detected. Optionally auto-close the existing position
                    if (sig.closeOnFlip) {
                        try {
                            // Determine existing size from common OKX position fields
                            const rawSize = Math.abs(Number(existing.pos || existing.qty || existing.availPos || existing.position || 0) || 0);
                            const closeSz = rawSize > 0 ? rawSize : 0;
                            if (closeSz <= 0) {
                                console.log(`[COMPOSER] closeOnFlip enabled but could not determine existing size for ${coin}. Skipping.`);
                                return false;
                            }

                            const closeSide = posSide === 'LONG' ? 'sell' : 'buy';

                            console.log(`[COMPOSER] closeOnFlip: closing ${coin} ${posSide} position size=${closeSz} by sending market ${closeSide}`);

                            // Place a market order to close the existing position (use same tdMode)
                            try {
                                const tdMode = localStorage.getItem('okx_margin_mode') || 'cross';
                                const adj = await OkxClient.adjustSize(coin, String(closeSz));
                                if (parseFloat(adj) === 0) {
                                    showToast('Adjusted close size is 0 — cannot close position', 'error');
                                } else {
                                    await OkxClient.placeOrder({ instId: coin, side: closeSide, ordType: 'market', sz: String(adj), tdMode });
                                }
                            } catch (e) {
                                console.error('[COMPOSER] close placeOrder failed', e);
                                throw e;
                            }

                            showToast(`Auto-close executed: ${coin} ${posSide} → closed`, 'success');
                            // Cleanup any pending TP/SL algo orders
                            setTimeout(() => OkxClient.syncTpSl(coin, 0, 0).catch(e => console.warn('[COMPOSER] TP/SL cleanup failed', e)), 1500);

                            // Reset DCA counter on a full close
                            localStorage.setItem(`dca_count_${coin}`, 0);
                            lastExecutions.set(coin, { side: closeSide, size: String(closeSz), price, ts: Date.now() });
                            return true;
                        } catch (e) {
                            console.error('[COMPOSER] closeOnFlip failed', e);
                            showToast(`Auto-close failed: ${e.message || 'unknown'}`, 'error');
                            return false;
                        }
                    }

                    console.log(`[COMPOSER] Signal opposite to existing position. Skipping.`);
                    return false;
                }
            } else {
                // ─── NEW ENTRY ────────────────────────────────────────
                console.log(`[COMPOSER] Opening NEW position for ${coin} size=${sz} ($${usdSize.toFixed(2)})`);

                try {
                    const tdMode = localStorage.getItem('okx_margin_mode') || 'cross';
                    const adj = await OkxClient.adjustSize(coin, String(sz));
                    if (parseFloat(adj) === 0) {
                        showToast(`Order too small for ${coin} lot step (min required > $${usdSize.toFixed(2)})`, 'error');
                    } else {
                        await OkxClient.placeOrder({ instId: coin, side: side, ordType: 'market', sz: String(adj), tdMode });
                        // Trigger TP/SL Sync
                        const tp = sig.orderConfig?.tpPct;
                        const sl = sig.orderConfig?.slPct;
                        if (tp || sl) {
                            setTimeout(() => OkxClient.syncTpSl(coin, tp, sl).catch(e => console.error('[COMPOSER] TP/SL Sync failed', e)), 2000);
                        }
                    }
                } catch (e) {
                    console.error('[COMPOSER] new entry placeOrder failed', e);
                    throw e;
                }

                showToast(`🎼 Signal Executed: ${coin} ${side}`, 'success');
                // Reset DCA count on new entry
                localStorage.setItem(`dca_count_${coin}`, 0);

                lastExecutions.set(coin, { side, size: sz, price, ts: Date.now() });

                // Update signal mapping for REAL mode
                const currentOwned = sigPosMapping.get(sig.id) || [];
                if (!currentOwned.includes(coin)) {
                    currentOwned.push(coin);
                    sigPosMapping.set(sig.id, currentOwned);
                    saveMapping();
                }

                return true;
            }

        } catch (e) {
            console.error('[COMPOSER] Execution Failed:', e);
            showToast(`❌ Exec Failed: ${e.message}`, 'error');
            return false;
        }
    }
    return false;
}



function updateLiveMonitor(triggers) {
    const triggersEl = document.getElementById('live-triggers');
    const countEl = document.getElementById('total-triggers');
    const activeEl = document.getElementById('active-count');

    if (activeEl) activeEl.textContent = `${compositions.filter(c => c.active).length} active`;
    if (countEl) countEl.textContent = `${totalTriggersToday} triggers`;
    if (triggersEl && triggers.length > 0) {
        triggersEl.innerHTML = triggers.slice(0, 8).map(t => `<span class="px-1 py-0.5 rounded text-[7px] font-bold ${t.bias === 'LONG' ? 'bg-bb-green/20 text-bb-green' : 'bg-bb-red/20 text-bb-red'}">${t.coin.replace('-USDT', '')} ${t.bias}</span>`).join('');
    }
}

/**
 * ⚡ Initialization Sequence (Non-UI)
 * Called by main.js to ensure signal compositions and triggers are loaded on refresh
 * priority: 3
 */
export function init() {
    loadState();
    console.log('[COMPOSER] Engine initialized (State Loaded)');
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compositions));

    // Also persist runtime state to prevent re-triggers on refresh
    try {
        const runtime = {
            cooldowns: Array.from(cooldowns.entries()),
            lastTriggeredState: Array.from(lastTriggeredState.entries())
        };
        localStorage.setItem(STORAGE_KEY + '_runtime', JSON.stringify(runtime));
    } catch (e) {
        console.warn('[COMPOSER] Failed to save runtime state', e);
    }

    console.log('[COMPOSER] Saved', compositions.length, 'signals');
}
function saveMapping() {
    try {
        localStorage.setItem(STORAGE_KEY_MAPPING, JSON.stringify(Array.from(sigPosMapping.entries())));
    } catch (e) { console.warn('[COMPOSER] Mapping save error', e); }
}

let stateLoaded = false;
function loadState() {
    if (stateLoaded) return; // Only load once
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) {
            compositions = JSON.parse(s);
            // Re-link activeComposition to the loaded object
            if (activeComposition) {
                activeComposition = compositions.find(c => c.id === activeComposition.id) || null;
            }
        }

        // Load runtime state
        const rs = localStorage.getItem(STORAGE_KEY + '_runtime');
        if (rs) {
            try {
                const runtime = JSON.parse(rs);
                if (runtime.cooldowns) {
                    cooldowns.clear();
                    runtime.cooldowns.forEach(([k, v]) => cooldowns.set(k, v));
                }
                if (runtime.lastTriggeredState) {
                    lastTriggeredState.clear();
                    runtime.lastTriggeredState.forEach(([k, v]) => lastTriggeredState.set(k, v));
                }
                console.log('[COMPOSER] Restored runtime state');
            } catch (re) {
                console.warn('[COMPOSER] Failed to parse runtime state', re);
            }
        }

        // Load Mapping
        const ms = localStorage.getItem(STORAGE_KEY_MAPPING);
        if (ms) {
            try {
                const mapData = JSON.parse(ms);
                sigPosMapping = new Map(mapData);
            } catch (e) { console.warn('[COMPOSER] Mapping parse error', e); }
        }

        stateLoaded = true;
        console.log('[COMPOSER] Loaded', compositions.length, 'signals');
    } catch (e) {
        console.error('Load error', e);
    }
}

// Force reload from storage (for manual refresh)
function reloadState() {
    stateLoaded = false;
    loadState();
}

export function update() { }
