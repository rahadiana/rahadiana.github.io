/**
 * advanced-sort.js
 * Advanced multi-criteria sort and filter logic
 */

(function () {
    'use strict';

    // ===================== Constants & State =====================
    const MAX_ADV_SORT_CRITERIA = 5;
    const defaultAdvancedSortState = () => ({
        enabled: false,
        criteria: [],
        filters: {
            flow: null,
            durability: null,
            priceWindow: null
        }
    });
    let advancedSortState = defaultAdvancedSortState();
    let advancedSortDraft = null;

    // ===================== DOM Refs (cached on init) =====================
    let sortBySelect, sortOrderRadios;
    let advancedSortModalEl, advancedSortCriteriaContainer;
    let advancedSortStatus, advancedSortHint;
    let addAdvancedSortRowBtn, clearAdvancedSortBtn, applyAdvancedSortBtn, disableAdvancedSortBtn;
    let advFilterFlowToggle, advFilterFlowControls, advFilterFlowMetric, advFilterFlowComparator, advFilterFlowValue;
    let advFilterDurToggle, advFilterDurControls, advFilterDurMetric, advFilterDurComparator, advFilterDurValue;
    let advFilterPriceToggle, advFilterPriceControls, advFilterPriceMin, advFilterPriceMax;

    // ===================== Helpers =====================
    function getSortOrderValue() {
        if (!sortOrderRadios) return 'desc';
        for (const radio of sortOrderRadios) {
            if (radio && radio.checked) return radio.value;
        }
        return 'desc';
    }

    function cloneState(obj) {
        try { return JSON.parse(JSON.stringify(obj)); } catch (e) { return defaultAdvancedSortState(); }
    }

    function toggleBaseSortControls(disabled) {
        try {
            // Don't actually disable controls - just add visual indicator
            // This was causing issues where select became unclickable
            if (sortBySelect) {
                // sortBySelect.disabled = !!disabled;  // DISABLED - was blocking clicks
                sortBySelect.classList.toggle('opacity-50', !!disabled);
            }
            if (sortOrderRadios) {
                for (const r of sortOrderRadios) {
                    // if (r) r.disabled = !!disabled;  // DISABLED - was blocking clicks
                    if (r) r.classList.toggle('opacity-50', !!disabled);
                }
            }
        } catch (e) { }
    }

    function updateAdvancedSortStatusUI() {
        if (!advancedSortStatus) return;
        if (advancedSortState.enabled) {
            const sortCount = advancedSortState.criteria ? advancedSortState.criteria.length : 0;
            const filterCount = ['flow', 'durability', 'priceWindow']
                .filter((key) => advancedSortState.filters && advancedSortState.filters[key])
                .length;
            const descriptor = [];
            descriptor.push(`${sortCount} sort`);
            if (filterCount) descriptor.push(`${filterCount} filter`);
            advancedSortStatus.textContent = `ON • ${descriptor.join(' + ')}`;
            advancedSortStatus.className = 'badge bg-warning text-dark';
            if (advancedSortHint) advancedSortHint.textContent = 'Advanced sort aktif: prioritas multilayer & filter diterapkan.';
            if (disableAdvancedSortBtn) disableAdvancedSortBtn.classList.remove('d-none');
            toggleBaseSortControls(true);
        } else {
            advancedSortStatus.textContent = 'OFF';
            advancedSortStatus.className = 'badge bg-secondary';
            if (advancedSortHint) advancedSortHint.textContent = 'Pilih beberapa kategori untuk prioritas sorting + filter tambahan.';
            if (disableAdvancedSortBtn) disableAdvancedSortBtn.classList.add('d-none');
            toggleBaseSortControls(false);
        }
    }

    function ensureAdvancedSortDraft() {
        if (!advancedSortDraft) {
            advancedSortDraft = cloneState(advancedSortState);
            if (!advancedSortDraft.criteria || !Array.isArray(advancedSortDraft.criteria)) advancedSortDraft.criteria = [];
            if (!advancedSortDraft.filters) advancedSortDraft.filters = { flow: null, durability: null, priceWindow: null };
            if (!advancedSortDraft.criteria.length) {
                advancedSortDraft.criteria.push({ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() });
            }
        }
    }

    function syncAdvancedFilterVisibility() {
        if (advFilterFlowControls && advFilterFlowToggle) {
            advFilterFlowControls.classList.toggle('d-none', !advFilterFlowToggle.checked);
        }
        if (advFilterDurControls && advFilterDurToggle) {
            advFilterDurControls.classList.toggle('d-none', !advFilterDurToggle.checked);
        }
        if (advFilterPriceControls && advFilterPriceToggle) {
            advFilterPriceControls.classList.toggle('d-none', !advFilterPriceToggle.checked);
        }
    }

    function hydrateAdvancedFilterControlsFromDraft() {
        ensureAdvancedSortDraft();
        const filters = advancedSortDraft.filters || {};
        if (advFilterFlowToggle) {
            const flow = filters.flow;
            advFilterFlowToggle.checked = !!flow;
            if (advFilterFlowMetric && flow && flow.metric) advFilterFlowMetric.value = flow.metric;
            if (advFilterFlowComparator && flow && flow.comparator) advFilterFlowComparator.value = flow.comparator;
            if (advFilterFlowValue) advFilterFlowValue.value = (flow && flow.value !== undefined) ? flow.value : '';
        }
        if (advFilterDurToggle) {
            const dur = filters.durability;
            advFilterDurToggle.checked = !!dur;
            if (advFilterDurMetric && dur && dur.metric) advFilterDurMetric.value = dur.metric;
            if (advFilterDurComparator && dur && dur.comparator) advFilterDurComparator.value = dur.comparator;
            if (advFilterDurValue) advFilterDurValue.value = (dur && dur.value !== undefined) ? dur.value : '';
        }
        if (advFilterPriceToggle) {
            const win = filters.priceWindow;
            advFilterPriceToggle.checked = !!win;
            if (advFilterPriceMin) advFilterPriceMin.value = (win && win.min !== undefined) ? win.min : '';
            if (advFilterPriceMax) advFilterPriceMax.value = (win && win.max !== undefined) ? win.max : '';
        }
        syncAdvancedFilterVisibility();
    }

    function buildFiltersFromInputs() {
        const filters = { flow: null, durability: null, priceWindow: null };
        if (advFilterFlowToggle && advFilterFlowToggle.checked && advFilterFlowValue) {
            const flowValue = Number(advFilterFlowValue.value);
            if (Number.isFinite(flowValue)) {
                // Normalize comparator to valid values only
                let comparator = (advFilterFlowComparator && advFilterFlowComparator.value) || '>=';
                if (!['>', '>=', '<', '<=', '=', '=='].includes(comparator)) {
                    comparator = '>=';
                }
                filters.flow = {
                    metric: (advFilterFlowMetric && advFilterFlowMetric.value) || 'vol_ratio',
                    comparator: comparator,
                    value: flowValue
                };
            }
        }
        if (advFilterDurToggle && advFilterDurToggle.checked && advFilterDurValue) {
            let durValue = Number(advFilterDurValue.value);
            if (Number.isFinite(durValue)) {
                // Clamp durability to valid range 0-100
                durValue = Math.max(0, Math.min(100, durValue));
                // Normalize comparator
                let comparator = (advFilterDurComparator && advFilterDurComparator.value) || '>=';
                if (!['>', '>=', '<', '<=', '=', '=='].includes(comparator)) {
                    comparator = '>=';
                }
                filters.durability = {
                    metric: (advFilterDurMetric && advFilterDurMetric.value) || 'vol_durability',
                    comparator: comparator,
                    value: durValue
                };
            }
        }
        if (advFilterPriceToggle && advFilterPriceToggle.checked) {
            let minVal = advFilterPriceMin ? Number(advFilterPriceMin.value) : NaN;
            let maxVal = advFilterPriceMax ? Number(advFilterPriceMax.value) : NaN;
            // Default and clamp to 0-100 range
            if (!Number.isFinite(minVal)) minVal = 0;
            if (!Number.isFinite(maxVal)) maxVal = 100;
            minVal = Math.max(0, Math.min(100, minVal));
            maxVal = Math.max(0, Math.min(100, maxVal));
            // Swap if min > max
            if (minVal > maxVal) {
                const temp = minVal;
                minVal = maxVal;
                maxVal = temp;
            }
            filters.priceWindow = { min: minVal, max: maxVal };
        }
        return filters;
    }

    function buildAdvancedSortRow(criterion, index) {
        const row = document.createElement('div');
        row.className = 'advanced-sort-row d-flex flex-wrap align-items-center gap-2 mb-2';
        const badge = document.createElement('span');
        badge.className = 'badge bg-secondary';
        badge.textContent = `#${index + 1}`;
        row.appendChild(badge);

        const metricSelect = document.createElement('select');
        metricSelect.className = 'form-select form-select-sm flex-grow-1';
        if (sortBySelect) metricSelect.innerHTML = sortBySelect.innerHTML;
        metricSelect.value = (criterion && criterion.metric) || (sortBySelect ? sortBySelect.value : 'vol_ratio');
        metricSelect.addEventListener('change', () => {
            if (criterion) criterion.metric = metricSelect.value;
        });
        row.appendChild(metricSelect);

        const orderSelect = document.createElement('select');
        orderSelect.className = 'form-select form-select-sm';
        orderSelect.innerHTML = '<option value="desc">Descending ⬇️</option><option value="asc">Ascending ⬆️</option>';
        orderSelect.value = (criterion && criterion.order === 'asc') ? 'asc' : 'desc';
        orderSelect.addEventListener('change', () => {
            if (criterion) criterion.order = orderSelect.value;
        });
        row.appendChild(orderSelect);

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'btn btn-sm btn-outline-light';
        upBtn.textContent = '⬆️';
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', () => {
            if (index === 0) return;
            const tmp = advancedSortDraft.criteria[index - 1];
            advancedSortDraft.criteria[index - 1] = advancedSortDraft.criteria[index];
            advancedSortDraft.criteria[index] = tmp;
            renderAdvancedSortRows();
        });
        row.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'btn btn-sm btn-outline-light';
        downBtn.textContent = '⬇️';
        downBtn.disabled = index === advancedSortDraft.criteria.length - 1;
        downBtn.addEventListener('click', () => {
            if (index >= advancedSortDraft.criteria.length - 1) return;
            const tmp = advancedSortDraft.criteria[index + 1];
            advancedSortDraft.criteria[index + 1] = advancedSortDraft.criteria[index];
            advancedSortDraft.criteria[index] = tmp;
            renderAdvancedSortRows();
        });
        row.appendChild(downBtn);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-sm btn-outline-danger';
        removeBtn.textContent = '🗑';
        removeBtn.addEventListener('click', () => {
            advancedSortDraft.criteria.splice(index, 1);
            if (!advancedSortDraft.criteria.length) {
                advancedSortDraft.criteria.push({ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() });
            }
            renderAdvancedSortRows();
        });
        row.appendChild(removeBtn);

        return row;
    }

    function renderAdvancedSortRows() {
        if (!advancedSortCriteriaContainer) return;
        ensureAdvancedSortDraft();
        advancedSortCriteriaContainer.innerHTML = '';
        advancedSortDraft.criteria = advancedSortDraft.criteria.slice(0, MAX_ADV_SORT_CRITERIA);
        advancedSortDraft.criteria.forEach((criterion, index) => {
            advancedSortCriteriaContainer.appendChild(buildAdvancedSortRow(criterion, index));
        });
        if (!advancedSortDraft.criteria.length) {
            const empty = document.createElement('div');
            empty.className = 'text-white-50 small';
            empty.textContent = 'Belum ada kriteria. Tambahkan minimal satu untuk mengaktifkan advanced sort.';
            advancedSortCriteriaContainer.appendChild(empty);
        }
    }

    function resetAdvancedSortState() {
        advancedSortState = defaultAdvancedSortState();
        advancedSortDraft = null;
        updateAdvancedSortStatusUI();
    }

    function quickSort(criteria) {
        resetAdvancedSortState();
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) sortSelect.value = criteria;
        if (typeof window.scheduleUpdateTable === 'function') window.scheduleUpdateTable();
        try {
            if (typeof showAlertBanner === 'function') {
                showAlertBanner('Sorted!', `Table sorted by ${criteria.replace('_', ' ').toUpperCase()}`, 'info', 1500);
            }
        } catch (e) {
            console.log('Alert banner failed', e);
        }
    }

    // ===================== Initialization =====================
    function initAdvancedSort() {
        // Cache DOM refs
        sortBySelect = document.getElementById('sortBy');
        sortOrderRadios = document.getElementsByName('sortOrder');
        advancedSortModalEl = document.getElementById('advancedSortModal');
        advancedSortCriteriaContainer = document.getElementById('advancedSortCriteria');
        advancedSortStatus = document.getElementById('advancedSortStatus');
        advancedSortHint = document.getElementById('advancedSortHint');
        addAdvancedSortRowBtn = document.getElementById('addAdvancedSortRow');
        clearAdvancedSortBtn = document.getElementById('clearAdvancedSort');
        applyAdvancedSortBtn = document.getElementById('applyAdvancedSort');
        disableAdvancedSortBtn = document.getElementById('disableAdvancedSort');

        advFilterFlowToggle = document.getElementById('advFilterFlowToggle');
        advFilterFlowControls = document.getElementById('advFilterFlowControls');
        advFilterFlowMetric = document.getElementById('advFilterFlowMetric');
        advFilterFlowComparator = document.getElementById('advFilterFlowComparator');
        advFilterFlowValue = document.getElementById('advFilterFlowValue');

        advFilterDurToggle = document.getElementById('advFilterDurToggle');
        advFilterDurControls = document.getElementById('advFilterDurControls');
        advFilterDurMetric = document.getElementById('advFilterDurMetric');
        advFilterDurComparator = document.getElementById('advFilterDurComparator');
        advFilterDurValue = document.getElementById('advFilterDurValue');

        advFilterPriceToggle = document.getElementById('advFilterPriceToggle');
        advFilterPriceControls = document.getElementById('advFilterPriceControls');
        advFilterPriceMin = document.getElementById('advFilterPriceMin');
        advFilterPriceMax = document.getElementById('advFilterPriceMax');

        // Event listeners for modal
        if (advancedSortModalEl) {
            advancedSortModalEl.addEventListener('show.bs.modal', () => {
                advancedSortDraft = cloneState(advancedSortState);
                if (!advancedSortDraft.criteria || !advancedSortDraft.criteria.length) {
                    advancedSortDraft.criteria = [{ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() }];
                }
                if (!advancedSortDraft.filters) advancedSortDraft.filters = { flow: null, durability: null, priceWindow: null };
                renderAdvancedSortRows();
                hydrateAdvancedFilterControlsFromDraft();
            });
            advancedSortModalEl.addEventListener('hidden.bs.modal', () => {
                advancedSortDraft = null;
            });
        }

        if (addAdvancedSortRowBtn) {
            addAdvancedSortRowBtn.addEventListener('click', () => {
                ensureAdvancedSortDraft();
                if (advancedSortDraft.criteria.length >= MAX_ADV_SORT_CRITERIA) {
                    try { if (typeof showAlertBanner === 'function') showAlertBanner('Limit reached', 'Maksimal 5 kriteria sort.', 'warning', 2000); } catch (e) { }
                    return;
                }
                advancedSortDraft.criteria.push({ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() });
                renderAdvancedSortRows();
            });
        }

        if (clearAdvancedSortBtn) {
            clearAdvancedSortBtn.addEventListener('click', () => {
                advancedSortDraft = defaultAdvancedSortState();
                advancedSortDraft.criteria = [{ metric: sortBySelect ? sortBySelect.value : 'vol_ratio', order: getSortOrderValue() }];
                renderAdvancedSortRows();
                hydrateAdvancedFilterControlsFromDraft();
            });
        }

        if (applyAdvancedSortBtn) {
            applyAdvancedSortBtn.addEventListener('click', () => {
                ensureAdvancedSortDraft();
                const sanitizedCriteria = (advancedSortDraft.criteria || [])
                    .filter((c) => c && c.metric)
                    .slice(0, MAX_ADV_SORT_CRITERIA)
                    .map((c) => ({ metric: c.metric, order: c.order === 'asc' ? 'asc' : 'desc' }));
                const filters = buildFiltersFromInputs();
                advancedSortState.criteria = sanitizedCriteria;
                advancedSortState.filters = filters;
                advancedSortState.enabled = Boolean(sanitizedCriteria.length) || Boolean(filters.flow || filters.durability || filters.priceWindow);
                updateAdvancedSortStatusUI();
                if (typeof window.scheduleUpdateTable === 'function') window.scheduleUpdateTable();
                try {
                    const modalInstance = bootstrap.Modal.getInstance(advancedSortModalEl);
                    if (modalInstance) modalInstance.hide();
                } catch (e) { }
            });
        }

        if (disableAdvancedSortBtn) {
            disableAdvancedSortBtn.addEventListener('click', () => {
                resetAdvancedSortState();
                if (typeof window.scheduleUpdateTable === 'function') window.scheduleUpdateTable();
            });
        }

        // Filter toggles
        if (advFilterFlowToggle) advFilterFlowToggle.addEventListener('change', syncAdvancedFilterVisibility);
        if (advFilterDurToggle) advFilterDurToggle.addEventListener('change', syncAdvancedFilterVisibility);
        if (advFilterPriceToggle) advFilterPriceToggle.addEventListener('change', syncAdvancedFilterVisibility);

        syncAdvancedFilterVisibility();
        updateAdvancedSortStatusUI();
    }

    // ===================== Exports =====================
    window.advancedSortState = advancedSortState;
    window.getAdvancedSortState = function () { return advancedSortState; };
    window.resetAdvancedSortState = resetAdvancedSortState;
    window.quickSort = quickSort;
    window.initAdvancedSort = initAdvancedSort;
    window.MAX_ADV_SORT_CRITERIA = MAX_ADV_SORT_CRITERIA;
})();
