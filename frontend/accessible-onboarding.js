/**
 * <accessible-onboarding> — drop-in Web Component (Shadow DOM, no deps).
 * Usage:  <script src="accessible-onboarding.js"></script>
 *         <accessible-onboarding api="/api/v1" lang="en"></accessible-onboarding>
 *
 * OWNERS: Frontend/A11y → render(), CSS, focus.  Offline/Voice/Amharic → I18N, speak(), dictate(), queue.
 * Design rules: one question per screen · NO timers/timeouts anywhere · every answer saved locally first.
 */
const I18N = {
  en: { next: 'Next', back: 'Back', listen: 'Read aloud', speak: 'Speak your answer', stop: 'Stop', done: 'All done. Thank you!',
    step: (n, t) => `Question ${n} of ${t}`, required: 'Please answer this question, or choose Skip.', skip: 'Skip',
    review: 'What we heard (you can edit it):', saved: 'Saved on this device.', noVoice: 'Voice is not available here. Please type.',
    resume: 'Get a code to continue later', code: 'Your code:', lang: 'አማርኛ', submit: 'Finish',
    q: { fullName: ['What is your name?', 'Say or type the name you want us to use.'],
      idRoute: ['Which ID can you use?', 'No ID? Choose the last option. A partner can help you.'],
      idNumber: ['What is the ID number?', 'You can skip this if you do not have it with you.'],
      partnerOrg: ['Which partner will help you?', 'For example AAAPD.'],
      support: ['What support helps you? (optional)', 'You do not need to tell us why. No papers needed.'],
      phone: ['What is your phone number?', 'We use it only to send your save-and-continue link.'] },
    ids: { kebele: 'Kebele ID', passport: 'Passport', refugee: 'Refugee ID', partner: 'Refer me through a partner' },
    sup: { screen_reader: 'Screen reader', large_text: 'Large text', sign_language: 'Sign language', step_free_access: 'Step-free access', extra_time: 'More time', read_to_me: 'Someone to read to me' } },
  am: { next: 'ቀጣይ', back: 'ተመለስ', listen: 'አንብብልኝ', speak: 'መልስዎን ይናገሩ', stop: 'አቁም', done: 'ጨርሰዋል። አመሰግናለሁ!',
    step: (n, t) => `ጥያቄ ${n} ከ${t}`, required: 'እባክዎ ጥያቄውን ይመልሱ ወይም ይዝለሉ።', skip: 'ዝለል',
    review: 'የሰማነው (ማስተካከል ይችላሉ)፦', saved: 'በዚህ መሣሪያ ላይ ተቀምጧል።', noVoice: 'እዚህ ድምፅ አይሰራም። እባክዎ ይጻፉ።',
    resume: 'በኋላ ለመቀጠል ኮድ ያግኙ', code: 'ኮድዎ፦', lang: 'English', submit: 'ጨርስ',
    q: { fullName: ['ስምዎ ማን ነው?', 'የሚፈልጉትን ስም ይናገሩ ወይም ይጻፉ።'],
      idRoute: ['የትኛውን መታወቂያ መጠቀም ይችላሉ?', 'መታወቂያ የለዎትም? የመጨረሻውን ይምረጡ። አጋር ሊረዳዎት ይችላል።'],
      idNumber: ['የመታወቂያ ቁጥሩ ስንት ነው?', 'ከሌለዎት መዝለል ይችላሉ።'],
      partnerOrg: ['የትኛው አጋር ይረዳዎታል?', 'ለምሳሌ AAAPD።'],
      support: ['ምን ድጋፍ ይረዳዎታል? (አማራጭ)', 'ምክንያቱን መናገር አያስፈልግም። ወረቀት አያስፈልግም።'],
      phone: ['ስልክ ቁጥርዎ ስንት ነው?', 'የመቀጠያ አገናኝ ለመላክ ብቻ ነው።'] },
    ids: { kebele: 'የቀበሌ መታወቂያ', passport: 'ፓስፖርት', refugee: 'የስደተኛ መታወቂያ', partner: 'በአጋር በኩል ላስመዝግብ' },
    sup: { screen_reader: 'ስክሪን አንባቢ', large_text: 'ትልቅ ጽሑፍ', sign_language: 'የምልክት ቋንቋ', step_free_access: 'ደረጃ የሌለው መግቢያ', extra_time: 'ተጨማሪ ጊዜ', read_to_me: 'የሚያነብልኝ ሰው' } },
};
const SPEECH_LANG = { en: 'en-US', am: 'am-ET' }; // am-ET TTS/STT depends on device; falls back to typing

// Step config. `when` makes a step conditional (state machine guard). Add steps here.
const STEPS = [
  { id: 'fullName', type: 'text', icon: '🙂', required: true, autocomplete: 'name' },
  { id: 'idRoute', type: 'radio', icon: '🪪', options: ['kebele', 'passport', 'refugee', 'partner'], i18nOpts: 'ids', required: true },
  { id: 'idNumber', type: 'text', icon: '🔢', when: a => ['kebele', 'passport', 'refugee'].includes(a.idRoute) },
  { id: 'partnerOrg', type: 'text', icon: '🤝', when: a => a.idRoute === 'partner' },
  { id: 'support', type: 'checks', icon: '🔒', options: ['screen_reader', 'large_text', 'sign_language', 'step_free_access', 'extra_time', 'read_to_me'], i18nOpts: 'sup' },
  { id: 'phone', type: 'tel', icon: '📱', autocomplete: 'tel' },
];

class AccessibleOnboarding extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  #s = { lang: 'en', i: 0, answers: {}, sessionId: null, done: false, rec: null, heard: '' };
  get #api() { return this.getAttribute('api') || '/api/v1'; }
  get #t() { return I18N[this.#s.lang]; }
  get #visible() { return STEPS.filter(st => !st.when || st.when(this.#s.answers)); }

  async connectedCallback() {
    this.#s.lang = this.getAttribute('lang') || localStorage.getItem('ao:lang') || 'en';
    const saved = JSON.parse(localStorage.getItem('ao:state') || 'null'); // offline-first: local is source of truth
    if (saved) Object.assign(this.#s, { answers: saved.answers, i: saved.i, sessionId: saved.sessionId });
    this.#render(true);
    this.addEventListener('keydown', e => { if (e.key === 'Escape') this.#stopDictation(); });
    window.addEventListener('online', () => this.#flush());
    await this.#ensureSession(); this.#flush();
  }

  // ---------- persistence / offline queue (no timeouts: nothing expires) ----------
  #persist() { localStorage.setItem('ao:state', JSON.stringify({ answers: this.#s.answers, i: this.#s.i, sessionId: this.#s.sessionId })); }
  async #ensureSession() {
    if (this.#s.sessionId) return;
    try { const r = await fetch(`${this.#api}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: this.#s.lang }) });
      this.#s.sessionId = (await r.json()).id; this.#persist(); } catch { /* offline: retry in #flush */ }
  }
  #queue(stepId, value) { const q = JSON.parse(localStorage.getItem('ao:queue') || '[]'); q.push({ stepId, value }); localStorage.setItem('ao:queue', JSON.stringify(q)); }
  async #flush() {
    await this.#ensureSession(); if (!this.#s.sessionId) return;
    let q = JSON.parse(localStorage.getItem('ao:queue') || '[]');
    while (q.length) { const { stepId, value } = q[0];
      try { await fetch(`${this.#api}/sessions/${this.#s.sessionId}/steps/${stepId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) }); }
      catch { break; } q.shift(); localStorage.setItem('ao:queue', JSON.stringify(q)); }
  }

  // ---------- state machine ----------
  #value() { const st = this.#visible[this.#s.i]; const sh = this.#root;
    if (st.type === 'radio') return sh.querySelector('input:checked')?.value ?? '';
    if (st.type === 'checks') return [...sh.querySelectorAll('input:checked')].map(x => x.value);
    return sh.querySelector('#field').value.trim(); }
  #go(delta, skip = false) {
    const vis = this.#visible, st = vis[this.#s.i];
    if (delta > 0) { const v = skip ? '' : this.#value();
      if (st.required && !v) return this.#error(this.#t.required);
      this.#s.answers[st.id] = v; this.#queue(st.id, v); this.#flush(); }
    this.#stopDictation();
    const n = this.#s.i + delta;
    if (n >= this.#visible.length) return this.#finish();
    this.#s.i = Math.max(0, n); this.#persist(); this.#render(true);
  }
  async #finish() {
    this.#s.done = true; localStorage.removeItem('ao:state'); await this.#flush();
    try { await fetch(`${this.#api}/sessions/${this.#s.sessionId}/complete`, { method: 'POST' }); } catch {}
    this.#render(true);
  }
  #error(msg) { const e = this.#root.querySelector('#err'); e.textContent = msg; this.#root.querySelector('#field, input')?.focus(); }
  #announce(msg) { const l = this.#root.querySelector('#live'); if (l) { l.textContent = ''; setTimeout(() => (l.textContent = msg), 50); } } // short delay only to re-trigger SR

  // ---------- voice: TTS ----------
  #speak(text) {
    if (!('speechSynthesis' in window)) return this.#announce(this.#t.noVoice);
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = SPEECH_LANG[this.#s.lang]; speechSynthesis.speak(u);
  }
  // ---------- voice: dictation with review/edit (never auto-submits) ----------
  #dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return this.#announce(this.#t.noVoice); // fallback = keyboard. TODO(voice): optional offline Vosk-WASM
    const rec = this.#s.rec = new SR(); rec.lang = SPEECH_LANG[this.#s.lang]; rec.interimResults = false;
    rec.onresult = e => { const text = [...e.results].map(r => r[0].transcript).join(' ');
      const f = this.#root.querySelector('#field'); if (f) { f.value = text; f.focus(); }
      const rv = this.#root.querySelector('#heard'); rv.hidden = false; this.#announce(`${this.#t.review} ${text}`); };
    rec.onerror = () => this.#announce(this.#t.noVoice);
    rec.start(); this.#announce(this.#t.speak);
  }
  #stopDictation() { try { this.#s.rec?.stop(); } catch {} speechSynthesis?.cancel?.(); }

  // ---------- render ----------
  #render(focus = false) {
    const t = this.#t, vis = this.#visible, st = vis[this.#s.i], sh = this.#root, a = this.#s.answers;
    if (this.#s.done) { sh.innerHTML = `${this.#css()}<div class="card" lang="${this.#s.lang}"><h2 id="h" tabindex="-1">${t.done}</h2></div><div id="live" class="sr" role="status" aria-live="polite"></div>`;
      sh.querySelector('#h').focus(); return; }
    const [label, hint] = t.q[st.id], cur = a[st.id];
    let control;
    if (st.type === 'radio') control = `<fieldset><legend id="lbl">${label}</legend><p id="hint">${hint}</p>${st.options.map(o =>
      `<label class="opt"><input type="radio" name="r" value="${o}" ${cur === o ? 'checked' : ''}> ${t[st.i18nOpts][o]}</label>`).join('')}</fieldset>`;
    else if (st.type === 'checks') control = `<fieldset><legend id="lbl">${label}</legend><p id="hint">${hint}</p>${st.options.map(o =>
      `<label class="opt"><input type="checkbox" value="${o}" ${(cur || []).includes(o) ? 'checked' : ''}> ${t[st.i18nOpts][o]}</label>`).join('')}</fieldset>`;
    else control = `<label id="lbl" for="field">${label}</label><p id="hint">${hint}</p>
      <input id="field" type="${st.type}" ${st.type === 'tel' ? 'inputmode="tel"' : ''} autocomplete="${st.autocomplete || 'off'}" aria-describedby="hint err" value="${(cur || '').toString().replace(/"/g, '&quot;')}">
      <div id="heard" hidden><span>${t.review}</span></div>`;
    sh.innerHTML = `${this.#css()}
      <section class="card" lang="${this.#s.lang}" aria-labelledby="h">
        <div class="top"><span id="prog">${t.step(this.#s.i + 1, vis.length)}</span>
          <button type="button" id="lang" lang="${this.#s.lang === 'en' ? 'am' : 'en'}">${t.lang}</button></div>
        <h2 id="h" tabindex="-1"><span aria-hidden="true">${st.icon}</span> <span class="sr">${t.step(this.#s.i + 1, vis.length)}</span></h2>
        <div class="q">${control}</div>
        <p id="err" role="alert" class="err"></p>
        <div class="tools">
          <button type="button" id="tts">🔊 ${t.listen}</button>
          ${['text', 'tel'].includes(st.type) ? `<button type="button" id="mic">🎤 ${t.speak}</button>` : ''}
        </div>
        <div class="nav">
          ${this.#s.i > 0 ? `<button type="button" id="back">${t.back}</button>` : ''}
          ${!st.required ? `<button type="button" id="skip">${t.skip}</button>` : ''}
          <button type="button" id="next" class="primary">${this.#s.i === vis.length - 1 ? t.submit : t.next}</button>
        </div>
        <p class="small">${t.saved} <button type="button" id="resume" class="link">${t.resume}</button> <span id="code"></span></p>
      </section><div id="live" class="sr" role="status" aria-live="polite"></div>`;
    const $ = s => sh.querySelector(s);
    $('#next').onclick = () => this.#go(1); $('#back')?.addEventListener('click', () => this.#go(-1));
    $('#skip')?.addEventListener('click', () => this.#go(1, true));
    $('#tts').onclick = () => this.#speak(`${label}. ${hint}`); $('#mic')?.addEventListener('click', () => this.#dictate());
    $('#lang').onclick = () => { this.#s.lang = this.#s.lang === 'en' ? 'am' : 'en'; localStorage.setItem('ao:lang', this.#s.lang); this.#render(true); };
    $('#resume').onclick = async () => { try { const r = await (await fetch(`${this.#api}/sessions/${this.#s.sessionId}/resume-token`, { method: 'POST' })).json();
      $('#code').textContent = `${this.#t.code} ${r.token}`; this.#announce(`${this.#t.code} ${r.token}`); } catch { this.#announce(this.#t.noVoice); } };
    sh.querySelector('#field')?.addEventListener('keydown', e => { if (e.key === 'Enter') this.#go(1); });
    if (focus) { $('#h').focus(); this.#announce(`${t.step(this.#s.i + 1, vis.length)}. ${label}`); }
  }
  #css() { return `<style>
    :host{display:block;font:1.125rem/1.5 system-ui,"Noto Sans Ethiopic",sans-serif;color:#111}
    .card{max-width:36rem;margin:auto;padding:1.5rem;background:#fff;border:2px solid #111;border-radius:.75rem}
    .top{display:flex;justify-content:space-between;align-items:center}
    h2{font-size:2rem;margin:.5rem 0} h2:focus{outline:3px solid #0b5fff;outline-offset:2px}
    label#lbl,legend{font-size:1.4rem;font-weight:700;display:block;margin-bottom:.25rem} fieldset{border:0;padding:0;margin:0}
    #hint{color:#333;margin:.25rem 0 1rem} input[type=text],input[type=tel],input:not([type]){width:100%;box-sizing:border-box;font:inherit;padding:.75rem;border:2px solid #111;border-radius:.5rem}
    .opt{display:flex;gap:.75rem;align-items:center;padding:.75rem;border:2px solid #767676;border-radius:.5rem;margin:.5rem 0;min-height:44px}
    .opt input{width:1.5rem;height:1.5rem}
    button{font:inherit;min-height:44px;min-width:44px;padding:.5rem 1rem;border:2px solid #111;border-radius:.5rem;background:#fff;color:#111;cursor:pointer}
    button.primary{background:#0b3d91;color:#fff;border-color:#0b3d91} .link{border:0;background:none;color:#0b3d91;text-decoration:underline}
    .tools,.nav{display:flex;gap:.75rem;flex-wrap:wrap;margin:1rem 0} .err{color:#b00020;font-weight:700;min-height:1.5rem}
    .small{font-size:1rem;color:#333} #heard{margin-top:.5rem;color:#333}
    :focus-visible{outline:3px solid #0b5fff;outline-offset:2px}
    .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
    @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style>`; }
}
customElements.define('accessible-onboarding', AccessibleOnboarding);
