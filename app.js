/* =========================================================
   IPING CELL - app.js
   Versi lengkap:
   - Menampilkan provider, masa aktif, dan daftar paket
   - Detail paket + WhatsApp
   - Login Admin Supabase
   - Edit NAMA PAKET, HARGA, dan MASA AKTIF
   - Tambah paket
   - Hapus paket
   - Search paket
   - Tidak memakai tombol "Simpan Semua"
   ========================================================= */

const sb = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

let providers = [];
let packages = [];
let selectedProvider = "axis";
let selectedDuration = "5 HARI";
let adminUser = null;

const $ = (selector) => document.querySelector(selector);

const money = (value) =>
  "Rp " + Number(value || 0).toLocaleString("id-ID");

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const durationOrder = [
  "1 HARI",
  "2 HARI",
  "3 HARI",
  "5 HARI",
  "7 HARI",
  "14 HARI",
  "28 HARI"
];

/* =========================
   TOAST
   ========================= */
function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(window.__ipingToastTimer);
  window.__ipingToastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

/* =========================
   LOAD DATA
   ========================= */
async function loadData() {
  const providerResult = await sb
    .from("providers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (providerResult.error) {
    showToast("Gagal membaca provider: " + providerResult.error.message);
    return;
  }

  const packageResult = await sb
    .from("packages")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (packageResult.error) {
    showToast("Gagal membaca paket: " + packageResult.error.message);
    return;
  }

  providers = providerResult.data || [];
  packages = packageResult.data || [];

  if (!providers.some((item) => item.id === selectedProvider)) {
    selectedProvider = providers[0]?.id || "";
  }

  render();
}

/* =========================
   PUBLIC PAGE
   ========================= */
function render() {
  const providerList = $("#providerList");
  if (!providerList) return;

  providerList.innerHTML = providers
    .map((provider) => `
      <button
        type="button"
        class="provider ${provider.id === selectedProvider ? "active" : ""}"
        data-provider="${esc(provider.id)}"
      >
        <span
          class="dot"
          style="background:${esc(provider.color || "#22d3ee")}"
        ></span>
        ${esc(provider.name)}
      </button>
    `)
    .join("");

  const availableDurations = [
    ...new Set(
      packages
        .filter((item) => item.provider_id === selectedProvider)
        .map((item) => item.duration)
        .filter(Boolean)
    )
  ].sort((a, b) => {
    const ai = durationOrder.indexOf(a);
    const bi = durationOrder.indexOf(b);

    if (ai === -1 && bi === -1) {
      return String(a).localeCompare(String(b));
    }

    if (ai === -1) return 1;
    if (bi === -1) return -1;

    return ai - bi;
  });

  if (!availableDurations.includes(selectedDuration)) {
    selectedDuration = availableDurations[0] || "";
  }

  const durationList = $("#durationList");
  if (durationList) {
    durationList.innerHTML = availableDurations
      .map((duration) => `
        <button
          type="button"
          class="duration ${duration === selectedDuration ? "active" : ""}"
          data-duration="${esc(duration)}"
        >
          ${esc(duration)}
        </button>
      `)
      .join("");
  }

  const provider = providers.find(
    (item) => item.id === selectedProvider
  );

  const heroKicker = $("#heroKicker");
  const heroTitle = $("#heroTitle");
  const heroText = $("#heroText");

  if (heroKicker) {
    heroKicker.textContent =
      provider?.promo_kicker || "PROMO IPING CELL";
  }

  if (heroTitle) {
    heroTitle.textContent =
      provider?.promo_title ||
      `${provider?.name || "Paket"} Hemat`;
  }

  if (heroText) {
    heroText.textContent =
      provider?.promo_price ||
      "Pilih paket sesuai kebutuhan Anda.";
  }

  const list = packages
    .filter(
      (item) =>
        item.provider_id === selectedProvider &&
        item.duration === selectedDuration
    )
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0));

  const packageGrid = $("#packageGrid");

  if (packageGrid) {
    packageGrid.innerHTML = list
      .map((item) => `
        <article
          class="package"
          data-package="${esc(item.id)}"
        >
          <div class="pkg-name">${esc(item.name)}</div>

          <div class="pkg-price">
            ${money(item.price)}
          </div>

          <span class="pkg-tag">
            ${esc(item.tag || "Internet")}
          </span>

          <div class="pkg-foot">
            ⏱ ${esc(item.duration)} • Klik untuk detail
          </div>
        </article>
      `)
      .join("");
  }

  const emptyState = $("#emptyState");
  if (emptyState) {
    emptyState.hidden = list.length > 0;
  }
}

/* =========================
   DETAIL PACKAGE
   ========================= */
function openDetail(id) {
  const item = packages.find(
    (packageItem) => String(packageItem.id) === String(id)
  );

  if (!item) return;

  const provider = providers.find(
    (providerItem) => providerItem.id === item.provider_id
  );

  const phone = "6285875177710";

  const message = encodeURIComponent(
    `Halo IPING CELL, saya ingin membeli ${item.name} - ${money(item.price)} (${item.duration}).`
  );

  const whatsappUrl =
    `https://wa.me/${phone}?text=${message}`;

  const detailContent = $("#detailContent");
  if (!detailContent) return;

  detailContent.innerHTML = `
    <h2>${esc(item.name)}</h2>

    <p class="pkg-price">
      ${money(item.price)}
    </p>

    <p class="muted">
      Provider: ${esc(provider?.name || "")}<br>
      Masa aktif: ${esc(item.duration)}<br>
      Keterangan: ${esc(item.tag || "Internet")}
    </p>

    <a
      class="primary-btn"
      style="display:inline-block;text-decoration:none"
      href="${whatsappUrl}"
      target="_blank"
      rel="noopener"
    >
      PESAN VIA WHATSAPP
    </a>
  `;

  const detailModal = $("#detailModal");
  if (detailModal) {
    detailModal.hidden = false;
  }
}

/* =========================
   MODAL CLOSE
   ========================= */
document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close]");

  if (closeButton) {
    const modal = closeButton.closest(".modal");
    if (modal) modal.hidden = true;
    return;
  }

  if (event.target.classList.contains("modal")) {
    event.target.hidden = true;
    return;
  }

  const providerButton =
    event.target.closest("[data-provider]");

  if (providerButton) {
    selectedProvider = providerButton.dataset.provider;
    render();
    return;
  }

  const durationButton =
    event.target.closest("[data-duration]");

  if (durationButton) {
    selectedDuration = durationButton.dataset.duration;
    render();
    return;
  }

  const packageCard =
    event.target.closest("[data-package]");

  if (packageCard) {
    openDetail(packageCard.dataset.package);
  }
});

/* =========================
   REFRESH
   ========================= */
const refreshButton = $("#refreshBtn");

if (refreshButton) {
  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;

    try {
      await loadData();
      showToast("Data berhasil diperbarui");
    } finally {
      refreshButton.disabled = false;
    }
  });
}

/* =========================
   THEME
   ========================= */
const themeButton = $("#themeBtn");

if (themeButton) {
  themeButton.addEventListener("click", () => {
    document.body.classList.toggle("light");
  });
}

/* =========================
   ADMIN OPEN
   ========================= */
const adminButton = $("#adminBtn");

if (adminButton) {
  adminButton.addEventListener("click", () => {
    const adminModal = $("#adminModal");
    if (!adminModal) return;

    adminModal.hidden = false;

    if (adminUser) {
      renderAdmin();
    }
  });
}

/* =========================
   LOGIN ADMIN
   ========================= */
const loginForm = $("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("#loginEmail")?.value.trim();
    const password = $("#loginPassword")?.value || "";
    const loginMessage = $("#loginMsg");

    if (!email || !password) {
      if (loginMessage) {
        loginMessage.textContent =
          "Email dan password wajib diisi.";
      }
      return;
    }

    if (loginMessage) {
      loginMessage.textContent = "Sedang login...";
    }

    const result = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) {
      if (loginMessage) {
        loginMessage.textContent = result.error.message;
      }
      return;
    }

    adminUser = result.data.user;

    await renderAdmin();
  });
}

/* =========================
   RENDER ADMIN
   ========================= */
async function renderAdmin() {
  const adminContent = $("#adminContent");
  if (!adminContent) return;

  const result = await sb
    .from("packages")
    .select("*")
    .order("provider_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (result.error) {
    showToast("Gagal membaca paket admin: " + result.error.message);
    return;
  }

  packages = result.data || [];

  adminContent.innerHTML = `
    <h2>Admin IPING CELL</h2>

    <div class="admin-toolbar">
      <button
        type="button"
        id="addPkg"
        class="primary-btn"
      >
        + Tambah Paket
      </button>

      <button
        type="button"
        id="logout"
        class="outline-btn"
      >
        Logout
      </button>
    </div>

    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin:15px 0
      "
    >
      <select
        id="adminProvider"
        class="admin-filter"
      >
        ${providers
          .map(
            (provider) => `
              <option
                value="${esc(provider.id)}"
                ${provider.id === selectedProvider ? "selected" : ""}
              >
                ${esc(provider.name)}
              </option>
            `
          )
          .join("")}
      </select>

      <input
        id="adminSearch"
        class="admin-filter"
        type="search"
        placeholder="🔍 Cari paket..."
        autocomplete="off"
      >
    </div>

    <div id="adminRows"></div>

    <div id="adminMsg" class="msg"></div>
  `;

  const providerSelect = $("#adminProvider");
  const searchInput = $("#adminSearch");
  const addButton = $("#addPkg");
  const logoutButton = $("#logout");

  if (providerSelect) {
    providerSelect.addEventListener("change", () => {
      selectedProvider = providerSelect.value;
      drawAdminRows();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      drawAdminRows();
    });
  }

  if (addButton) {
    addButton.addEventListener("click", () => {
      drawAdminRows(true);
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const result = await sb.auth.signOut();

      if (result.error) {
        showToast(result.error.message);
        return;
      }

      adminUser = null;

      const adminModal = $("#adminModal");
      if (adminModal) {
        adminModal.hidden = true;
      }

      showToast("Logout berhasil");
    });
  }

  drawAdminRows();
}

/* =========================
   DRAW ADMIN ROWS
   ========================= */
function drawAdminRows(addNew = false) {
  const rowsContainer = $("#adminRows");
  if (!rowsContainer) return;

  const provider =
    $("#adminProvider")?.value || selectedProvider;

  const search =
    ($("#adminSearch")?.value || "")
      .toLowerCase()
      .trim();

  let data = packages.filter(
    (item) => item.provider_id === provider
  );

  if (search) {
    data = data.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(search)
    );
  }

  if (addNew) {
    data.unshift({
      id: null,
      provider_id: provider,
      duration: selectedDuration || "5 HARI",
      name: "",
      price: 0,
      tag: "Internet",
      active: true,
      sort_order: 999999,
      __new: true
    });
  }

  if (!data.length) {
    rowsContainer.innerHTML = `
      <div
        style="
          padding:25px;
          text-align:center;
          opacity:.7
        "
      >
        Tidak ada paket.
      </div>
    `;
    return;
  }

  rowsContainer.innerHTML = data
    .map((item) => {
      const isNew = Boolean(item.__new);

      return `
        <div
          class="admin-row"
          data-admin-row="${isNew ? "new" : esc(item.id)}"
          style="
            padding:18px 0;
            border-bottom:1px solid rgba(255,255,255,.12);
          "
        >
          <div class="iping-admin-fields">

            <label>
              Nama Paket

              <input
                type="text"
                data-field="name"
                value="${esc(item.name)}"
                placeholder="Contoh: AXIS 10GB"
              >
            </label>

            <label>
              Harga

              <input
                type="number"
                min="0"
                step="1000"
                data-field="price"
                value="${Number(item.price || 0)}"
                placeholder="15000"
              >
            </label>

            <label>
              Masa Aktif

              <select data-field="duration">
                ${durationOrder
                  .map(
                    (duration) => `
                      <option
                        value="${esc(duration)}"
                        ${duration === item.duration ? "selected" : ""}
                      >
                        ${esc(duration)}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </label>

            <div
              style="
                display:flex;
                gap:8px;
                align-items:end;
                flex-wrap:wrap;
              "
            >
              <button
                type="button"
                class="primary-btn"
                data-action="save"
                data-id="${isNew ? "new" : esc(item.id)}"
              >
                💾 Simpan
              </button>

              <button
                type="button"
                class="danger-btn"
                data-action="delete"
                data-id="${isNew ? "new" : esc(item.id)}"
              >
                🗑 Hapus
              </button>
            </div>

          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   ADMIN SAVE / DELETE
   ========================= */
const adminRowsContainer = $("#adminRows");

document.addEventListener("click", async (event) => {
  const actionButton =
    event.target.closest("[data-action]");

  if (!actionButton) return;

  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;

  const row = actionButton.closest(".admin-row");
  if (!row) return;

  if (action === "save") {
    await saveAdminRow(row, id);
    return;
  }

  if (action === "delete") {
    await deleteAdminRow(row, id);
  }
});

/* =========================
   SAVE ONE PACKAGE
   ========================= */
async function saveAdminRow(row, id) {
  const nameInput = row.querySelector(
    '[data-field="name"]'
  );

  const priceInput = row.querySelector(
    '[data-field="price"]'
  );

  const durationInput = row.querySelector(
    '[data-field="duration"]'
  );

  const name = nameInput?.value.trim() || "";
  const price = Number(priceInput?.value || 0);
  const duration =
    durationInput?.value || "5 HARI";

  if (!name) {
    showToast("Nama paket belum diisi");
    nameInput?.focus();
    return;
  }

  if (!price || price < 0) {
    showToast("Harga harus lebih dari 0");
    priceInput?.focus();
    return;
  }

  const providerId =
    $("#adminProvider")?.value || selectedProvider;

  const saveButton =
    row.querySelector('[data-action="save"]');

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Menyimpan...";
  }

  let result;

  try {
    if (id === "new") {
      const payload = {
        provider_id: providerId,
        duration,
        name,
        price,
        tag: "Internet",
        active: true,
        sort_order: 999999
      };

      result = await sb
        .from("packages")
        .insert(payload);
    } else {
      result = await sb
        .from("packages")
        .update({
          name,
          price,
          duration
        })
        .eq("id", id);
    }
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "💾 Simpan";
    }
  }

  if (result.error) {
    showToast(
      "Gagal menyimpan: " + result.error.message
    );
    return;
  }

  showToast(
    id === "new"
      ? "Paket berhasil ditambahkan"
      : "Paket berhasil diperbarui"
  );

  await renderAdmin();
  await loadData();
}

/* =========================
   DELETE ONE PACKAGE
   ========================= */
async function deleteAdminRow(row, id) {
  if (id === "new") {
    drawAdminRows();
    return;
  }

  const name =
    row.querySelector('[data-field="name"]')?.value ||
    "paket ini";

  const confirmed = confirm(
    `Hapus ${name}?`
  );

  if (!confirmed) return;

  const deleteButton =
    row.querySelector('[data-action="delete"]');

  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.textContent = "Menghapus...";
  }

  const result = await sb
    .from("packages")
    .delete()
    .eq("id", id);

  if (result.error) {
    showToast(
      "Gagal menghapus: " + result.error.message
    );

    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.textContent = "🗑 Hapus";
    }

    return;
  }

  showToast("Paket berhasil dihapus");

  await renderAdmin();
  await loadData();
}

/* =========================
   AUTH SESSION
   ========================= */
async function checkSession() {
  const result = await sb.auth.getSession();

  if (result.error) return;

  adminUser = result.data.session?.user || null;
}

/* =========================
   RESPONSIVE ADMIN
   ========================= */
function installResponsiveAdminStyle() {
  if (document.getElementById("ipingResponsiveAdminStyle")) return;

  const style = document.createElement("style");
  style.id = "ipingResponsiveAdminStyle";
  style.textContent = `
    .iping-admin-fields {
      display: grid;
      grid-template-columns:
        minmax(180px, 1.4fr)
        minmax(120px, .7fr)
        minmax(140px, .8fr)
        auto;
      gap: 10px;
      align-items: end;
      width: 100%;
      box-sizing: border-box;
    }

    .iping-admin-fields label {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .iping-admin-fields input,
    .iping-admin-fields select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    @media (max-width: 700px) {
      .iping-admin-fields {
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .iping-admin-fields label:first-child {
        grid-column: 1 / -1;
      }

      .iping-admin-fields > div {
        grid-column: 1 / -1;
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 10px !important;
        width: 100%;
      }

      .iping-admin-fields > div button {
        width: 100%;
        min-width: 0;
      }
    }

    @media (max-width: 430px) {
      .iping-admin-fields {
        grid-template-columns: 1fr;
      }

      .iping-admin-fields label:first-child {
        grid-column: auto;
      }
    }

    #adminRows {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .admin-row {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);
}

/* =========================
   START APPLICATION
   ========================= */
(async function init() {
  try {
    installResponsiveAdminStyle();
    await checkSession();
    await loadData();
  } catch (error) {
    console.error(error);
    showToast("Terjadi kesalahan saat memuat aplikasi");
  }
})();
