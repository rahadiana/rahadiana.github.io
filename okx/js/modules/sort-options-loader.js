/**
 * Sort Options Loader
 * Loads sort options from JSON file and populates select element
 */
(function() {
    'use strict';

    async function loadSortOptions() {
        const select = document.getElementById('sortBy');
        if (!select) return;

        try {
            const response = await fetch('./js/data/sort-options.json');
            if (!response.ok) throw new Error('Failed to load sort options');
            
            const data = await response.json();
            
            // Clear existing options
            select.innerHTML = '';
            
            // Build options from JSON
            data.sortOptions.forEach(group => {
                if (group.label) {
                    // Create optgroup
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = group.label;
                    
                    group.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        if (opt.selected) option.selected = true;
                        if (opt.disabled) option.disabled = true;
                        optgroup.appendChild(option);
                    });
                    
                    select.appendChild(optgroup);
                } else {
                    // Add options directly (no group)
                    group.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        if (opt.selected) option.selected = true;
                        if (opt.disabled) option.disabled = true;
                        select.appendChild(option);
                    });
                }
            });
            
            console.log('[SortLoader] Loaded', data.sortOptions.length, 'option groups');
        } catch (err) {
            console.error('[SortLoader] Error loading sort options:', err);
            // Fallback default options so UI remains usable
            const DEFAULT_SORT_OPTS = [
                { text: 'Price', value: 'price', selected: true },
                { text: 'Change %', value: 'change' },
                { text: 'Vol Ratio (2h)', value: 'vol_ratio' },
                { text: 'Vol Buy (24h)', value: 'vol_buy_24h' },
                { text: 'Vol Sell (24h)', value: 'vol_sell_24h' }
            ];
            // Clear existing options
            select.innerHTML = '';
            DEFAULT_SORT_OPTS.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                if (opt.selected) option.selected = true;
                select.appendChild(option);
            });
        }
    }

    // Load on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSortOptions);
    } else {
        loadSortOptions();
    }

    // Export for manual reload if needed
    window.loadSortOptions = loadSortOptions;
})();
