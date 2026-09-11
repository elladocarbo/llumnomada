const app = document.getElementById('app');
let CATEGORIES = [];

// ---------- API helper ----------
async function api(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'content-type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    location.hash = '#/login';
    throw new Error('unauthorized');
  }
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const err = new Error(data?.error || `error_${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Converts a stored UTC ISO string to the local "YYYY-MM-DDTHH:mm" a datetime-local input expects.
function toLocalDatetimeValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Shell ----------
function shell(activeHash, bodyHtml) {
  const nav = [
    ['#/posts', 'Articles'],
    ['#/posts/new', 'Nou article'],
    ['#/settings', 'Ajustos'],
    ['#/stats', 'Lectors'],
  ];
  app.innerHTML = `
    <div class="topbar">
      <span class="brand">Llum Nòmada · Panel</span>
      <nav>
        ${nav.map(([h, l]) => `<a href="${h}" class="${activeHash === h ? 'active' : ''}">${l}</a>`).join('')}
        <button class="logout" id="logoutBtn">Tanca sessió</button>
      </nav>
    </div>
    <div class="wrap wide">${bodyHtml}</div>
  `;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/logout', { method: 'POST' });
    location.hash = '#/login';
  });
}

// ---------- Router ----------
async function router() {
  const hash = location.hash || '#/posts';

  if (hash === '#/login') return renderLogin();

  try {
    const me = await api('/me');
    void me;
  } catch {
    return; // api() already redirected to #/login
  }

  try {
    const settings = await api('/settings');
    CATEGORIES = settings.categories || [];
  } catch { /* non-fatal */ }

  if (hash === '#/posts') return renderPostList();
  if (hash === '#/posts/new') return renderEditor(null);
  const editMatch = hash.match(/^#\/posts\/([^/]+)\/edit$/);
  if (editMatch) return renderEditor(editMatch[1]);
  if (hash === '#/settings') return renderSettings();
  if (hash === '#/stats') return renderStats();

  location.hash = '#/posts';
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// ---------- Login ----------
function renderLogin() {
  app.innerHTML = `
  <div class="login-shell">
    <div class="login-box">
      <h1>Llum Nòmada</h1>
      <p class="hint" style="margin-top:-0.5em">Panel de publicació</p>
      <div id="loginError"></div>
      <form id="loginForm">
        <label for="u">Usuari</label>
        <input type="text" id="u" autocomplete="username" required>
        <label for="p">Contrasenya</label>
        <input type="password" id="p" autocomplete="current-password" required>
        <button type="submit" style="width:100%">Entra</button>
      </form>
    </div>
  </div>`;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('loginError');
    errBox.innerHTML = '';
    const u = document.getElementById('u').value.trim();
    const p = document.getElementById('p').value;
    try {
      await api('/login', { method: 'POST', body: { u, p } });
      location.hash = '#/posts';
    } catch (err) {
      if (err.status === 429) {
        const min = Math.ceil((err.data?.retryAfterMs || 0) / 60000);
        errBox.innerHTML = `<div class="error">Massa intents fallits. Torna-ho a provar d'aquí a ${min} minut${min === 1 ? '' : 's'}.</div>`;
      } else {
        errBox.innerHTML = `<div class="error">Usuari o contrasenya incorrectes.</div>`;
      }
    }
  });
}

// ---------- Post list ----------
function statusPill(post) {
  if (post.status === 'draft' && post.scheduledAt && new Date(post.scheduledAt).getTime() > Date.now()) {
    return `<span class="pill pill-scheduled">Programat</span>`;
  }
  return post.status === 'published'
    ? `<span class="pill pill-published">Publicat</span>`
    : `<span class="pill pill-draft">Esborrany</span>`;
}

async function renderPostList() {
  shell('#/posts', `<h1>Articles</h1><div id="listBody">Carregant…</div>`);
  const posts = await api('/posts');
  const body = document.getElementById('listBody');

  if (!posts.length) {
    body.innerHTML = `<div class="card">Encara no hi ha cap article. <a href="#/posts/new">Crea el primer</a>.</div>`;
    return;
  }

  body.innerHTML = `<div class="card"><table>
    <thead><tr><th>Títol</th><th>Estat</th><th>Data</th><th></th></tr></thead>
    <tbody>${posts
      .map(
        (p) => `<tr>
        <td>${escapeHtml(p.title || '(sense títol)')}</td>
        <td>${statusPill(p)}</td>
        <td>${p.date ? new Date(p.date).toLocaleDateString('ca-ES') : ''}</td>
        <td class="row-actions">
          <button class="secondary" data-edit="${p.id}">Edita</button>
          <button class="danger" data-del="${p.id}">Esborra</button>
        </td>
      </tr>`,
      )
      .join('')}</tbody>
  </table></div>`;

  body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { location.hash = `#/posts/${b.dataset.edit}/edit`; }));
  body.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Segur que vols esborrar aquest article? No es pot desfer.')) return;
      await api(`/posts/${b.dataset.del}`, { method: 'DELETE' });
      renderPostList();
    }),
  );
}

// ---------- Editor ----------
function blockHtml(block) {
  const label = { p: 'Paràgraf', h3: 'Subtítol', q: 'Cita' }[block.t] || 'Paràgraf';
  return `<div class="block" data-t="${block.t}">
    <div class="block-head">
      <span>${label}</span>
      <div class="row-actions">
        <button type="button" class="secondary" data-move="up">↑</button>
        <button type="button" class="secondary" data-move="down">↓</button>
        <button type="button" class="danger" data-remove>Elimina</button>
      </div>
    </div>
    <div class="block-body" contenteditable="true" data-t="${block.t}">${block.h || ''}</div>
    <div class="toolbar">
      <button type="button" data-wrap="strong"><strong>N</strong></button>
      <button type="button" data-wrap="em"><em>C</em></button>
    </div>
  </div>`;
}

function wrapSelection(container, tag) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer) || range.collapsed) return;
  const wrapper = document.createElement(tag);
  try {
    range.surroundContents(wrapper);
  } catch {
    const content = range.extractContents();
    wrapper.appendChild(content);
    range.insertNode(wrapper);
  }
}

function wireBlockEditable(bodyEl) {
  bodyEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  });
  bodyEl.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  });
}

function wireBlockCard(cardEl, blocksList) {
  const bodyEl = cardEl.querySelector('.block-body');
  wireBlockEditable(bodyEl);
  cardEl.querySelectorAll('[data-wrap]').forEach((btn) =>
    btn.addEventListener('click', () => { bodyEl.focus(); wrapSelection(bodyEl, btn.dataset.wrap); }),
  );
  cardEl.querySelector('[data-remove]').addEventListener('click', () => {
    cardEl.remove();
  });
  cardEl.querySelectorAll('[data-move]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const dir = btn.dataset.move;
      if (dir === 'up' && cardEl.previousElementSibling) cardEl.parentElement.insertBefore(cardEl, cardEl.previousElementSibling);
      if (dir === 'down' && cardEl.nextElementSibling) cardEl.parentElement.insertBefore(cardEl.nextElementSibling, cardEl);
    }),
  );
  void blocksList;
}

async function renderEditor(id) {
  const existing = id ? await api(`/posts/${id}`) : null;
  const post = existing || {
    id: null, title: '', lead: '', blocks: [], cover: '', categories: [], refs: [], location: '', status: 'draft', scheduledAt: null, date: null,
  };

  shell(id ? '#/posts' : '#/posts/new', `
    <h1>${id ? 'Edita article' : 'Nou article'}</h1>
    <div id="editorError"></div>
    <div class="card">
      <label for="fTitle">Títol</label>
      <input type="text" id="fTitle" value="${escapeHtml(post.title)}">

      <label>Portada</label>
      <img class="cover-preview" id="coverPreview" src="${post.cover || '/images/hero-home.svg'}" alt="">
      <input type="file" id="coverInput" accept="image/*">
      <p class="hint" id="coverHint"></p>

      <label for="fLocation">Ubicació (opcional)</label>
      <input type="text" id="fLocation" value="${escapeHtml(post.location || '')}" placeholder="p. ex. Lisboa, Portugal">

      <label>Categories</label>
      <div class="checkbox-grid" id="catGrid">
        ${CATEGORIES.map(
          (c) => `<label><input type="checkbox" value="${escapeHtml(c)}" ${post.categories?.includes(c) ? 'checked' : ''}> ${escapeHtml(c)}</label>`,
        ).join('')}
      </div>

      <label for="fLead">Text d'entrada (lead)</label>
      <div class="block" style="margin-bottom:1em">
        <div class="block-body" id="fLead" contenteditable="true">${post.lead || ''}</div>
        <div class="toolbar">
          <button type="button" data-wrap="strong"><strong>N</strong></button>
          <button type="button" data-wrap="em"><em>C</em></button>
        </div>
      </div>
    </div>

    <h2>Cos de l'article</h2>
    <div id="blocksList"></div>
    <div class="row" style="margin-bottom:1.5em">
      <button type="button" class="secondary" data-add="p">+ Paràgraf</button>
      <button type="button" class="secondary" data-add="h3">+ Subtítol</button>
      <button type="button" class="secondary" data-add="q">+ Cita</button>
    </div>

    <h2>Referències (opcional)</h2>
    <ul class="refs-list" id="refsList"></ul>
    <button type="button" class="secondary" id="addRef">+ Referència</button>

    <h2>Publicació</h2>
    <div class="card">
      <div class="row" style="margin-bottom:1em">
        <label style="margin:0"><input type="radio" name="status" value="draft" ${post.status !== 'published' ? 'checked' : ''}> Esborrany</label>
        <label style="margin:0"><input type="radio" name="status" value="published" ${post.status === 'published' ? 'checked' : ''}> Publicat</label>
      </div>
      <label for="fSchedule">Programar publicació (opcional)</label>
      <input type="datetime-local" id="fSchedule" value="${toLocalDatetimeValue(post.scheduledAt)}">
      <p class="hint">Si ho omples i deixes l'estat en "Esborrany", l'article es publicarà sol quan arribi aquesta data i hora.</p>

      <div class="row">
        <button type="button" id="saveBtn">Desa</button>
        <button type="button" class="secondary" id="previewBtn">Vista prèvia</button>
        ${id ? '<button type="button" class="danger" id="deleteBtn">Esborra</button>' : ''}
      </div>
    </div>
  `);

  // Lead toolbar
  const leadEl = document.getElementById('fLead');
  wireBlockEditable(leadEl);
  document.querySelectorAll('.card [data-wrap]').forEach((btn) => {
    if (btn.closest('.block-body') || btn.closest('#blocksList')) return;
    btn.addEventListener('click', () => { leadEl.focus(); wrapSelection(leadEl, btn.dataset.wrap); });
  });

  // Blocks
  const blocksListEl = document.getElementById('blocksList');
  function addBlock(t, h = '') {
    const card = el(blockHtml({ t, h }));
    blocksListEl.appendChild(card);
    wireBlockCard(card, blocksListEl);
  }
  (post.blocks || []).forEach((b) => addBlock(b.t, b.h));
  document.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => addBlock(btn.dataset.add)));

  // Refs
  const refsListEl = document.getElementById('refsList');
  function addRef(value = '') {
    const li = el(`<li><input type="text" value="${escapeHtml(value)}" placeholder="Referència"><button type="button" class="danger" data-rm>×</button></li>`);
    li.querySelector('[data-rm]').addEventListener('click', () => li.remove());
    refsListEl.appendChild(li);
  }
  (post.refs || []).forEach((r) => addRef(r));
  document.getElementById('addRef').addEventListener('click', () => addRef());

  // Cover upload
  document.getElementById('coverInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const hint = document.getElementById('coverHint');
    hint.textContent = 'Pujant imatge…';
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/images', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      document.getElementById('coverPreview').src = data.url;
      document.getElementById('coverPreview').dataset.url = data.url;
      hint.textContent = 'Imatge pujada.';
    } catch {
      hint.textContent = "No s'ha pogut pujar la imatge (comprova que sigui una imatge de menys de 8 MB).";
    }
  });

  function collectPayload() {
    const blocks = [...blocksListEl.querySelectorAll('.block')].map((card) => ({
      t: card.dataset.t,
      h: card.querySelector('.block-body').innerHTML,
    }));
    const refs = [...refsListEl.querySelectorAll('input')].map((i) => i.value.trim()).filter(Boolean);
    const categories = [...document.querySelectorAll('#catGrid input:checked')].map((i) => i.value);
    const status = document.querySelector('input[name=status]:checked').value;
    const scheduleVal = document.getElementById('fSchedule').value;

    return {
      id: post.id,
      title: document.getElementById('fTitle').value.trim(),
      lead: leadEl.innerHTML,
      blocks,
      refs,
      categories,
      location: document.getElementById('fLocation').value.trim(),
      cover: document.getElementById('coverPreview').dataset.url || post.cover || '',
      status,
      scheduledAt: scheduleVal ? new Date(scheduleVal).toISOString() : null,
      date: post.date,
    };
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const errBox = document.getElementById('editorError');
    errBox.innerHTML = '';
    const payload = collectPayload();
    if (!payload.title) {
      errBox.innerHTML = `<div class="error">Cal un títol abans de desar.</div>`;
      return;
    }
    try {
      const saved = await api('/posts', { method: 'POST', body: payload });
      location.hash = `#/posts/${saved.id}/edit`;
      renderEditor(saved.id);
    } catch {
      errBox.innerHTML = `<div class="error">No s'ha pogut desar l'article. Torna-ho a provar.</div>`;
    }
  });

  document.getElementById('previewBtn').addEventListener('click', async () => {
    const payload = collectPayload();
    const res = await fetch('/api/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const html = await res.text();
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  });

  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Segur que vols esborrar aquest article?')) return;
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      location.hash = '#/posts';
    });
  }
}

// ---------- Settings ----------
async function renderSettings() {
  const settings = await api('/settings');
  shell('#/settings', `
    <h1>Ajustos</h1>
    <div id="settingsError"></div>
    <div class="card">
      <label for="fInstagram">Instagram</label>
      <input type="text" id="fInstagram" value="${escapeHtml(settings.instagram || '')}" placeholder="@usuari">

      <label>Foto de perfil</label>
      <img class="cover-preview" id="portraitPreview" src="${settings.portrait || '/images/hero-about.svg'}" alt="">
      <input type="file" id="portraitInput" accept="image/*">

      <label style="margin-top:1em" for="fCategories">Categories (una per línia)</label>
      <textarea id="fCategories" rows="8">${(settings.categories || []).join('\n')}</textarea>

      <button type="button" id="saveSettings">Desa ajustos</button>
    </div>
  `);

  document.getElementById('portraitInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/images', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('portraitPreview').src = data.url;
      document.getElementById('portraitPreview').dataset.url = data.url;
    }
  });

  document.getElementById('saveSettings').addEventListener('click', async () => {
    const errBox = document.getElementById('settingsError');
    errBox.innerHTML = '';
    const categories = document.getElementById('fCategories').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const portraitEl = document.getElementById('portraitPreview');
    try {
      await api('/settings', {
        method: 'POST',
        body: {
          instagram: document.getElementById('fInstagram').value.trim(),
          portrait: portraitEl.dataset.url || settings.portrait || '',
          categories,
        },
      });
      errBox.innerHTML = `<div class="hint">Ajustos desats.</div>`;
    } catch {
      errBox.innerHTML = `<div class="error">No s'han pogut desar els ajustos.</div>`;
    }
  });
}

// ---------- Stats ----------
async function renderStats() {
  shell('#/stats', `<h1>Lectors</h1><div id="statsBody">Carregant…</div>`);
  const stats = await api('/stats?days=30');
  const max = Math.max(1, ...stats.map((s) => s.views));
  document.getElementById('statsBody').innerHTML = `<div class="card">
    <p class="hint">Visites dels últims 30 dies (comptador propi, sense galetes).</p>
    ${stats
      .map(
        (s) => `<div class="stat-bar-row">
        <span class="day">${s.day.slice(5)}</span>
        <span class="stat-bar-track"><span class="stat-bar-fill" style="width:${(s.views / max) * 100}%"></span></span>
        <span class="val">${s.views} visites</span>
      </div>`,
      )
      .join('')}
  </div>`;
}
