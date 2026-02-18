// Helper utilities for safe data access and volume calculations
export function getMasterSignal(data, profile, timeframe) {
  const tf = data.signals?.profiles?.[profile]?.timeframes?.[timeframe];
  return tf?.recommendation || tf?.masterSignal || data.masterSignals?.[timeframe]?.[profile] || {};
}

export function getMicrostructure(data, profile) {
  return data.microstructure?.[profile] || {};
}

export function getSignals(data, profile, timeframe) {
  return data.signals?.profiles?.[profile]?.timeframes?.[timeframe]?.signals || {};
}

// Calculate volume pace (per-minute) and historical spike
export function calculateVolumePace(volData, avgData, timeframeKey, minutes) {
  const buy = volData[`vol_BUY_${timeframeKey}`] || 0;
  const sell = volData[`vol_SELL_${timeframeKey}`] || 0;
  const total = buy + sell;

  const currentPace = minutes > 0 ? (total / minutes) : 0;

  const histBuy = avgData[`avg_VOLCOIN_buy_${timeframeKey}`] || 0;
  const histSell = avgData[`avg_VOLCOIN_sell_${timeframeKey}`] || 0;
  const histTotal = histBuy + histSell;
  const histPace = minutes > 0 ? (histTotal / minutes) : 0;

  const spike = histPace > 0 ? (currentPace / histPace) : 1.0;

  return { currentPace, histPace, spike, total, buy, sell };
}

// Durability score: normalized comparing current pace to 1H benchmark (per-minute)
export function calculateDurability(currentPacePerMin, benchmark1hPerMin) {
  if (!benchmark1hPerMin || benchmark1hPerMin <= 0) return 0.5;
  const raw = currentPacePerMin / benchmark1hPerMin;
  // Cap: 2x pace -> 1.0, linear scaling
  return Math.min(1.0, raw / 2);
}

// Technical Score Calculation (0-100)
export function calculateTechnicalScore(price, vol, lsr, funding) {
  let score = 50; // Base score

  // 1. Price Trend (30%)
  const chg1h = price.percent_change_1JAM || 0;
  const chg24h = (price.percent_change_24JAM || price.percent_change_24h || 0);

  if (chg1h > 1.0) score += 10;
  else if (chg1h > 0.5) score += 5;
  else if (chg1h < -1.0) score -= 10;
  else if (chg1h < -0.5) score -= 5;

  if (chg24h > 5.0) score += 5;
  else if (chg24h < -5.0) score -= 5;

  // 2. Volume Strength (30%)
  // We need to re-calculate simple spike here or pass it in. 
  // Simplified: check if recent volume is high
  const v1h = (vol.vol_BUY_1JAM || 0) + (vol.vol_SELL_1JAM || 0);
  const v24h = (vol.vol_BUY_24JAM || vol.vol_BUY_24h || 0) + (vol.vol_SELL_24JAM || vol.vol_SELL_24h || 1);
  const hourlyAvg = v24h / 24;

  if (v1h > hourlyAvg * 2.0) score += 15; // Heavy volume breakout
  else if (v1h > hourlyAvg * 1.5) score += 10;
  else if (v1h < hourlyAvg * 0.5) score -= 5; // Low volume

  // 3. Sentiment / LSR (20%) - Contrarian? Or Trend Following?
  // Let's assume low LSR (< 0.8) is Bullish (Retail Shorting) -> +Score
  // High LSR (> 1.2) is Bearish (Retail Longing) -> -Score
  const ratio = lsr.longShortRatio || 1.0;
  if (ratio < 0.8) score += 10;
  else if (ratio < 0.9) score += 5;
  else if (ratio > 1.2) score -= 10;
  else if (ratio > 1.1) score -= 5;

  // 4. Funding (20%)
  // High positive funding -> Overbought/Bearish
  // High negative funding -> Oversold/Bullish
  const rate = funding.funding_Rate || 0;
  if (rate < -0.0002) score += 10;
  else if (rate > 0.0002) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// === COMPUTED VALUES ===
// Normalizes the data structure to match expected paths
export function computeData(data, profile = 'AGGRESSIVE', timeframe = '15MENIT') {
  if (!data) return null;

  // Extract nested structures like viewGlobal.js does
  const raw = data.raw || {};
  const dash = data.dashboard || {};
  const sigRoot = data.signals || {};
  const profileObj = sigRoot.profiles?.[profile] || {};
  const tfObj = profileObj.timeframes?.[timeframe] || {};
  const tfSignals = tfObj.signals || {};
  const tfMaster = tfObj.recommendation || tfObj.masterSignal || {};
  const analytics = data.analytics || {};

  // Raw data
  const price = raw.PRICE || sigRoot.PRICE || {};
  // Normalize 24h change for consistency across modules
  if (price.percent_change_24JAM === undefined && price.percent_change_24h !== undefined) {
    price.percent_change_24JAM = price.percent_change_24h;
  }

  const vol = raw.VOL || sigRoot.VOL || {};
  const freq = raw.FREQ || sigRoot.FREQ || {};
  const oiRaw = raw.OI || sigRoot.OI || {};
  const fundingRaw = raw.FUNDING || sigRoot.FUNDING || {};
  const lsrRaw = raw.LSR || sigRoot.LSR || {};
  const obRaw = raw.OB || {};
  const avgRaw = raw.AVG || sigRoot.AVG || {};

  // Synthesis
  const syn = data.synthesis || {};
  const flow = syn.flow || {};
  const eff = syn.efficiency || {};
  const mom = syn.momentum || {};

  // Funding analytics
  const fundAn = analytics.funding || {};

  // Helper for volume spike (calculate pace per-minute and compare to 1H baseline and historical avg)
  const getVolSpike = (tf, minutes) => {
    const buy = (vol[`vol_BUY_${tf}`] || 0);
    const sell = (vol[`vol_SELL_${tf}`] || 0);
    const total = buy + sell;

    // Current pace per minute in this timeframe window
    const currentPacePerMin = minutes > 0 ? (total / minutes) : 0;

    // Baseline: 1H pace per minute
    const v1h = ((vol.vol_BUY_1JAM || 0) + (vol.vol_SELL_1JAM || 0));
    const pace1hPerMin = v1h / 60;

    // SANITY CHECK: If 1H volume is roughly equal to this TF's volume (e.g. fresh data / new coin),
    // then the 1H baseline is diluted by zeros, causing fake 60x spikes.
    // If v1h is not significantly larger than total (allow 10% bufer), assume lack of history.
    const isSparseData = (v1h > 0) && (v1h < total * 1.1) && (minutes < 60);

    const spike = (pace1hPerMin > 0 && !isSparseData) ? (currentPacePerMin / pace1hPerMin) : 1.0;

    // Historical average pace per minute for this timeframe
    const histBuy = avgRaw[`avg_VOLCOIN_buy_${tf}`] || 0;
    const histSell = avgRaw[`avg_VOLCOIN_sell_${tf}`] || 0;
    const histTotal = histBuy + histSell;
    const histPacePerMin = minutes > 0 ? (histTotal / minutes) : 0;
    const avgSpike = histPacePerMin > 0 ? (currentPacePerMin / histPacePerMin) : 1.0;
    // If 1H data looks sparse (e.g. app just started), try to use historical average as baseline
    let baseline = pace1hPerMin;
    if (isSparseData || baseline <= 0) {
      baseline = histPacePerMin;
    }

    const durability = (baseline > 0) ? calculateDurability(currentPacePerMin, baseline) : 0.5;

    return {
      spike,        // vs 1H baseline (per-minute)
      avgSpike,     // vs historical avg (per-minute)
      currentPace: currentPacePerMin,
      baselinePace: pace1hPerMin,
      histPace: histPacePerMin,
      durability,
      total,
      buy,
      sell
    };
  };

  // Helper for frequency
  const getFreq = (tf) => {
    const b = freq[`freq_BUY_${tf}`] || 0;
    const s = freq[`freq_SELL_${tf}`] || 0;
    return { buy: b, sell: s, total: b + s, net: b - s, ratio: (b + s) > 0 ? (b - s) / (b + s) : 0 };
  };

  // Helper for BTC benchmark data - try multiple symbols and fallback to any BTC key
  const getBtcData = () => {
    const mkt = window.marketState || {};
    let btcEntry = mkt['BTC-USDT'] || mkt['BTC-USD-SWAP'] || mkt['BTCUSDT'] || mkt['BTC-USDT-SWAP'] || null;
    if (!btcEntry || !btcEntry.raw?.PRICE) {
      const btcKey = Object.keys(mkt || {}).find(k => k && k.includes('BTC'));
      if (btcKey) btcEntry = mkt[btcKey];
    }
    const btcPriceObj = btcEntry?.raw?.PRICE || btcEntry?.signals?.PRICE || {};
    return {
      change1m: btcPriceObj.percent_change_1MENIT || 0,
      change5m: btcPriceObj.percent_change_5MENIT || 0,
      change15m: btcPriceObj.percent_change_15MENIT || 0,
      change1h: btcPriceObj.percent_change_1JAM || 0,
      change24h: btcPriceObj.percent_change_24JAM || btcPriceObj.percent_change_24h || 0,
      found: !!(btcEntry && btcEntry.raw?.PRICE),
      symbol: btcEntry && btcEntry.raw?.PRICE ? (btcEntry.coin || Object.keys(window.marketState || {}).find(k => window.marketState[k] === btcEntry) || 'BTC') : null
    };
  };

  const btcData = getBtcData();
  const coinChange5m = price.percent_change_5MENIT || 0;
  const coinChange15m = price.percent_change_15MENIT || 0;

  // BTC correlation calculations
  const btcDirection = btcData.change5m > 0.1 ? 'UP' : btcData.change5m < -0.1 ? 'DOWN' : 'FLAT';
  const coinDirection = coinChange5m > 0.1 ? 'UP' : coinChange5m < -0.1 ? 'DOWN' : 'FLAT';

  // Follows BTC = both moving same direction with similar magnitude
  const btcFollows = btcDirection !== 'FLAT' && btcDirection === coinDirection;

  // Diverges = opposite directions or coin moving while BTC flat
  const btcDiverges = (btcDirection === 'UP' && coinDirection === 'DOWN') ||
    (btcDirection === 'DOWN' && coinDirection === 'UP') ||
    (btcDirection === 'FLAT' && coinDirection !== 'FLAT');

  // Beta = ratio of coin move to BTC move (how much coin amplifies BTC move)
  const btcBeta = Math.abs(btcData.change5m) > 0.05 ? coinChange5m / btcData.change5m : 1.0;

  // Outperform = coin moving more in same direction as BTC
  const btcOutperform = btcFollows && Math.abs(coinChange5m) > Math.abs(btcData.change5m) * 1.2;

  // Compute derived values
  const computed = {
    // Volume spikes (normalized to multiplier)
    volSpike1m: getVolSpike('1MENIT', 1).spike,
    volSpike5m: getVolSpike('5MENIT', 5).spike,
    volSpike15m: getVolSpike('15MENIT', 15).spike,
    volDurability: getVolSpike('15MENIT', 15).durability * 100, // Normalized 0-100
    volSpike1h: getVolSpike('1JAM', 60).spike,
    // Buy Ratios (computed if missing in raw)
    volBuyRatio1h: (vol.vol_BUY_1JAM && vol.vol_SELL_1JAM) ? (vol.vol_BUY_1JAM / vol.vol_SELL_1JAM) : 1.0,
    // Frequency
    freqTotal1m: getFreq('1MENIT').total,
    freqTotal5m: getFreq('5MENIT').total,
    freqTotal15m: getFreq('15MENIT').total,
    freqTotal1h: getFreq('1JAM').total,
    freqNetRatio: getFreq('5MENIT').ratio,
    // Funding APY (annualized)
    fundingApy: (fundAn.currentRate || fundingRaw.funding_Rate || 0) * 3 * 365 * 100,
    // 24h price range %
    range24h: (() => { const h = price.high || 0; const l = price.low || 1; return l > 0 ? ((h - l) / l) * 100 : 0; })(),
    // Smart alerts
    hasConvergence: (tfMaster.confirmations || 0) >= 4 || (tfMaster.tier <= 2),
    isWhaleActive: ['WHALE', 'INSTITUTIONAL'].includes(mom.aggression_level_15MENIT),
    isDiscount: (price.percent_change_from_top || 0) < -10,
    hasArbOpp: Math.abs(fundAn.currentRate || fundingRaw.funding_Rate || 0) > 0.0003,
    // BTC Benchmark
    btcChange1m: btcData.change1m,
    btcChange5m: btcData.change5m,
    btcChange15m: btcData.change15m,
    btcChange1h: btcData.change1h,
    btcDirection,
    btcFollows,
    btcDiverges,
    btcBeta: Math.round(btcBeta * 100) / 100,
    btcOutperform
  };

  // Build normalized data structure with correct paths
  const normalized = {
    raw: {
      PRICE: (function () {
        const p = {
          last: price.last || 0,
          high: price.high || 0,
          low: price.low || 0
        };
        if (price.percent_change_1MENIT !== undefined) p.percent_change_1MENIT = price.percent_change_1MENIT;
        if (price.percent_change_5MENIT !== undefined) p.percent_change_5MENIT = price.percent_change_5MENIT;
        if (price.percent_change_15MENIT !== undefined) p.percent_change_15MENIT = price.percent_change_15MENIT;
        if (price.percent_change_1JAM !== undefined) p.percent_change_1JAM = price.percent_change_1JAM;
        // support both naming conventions for 24h
        if (price.percent_change_24JAM !== undefined) p.percent_change_24JAM = price.percent_change_24JAM;
        else if (price.percent_change_24h !== undefined) p.percent_change_24h = price.percent_change_24h;
        if (price.percent_change_from_top !== undefined) p.percent_change_from_top = price.percent_change_from_top;
        if (price.percent_change_from_bottom !== undefined) p.percent_change_from_bottom = price.percent_change_from_bottom;
        return p;
      })(),
      VOL: {
        vol_total_1MENIT: vol.vol_total_1MENIT || (vol.vol_BUY_1MENIT || 0) + (vol.vol_SELL_1MENIT || 0),
        vol_total_5MENIT: vol.vol_total_5MENIT || (vol.vol_BUY_5MENIT || 0) + (vol.vol_SELL_5MENIT || 0),
        vol_total_15MENIT: vol.vol_total_15MENIT || (vol.vol_BUY_15MENIT || 0) + (vol.vol_SELL_15MENIT || 0),
        vol_total_1JAM: vol.vol_total_1JAM || (vol.vol_BUY_1JAM || 0) + (vol.vol_SELL_1JAM || 0),
        buy_sell_ratio_1MENIT: vol.vol_SELL_1MENIT > 0 ? (vol.vol_BUY_1MENIT || 0) / vol.vol_SELL_1MENIT : 1,
        buy_sell_ratio_5MENIT: vol.vol_SELL_5MENIT > 0 ? (vol.vol_BUY_5MENIT || 0) / vol.vol_SELL_5MENIT : 1,
        buy_sell_ratio_15MENIT: vol.vol_SELL_15MENIT > 0 ? (vol.vol_BUY_15MENIT || 0) / vol.vol_SELL_15MENIT : 1
      },
      OI: {
        openInterest: oiRaw.oi || oiRaw.openInterest || 0,
        oiChange5m: oiRaw.oiChange5m || 0,
        oiChange10m: oiRaw.oiChange10m || 0,
        oiChange15m: oiRaw.oiChange15m || 0,
        oiChange1h: oiRaw.oiChange1h || 0,
        oiChange4h: oiRaw.oiChange4h || 0,
        oiChange24h: oiRaw.oiChange24h || 0,
        oiVolume5m: oiRaw.oiVolume5m || 0,
        oiVolume10m: oiRaw.oiVolume10m || 0,
        oiVolume15m: oiRaw.oiVolume15m || 0,
        oiVolume1h: oiRaw.oiVolume1h || 0,
        tier: oiRaw.tier || 3,
        marketDirection: oiRaw.marketDirection || (oiRaw.oiChange1h > 1 ? 'BULLISH' : oiRaw.oiChange1h < -1 ? 'BEARISH' : 'NEUTRAL'),
        bullScore: oiRaw.bullScore || 0,
        bearScore: oiRaw.bearScore || 0,
        netScore: oiRaw.netScore || 0,
        volumeTrend5m: oiRaw.volumeTrend5m || 0,
        volumeTrend15m: oiRaw.volumeTrend15m || 0,
        reliabilityScore: oiRaw.reliabilityScore || 0,
        signalConfidence: oiRaw.signalConfidence || 0,
        volumeRatio: oiRaw.volumeRatio || 0
      },
      FUNDING: {
        fundingRate: fundAn.currentRate !== undefined ? fundAn.currentRate : (fundingRaw.funding_Rate || 0),
        nextFundingRate: fundAn.nextRate !== undefined ? fundAn.nextRate : (fundingRaw.funding_nextFundingRate || 0),
        zScore: fundAn.zScore || 0,
        marketBias: (() => {
          const rate = fundAn.currentRate || fundingRaw.funding_Rate || 0;
          if (rate > 0.0005) return 'EXTREME_BULL';
          if (rate > 0.0001) return 'BULLISH';
          if (rate < -0.0005) return 'EXTREME_BEAR';
          if (rate < -0.0001) return 'BEARISH';
          return 'NEUTRAL';
        })()
      },
      LSR: {
        ratio: (() => {
          const tfMap = { '1MENIT': 'timeframes_5min', '5MENIT': 'timeframes_5min', '15MENIT': 'timeframes_15min', '30MENIT': 'timeframes_15min', '1JAM': 'timeframes_1hour' };
          const key = tfMap[timeframe] || 'timeframes_15min';
          return lsrRaw[key]?.longShortRatio || 1.0;
        })(),
        // Correct: long/short ratios come from the nested timeframe object
        longAccountRatio: (() => {
          const tfMap = { '1MENIT': 'timeframes_5min', '5MENIT': 'timeframes_5min', '15MENIT': 'timeframes_15min', '30MENIT': 'timeframes_15min', '1JAM': 'timeframes_1hour' };
          const key = tfMap[timeframe] || 'timeframes_15min';
          return (lsrRaw[key]?.longRatio || lsrRaw.longRatio || 0.5) * 100;
        })(),
        shortAccountRatio: (() => {
          const tfMap = { '1MENIT': 'timeframes_5min', '5MENIT': 'timeframes_5min', '15MENIT': 'timeframes_15min', '30MENIT': 'timeframes_15min', '1JAM': 'timeframes_1hour' };
          const key = tfMap[timeframe] || 'timeframes_15min';
          return (lsrRaw[key]?.shortRatio || lsrRaw.shortRatio || 0.5) * 100;
        })(),
        z: (() => {
          const tfMap = { '1MENIT': 'timeframes_5min', '5MENIT': 'timeframes_5min', '15MENIT': 'timeframes_15min', '30MENIT': 'timeframes_15min', '1JAM': 'timeframes_1hour' };
          const key = tfMap[timeframe] || 'timeframes_15min';
          return lsrRaw[key]?.z || tfSignals.sentiment?.sentimentAlignment?.metadata?.avgZScore || 0;
        })(),
        percentile: lsrRaw.summary?.percentile || lsrRaw.percentile || 50
      },
      LIQ: (() => {
        const cascade = tfSignals.derivatives?.liquidationCascade;
        let side = 'BALANCED';

        // Map BUY(Shorts Liquidated) -> SHORT LIQ, SELL(Longs Liquidated) -> LONG LIQ
        if (cascade && cascade.direction === 'BUY') side = 'SHORT LIQ';
        else if (cascade && cascade.direction === 'SELL') side = 'LONG LIQ';

        const rawLiq = data.raw?.LIQ || {};
        // Fallback to raw data dominant side if signal side is still BALANCED
        if (side === 'BALANCED' && rawLiq.dominantSide) {
          const rawSide = rawLiq.dominantSide.toUpperCase();
          if (rawSide !== 'NONE' && rawSide !== 'N/A' && rawSide !== 'BALANCED') {
            side = rawSide.includes('LIQ') ? rawSide : `${rawSide} LIQ`;
          }
        }

        return {
          liqRate: cascade?.normalizedScore || rawLiq.liqRate || 0,
          dominantSide: side
        };
      })(),
      ORDERBOOK: {
        imbalance: (() => {
          const bids = obRaw.bidDepth || 0;
          const asks = obRaw.askDepth || 0;
          const total = bids + asks;
          return total > 0 ? (bids - asks) / total : 0;
        })(),
        depthRatio: (() => {
          const bids = obRaw.bidDepth || 0;
          const asks = obRaw.askDepth || 1;
          return bids / asks;
        })(),
        wallDetected: (() => {
          const bids = obRaw.bidDepth || 0;
          const asks = obRaw.askDepth || 0;
          return (asks > bids * 1.5) || (bids > asks * 1.5);
        })(),
        spread: obRaw.spread || 0,
        spreadBps: obRaw.spreadBps || 0,
        bookHealth: obRaw.bookHealth || 'HEALTHY',
        slippage100k: obRaw.slippage100k || 0
      },
      AVG: {
        ...avgRaw
      }
    },
    _computed: computed,
    synthesis: syn,
    dashboard: {
      totalScore: tfMaster.score || tfMaster.normalizedScore || 0,
      recommendation: (() => {
        const score = tfMaster.score || tfMaster.normalizedScore || 50;
        const action = tfMaster.action || 'WAIT';
        if (action === 'LONG' && score >= 75) return 'STRONG_LONG';
        if (action === 'LONG') return 'LONG';
        if (action === 'SHORT' && score >= 75) return 'STRONG_SHORT';
        if (action === 'SHORT') return 'SHORT';
        if (action === 'SHORT') return 'SHORT';
        return 'HOLD';
      })(),
      sentimentScore: data.signals?.sentiment?.sentimentAlignment?.normalizedScore || 50,
      accumScore: dash.accumScore?.accumScore || 0,
      intensity: dash.intensity?.intensity || 0,
      breakoutProb: dash.breakoutPct?.breakoutPct || 0,
      riRatio: dash.riRatio?.riRatio || 0,
      technicalScore: dash.technicalScore?.technicalScore || calculateTechnicalScore(price, vol, lsrRaw, fundingRaw)
    },
    signals: {
      masterSignal: {
        normalizedScore: tfMaster.score || tfMaster.normalizedScore || 0,
        action: tfMaster.action || 'WAIT',
        confidence: tfMaster.confidence || 0,
        confirmations: tfMaster.confirmations || 0,
        mtfAligned: tfMaster.mtfAligned || false
      },
      micro: {
        vpin: {
          rawValue: tfSignals.microstructure?.vpin?.rawValue || data.microstructure?.[profile]?.vpin?.rawValue || 0,
          direction: tfSignals.microstructure?.vpin?.direction || data.microstructure?.[profile]?.vpin?.direction || 'NEUTRAL'
        },
        ofi: {
          normalizedScore: tfSignals.orderBook?.orderFlowImbalance?.normalizedScore || tfSignals.orderBook?.ofi?.normalizedScore || data.orderBook?.orderFlowImbalance?.normalizedScore || 50
        },
        spread: { rawValue: obRaw.spreadBps ? obRaw.spreadBps / 100 : (obRaw.spread ? obRaw.spread : 0) },
        toxicity: { rawValue: tfSignals.microstructure?.volumeFreqDivergence?.rawValue || data.microstructure?.[profile]?.volumeFreqDivergence?.rawValue || 0 }
      },
      enhanced: {
        cvd: { rawValue: mom.velocity_15MENIT > 0 ? 0.5 : -0.5, divergence: false },
        institutionalFootprint: { rawValue: mom.aggression_level_15MENIT === 'WHALE' ? 0.9 : mom.aggression_level_15MENIT === 'INSTITUTIONAL' ? 0.7 : 0.3 },
        momentumQuality: { rawValue: Math.min(1, Math.abs(mom.velocity_15MENIT || 0) / 10000) },
        bookResilience: { rawValue: dash.liqQuality?.qualityScore / 100 || 0.5 },
        pressureAcceleration: { rawValue: 0 },
        amihudIlliquidity: { rawValue: 0.5 }
      },
      marketRegime: {
        currentRegime: data.signals?.marketRegime?.currentRegime || 'RANGING',
        volRegime: data.signals?.volatilityRegime?.regime || 'NORMAL',
        trendStrength: data.signals?.marketRegime?.trendStrength || data.signals?.trendStrength || 0.5
      },
      institutional_guard: data.signals?.institutional_guard || data.institutional_guard || {}
    },
    profile: profileObj,
    timeframe: tfObj
  };

  return normalized;
}
