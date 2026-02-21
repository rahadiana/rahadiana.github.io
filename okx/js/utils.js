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

export const safeFixed = (value, decimals = 2) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return (decimals === 0) ? '0' : Number(0).toFixed(decimals);

    if (n === 0 || decimals === 0) return n.toFixed(decimals);

    const abs = Math.abs(n);
    const threshold = Math.pow(10, -decimals);

    // If the value is smaller than what "decimals" realistically allows, increase precision dynamically
    if (abs > 0 && abs < threshold) {
        const leadingZeros = -Math.floor(Math.log10(abs));
        // Retain ~3 significant digits, capped at 8 total decimals
        return n.toFixed(Math.min(leadingZeros + 2, 8));
    }

    return n.toFixed(decimals);
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

// Helper to download a string as a file (CSV/JSON/etc.)
export function downloadFile(content, filename = 'download.txt', mime = 'text/plain') {
    try {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (e) {
        console.error('downloadFile error', e);
        return false;
    }
}

export const formatCompactNumber = (number, decimals = 1) => {
    if (number === undefined || number === null) return '--';
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: decimals
    }).format(number);
};

// Hybrid Export for resolution resilience
export default {
    formatCurrency,
    formatNumber,
    formatPrice,
    formatCompactNumber,
    formatPct,
    formatTime,
    getColor
};
