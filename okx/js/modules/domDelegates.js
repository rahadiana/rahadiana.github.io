// Centralized DOM delegations for safe event handling
// Installs a document-level click handler for elements with `data-coin`
// to avoid inline onclick attributes and centralize guard checks.
(function install() {
    if (typeof document === 'undefined') return;
    if (document.__bb_delegates_installed) return;
    document.__bb_delegates_installed = true;

    document.addEventListener('click', function (e) {
        try {
            const el = e.target.closest && e.target.closest('[data-coin]');
            if (el) {
                const coin = el.getAttribute('data-coin');
                if (!coin) return;
                if (typeof window !== 'undefined' && window.app && typeof window.app.selectCoin === 'function') {
                    try { window.app.selectCoin(coin); } catch (err) { console.error('selectCoin handler', err); }
                }
            }
        } catch (err) { console.error('domDelegates click handler', err); }
    }, { capture: false });
})();

export default {};
