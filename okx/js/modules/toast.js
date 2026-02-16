export function showToast(message, type = 'info', title = '') {
  try {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    if (title) t.innerHTML = `<div class="title">${title}</div><div class="msg">${message}</div>`;
    else t.innerHTML = `<div class="msg">${message}</div>`;
    container.appendChild(t);
    // force reflow for animation
    requestAnimationFrame(() => t.classList.add('show'));
    const timeout = (type === 'error' || type === 'warning') ? 6000 : 3500;
    const id = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => { try { container.removeChild(t); } catch (e) { } }, 220);
    }, timeout);
    // clickable to dismiss
    t.addEventListener('click', () => { clearTimeout(id); t.classList.remove('show'); setTimeout(() => { try { container.removeChild(t); } catch (e) { } }, 220); });
  } catch (e) {
    console.error('toast error', e);
  }
}
