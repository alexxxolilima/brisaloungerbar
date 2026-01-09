/* app.js - versão atualizada (modal via <template>, tentativa de carregamento jpg/png, layout conforme CSS) */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

/* --------------------- FALLBACK INITIAL DATA (se JSON local não carregado) --------------------- */
const INITIAL_DATA = {
  "categories": [
    {
      "id": "cat_drinks",
      "name": "Drinks",
      "items": [
        { "id": "dk_caip_cachaca_300", "name": "Caipirinha de Cachaça (300ml)", "price": 15.00, "desc": "Escolha: Morango ou Limão.", "image": "images/dk_caip_cachaca_300.jpg" },
        { "id": "dk_caip_vodka_saque_300", "name": "Caipirinha de Vodka ou Saquê (300ml)", "price": 20.00, "desc": "Escolha: Morango ou Limão.", "image": "images/dk_caip_vodka_saque_300.jpg" },
        { "id": "dk_caip_gourmet_brisa", "name": "Caipirinha Gourmet Brisa", "price": 35.00, "desc": "Especial da casa. Escolha: Morango ou Limão.", "image": "images/dk_caip_gourmet_brisa.jpg" },
        { "id": "dk_gin_eternity_700", "name": "Gin Eternity (700ml)", "price": 15.00, "desc": "Escolha o sabor: Melancia, Tropical, Maçã Verde ou Royale.", "image": "images/dk_gin_eternity_700.jpg" },
        { "id": "dk_gin_eternity_500", "name": "Gin Eternity (500ml)", "price": 10.00, "desc": "Escolha o sabor: Melancia, Tropical, Maçã Verde ou Royale.", "image": "images/dk_gin_eternity_500.jpg" },
        { "id": "dk_gin_premium_redbull", "name": "Gin Premium & Red Bull", "price": 30.00, "desc": "Escolha o sabor: Melancia ou Tropical. Com fruta.", "image": "images/dk_gin_premium_redbull.jpg" },
        { "id": "dk_copao_premium_redbull_300", "name": "Copão Premium & Red Bull (300ml)", "price": 40.00, "desc": "Escolha o sabor: Melancia ou Tropical. Com fruta.", "image": "images/dk_copao_premium_redbull_300.jpg" },
        { "id": "dk_copao", "name": "Copão (Red Label + Energético, 700ml)", "price": 30.00, "desc": "", "image": "images/dk_copao.jpg" },
        { "id": "dk_moscow_mule", "name": "Moscow Mule (Tradicional)", "price": 30.00, "desc": "Tradicional.", "image": "images/dk_moscow_mule.jpg" }
      ]
    },
    {
      "id": "cat_combos_garrafas",
      "name": "Combos / Garrafas",
      "items": [
        { "id": "cb_redlabel_energetico", "name": "Red Label + Energético (copão/700ml)", "price": 30.00, "desc": "", "image": "images/cb_redlabel_energetico.jpg" },
        { "id": "cb_whitehorse_energetico", "name": "White Horse + Energético", "price": 25.00, "desc": "", "image": "images/cb_whitehorse_energetico.jpg" },
        { "id": "cb_jack_rb", "name": "Jack Daniel's + Red Bull", "price": 50.00, "desc": "", "image": "images/cb_jack_rb.jpg" },
        { "id": "cb_smirnoff_energetico", "name": "Smirnoff + Energético", "price": 20.00, "desc": "", "image": "images/cb_smirnoff_energetico.jpg" },
        { "id": "cb_absolut_rb", "name": "Absolut + Red Bull", "price": 40.00, "desc": "", "image": "images/cb_absolut_rb.jpg" },
        { "id": "cb_jack_maca_verde_rb", "name": "Jack Daniel's Maçã Verde + Red Bull", "price": 55.00, "desc": "", "image": "images/cb_jack_maca_verde_rb.jpg" },
        { "id": "cb_jack_trad_garrafa", "name": "Jack Daniel's Tradicional (garrafa)", "price": 280.00, "desc": "Acompanha a garrafa + 4 gelos de sabores + 4 Red Bull.", "image": "images/cb_jack_trad_garrafa.jpg" },
        { "id": "cb_jack_sabores_garrafa", "name": "Jack Daniel's (Sabores) (garrafa)", "price": 300.00, "desc": "Honey, Fire ou Apple. Acompanha + 4 gelos de sabores + 4 Red Bull.", "image": "images/cb_jack_sabores_garrafa.jpg" },
        { "id": "cb_whitehorse_garrafa", "name": "White Horse (garrafa)", "price": 200.00, "desc": "Acompanha a garrafa + 4 gelos de sabores + 4 Red Bull.", "image": "images/cb_whitehorse_garrafa.jpg" },
        { "id": "cb_gin_tanqueray", "name": "Gin Tanqueray (garrafa)", "price": 250.00, "desc": "Acompanha a garrafa + frutas + 4 Red Bull ou 5 tônicas.", "image": "images/cb_gin_tanqueray.jpg" },
        { "id": "cb_ciroc", "name": "Ciroc Tradicional (garrafa)", "price": 320.00, "desc": "Acompanha a garrafa + 4 gelos de sabores + 4 Red Bull.", "image": "images/cb_ciroc.jpg" },
        { "id": "cb_absolut_garrafa", "name": "Absolut (garrafa)", "price": 200.00, "desc": "Acompanha a garrafa + 4 gelos de sabores + 4 Red Bull.", "image": "images/cb_absolut_garrafa.jpg" },
        { "id": "cb_malibu_garrafa", "name": "Malibu (garrafa)", "price": 120.00, "desc": "Observação: energético Bally.", "image": "images/cb_malibu_garrafa.jpg" },
        { "id": "cb_malibu_dose", "name": "Malibu (dose)", "price": 30.00, "desc": "", "image": "images/cb_malibu_dose.jpg" },
        { "id": "cb_chivas12", "name": "Chivas 12 anos (garrafa)", "price": 250.00, "desc": "Acompanha a garrafa + 4 gelos de sabores + 4 Red Bull.", "image": "images/cb_chivas12.jpg" }
      ]
    },
    {
      "id": "cat_doses",
      "name": "Doses",
      "items": [
        { "id": "dose_licor43", "name": "Licor 43 (dose)", "price": 18.00, "desc": "", "image": "images/dose_licor43.jpg" },
        { "id": "dose_licor_ballena", "name": "Licor Ballena (dose)", "price": 18.00, "desc": "", "image": "images/dose_licor_ballena.jpg" },
        { "id": "dose_tequila_jose_cuervo", "name": "Tequila (Jose Cuervo) (dose)", "price": 18.00, "desc": "", "image": "images/dose_tequila_jose_cuervo.jpg" },
        { "id": "dose_jack", "name": "Jack (dose)", "price": 30.00, "desc": "", "image": "images/dose_jack.jpg" }
      ]
    },
    {
      "id": "cat_cervejas",
      "name": "Cervejas & Baldes",
      "items": [
        { "id": "beer_original_600", "name": "Original (600ml)", "price": 15.00, "desc": "Garrafa.", "image": "images/beer_original_600.jpg" },
        { "id": "beer_spaten_600", "name": "Spaten (600ml)", "price": 17.00, "desc": "Puro malte.", "image": "images/beer_spaten_600.jpg" },
        { "id": "beer_heineken_600", "name": "Heineken (600ml)", "price": 19.00, "desc": "Premium.", "image": "images/beer_heineken_600.jpg" },
        { "id": "beer_long_heineken", "name": "Heineken (long neck)", "price": 12.00, "desc": "", "image": "images/beer_long_heineken.jpg" },
        { "id": "beer_long_heineken_0", "name": "Heineken 0% (long neck)", "price": 12.00, "desc": "Sem álcool.", "image": "images/beer_long_heineken_0.jpg" },
        { "id": "beer_skol_beats", "name": "Skol Beats", "price": 12.00, "desc": "", "image": "images/beer_skol_beats.jpg" },
        { "id": "beer_budweiser", "name": "Budweiser", "price": 8.00, "desc": "", "image": "images/beer_budweiser.jpg" },
        { "id": "beer_corona", "name": "Corona", "price": 12.00, "desc": "", "image": "images/beer_corona.jpg" },
        { "id": "smirnoff_ice", "name": "Smirnoff Ice", "price": 12.00, "desc": "", "image": "images/smirnoff_ice.jpg" },
        { "id": "balde_original_4", "name": "Balde Original (4 unidades)", "price": 56.00, "desc": "", "image": "images/balde_original_4.jpg" },
        { "id": "balde_spaten_4", "name": "Balde Spaten (4 unidades)", "price": 64.00, "desc": "", "image": "images/balde_spaten_4.jpg" },
        { "id": "balde_heineken_4", "name": "Balde Heineken (4 unidades)", "price": 72.00, "desc": "", "image": "images/balde_heineken_4.jpg" },
        { "id": "balde_heineken_10", "name": "Balde Heineken Long (10 unidades)", "price": 110.00, "desc": "", "image": "images/balde_heineken_10.jpg" }
      ]
    },
    {
      "id": "cat_diversos_nao_alcoolicos",
      "name": "Diversos / Sem Álcool",
      "items": [
        { "id": "div_refri_suco", "name": "Refrigerante / Suco (lata)", "price": 6.00, "desc": "Coca-Cola, Guaraná, Sprite, Fanta e Del Valle.", "image": "images/div_refri_suco.jpg" },
        { "id": "div_agua", "name": "Água (com ou sem gás)", "price": 5.00, "desc": "", "image": "images/div_agua.jpg" },
        { "id": "div_agua_tonica", "name": "Água Tônica", "price": 6.00, "desc": "", "image": "images/div_agua_tonica.jpg" },
        { "id": "div_redbull", "name": "Red Bull", "price": 12.00, "desc": "", "image": "images/div_redbull.jpg" },
        { "id": "div_gelo_sabores", "name": "Gelo Sabores", "price": 3.00, "desc": "", "image": "images/div_gelo_sabores.jpg" },
        { "id": "div_halls_trident", "name": "Halls / Trident", "price": 3.50, "desc": "", "image": "images/div_halls_trident.jpg" },
        { "id": "div_snickers", "name": "Snickers", "price": 6.00, "desc": "", "image": "images/div_snickers.jpg" }
      ]
    },
    {
      "id": "cat_narguile",
      "name": "Narguilé",
      "items": [
        { "id": "n_rosh", "name": "Rosh", "price": 15.00, "desc": "", "image": "images/n_rosh.jpg" },
        { "id": "n_aluguel_taxa", "name": "Taxa de aluguel narguilé (cobrado no primeiro)", "price": 5.00, "desc": "Valor cobrado no primeiro atendimento.", "image": "images/n_aluguel_taxa.jpg" }
      ]
    },
    {
      "id": "cat_porcoes",
      "name": "Porções",
      "items": [
        { "id": "p_calabresa", "name": "Calabresa", "price": 30.00, "desc": "", "image": "images/p_calabresa.jpg" },
        { "id": "p_batata_cheddar_bacon", "name": "Batata com Cheddar e Bacon", "price": 35.00, "desc": "", "image": "images/p_batata_cheddar_bacon.jpg" },
        { "id": "p_onion_rings", "name": "Onion Rings", "price": 25.00, "desc": "", "image": "images/p_onion_rings.jpg" },
        { "id": "p_salgados_fritos", "name": "Salgados Fritos", "price": 25.00, "desc": "", "image": "images/p_salgados_fritos.jpg" },
        { "id": "p_mista", "name": "Porção Mista (Escolha 2 itens, exceto peixe)", "price": 40.00, "desc": "", "image": "images/p_mista.jpg" },
        { "id": "p_isca_peixe", "name": "Isca de Peixe", "price": 60.00, "desc": "", "image": "images/p_isca_peixe.jpg" },
        { "id": "p_frango_passarinho", "name": "Frango a Passarinho", "price": 35.00, "desc": "", "image": "images/p_frango_passarinho.jpg" }
      ]
    },
    {
      "id": "cat_caldos_tabuas",
      "name": "Caldos, Porções e Tábuas",
      "items": [
        { "id": "caldo_verde_500", "name": "Caldo Verde (500ml)", "price": 18.00, "desc": "", "image": "images/caldo_verde_500.jpg" },
        { "id": "caldo_feijao_500", "name": "Caldo de Feijão (500ml)", "price": 18.00, "desc": "", "image": "images/caldo_feijao_500.jpg" },
        { "id": "mocoto_500", "name": "Mocotó (500ml)", "price": 20.00, "desc": "", "image": "images/mocoto_500.jpg" },
        { "id": "abobora_carne_seca_500", "name": "Abóbora com Carne Seca (500ml)", "price": 20.00, "desc": "", "image": "images/abobora_carne_seca_500.jpg" },
        { "id": "porcao_completa", "name": "Porção Completa", "price": 120.00, "desc": "Acompanha isca de peixe + 2 opções à sua escolha.", "image": "images/porcao_completa.jpg" },
        { "id": "tabua_picanha", "name": "Tábua Picanha com Batata (≈600g)", "price": 100.00, "desc": "Aproximadamente 600g + molhos e farofa.", "image": "images/tabua_picanha.jpg" },
        { "id": "tabua_linguica_aligot", "name": "Tábua Linguiça com Aligot (≈500g)", "price": 70.00, "desc": "", "image": "images/tabua_linguica_aligot.jpg" }
      ]
    }
  ]
};

/* --------------------- FIREBASE / APP CONFIG (guarded) --------------------- */
let firebaseConfig = null;
try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
    }
} catch (err) {
    console.warn('Failed to parse __firebase_config:', err);
    firebaseConfig = null;
}

let app = null, db = null, auth = null;
if (firebaseConfig) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (e) {
        console.error('Firebase init error:', e);
        app = null; db = null; auth = null;
    }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app';
const MENU_DOC_PATH = ['artifacts', appId, 'public', 'data', 'menu_store', 'main'];

let data = INITIAL_DATA;
let isAdmin = false;
let currentUser = null;

/* --------------------- HELPERS --------------------- */
function escapeHtml(str = '') {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

window.formatCurrency = function (val) {
    if (val === undefined || val === null) return 'R$ 0,00';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/* --------------------- TRY LOAD LOCAL JSON --------------------- */
async function tryLoadLocalJson() {
    const candidates = [
        './menu_final_brisa.json',
        'menu_final_brisa.json',
        './menu.json',
        'menu.json'
    ];
    for (const p of candidates) {
        try {
            const res = await fetch(p + '?v=' + Date.now(), { cache: 'no-store' });
            if (!res.ok) continue;
            const j = await res.json();
            if (j && Array.isArray(j.categories) && j.categories.length > 0) {
                data = j;
                renderMenu();
                console.log('Loaded local menu JSON from', p);
                return true;
            }
        } catch (e) {
            // continue
        }
    }
    return false;
}

/* --------------------- ENSURE LOGO --------------------- */
(function ensureLogo() {
    const img = document.getElementById('logoBtn');
    if (!img) return;
    const tryPaths = ['logo.jpg', 'logo.png', '/assets/logo.jpg', '/assets/logo.png'];
    let idx = 0;
    img.onerror = () => {
        idx++;
        if (idx < tryPaths.length) img.src = tryPaths[idx];
        else img.style.display = 'none';
    };
    if (!img.getAttribute('src')) img.src = tryPaths[0];
})();

/* --------------------- FIREBASE AUTH & SYNC (guarded) --------------------- */
async function initAuth() {
    if (!auth) return;
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (err) {
        console.error("Auth init error", err);
    }
}
if (auth) initAuth();

if (auth) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        const statusEl = document.getElementById('connStatus');
        if (user) {
            statusEl.classList.add('online');
            setupRealtimeSync();
        } else {
            statusEl.classList.remove('online');
        }
    });
} else {
    const statusEl = document.getElementById('connStatus');
    if (statusEl) statusEl.classList.remove('online');
}

function setupRealtimeSync() {
    if (!db) return;
    try {
        const docRef = doc(db, ...MENU_DOC_PATH);
        onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const cloud = snapshot.data();
                if (cloud && cloud.categories) {
                    data = cloud;
                    renderMenu();
                    console.log("Menu sincronizado com Firestore.");
                }
            }
        }, (err) => {
            console.error("sync err", err);
        });
    } catch (e) {
        console.error(e);
    }
}

/* --------------------- RENDERING --------------------- */
window.renderMenu = function () {
    const menuListEl = document.getElementById('menuList');
    const catNavEl = document.getElementById('catNav');
    const searchInput = document.getElementById('searchInput');
    const term = searchInput ? searchInput.value.toLowerCase() : '';

    menuListEl.innerHTML = '';
    if (catNavEl) catNavEl.innerHTML = '';

    if (!data || !data.categories) {
        menuListEl.innerHTML = '<div class="empty-state">Cardápio vazio.</div>';
        return;
    }

    let hasContent = false;

    data.categories.forEach((cat, catIndex) => {
        const filteredItems = (cat.items || []).filter(item =>
            (item.name || '').toLowerCase().includes(term) ||
            (item.desc || '').toLowerCase().includes(term)
        );
        if (filteredItems.length === 0) return;
        hasContent = true;

        // Nav pill
        if (catNavEl) {
            const navLink = document.createElement('a');
            navLink.className = 'nav-pill';
            navLink.href = '#' + cat.id;
            navLink.innerText = cat.name;
            navLink.addEventListener('click', (e) => {
                e.preventDefault();
                const el = document.getElementById(cat.id);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.querySelectorAll('.nav-pill').forEach(el => el.classList.remove('active'));
                navLink.classList.add('active');
            });
            catNavEl.appendChild(navLink);
            if (catIndex === 0) setTimeout(() => navLink.classList.add('active'), 0);
        }

        // Section
        const section = document.createElement('section');
        section.className = 'category-section';
        section.id = cat.id;

        const header = document.createElement('div');
        header.className = 'cat-header';

        const headerLeft = document.createElement('div');
        headerLeft.innerHTML = `<h2 class="cat-title">${escapeHtml(cat.name)}</h2><span class="cat-count">${filteredItems.length} opções</span>`;
        header.appendChild(headerLeft);

        if (isAdmin) {
            const adminWrap = document.createElement('div');
            adminWrap.className = 'admin-card-actions';
            adminWrap.style.position = 'static';
            adminWrap.style.display = 'flex';
            adminWrap.style.background = 'transparent';
            const btnDelCat = document.createElement('button');
            btnDelCat.className = 'btn btn-icon';
            btnDelCat.title = 'Deletar seção';
            btnDelCat.innerText = '🗑';
            btnDelCat.onclick = () => deleteCategory(cat.id);
            adminWrap.appendChild(btnDelCat);
            header.appendChild(adminWrap);
        }
        section.appendChild(header);

        filteredItems.forEach(item => {
            const card = document.createElement('article');
            card.className = 'item-card';

            const content = document.createElement('div');
            content.className = 'item-content';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';

            const title = document.createElement('div');
            title.className = 'item-name';
            title.innerHTML = escapeHtml(item.name || '');

            // Price quick (will also show below)
            const priceShort = document.createElement('div');
            priceShort.style.fontWeight = '700';
            priceShort.style.color = 'var(--gold)';
            priceShort.style.fontSize = '14px';
            priceShort.innerText = window.formatCurrency(item.price);

            row.appendChild(title);
            row.appendChild(priceShort);

            // Image wrapper - absolute positioned by CSS on desktop
            const imgWrap = document.createElement('div');
            imgWrap.className = 'item-image-wrapper';
            const imgEl = document.createElement('img');
            imgEl.className = 'item-image';
            imgEl.alt = item.name || '';

            // prefer explicit item.image then fallback to id-based path
            const srcCandidates = [
                item.image || '',
                `./images/${item.id}.jpg`,
                `./images/${item.id}.png`
            ].filter(Boolean);

            // try loading first candidate; onerror hide (keeps wrapper hidden if none)
            let loaded = false;
            function trySetSrcList(list) {
                if (!list || list.length === 0) {
                    imgEl.style.display = 'none';
                    return;
                }
                imgEl.src = list[0];
                imgEl.onerror = () => {
                    // try next candidate
                    list.shift();
                    trySetSrcList(list);
                };
                imgEl.onload = () => {
                    imgEl.style.display = 'block';
                    loaded = true;
                };
            }
            trySetSrcList(srcCandidates.slice());

            imgWrap.appendChild(imgEl);

            // Hidden description text, shown on press/modal
            const descText = document.createElement('div');
            descText.className = 'item-desc-text';
            descText.innerHTML = escapeHtml(item.desc || '');

            content.appendChild(row);
            content.appendChild(descText);

            // price element (below)
            const priceEl = document.createElement('div');
            priceEl.className = 'item-price';
            priceEl.innerText = window.formatCurrency(item.price);
            content.appendChild(priceEl);

            card.appendChild(content);
            card.appendChild(imgWrap);

            // Admin actions
            if (isAdmin) {
                const actions = document.createElement('div');
                actions.className = 'admin-card-actions';
                const btnEdit = document.createElement('button');
                btnEdit.className = 'btn btn-icon';
                btnEdit.innerText = '✎';
                btnEdit.onclick = (ev) => { ev.stopPropagation(); openEditModal(cat.id, item.id); };
                const btnDel = document.createElement('button');
                btnDel.className = 'btn btn-icon';
                btnDel.style.borderColor = 'var(--danger)';
                btnDel.style.color = 'var(--danger)';
                btnDel.innerText = '✕';
                btnDel.onclick = (ev) => { ev.stopPropagation(); deleteItem(cat.id, item.id); };

                actions.appendChild(btnEdit);
                actions.appendChild(btnDel);
                card.appendChild(actions);
            }

            /* interactions */
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                openItemModal(item);
            });

            let pressTimer = null;
            const PRESS_THRESHOLD = 180;
            function onPressStart(ev) {
                if (ev.target.closest('button')) return;
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    card.classList.add('show-desc');
                }, PRESS_THRESHOLD);
            }
            function onPressEnd(ev) {
                clearTimeout(pressTimer);
                if (card.classList.contains('show-desc')) {
                    setTimeout(() => card.classList.remove('show-desc'), 1200);
                }
            }
            card.addEventListener('mousedown', onPressStart);
            card.addEventListener('mouseup', onPressEnd);
            card.addEventListener('mouseleave', onPressEnd);
            card.addEventListener('touchstart', onPressStart, { passive: true });
            card.addEventListener('touchend', onPressEnd);
            card.addEventListener('touchcancel', onPressEnd);

            section.appendChild(card);
        });

        menuListEl.appendChild(section);
    });

    if (!hasContent) {
        menuListEl.innerHTML = `<div class="empty-state">Nenhum item encontrado para "${escapeHtml(term)}"</div>`;
    }
};

/* --------------------- SEARCH HOOK --------------------- */
document.getElementById('searchInput').addEventListener('input', window.renderMenu);

/* --------------------- MODAL / CRUD (modal via template) --------------------- */
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
window.closeModal = function () {
    modalOverlay.classList.remove('active');
    setTimeout(() => { modalContent.innerHTML = ''; }, 300);
};
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) window.closeModal(); });

window.openItemModal = function (item) {
    // find template
    const tpl = document.getElementById('itemModalTemplate');
    if (!tpl) {
        // fallback: simple modal assembly
        modalContent.innerHTML = `
        <div class="modal-header">
          <h3 class="modal-title">Detalhes</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <h2 style="color:var(--gold); margin-top:0; line-height:1.2; font-family:var(--font-display)">${escapeHtml(item.name)}</h2>
          <p style="color:var(--text-muted); font-size:16px; line-height:1.5; margin-bottom:20px;">
            ${escapeHtml(item.desc || 'Sem descrição adicional.')}
          </p>
          <div style="height:1px; background:rgba(255,255,255,0.1); margin:10px 0;"></div>
          <div class="modal-price-big">${window.formatCurrency(item.price)}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" style="width:100%; justify-content:center" onclick="closeModal()">Fechar</button>
        </div>
      `;
        modalOverlay.classList.add('active');
        return;
    }

    // clone template and populate
    const clone = tpl.content.cloneNode(true);
    const imgWrap = clone.querySelector('.modal-image-wrap');
    const imgEl = clone.querySelector('.modal-image');
    const nameEl = clone.querySelector('.modal-item-name');
    const descEl = clone.querySelector('.modal-item-desc');
    const priceEl = clone.querySelector('.modal-price-big');

    const imgCandidates = [
        item.image || '',
        `./images/${item.id}.jpg`,
        `./images/${item.id}.png`
    ].filter(Boolean);

    // set text
    if (nameEl) nameEl.innerText = item.name || '';
    if (descEl) descEl.innerText = item.desc || 'Sem descrição adicional.';
    if (priceEl) priceEl.innerText = window.formatCurrency(item.price);

    // set image and handle onerror to hide wrapper if not available
    if (imgEl && imgWrap) {
        imgEl.onerror = () => {
            imgWrap.style.display = 'none';
        };
        imgEl.onload = () => {
            imgWrap.style.display = 'block';
        };
        // try sequence
        (function trySeq(list) {
            if (!list || list.length === 0) {
                imgWrap.style.display = 'none';
                return;
            }
            imgEl.src = list[0];
            imgEl.onerror = () => {
                list.shift();
                trySeq(list);
            };
        })(imgCandidates.slice());
    }

    modalContent.innerHTML = ''; // clear
    modalContent.appendChild(clone);
    modalOverlay.classList.add('active');
};

/* --------------------- EDIT / SAVE / DELETE --------------------- */
window.openEditModal = function (catId, itemId = null) {
    const category = data.categories.find(c => c.id === catId);
    if (!category) return;
    const isNew = !itemId;
    const item = itemId ? { ...category.items.find(i => i.id === itemId) } : { name: '', price: '', desc: '' };

    modalContent.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${isNew ? 'Novo Item' : 'Editar Item'}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Nome do Item</label>
        <input type="text" id="inpName" class="form-input" value="${escapeHtml(item.name || '')}" placeholder="Ex: Gin Tônica">
      </div>
      <div class="form-group">
        <label class="form-label">Preço (R$)</label>
        <input type="number" id="inpPrice" class="form-input" value="${item.price || ''}" placeholder="0.00" step="0.50">
      </div>
      <div class="form-group">
        <label class="form-label">Descrição / Ingredientes</label>
        <textarea id="inpDesc" class="form-textarea" rows="4" placeholder="Ex: Acompanha gelo de sabor...">${escapeHtml(item.desc || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Caminho da imagem (opcional)</label>
        <input type="text" id="inpImage" class="form-input" value="${escapeHtml(item.image || '')}" placeholder="images/nome-da-imagem.jpg">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="saveItemBtn">${isNew ? 'Salvar' : 'Salvar'}</button>
    </div>
  `;
    modalOverlay.classList.add('active');

    document.getElementById('saveItemBtn').addEventListener('click', () => saveItem(catId, itemId || ''));
};

window.saveItem = async function (catId, itemId) {
    const name = document.getElementById('inpName').value.trim();
    const priceVal = document.getElementById('inpPrice').value;
    const price = priceVal ? parseFloat(priceVal) : 0;
    const desc = document.getElementById('inpDesc').value.trim();
    const image = document.getElementById('inpImage').value.trim();
    if (!name) return alert('Nome obrigatório.');
    const catIndex = data.categories.findIndex(c => c.id === catId);
    if (catIndex === -1) return;
    if (itemId) {
        const itemIndex = data.categories[catIndex].items.findIndex(i => i.id === itemId);
        if (itemIndex > -1) {
            data.categories[catIndex].items[itemIndex] = { id: itemId, name, price, desc, image };
        }
    } else {
        const newItem = { id: 'it_' + Date.now() + Math.random().toString(36).substr(2, 5), name, price, desc, image };
        data.categories[catIndex].items.push(newItem);
    }
    await window.saveDataToCloud();
    closeModal();
};

window.deleteItem = async function (catId, itemId) {
    if (!confirm('Apagar este item?')) return;
    const cat = data.categories.find(c => c.id === catId);
    if (cat) {
        cat.items = cat.items.filter(i => i.id !== itemId);
        await window.saveDataToCloud();
    }
};

window.addNewCategory = async function () {
    const name = prompt('Nome da nova seção (Ex: Vinhos):');
    if (name && name.trim()) {
        data.categories.push({ id: 'cat_' + Date.now(), name: name.trim(), items: [] });
        await window.saveDataToCloud();
    }
};

window.deleteCategory = async function (catId) {
    if (!confirm('Isso apagará a seção inteira. Continuar?')) return;
    data.categories = data.categories.filter(c => c.id !== catId);
    await window.saveDataToCloud();
};

/* --------------------- SAVE WITH DEBOUNCE --------------------- */
let savePending = false;
let saveTimer = null;
window.saveDataToCloud = async function () {
    if (!db) {
        // offline: just update local render and show toast
        renderMenu();
        window.showToast("Alteração local (sem Firestore).");
        return;
    }
    if (savePending) return;
    savePending = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        try {
            const docRef = doc(db, ...MENU_DOC_PATH);
            await setDoc(docRef, data);
            window.showToast("Alteração Salva!");
        } catch (e) {
            alert("Erro ao salvar: " + (e.message || e));
        } finally {
            savePending = false;
        }
    }, 300);
};

/* --------------------- TOAST --------------------- */
window.showToast = function (msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    toastMsg.innerText = msg || "Salvo com sucesso!";
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
};

/* --------------------- ADMIN (tap -> password modal) --------------------- */
const logoBtn = document.getElementById('logoBtn');
let tapCount = 0;
let tapTimer;
const ADMIN_PASS = 'brisa2026';

window.toggleAdmin = function (status) {
    isAdmin = Boolean(status);
    document.body.classList.toggle('is-admin', isAdmin);
    renderMenu();
};

function showAdminPwdModal() {
    modalContent.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">Área Administrativa</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Senha:</label>
        <input type="password" id="adminPwd" class="form-input" placeholder="Senha administrativa">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="confirmAdmin">Entrar</button>
    </div>
  `;
    modalOverlay.classList.add('active');
    document.getElementById('confirmAdmin').addEventListener('click', () => {
        const val = document.getElementById('adminPwd').value;
        if (val === ADMIN_PASS) {
            toggleAdmin(true);
            closeModal();
            window.showToast("Modo Admin Ativado!");
        } else {
            alert('Senha incorreta.');
        }
    });
}

if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        tapCount++;
        clearTimeout(tapTimer);
        if (tapCount === 7) {
            tapCount = 0;
            showAdminPwdModal();
        } else {
            tapTimer = setTimeout(() => { tapCount = 0; }, 700);
        }
    });
}

/* --------------------- INITIALIZATION --------------------- */
document.getElementById('searchInput').focus();

tryLoadLocalJson().then(found => {
    if (!found) {
        data = INITIAL_DATA;
        renderMenu();
    }
});
