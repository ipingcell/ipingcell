/* IPING CELL - app.js
   Full admin + public package filtering.
   Requires config.js to expose SUPABASE_URL and SUPABASE_ANON_KEY.
*/

const sb = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

let providers = [];
let packages = [];
let selectedProvider = "";
let selectedDuration = "";
let adminUser = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

const money = (v) => "Rp " + Number(v || 0).toLocaleString("id-ID");

const durationOrder = [
  "1 HARI","2 HARI","3 HARI","5 HARI","7 HARI","14 HARI","28 HARI"
];

function showToast(message) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.hidden = true, 2500);
}

async function loadData() {
  const p = await sb.from("providers").select("*").order("sort_order", {ascending:true});
  if (p.error) { showToast(p.error.message); return; }

  const q = await sb.from("packages").select("*").order("sort_order", {ascending:true});
  if (q.error) { showToast(q.error.message); return; }

  providers = p.data || [];
  packages = q.data || [];

  if (!selectedProvider || !providers.some(x => x.id === selectedProvider)) {
    selectedProvider = providers[0]?.id || "";
  }

  const durations = getDurations(selectedProvider);
  if (!durations.includes(selectedDuration)) selectedDuration = durations[0] || "";

  renderPublic();
}

function getDurations(providerId) {
  return [...new Set(
    packages
      .filter(x => x.active !== false && x.provider_id === providerId)
      .map(x => x.duration)
      .filter(Boolean)
  )].sort((a,b) => {
    const ai = durationOrder.indexOf(a), bi = durationOrder.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}

function renderPublic() {
  const providerList = $("#providerList");
  if (providerList) {
    providerList.innerHTML = providers.map(p => `
      <button type="button"
        class="provider ${p.id === selectedProvider ? "active" : ""}"
        data-provider="${esc(p.id)}">
        <span class="dot" style="background:${esc(p.color || "#0097ff")}"></span>
        ${esc(p.name)}
      </button>
    `).join("");
  }

  const durations = getDurations(selectedProvider);
  const durationList = $("#durationList");
  if (durationList) {
    durationList.innerHTML = durations.map(d => `
      <button type="button"
        class="duration ${d === selectedDuration ? "active" : ""}"
        data-duration="${esc(d)}">${esc(d)}</button>
    `).join("");
  }

  const list = packages
    .filter(x => x.active !== false &&
      x.provider_id === selectedProvider &&
      x.duration === selectedDuration)
    .sort((a,b) => Number(a.price||0) - Number(b.price||0));

  const grid = $("#packageGrid");
  if (grid) {
    grid.innerHTML = list.map(x => `
      <article class="package" data-package="${esc(x.id)}">
        <div class="pkg-name">${esc(x.name)}</div>
        <div class="pkg-price">${money(x.price)}</div>
        <span class="pkg-tag">${esc(x.tag || "Internet")}</span>
        <div class="pkg-foot">⏱ ${esc(x.duration)} • Klik untuk detail</div>
      </article>
    `).join("");
  }

  const empty = $("#emptyState");
  if (empty) empty.hidden = list.length > 0;
}

function openDetail(id) {
  const item = packages.find(x => String(x.id) === String(id));
  if (!item) return;

  const provider = providers.find(x => x.id === item.provider_id);
  const msg = encodeURIComponent(
    `Halo IPING CELL, saya ingin membeli ${item.name} - ${money(item.price)} (${item.duration}).`
  );

  const box = $("#detailContent");
  if (!box) return;

  box.innerHTML = `
    <h2>${esc(item.name)}</h2>
    <p class="pkg-price">${money(item.price)}</p>
    <p class="muted">
      Provider: ${esc(provider?.name || "")}<br>
      Masa aktif: ${esc(item.duration)}<br>
      ${esc(item.tag || "Internet")}
    </p>
    <a class="primary-btn" target="_blank" rel="noopener"
       href="https://wa.me/6285875177710?text=${msg}">
       PESAN VIA WHATSAPP
    </a>
  `;

  const modal = $("#detailModal");
  if (modal) modal.hidden = false;
}

/* ---------- Public events ---------- */
document.addEventListener("click", e => {
  const close = e.target.closest("[data-close]");
  if (close) {
    const modal = close.closest(".modal");
    if (modal) modal.hidden = true;
    return;
  }

  if (e.target.classList.contains("modal")) {
    e.target.hidden = true;
    return;
  }

  const p = e.target.closest("[data-provider]");
  if (p) {
    selectedProvider = p.dataset.provider;
    const d = getDurations(selectedProvider);
    selectedDuration = d[0] || "";
    renderPublic();
    return;
  }

  const d = e.target.closest("[data-duration]");
  if (d) {
    selectedDuration = d.dataset.duration;
    renderPublic();
    return;
  }

  const card = e.target.closest("[data-package]");
  if (card) openDetail(card.dataset.package);
});

$("#refreshBtn")?.addEventListener("click", async () => {
  const b = $("#refreshBtn");
  if (b) b.disabled = true;
  try {
    await loadData();
    showToast("Data berhasil diperbarui");
  } finally {
    if (b) b.disabled = false;
  }
});

$("#themeBtn")?.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

/* ---------- Admin login/open ---------- */
$("#adminBtn")?.addEventListener("click", async () => {
  const modal = $("#adminModal");
  if (modal) modal.hidden = false;
  if (adminUser) renderAdmin();
});

$("#loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#loginEmail")?.value.trim();
  const password = $("#loginPassword")?.value || "";
  const msg = $("#loginMsg");

  if (!email || !password) {
    if (msg) msg.textContent = "Email dan password wajib diisi.";
    return;
  }

  if (msg) msg.textContent = "Sedang login...";

  const r = await sb.auth.signInWithPassword({email, password});
  if (r.error) {
    if (msg) msg.textContent = r.error.message;
    return;
  }

  adminUser = r.data.user;
  await renderAdmin();
});

async function renderAdmin() {
  const content = $("#adminContent");
  if (!content) return;

  const r = await sb.from("packages")
    .select("*")
    .order("provider_id", {ascending:true})
    .order("sort_order", {ascending:true});

  if (r.error) {
    showToast(r.error.message);
    return;
  }

  packages = r.data || [];

  content.innerHTML = `
    <h2>Admin IPING CELL</h2>

    <div class="admin-toolbar">
      <button type="button" id="addPkg" class="primary-btn">+ Tambah Paket</button>
      <button type="button" id="logout" class="outline-btn">Logout</button>
    </div>

    <div class="admin-filters" style="display:flex;gap:8px;flex-wrap:wrap;margin:15px 0">
      <select id="adminProvider" class="admin-filter">
        ${providers.map(p => `
          <option value="${esc(p.id)}" ${p.id === selectedProvider ? "selected" : ""}>
            ${esc(p.name)}
          </option>
        `).join("")}
      </select>

      <select id="adminDuration" class="admin-filter">
        <option value="">Semua Masa Aktif</option>
        ${durationOrder.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join("")}
      </select>

      <input id="adminSearch" class="admin-filter"
        type="search" placeholder="🔍 Cari paket..." autocomplete="off">
    </div>

    <div id="adminRows"></div>
    <div id="adminMsg" class="msg"></div>
  `;

  $("#adminProvider")?.addEventListener("change", () => {
    selectedProvider = $("#adminProvider").value;
    renderAdminRows();
  });

  $("#adminDuration")?.addEventListener("change", renderAdminRows);
  $("#adminSearch")?.addEventListener("input", renderAdminRows);

  $("#addPkg")?.addEventListener("click", () => renderAdminRows(true));

  $("#logout")?.addEventListener("click", async () => {
    const r = await sb.auth.signOut();
    if (r.error) return showToast(r.error.message);
    adminUser = null;
    $("#adminModal").hidden = true;
    showToast("Logout berhasil");
  });

  renderAdminRows();
}

function renderAdminRows(addNew = false) {
  const box = $("#adminRows");
  if (!box) return;

  const provider = $("#adminProvider")?.value || selectedProvider;
  const duration = $("#adminDuration")?.value || "";
  const search = ($("#adminSearch")?.value || "").toLowerCase().trim();

  let data = packages.filter(x => x.provider_id === provider);

  if (duration) data = data.filter(x => x.duration === duration);
  if (search) data = data.filter(x =>
    String(x.name || "").toLowerCase().includes(search)
  );

  if (addNew) {
    data.unshift({
      id: null,
      provider_id: provider,
      duration: duration || selectedDuration || "5 HARI",
      name: "",
      price: 0,
      tag: "Internet",
      active: true,
      __new: true
    });
  }

  if (!data.length) {
    box.innerHTML = `<div style="padding:25px;text-align:center;opacity:.7">Tidak ada paket.</div>`;
    return;
  }

  box.innerHTML = data.map(x => {
    const isNew = !x.id;
    return `
      <div class="admin-row" data-admin-row="${isNew ? "new" : esc(x.id)}"
        style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.12)">

        <div class="admin-package-info"
          style="display:grid;grid-template-columns:minmax(180px,1.4fr) minmax(110px,.8fr) minmax(130px,.8fr) auto;gap:8px;align-items:end">

          <label>
            Nama Paket
            <input type="text" data-field="name"
              value="${esc(x.name)}" placeholder="Nama paket">
          </label>

          <label>
            Harga
            <input type="number" min="0" step="1000"
              inputmode="numeric" data-field="price"
              value="${Number(x.price || 0)}" placeholder="15000">
          </label>

          <label>
            Masa Aktif
            <select data-field="duration">
              ${durationOrder.map(d => `
                <option value="${esc(d)}" ${d === x.duration ? "selected" : ""}>
                  ${esc(d)}
                </option>
              `).join("")}
            </select>
          </label>

          <div class="admin-actions" style="display:flex;gap:8px">
            <button type="button" class="primary-btn"
              data-action="save" data-id="${isNew ? "new" : esc(x.id)}">
              💾 Simpan
            </button>

            <button type="button" class="danger-btn"
              data-action="delete" data-id="${isNew ? "new" : esc(x.id)}">
              🗑 Hapus
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

document.addEventListener("click", async e => {
  const button = e.target.closest("[data-action]");
  if (!button) return;

  const row = button.closest(".admin-row");
  if (!row) return;

  if (button.dataset.action === "save") {
    await saveAdminRow(row, button.dataset.id);
  }

  if (button.dataset.action === "delete") {
    await deleteAdminRow(row, button.dataset.id);
  }
});

async function saveAdminRow(row, id) {
  const name = row.querySelector('[data-field="name"]')?.value.trim() || "";
  const price = Number(row.querySelector('[data-field="price"]')?.value || 0);
  const duration = row.querySelector('[data-field="duration"]')?.value || "";

  if (!name) return showToast("Nama paket belum diisi");
  if (price <= 0) return showToast("Harga harus lebih dari 0");
  if (!duration) return showToast("Masa aktif belum dipilih");

  const button = row.querySelector('[data-action="save"]');
  if (button) {
    button.disabled = true;
    button.textContent = "Menyimpan...";
  }

  let r;

  if (id === "new") {
    r = await sb.from("packages").insert({
      provider_id: $("#adminProvider")?.value || selectedProvider,
      name,
      price,
      duration,
      tag: "Internet",
      active: true,
      sort_order: 999999
    });
  } else {
    r = await sb.from("packages").update({
      name,
      price,
      duration
    }).eq("id", id);
  }

  if (r.error) {
    if (button) {
      button.disabled = false;
      button.textContent = "💾 Simpan";
    }
    showToast("Gagal menyimpan: " + r.error.message);
    return;
  }

  showToast(id === "new" ? "Paket berhasil ditambahkan" : "Paket berhasil disimpan");
  await renderAdmin();
  await loadData();
}

async function deleteAdminRow(row, id) {
  if (id === "new") {
    renderAdminRows();
    return;
  }

  const name = row.querySelector('[data-field="name"]')?.value || "paket ini";
  if (!confirm(`Hapus ${name}?`)) return;

  const r = await sb.from("packages").delete().eq("id", id);

  if (r.error) {
    showToast("Gagal menghapus: " + r.error.message);
    return;
  }

  showToast("Paket berhasil dihapus");
  await renderAdmin();
  await loadData();
}

async function init() {
  const session = await sb.auth.getSession();
  if (!session.error) adminUser = session.data.session?.user || null;
  await loadData();
}

init().catch(err => {
  console.error(err);
  showToast("Gagal memuat aplikasi");
});
