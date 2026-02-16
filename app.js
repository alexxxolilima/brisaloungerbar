const refs = {
  searchInput: document.getElementById("searchInput"),
  categoryNav: document.getElementById("categoryNav"),
  quickFilters: document.getElementById("quickFilters"),
  highlightsTrack: document.getElementById("highlightsTrack"),
  menuList: document.getElementById("menuList"),
  modalOverlay: document.getElementById("modalOverlay"),
  modalContent: document.getElementById("modalContent"),
  toast: document.getElementById("toast")
};

const state = {
  menu: { categories: [] },
  search: "",
  category: "all",
  filter: "all",
  searchDebounce: null,
  imageCache: new Map(),
  itemsById: new Map()
};

const quickFilterOptions = [
  { id: "all", label: "Tudo" },
  { id: "ate20", label: "Até R$ 20" },
  { id: "semAlcool", label: "Sem álcool" },
  { id: "combos", label: "Combos" }
];

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  window.setTimeout(() => refs.toast.classList.remove("show"), 1800);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function normalizeMenu(raw) {
  const root = raw && typeof raw === "object" ? raw : {};
  const categoriesIn = Array.isArray(root.categories) ? root.categories : [];

  return {
    categories: categoriesIn.map((cat, catIndex) => {
      const itemsIn = Array.isArray(cat && cat.items) ? cat.items : [];
      const name = maybeFixEncoding((cat && cat.name) || `Seção ${catIndex + 1}`).trim();
      const id = (cat && cat.id) || `cat_${catIndex}_${Date.now().toString(36)}`;

      return {
        id,
        name,
        items: itemsIn.map((item, itemIndex) => ({
          id: (item && item.id) || `item_${catIndex}_${itemIndex}`,
          name: maybeFixEncoding((item && item.name) || "Item").trim(),
          desc: maybeFixEncoding((item && item.desc) || "").trim(),
          image: String((item && item.image) || "").trim(),
          price: Number.isFinite(Number(item && item.price)) ? Number(item.price) : 0,
          categoryName: name,
          categoryId: id
        }))
      };
    })
  };
}

function getItemImageCandidates(item) {
  const candidates = [];
  if (item.image) candidates.push(item.image);
  if (item.id) {
    candidates.push(`./images/${item.id}.jpg`);
    candidates.push(`./images/${item.id}.png`);
  }
  return candidates;
}

function setImageWithFallback(img, item) {
  const cached = state.imageCache.get(item.id);
  if (cached === null) {
    img.style.display = "none";
    return;
  }
  if (typeof cached === "string") {
    img.src = cached;
    return;
  }

  const candidates = getItemImageCandidates(item);
  if (!candidates.length) {
    img.style.display = "none";
    state.imageCache.set(item.id, null);
    return;
  }

  const tryAt = (idx) => {
    if (idx >= candidates.length) {
      img.style.display = "none";
      state.imageCache.set(item.id, null);
      return;
    }

    img.src = candidates[idx];
    img.onerror = () => tryAt(idx + 1);
    img.onload = () => {
      img.style.display = "block";
      state.imageCache.set(item.id, candidates[idx]);
    };
  };

  tryAt(0);
}

function isSemAlcool(item) {
  const text = item._searchKey;
  return (
    text.includes("sem álcool") ||
    text.includes("sem alcool") ||
    text.includes("água") ||
    text.includes("agua") ||
    text.includes("refrigerante") ||
    text.includes("suco") ||
    text.includes("tônica") ||
    text.includes("tonica")
  );
}

function matchesQuickFilter(item) {
  if (state.filter === "all") return true;
  if (state.filter === "ate20") return Number(item.price) <= 20;
  if (state.filter === "semAlcool") return isSemAlcool(item);
  if (state.filter === "combos") {
    const text = item._searchKey;
    return text.includes("combo") || text.includes("garrafa");
  }
  return true;
}

function matchesSearch(item) {
  if (!state.search) return true;
  return item._searchKey.includes(state.search);
}

function getFilteredCategories() {
  const baseCategories = state.category === "all"
    ? state.menu.categories
    : state.menu.categories.filter((cat) => cat.id === state.category);

  return baseCategories
    .map((cat) => {
      const items = cat.items.filter((item) => matchesSearch(item) && matchesQuickFilter(item));
      return { ...cat, items };
    })
    .filter((cat) => cat.items.length > 0);
}

function renderCategoryNav() {
  refs.categoryNav.innerHTML = "";
  const frag = document.createDocumentFragment();

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `chip ${state.category === "all" ? "active" : ""}`;
  allBtn.textContent = "Todas";
  allBtn.addEventListener("click", () => {
    state.category = "all";
    renderApp();
  });
  frag.appendChild(allBtn);

  state.menu.categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip ${state.category === cat.id ? "active" : ""}`;
    btn.textContent = cat.name;
    btn.addEventListener("click", () => {
      state.category = cat.id;
      renderApp();
    });
    frag.appendChild(btn);
  });

  refs.categoryNav.appendChild(frag);
}

function renderQuickFilters() {
  refs.quickFilters.innerHTML = "";
  const frag = document.createDocumentFragment();

  quickFilterOptions.forEach((f) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip ${state.filter === f.id ? "active" : ""}`;
    btn.textContent = f.label;
    btn.addEventListener("click", () => {
      state.filter = f.id;
      renderApp();
    });
    frag.appendChild(btn);
  });

  refs.quickFilters.appendChild(frag);
}

function renderHighlights() {
  refs.highlightsTrack.innerHTML = "";

  const allItems = state.menu.categories.flatMap((cat) => cat.items);
  const base = allItems
    .slice()
    .sort((a, b) => Number(a.price) - Number(b.price))
    .slice(0, 8);

  if (!base.length) {
    refs.highlightsTrack.innerHTML = "<div class=\"empty-state\">Sem itens para destacar agora.</div>";
    return;
  }

  const frag = document.createDocumentFragment();

  base.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "highlight-card";
    card.dataset.itemId = item.id;
    card.innerHTML = `
      <div class="highlight-name">${escapeHtml(item.name)}</div>
      <span class="highlight-price">${formatCurrency(item.price)}</span>
    `;
    frag.appendChild(card);
  });

  refs.highlightsTrack.appendChild(frag);
}

function renderMenu() {
  refs.menuList.innerHTML = "";
  const filteredCategories = getFilteredCategories();

  if (!filteredCategories.length) {
    refs.menuList.innerHTML = "<div class=\"empty-state\">Nenhum item encontrado com esses filtros.</div>";
    return;
  }

  const frag = document.createDocumentFragment();

  filteredCategories.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "category-section";
    section.id = cat.id;

    section.innerHTML = `
      <header class="cat-header">
        <h3 class="cat-title">${escapeHtml(cat.name)}</h3>
        <span class="cat-count">${cat.items.length} itens</span>
      </header>
    `;

    const list = document.createElement("div");
    list.className = "items-list";

    cat.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "item-card";
      card.dataset.itemId = item.id;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${item.name}, ${formatCurrency(item.price)}`);

      const thumb = document.createElement("div");
      thumb.className = "item-thumb";
      const img = document.createElement("img");
      img.alt = item.name;
      img.loading = "lazy";
      img.decoding = "async";
      setImageWithFallback(img, item);
      thumb.appendChild(img);

      const content = document.createElement("div");
      content.className = "item-content";
      content.innerHTML = `
        <h4 class="item-name">${escapeHtml(item.name)}</h4>
        ${item.desc ? `<p class="item-desc">${escapeHtml(item.desc)}</p>` : ""}
        <div class="item-bottom">
          <span class="item-price">${formatCurrency(item.price)}</span>
          <span class="item-cta">Ver detalhes</span>
        </div>
      `;

      card.appendChild(thumb);
      card.appendChild(content);

      list.appendChild(card);
    });

    section.appendChild(list);
    frag.appendChild(section);
  });

  refs.menuList.appendChild(frag);
}

function openItemModal(item) {
  refs.modalContent.innerHTML = `
    <div class="modal-header">
      <h3 id="modalTitle" class="modal-title">Detalhes do produto</h3>
      <button class="modal-close" type="button" aria-label="Fechar" onclick="closeModal()">x</button>
    </div>
    <div class="modal-body">
      <img id="modalImg" class="modal-image" alt="Imagem do produto">
      <h2 class="modal-name">${escapeHtml(item.name)}</h2>
      <p class="modal-desc">${escapeHtml(item.desc || "Sem descrição adicional.")}</p>
      <span class="modal-price">${formatCurrency(item.price)}</span>
    </div>
  `;

  const modalImg = document.getElementById("modalImg");
  setImageWithFallback(modalImg, item);

  refs.modalOverlay.classList.add("active");
  refs.modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function openItemModalById(itemId) {
  if (!itemId) return;
  const item = state.itemsById.get(itemId);
  if (!item) return;
  openItemModal(item);
}

window.closeModal = function closeModal() {
  refs.modalOverlay.classList.remove("active");
  refs.modalOverlay.setAttribute("aria-hidden", "true");
  refs.modalContent.innerHTML = "";
  document.body.style.overflow = "";
};

refs.modalOverlay.addEventListener("click", (event) => {
  if (event.target === refs.modalOverlay) window.closeModal();
});

refs.menuList.addEventListener("click", (event) => {
  const card = event.target.closest(".item-card");
  if (!card) return;
  openItemModalById(card.dataset.itemId);
});

refs.menuList.addEventListener("keydown", (event) => {
  const card = event.target.closest(".item-card");
  if (!card) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openItemModalById(card.dataset.itemId);
});

refs.highlightsTrack.addEventListener("click", (event) => {
  const card = event.target.closest(".highlight-card");
  if (!card) return;
  openItemModalById(card.dataset.itemId);
});

function buildItemIndexes() {
  state.itemsById.clear();
  state.imageCache.clear();
  state.menu.categories.forEach((cat) => {
    cat.items.forEach((item) => {
      item._searchKey = normalizeText(`${item.name} ${item.desc} ${cat.name}`);
      state.itemsById.set(item.id, item);
    });
  });
}

function renderApp() {
  renderCategoryNav();
  renderQuickFilters();
  renderHighlights();
  renderMenu();
}

refs.searchInput.addEventListener("input", () => {
  clearTimeout(state.searchDebounce);
  state.searchDebounce = window.setTimeout(() => {
    state.search = normalizeText(refs.searchInput.value);
    renderMenu();
  }, 120);
});

async function loadMenuData() {
  const candidates = ["./menu_final_brisa.json", "./menu.json"];

  for (const path of candidates) {
    try {
      const response = await fetch(path + "?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) continue;
      const json = await response.json();
      return normalizeMenu(json);
    } catch (_e) {
      // try next file
    }
  }

  return { categories: [] };
}

(async function bootstrap() {
  state.menu = await loadMenuData();

  if (!state.menu.categories.length) {
    refs.highlightsTrack.innerHTML = "<div class=\"empty-state\">Não foi possível carregar o cardápio.</div>";
    refs.menuList.innerHTML = "<div class=\"empty-state\">Confira se o arquivo menu_final_brisa.json existe.</div>";
    showToast("Falha ao carregar cardápio");
    return;
  }

  buildItemIndexes();
  renderApp();
  showToast("Cardápio carregado");
})();

