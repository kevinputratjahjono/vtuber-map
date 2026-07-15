// ============================================================
//  messages.js  —  Floating Message System
//  Rotates viewer messages as floating chat bubbles
// ============================================================

const MessagesModule = (() => {

  const COLORS = ['', 'pink', 'purple']; // '' = cyan (default)
  const GENDER_EMOJI = { male: '💙', female: '💛', default: '💬' };
  const MAX_VISIBLE = 4;
  const DISPLAY_MS  = 4200;
  const INTERVAL_MS = 2800;

  let messages   = [];
  let queue      = [];
  let container  = null;
  let timer      = null;
  let visible    = [];

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function refillQueue() {
    queue = shuffle(messages);
  }

  function nextMessage() {
    if (queue.length === 0) refillQueue();
    return queue.pop();
  }

  function createBubble(msg) {
    const colorClass = COLORS[Math.floor(Math.random() * COLORS.length)];
    const genderKey  = (msg.gender || '').toLowerCase();
    const emoji      = GENDER_EMOJI[genderKey] || GENDER_EMOJI.default;

    const el = document.createElement('div');
    el.className = `float-msg${colorClass ? ' ' + colorClass : ''}`;

    el.innerHTML = `
      <div class="float-msg-user">${emoji} ${msg.city || msg.province}</div>
      <div class="float-msg-text">${escapeHtml(msg.text)}</div>
      <div class="float-msg-loc">📍 ${msg.province}</div>
    `;

    return el;
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function showNext() {
    if (!container || messages.length === 0) return;

    const msg = nextMessage();
    if (!msg) return;

    const bubble = createBubble(msg);
    container.appendChild(bubble);
    visible.push(bubble);

    // Remove excess
    while (visible.length > MAX_VISIBLE) {
      const old = visible.shift();
      old.classList.add('fading');
      setTimeout(() => old.remove(), 400);
    }

    // Auto-remove after display time
    setTimeout(() => {
      if (bubble.parentNode) {
        bubble.classList.add('fading');
        setTimeout(() => { bubble.remove(); visible = visible.filter(b => b !== bubble); }, 400);
      }
    }, DISPLAY_MS);
  }

  /* ---- Public API ---- */
  function init(msgs, containerId) {
    messages  = msgs.filter(m => m.text && m.text.length > 0);
    container = document.getElementById(containerId);
    if (!container || messages.length === 0) return;
    refillQueue();

    // First message immediately
    showNext();

    // Then on interval
    timer = setInterval(showNext, INTERVAL_MS);
  }

  function destroy() {
    if (timer) { clearInterval(timer); timer = null; }
    if (container) container.innerHTML = '';
    visible = [];
  }

  function triggerProvinceMessages(provinceMessages) {
    // Temporarily inject province-specific messages with higher frequency
    if (!container || provinceMessages.length === 0) return;
    provinceMessages.slice(0, 3).forEach((msg, i) => {
      setTimeout(() => {
        const bubble = createBubble(msg);
        container.appendChild(bubble);
        visible.push(bubble);
        while (visible.length > MAX_VISIBLE) {
          const old = visible.shift();
          old.classList.add('fading');
          setTimeout(() => old.remove(), 400);
        }
        setTimeout(() => {
          if (bubble.parentNode) {
            bubble.classList.add('fading');
            setTimeout(() => { bubble.remove(); visible = visible.filter(b=>b!==bubble); }, 400);
          }
        }, DISPLAY_MS + 1000);
      }, i * 700);
    });
  }

  return { init, destroy, triggerProvinceMessages };

})();

window.MessagesModule = MessagesModule;
