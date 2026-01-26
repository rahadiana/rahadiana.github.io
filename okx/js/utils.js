export const formatCurrency = (value) => {
    if (value === undefined || value === null) return '--';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const formatNumber = (value, decimals = 2) => {
    if (value === undefined || value === null) return '--';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
};

export const formatPrice = (value) => {
    if (value === undefined || value === null || value === 0) return '--';
    if (value >= 1) return formatNumber(value, 2);
    if (value >= 0.01) return formatNumber(value, 4);
    if (value >= 0.0001) return formatNumber(value, 6);
    return formatNumber(value, 8); // Deep precision for meme coins
};

export const formatPct = (value) => {
    if (value === undefined || value === null) return '--';
    return `${(value * 100).toFixed(2)}%`;
};

export const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
};

export const getColor = (value, isBullishHigh = true) => {
    if (value === 0) return 'text-bb-gray';
    if (isBullishHigh) {
        return value > 0 ? 'text-bb-green' : 'text-bb-red';
    } else {
        // Bearish if high (e.g. Funding for shorts)
        return value > 0 ? 'text-bb-red' : 'text-bb-green';
    }
};

// Hybrid Export for resolution resilience
export default {
    formatCurrency,
    formatNumber,
    formatPrice,
    formatPct,
    formatTime,
    getColor
};
