(function(){
    'use strict';
    const core = (typeof AnalyticsCore !== 'undefined') ? AnalyticsCore : null;

    function wrapFn(name, placeholder) {
        return function(...args){
            if (core && typeof core[name] === 'function') {
                return core[name](...args);
            }
            if (typeof placeholder === 'function') return placeholder(...args);
            return placeholder;
        };
    }

    const placeholders = {
        calculateImprovedVolRatio: { imbalance:0, buyPercent:50, buy:0, sell:0, total:0, interpretation:'NO_DATA', className:'text-muted' },
        improvedComputeAnalytics: {},
        robustStatistics: { mean:0, median:0, std:0, mad:0, samples:0, valid:false },
        calculateRobustZScore: { zScore:0, isSignificant:false, interpretation:'INSUFFICIENT_DATA' },
        calculateMomentumScore: 0,
        computeATR: 0,
        calculateEnhancedRecommendation: { recommendation:'HOLD', confidence:0, score:0, className:'recommendation-hold', factors:{}, warnings:[] },
        detectMarketRegime: { regime:'UNKNOWN', confidence:0, characteristics:[], strategies:[], warnings:['Insufficient data'] },
        calculateAdaptiveStops: { entryPrice:null, stopLoss:null, takeProfit:null, confidence:0, warnings:['Insufficient data'] },
        calculatePositionSize: null
    };

    window.AnalyticsEnhanced = window.AnalyticsEnhanced || {};
    Object.keys(placeholders).forEach(k => {
        window.AnalyticsEnhanced[k] = wrapFn(k, placeholders[k]);
    });

    console.log('[AnalyticsEnhanced] loaded (thin wrappers to AnalyticsCore)');
})();
