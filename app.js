import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const STORAGE_KEY = "brisa_menu_data_v3";
const ADMIN_PASS = "brisa2026";
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app";
const MENU_DOC_PATH = ["artifacts", appId, "public", "data", "menu_store", "main"];

const refs = {
  searchInput: document.getElementById("searchInput"),
  menuList: document.getElementById("menuList"),
  catNav: document.getElementById("catNav"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalContent: document.getElementById("modalContent"),
  toast: document.getElementById("toast"),
  toastMsg: document.getElementById("toastMsg"),
  connStatus: document.getElementById("connStatus"),
  connStatusText: document.getElementById("connStatusText"),
  logoBtn: document.getElementById("logoBtn"),
  adminFab: document.getElementById("adminFab"),
  importFileInput: document.getElementById("importFileInput")
};

let app = null;
let db = null;
let auth = null;
let currentUser = null;
let data = { categories: [] };
let isAdmin = false;
let activeCategoryId = "";
let saveDebounce = null;
let searchDebounce = null;

function uid(prefix) {
  return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || uid("id");
}

function maybeFixEncoding(value) {
  if (typeof value !== "string") return value;
  if (!/[ÃÂâ�]/.test(value)) return value;
  try {
    return decodeURIComponent(escape(value));
  } catch (_e) {
    return value;
  }
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.formatCurrency = function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};

function normalizeMenu(rawMenu) {
  const input = rawMenu && typeof rawMenu === "object" ? rawMenu : {};
  const categoriesIn = Array.isArray(input.categories) ? input.categories : [];

  const categories = categoriesIn.map((cat, catIndex) => {
    const catName = maybeFixEncoding((cat && cat.name) || "Seção").trim() || "Seção";
    const catId = (cat && cat.id) || "cat_" + slugify(catName) + "_" + catIndex;
    const itemsIn = Array.isArray(cat && cat.items) ? cat.items : [];

    const items = itemsIn.map((item, itemIndex) => {
      const name = maybeFixEncoding((item && item.name) || "Item").trim() || "Item";
      const desc = maybeFixEncoding((item && item.desc) || "").trim();
      const image = String((item && item.image) || "").trim();
      const price = Number(item && item.price);
      const safePrice = Number.isFinite(price) ? price : 0;
      const id = (item && item.id) || "it_" + slugify(name) + "_" + itemIndex;

      return {
        id,
        name,
        price: Math.max(0, safePrice),
        desc,
        image
      };
    });

    return {
      id: catId,
      name: catName,
      items
    };
  });

  return { categories };
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeMenu(JSON.parse(raw));
  } catch (_e) {
    return null;
  }
}

async function loadFromJsonFile() {
  if (window.__preloaded_menu) return normalizeMenu(window.__preloaded_menu);

  const candidates = ["./menu_final_brisa.json", "./menu.json"];
  for (const path of candidates) {
    try {
      const res = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      return normalizeMenu(json);
    } catch (_e) {
      // try next
    }
  }
  return { categories: [] };
}

function setConnectionStatus(online) {
  if (!refs.connStatus || !refs.connStatusText) return;
  refs.connStatus.classList.toggle("online", online);
  refs.connStatusText.textContent = online ? "Online" : "Offline";
}

function showToast(message) {
  if (!refs.toast || !refs.toastMsg) return;
  refs.toastMsg.textContent = message || "Salvo";
  refs.toast.classList.add("show");
  window.setTimeout(() => refs.toast.classList.remove("show"), 2200);
}

window.closeModal = function closeModal() {
  refs.modalOverlay.classList.remove("active");
  refs.modalOverlay.setAttribute("aria-hidden", "true");
  refs.modalContent.innerHTML = "";
};

function openModal(contentHtml) {
  refs.modalContent.innerHTML = contentHtml;
  refs.modalOverlay.classList.add("active");
  refs.modalOverlay.setAttribute("aria-hidden", "false");
}

refs.modalOverlay.addEventListener("click", function onOverlayClick(event) {
  if (event.target === refs.modalOverlay) {
    window.closeModal();
  }
});

function scheduleSave(options) {
  clearTimeout(saveDebounce);
  saveDebounce = window.setTimeout(() => persistData(options), 240);
}

async function persistData(options) {
  data = normalizeMenu(data);
  saveLocal();
  renderMenu();

  if (!db) {
    showToast((options && options.toast) || "Alterações salvas localmente");
    return;
  }

  try {
    const ref = doc(db, ...MENU_DOC_PATH);
    await setDoc(ref, data);
    showToast((options && options.toast) || "Alterações salvas");
  } catch (error) {
    showToast("Falha no Firestore. Dados locais preservados.");
    console.error(error);
  }
}

function getImageCandidates(item) {
  const list = [];
  if (item.image) list.push(item.image);
  if (item.id) {
    list.push("./images/" + item.id + ".jpg");
    list.push("./images/" + item.id + ".png");
  }
  return list;
}

function setImageWithFallback(imgEl, item) {
  const list = getImageCandidates(item);
  if (list.length === 0) {
    imgEl.style.display = "none";
    return;
  }

  function tryAt(index) {
    if (index >= list.length) {
      imgEl.style.display = "none";
      return;
    }
    imgEl.src = list[index];
    imgEl.onerror = function onImgError() {
      tryAt(index + 1);
    };
    imgEl.onload = function onImgLoad() {
      imgEl.style.display = "block";
    };
  }

  tryAt(0);
}

function renderMenu() {
  if (!refs.menuList || !refs.catNav) return;

  const term = (refs.searchInput.value || "").trim().toLowerCase();
  refs.menuList.innerHTML = "";
  refs.catNav.innerHTML = "";
  const listFrag = document.createDocumentFragment();

  const categories = data.categories || [];
  let renderedSections = 0;

  categories.forEach((cat, idx) => {
    const filtered = (cat.items || []).filter((item) => {
      return (
        (item.name || "").toLowerCase().includes(term) ||
        (item.desc || "").toLowerCase().includes(term)
      );
    });

    if (filtered.length === 0) return;

    if (!activeCategoryId && idx === 0) {
      activeCategoryId = cat.id;
    }

    const nav = document.createElement("a");
    nav.href = "#" + cat.id;
    nav.className = "nav-pill" + (activeCategoryId === cat.id ? " active" : "");
    nav.textContent = cat.name;
    nav.addEventListener("click", function onNavClick(event) {
      event.preventDefault();
      activeCategoryId = cat.id;
      const target = document.getElementById(cat.id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".nav-pill").forEach((el) => el.classList.remove("active"));
      nav.classList.add("active");
    });
    refs.catNav.appendChild(nav);

    const section = document.createElement("section");
    section.className = "category-section";
    section.id = cat.id;

    const header = document.createElement("header");
    header.className = "cat-header";

    const titleWrap = document.createElement("div");
    titleWrap.innerHTML = "<h2 class=\"cat-title\">" + escapeHtml(cat.name) + "</h2>" +
      "<span class=\"cat-count\">" + filtered.length + " item(ns)</span>";
    header.appendChild(titleWrap);

    if (isAdmin) {
      const tools = document.createElement("div");
      tools.style.display = "flex";
      tools.style.gap = "8px";

      const renameBtn = document.createElement("button");
      renameBtn.className = "btn btn-outline";
      renameBtn.type = "button";
      renameBtn.textContent = "Renomear";
      renameBtn.addEventListener("click", function () {
        openCategoryRenameModal(cat.id);
      });

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.type = "button";
      delBtn.textContent = "Excluir Seção";
      delBtn.addEventListener("click", function () {
        deleteCategory(cat.id);
      });

      tools.appendChild(renameBtn);
      tools.appendChild(delBtn);
      header.appendChild(tools);
    }

    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "items-grid";

    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "item-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", item.name + ", " + window.formatCurrency(item.price));

      const imgWrap = document.createElement("div");
      imgWrap.className = "item-image-wrapper";
      const img = document.createElement("img");
      img.className = "item-image";
      img.alt = item.name;
      img.loading = "lazy";
      img.decoding = "async";
      img.fetchPriority = "low";
      setImageWithFallback(img, item);
      imgWrap.appendChild(img);

      const content = document.createElement("div");
      content.className = "item-content";
      const desc = item.desc ? "<p class=\"item-desc\">" + escapeHtml(item.desc) + "</p>" : "";
      content.innerHTML = "<div class=\"item-name\">" + escapeHtml(item.name) + "</div>" + desc;

      const bottom = document.createElement("div");
      bottom.className = "item-bottom";

      const priceTag = document.createElement("span");
      priceTag.className = "item-price";
      priceTag.textContent = window.formatCurrency(item.price);
      bottom.appendChild(priceTag);

      if (isAdmin) {
        const quickPrice = document.createElement("input");
        quickPrice.type = "number";
        quickPrice.className = "quick-price";
        quickPrice.step = "0.5";
        quickPrice.min = "0";
        quickPrice.value = Number(item.price || 0).toString();
        quickPrice.title = "Editar preço rápido";

        quickPrice.addEventListener("click", (ev) => ev.stopPropagation());
        quickPrice.addEventListener("change", (ev) => {
          ev.stopPropagation();
          const newVal = Number(quickPrice.value);
          if (!Number.isFinite(newVal) || newVal < 0) return;
          item.price = newVal;
          scheduleSave({ toast: "Preço atualizado" });
        });

        bottom.appendChild(quickPrice);
      }

      content.appendChild(bottom);

      const adminActions = document.createElement("div");
      adminActions.className = "card-admin-actions";
      if (isAdmin) {
        const editBtn = document.createElement("button");
        editBtn.className = "btn btn-outline";
        editBtn.type = "button";
        editBtn.textContent = "Editar";
        editBtn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openEditModal(cat.id, item.id);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "btn btn-danger";
        delBtn.type = "button";
        delBtn.textContent = "Remover";
        delBtn.addEventListener("click", function (ev) {
          ev.stopPropagation();
          deleteItem(cat.id, item.id);
        });

        adminActions.appendChild(editBtn);
        adminActions.appendChild(delBtn);
        content.appendChild(adminActions);
      }

      card.appendChild(imgWrap);
      card.appendChild(content);

      card.addEventListener("click", function () {
        openItemModal(item);
      });
      card.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openItemModal(item);
        }
      });

      grid.appendChild(card);
    });

    section.appendChild(grid);
    listFrag.appendChild(section);
    renderedSections += 1;
  });

  if (renderedSections === 0) {
    refs.menuList.innerHTML = "<div class=\"empty-state\">Nenhum item encontrado.</div>";
  } else {
    refs.menuList.appendChild(listFrag);
  }
}

function findCategory(catId) {
  return data.categories.find((cat) => cat.id === catId);
}

function findItem(cat, itemId) {
  if (!cat) return null;
  return cat.items.find((item) => item.id === itemId) || null;
}

function openItemModal(item) {
  const html = [
    "<div class=\"modal-header\">",
    "  <h3 id=\"modalTitle\" class=\"modal-title\">Detalhes do Produto</h3>",
    "  <button class=\"modal-close\" type=\"button\" onclick=\"closeModal()\">x</button>",
    "</div>",
    "<div class=\"modal-body\">",
    "  <img id=\"modalItemImage\" class=\"modal-image\" alt=\"Imagem do produto\">",
    "  <h2 style=\"margin:0 0 10px;font-family:var(--font-display);\">" + escapeHtml(item.name) + "</h2>",
    "  <p style=\"margin:0 0 12px;color:var(--text-muted);\">" + escapeHtml(item.desc || "Sem descrição adicional.") + "</p>",
    "  <div class=\"modal-price-big\">" + window.formatCurrency(item.price) + "</div>",
    "</div>",
    "<div class=\"modal-footer\">",
    "  <button class=\"btn btn-primary\" type=\"button\" onclick=\"closeModal()\">Fechar</button>",
    "</div>"
  ].join("\n");

  openModal(html);

  const img = document.getElementById("modalItemImage");
  if (img) setImageWithFallback(img, item);
}

function modalItemForm(title, categories, selectedCatId, item) {
  const catOptions = categories
    .map((cat) => "<option value=\"" + escapeHtml(cat.id) + "\"" + (cat.id === selectedCatId ? " selected" : "") + ">" + escapeHtml(cat.name) + "</option>")
    .join("");

  return [
    "<div class=\"modal-header\">",
    "  <h3 id=\"modalTitle\" class=\"modal-title\">" + escapeHtml(title) + "</h3>",
    "  <button class=\"modal-close\" type=\"button\" onclick=\"closeModal()\">x</button>",
    "</div>",
    "<div class=\"modal-body\">",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"frmCategory\">Seção</label>",
    "    <select id=\"frmCategory\" class=\"form-select\">" + catOptions + "</select>",
    "  </div>",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"frmName\">Nome do item</label>",
    "    <input id=\"frmName\" class=\"form-input\" type=\"text\" value=\"" + escapeHtml(item.name || "") + "\" placeholder=\"Ex: Gin Tônica\">",
    "  </div>",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"frmPrice\">Preço (R$)</label>",
    "    <input id=\"frmPrice\" class=\"form-input\" type=\"number\" min=\"0\" step=\"0.5\" value=\"" + escapeHtml(String(item.price ?? "")) + "\">",
    "  </div>",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"frmDesc\">Descrição</label>",
    "    <textarea id=\"frmDesc\" class=\"form-textarea\" rows=\"4\" placeholder=\"Ingredientes, observações...\">" + escapeHtml(item.desc || "") + "</textarea>",
    "  </div>",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"frmImage\">Imagem (opcional)</label>",
    "    <input id=\"frmImage\" class=\"form-input\" type=\"text\" value=\"" + escapeHtml(item.image || "") + "\" placeholder=\"images/nome.jpg\">",
    "  </div>",
    "</div>",
    "<div class=\"modal-footer\">",
    "  <button class=\"btn btn-outline\" type=\"button\" onclick=\"closeModal()\">Cancelar</button>",
    "  <button id=\"saveItemBtn\" class=\"btn btn-primary\" type=\"button\">Salvar</button>",
    "</div>"
  ].join("\n");
}

window.openEditModal = function openEditModal(catId, itemId) {
  const cat = findCategory(catId);
  if (!cat) return;
  const existing = findItem(cat, itemId);
  const item = existing
    ? { ...existing }
    : { name: "", price: "", desc: "", image: "" };

  openModal(modalItemForm(existing ? "Editar Item" : "Novo Item", data.categories, cat.id, item));

  const saveBtn = document.getElementById("saveItemBtn");
  saveBtn.addEventListener("click", async function () {
    const targetCatId = document.getElementById("frmCategory").value;
    const targetCat = findCategory(targetCatId);
    if (!targetCat) return;

    const name = maybeFixEncoding(document.getElementById("frmName").value).trim();
    const price = Number(document.getElementById("frmPrice").value);
    const desc = maybeFixEncoding(document.getElementById("frmDesc").value).trim();
    const image = document.getElementById("frmImage").value.trim();

    if (!name) {
      showToast("Informe o nome do item");
      return;
    }

    const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;

    if (existing) {
      const oldCat = findCategory(catId);
      if (!oldCat) return;
      oldCat.items = oldCat.items.filter((i) => i.id !== existing.id);
      targetCat.items.push({
        id: existing.id,
        name,
        price: safePrice,
        desc,
        image
      });
    } else {
      targetCat.items.push({
        id: uid("it"),
        name,
        price: safePrice,
        desc,
        image
      });
    }

    await persistData({ toast: "Item salvo" });
    window.closeModal();
  });
};

window.openAddModal = function openAddModal() {
  if (!data.categories.length) {
    showToast("Crie uma seção antes de adicionar itens");
    return;
  }
  window.openEditModal(data.categories[0].id, null);
};

window.deleteItem = function deleteItem(catId, itemId) {
  if (!window.confirm("Remover este item?")) return;
  const cat = findCategory(catId);
  if (!cat) return;
  cat.items = cat.items.filter((item) => item.id !== itemId);
  persistData({ toast: "Item removido" });
};

function openCategoryRenameModal(catId) {
  const cat = findCategory(catId);
  if (!cat) return;

  openModal([
    "<div class=\"modal-header\">",
    "  <h3 id=\"modalTitle\" class=\"modal-title\">Renomear Seção</h3>",
    "  <button class=\"modal-close\" type=\"button\" onclick=\"closeModal()\">x</button>",
    "</div>",
    "<div class=\"modal-body\">",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"newCatName\">Nome</label>",
    "    <input id=\"newCatName\" class=\"form-input\" type=\"text\" value=\"" + escapeHtml(cat.name) + "\">",
    "  </div>",
    "</div>",
    "<div class=\"modal-footer\">",
    "  <button class=\"btn btn-outline\" type=\"button\" onclick=\"closeModal()\">Cancelar</button>",
    "  <button id=\"saveCatRename\" class=\"btn btn-primary\" type=\"button\">Salvar</button>",
    "</div>"
  ].join("\n"));

  document.getElementById("saveCatRename").addEventListener("click", function () {
    const value = maybeFixEncoding(document.getElementById("newCatName").value).trim();
    if (!value) return;
    cat.name = value;
    persistData({ toast: "Seção atualizada" });
    window.closeModal();
  });
}

window.openNewCategoryModal = function openNewCategoryModal() {
  openModal([
    "<div class=\"modal-header\">",
    "  <h3 id=\"modalTitle\" class=\"modal-title\">Nova Seção</h3>",
    "  <button class=\"modal-close\" type=\"button\" onclick=\"closeModal()\">x</button>",
    "</div>",
    "<div class=\"modal-body\">",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"newSectionName\">Nome da seção</label>",
    "    <input id=\"newSectionName\" class=\"form-input\" type=\"text\" placeholder=\"Ex: Vinhos\">",
    "  </div>",
    "</div>",
    "<div class=\"modal-footer\">",
    "  <button class=\"btn btn-outline\" type=\"button\" onclick=\"closeModal()\">Cancelar</button>",
    "  <button id=\"saveNewSection\" class=\"btn btn-primary\" type=\"button\">Criar</button>",
    "</div>"
  ].join("\n"));

  document.getElementById("saveNewSection").addEventListener("click", function () {
    const name = maybeFixEncoding(document.getElementById("newSectionName").value).trim();
    if (!name) {
      showToast("Informe o nome da seção");
      return;
    }

    data.categories.push({
      id: "cat_" + slugify(name) + "_" + Date.now().toString(36),
      name,
      items: []
    });

    persistData({ toast: "Seção criada" });
    window.closeModal();
  });
};

function deleteCategory(catId) {
  if (!window.confirm("Excluir esta seção e todos os itens?")) return;
  data.categories = data.categories.filter((cat) => cat.id !== catId);
  if (activeCategoryId === catId) activeCategoryId = "";
  persistData({ toast: "Seção removida" });
}

window.openImportModal = function openImportModal() {
  refs.importFileInput.value = "";
  refs.importFileInput.click();
};

refs.importFileInput.addEventListener("change", async function onFileImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    data = normalizeMenu(parsed);
    await persistData({ toast: "Cardápio importado" });
  } catch (_e) {
    showToast("Arquivo JSON inválido");
  }
});

window.exportMenuJson = function exportMenuJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cardapio-brisa-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("JSON exportado");
};

function openAdminLoginModal() {
  openModal([
    "<div class=\"modal-header\">",
    "  <h3 id=\"modalTitle\" class=\"modal-title\">Área Administrativa</h3>",
    "  <button class=\"modal-close\" type=\"button\" onclick=\"closeModal()\">x</button>",
    "</div>",
    "<div class=\"modal-body\">",
    "  <div class=\"form-group\">",
    "    <label class=\"form-label\" for=\"adminPwd\">Senha</label>",
    "    <input id=\"adminPwd\" class=\"form-input\" type=\"password\" placeholder=\"Senha administrativa\">",
    "  </div>",
    "</div>",
    "<div class=\"modal-footer\">",
    "  <button class=\"btn btn-outline\" type=\"button\" onclick=\"closeModal()\">Cancelar</button>",
    "  <button id=\"confirmAdminBtn\" class=\"btn btn-primary\" type=\"button\">Entrar</button>",
    "</div>"
  ].join("\n"));

  const pwdInput = document.getElementById("adminPwd");
  const submit = function () {
    const val = pwdInput.value;
    if (val === ADMIN_PASS) {
      window.toggleAdmin(true);
      window.closeModal();
      showToast("Modo admin ativo");
    } else {
      showToast("Senha incorreta");
    }
  };

  document.getElementById("confirmAdminBtn").addEventListener("click", submit);
  pwdInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") submit();
  });
  pwdInput.focus();
}

window.toggleAdmin = function toggleAdmin(state) {
  isAdmin = Boolean(state);
  document.body.classList.toggle("is-admin", isAdmin);
  renderMenu();
};

refs.adminFab.addEventListener("click", openAdminLoginModal);

let logoTapCount = 0;
let logoTapTimer = null;
if (refs.logoBtn) {
  refs.logoBtn.addEventListener("click", function () {
    logoTapCount += 1;
    clearTimeout(logoTapTimer);
    if (logoTapCount >= 6) {
      logoTapCount = 0;
      openAdminLoginModal();
      return;
    }
    logoTapTimer = setTimeout(() => {
      logoTapCount = 0;
    }, 700);
  });
}

refs.searchInput.addEventListener("input", function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = window.setTimeout(renderMenu, 120);
});

function initFirebase() {
  let firebaseConfig = null;
  try {
    if (typeof __firebase_config !== "undefined" && __firebase_config) {
      firebaseConfig = JSON.parse(__firebase_config);
    }
  } catch (_e) {
    firebaseConfig = null;
  }

  if (!firebaseConfig) {
    setConnectionStatus(false);
    return;
  }

  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (_e) {
    setConnectionStatus(false);
    return;
  }

  setConnectionStatus(false);

  const doAuth = async function () {
    try {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (_e) {
      setConnectionStatus(false);
    }
  };

  onAuthStateChanged(auth, function (user) {
    currentUser = user;
    const online = Boolean(currentUser && db);
    setConnectionStatus(online);
    if (!online) return;

    const ref = doc(db, ...MENU_DOC_PATH);
    onSnapshot(ref, function (snapshot) {
      if (!snapshot.exists()) return;
      const cloud = snapshot.data();
      if (!cloud || !cloud.categories) return;
      data = normalizeMenu(cloud);
      saveLocal();
      renderMenu();
    });
  });

  doAuth();
}

(async function bootstrap() {
  initFirebase();

  const local = loadLocal();
  if (local && local.categories.length > 0) {
    data = local;
  } else {
    data = await loadFromJsonFile();
    saveLocal();
  }

  renderMenu();
  refs.searchInput.focus();
})();



