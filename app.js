/* ============================================================
   StyleStore — Main JavaScript
   Author: Senior Frontend Developer
   ============================================================ */

"use strict";

/* ============================================================
   STATE
   ============================================================ */
const state = {
  allProducts: [], // Full product pool (30+)
  filteredProducts: [], // After filter applied
  currentPage: 1,
  productsPerPage: 10,
  currentFilter: "all",
  wishlist: new Set(),
  cart: [],
  currentSlide: 0,
  sliderTotal: 3,
  sliderTimer: null,
};

/* ============================================================
   DOM REFERENCES
   ============================================================ */
const DOM = {
  grid: document.getElementById("products-grid"),
  loading: document.getElementById("products-loading"),
  pagination: document.getElementById("pagination"),
  wishlistBadge: document.getElementById("wishlist-count"),
  cartBadge: document.getElementById("cart-count"),
  sliderEl: document.getElementById("hero-slider"),
  sliderPrev: document.getElementById("slider-prev"),
  sliderNext: document.getElementById("slider-next"),
  dotsEl: document.getElementById("slider-dots"),
  filterBtns: document.querySelectorAll(".filter-btn"),
  toast: document.getElementById("toast"),
};

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/** Format price to USD string */
const formatPrice = (n) => `$${Number(n).toFixed(2)}`;

/** Generate a fake "old" price (20–40% above actual) */
const fakeOldPrice = (price) => {
  const mult = 1.2 + Math.random() * 0.2;
  return +(price * mult).toFixed(2);
};

/** Build star string from a rating (0–5) */
const buildStars = (rating) => {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
};

/** Show a toast notification */
let toastTimer;
const showToast = (msg) => {
  clearTimeout(toastTimer);
  DOM.toast.textContent = msg;
  DOM.toast.classList.add("show");
  toastTimer = setTimeout(() => DOM.toast.classList.remove("show"), 2800);
};

/** Update badge visibility */
const updateBadges = () => {
  // Wishlist badge
  const wCount = state.wishlist.size;
  DOM.wishlistBadge.textContent = wCount;
  DOM.wishlistBadge.classList.toggle("visible", wCount > 0);

  // Cart badge
  const cCount = state.cart.reduce((sum, i) => sum + i.qty, 0);
  DOM.cartBadge.textContent = cCount;
  DOM.cartBadge.classList.toggle("visible", cCount > 0);
};

/* ============================================================
   API & PRODUCT LOADING
   ============================================================ */

/**
 * Fetch products from FakeStore API.
 * Duplicate array until we have at least 30 items.
 */
const fetchProducts = async () => {
  try {
    const res = await fetch("https://fakestoreapi.com/products");
    if (!res.ok) throw new Error("API error");
    const data = await res.json();

    // Duplicate to reach 30+
    let pool = [...data];
    while (pool.length < 30) pool = [...pool, ...data];

    // Trim to exactly 30 and attach metadata
    state.allProducts = pool.slice(0, 30).map((p, i) => ({
      ...p,
      id: i + 1, // unique sequential id
      oldPrice: Math.random() > 0.45 ? fakeOldPrice(p.price) : null,
      isNew: i < 6,
      isSale: i >= 6 && i < 14,
    }));

    state.filteredProducts = [...state.allProducts];
    DOM.loading.style.display = "none";
    renderProducts();
    renderPagination();
  } catch (err) {
    DOM.loading.innerHTML = `<p style="color:var(--clr-sale)">Ошибка загрузки товаров. Проверьте соединение.</p>`;
    console.error("fetchProducts:", err);
  }
};

/* ============================================================
   PRODUCT RENDERING
   ============================================================ */

/** Render the current page of products */
const renderProducts = () => {
  const { filteredProducts, currentPage, productsPerPage } = state;
  const start = (currentPage - 1) * productsPerPage;
  const slice = filteredProducts.slice(start, start + productsPerPage);

  DOM.grid.innerHTML = slice.map(buildProductCard).join("");

  // Attach card event listeners
  attachCardListeners();

  // Scroll to products section smoothly
  if (currentPage > 1) {
    document
      .getElementById("products")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

/** Build product card HTML string */
const buildProductCard = (product) => {
  const inWishlist = state.wishlist.has(product.id);
  const categoryLabel = prettifyCategory(product.category);
  const badge = product.isNew
    ? `<span class="product-card__badge badge--new">New</span>`
    : product.isSale
      ? `<span class="product-card__badge badge--sale">Sale</span>`
      : "";

  const oldPriceHTML = product.oldPrice
    ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>`
    : "";

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card__img-wrap">
        ${badge}
        <div class="product-card__actions">
          <button class="action-btn btn-wishlist${inWishlist ? " active" : ""}"
                  data-id="${product.id}" aria-label="Добавить в избранное">
            <svg viewBox="0 0 24 24" fill="${inWishlist ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button class="action-btn btn-like" data-id="${product.id}" aria-label="Нравится">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
          </button>
        </div>
        <img class="product-card__img"
             src="${product.image}"
             alt="${escapeHTML(product.title)}"
             loading="lazy" />
      </div>
      <div class="product-card__body">
        <p class="product-card__cat">${categoryLabel}</p>
        <h3 class="product-card__title">${escapeHTML(product.title)}</h3>
        <div class="product-card__rating">
          <span class="stars">${buildStars(product.rating?.rate ?? 4)}</span>
          <span class="rating-count">(${product.rating?.count ?? 0})</span>
        </div>
        <div class="product-card__footer">
          <div class="product-card__prices">
            <span class="price-current">${formatPrice(product.price)}</span>
            ${oldPriceHTML}
          </div>
          <button class="btn-add-cart" data-id="${product.id}" aria-label="В корзину">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `;
};

/** Escape HTML to prevent XSS */
const escapeHTML = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Map API category to Russian label */
const prettifyCategory = (cat) => {
  const map = {
    "men's clothing": "Мужчинам",
    "women's clothing": "Женщинам",
    electronics: "Электроника",
    jewelery: "Украшения",
  };
  return map[cat] || cat;
};

/* ============================================================
   CARD INTERACTIONS
   ============================================================ */

const attachCardListeners = () => {
  // Wishlist buttons
  DOM.grid.querySelectorAll(".btn-wishlist").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      toggleWishlist(id, btn);
    });
  });

  // Like buttons
  DOM.grid.querySelectorAll(".btn-like").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      btn.classList.toggle("active");
      if (btn.classList.contains("active")) {
        btn.querySelector("svg").setAttribute("fill", "currentColor");
        showToast("👍 Отмечено!");
      } else {
        btn.querySelector("svg").setAttribute("fill", "none");
      }
    });
  });

  // Add to cart buttons
  DOM.grid.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      addToCart(id);
    });
  });
};

/** Toggle product in wishlist */
const toggleWishlist = (id, btn) => {
  const heartPath = btn.querySelector("svg");
  if (state.wishlist.has(id)) {
    state.wishlist.delete(id);
    btn.classList.remove("active");
    heartPath.setAttribute("fill", "none");
    showToast("Удалено из избранного");
  } else {
    state.wishlist.add(id);
    btn.classList.add("active");
    heartPath.setAttribute("fill", "currentColor");
    showToast("❤️ Добавлено в избранное!");
  }
  updateBadges();
};

/** Add product to cart */
const addToCart = (id) => {
  const existing = state.cart.find((i) => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({ id, qty: 1 });
  }
  updateBadges();

  const product = state.allProducts.find((p) => p.id === id);
  showToast(`🛒 "${product?.title?.substring(0, 30)}..." добавлен!`);
};

/* ============================================================
   PAGINATION
   ============================================================ */

const renderPagination = () => {
  const totalPages = Math.ceil(
    state.filteredProducts.length / state.productsPerPage,
  );
  if (totalPages <= 1) {
    DOM.pagination.innerHTML = "";
    return;
  }

  let html = `
    <button class="page-btn page-btn--arrow" id="pg-prev"
            ${state.currentPage === 1 ? "disabled" : ""} aria-label="Предыдущая">‹</button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    html += `
      <button class="page-btn${state.currentPage === p ? " active" : ""}"
              data-page="${p}" aria-label="Страница ${p}">${p}</button>
    `;
  }

  html += `
    <button class="page-btn page-btn--arrow" id="pg-next"
            ${state.currentPage === totalPages ? "disabled" : ""} aria-label="Следующая">›</button>
  `;

  DOM.pagination.innerHTML = html;

  // Listeners
  DOM.pagination.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.currentPage = Number(btn.dataset.page);
      renderProducts();
      renderPagination();
    });
  });

  const prevBtn = document.getElementById("pg-prev");
  const nextBtn = document.getElementById("pg-next");
  if (prevBtn) prevBtn.addEventListener("click", () => changePage(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changePage(+1));
};

const changePage = (delta) => {
  const totalPages = Math.ceil(
    state.filteredProducts.length / state.productsPerPage,
  );
  state.currentPage = Math.max(
    1,
    Math.min(totalPages, state.currentPage + delta),
  );
  renderProducts();
  renderPagination();
};

/* ============================================================
   FILTERING
   ============================================================ */

DOM.filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    DOM.filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    state.currentFilter = btn.dataset.filter;
    state.currentPage = 1;

    state.filteredProducts =
      state.currentFilter === "all"
        ? [...state.allProducts]
        : state.allProducts.filter((p) => p.category === state.currentFilter);

    renderProducts();
    renderPagination();
  });
});

/* ============================================================
   HERO SLIDER
   ============================================================ */

const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");

/** Move to a specific slide index */
const goToSlide = (index) => {
  // Exit current
  slides[state.currentSlide].classList.add("exit");
  dots[state.currentSlide].classList.remove("active");

  // Small delay so exit animation can start
  setTimeout(() => {
    slides[state.currentSlide].classList.remove("active", "exit");
    state.currentSlide = (index + state.sliderTotal) % state.sliderTotal;
    slides[state.currentSlide].classList.add("active");
    dots[state.currentSlide].classList.add("active");
  }, 60);
};

/** Advance slider forward */
const nextSlide = () => goToSlide(state.currentSlide + 1);
const prevSlide = () => goToSlide(state.currentSlide - 1);

/** Start auto-play */
const startSlider = () => {
  stopSlider();
  state.sliderTimer = setInterval(nextSlide, 5000);
};

/** Stop auto-play */
const stopSlider = () => clearInterval(state.sliderTimer);

// Button listeners
DOM.sliderNext.addEventListener("click", () => {
  nextSlide();
  startSlider();
});
DOM.sliderPrev.addEventListener("click", () => {
  prevSlide();
  startSlider();
});

// Dot listeners
dots.forEach((dot) => {
  dot.addEventListener("click", () => {
    goToSlide(Number(dot.dataset.index));
    startSlider();
  });
});

// Pause on hover
DOM.sliderEl.addEventListener("mouseenter", stopSlider);
DOM.sliderEl.addEventListener("mouseleave", startSlider);

// Touch / swipe support
let touchStartX = 0;
DOM.sliderEl.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.changedTouches[0].screenX;
  },
  { passive: true },
);
DOM.sliderEl.addEventListener(
  "touchend",
  (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? nextSlide() : prevSlide();
      startSlider();
    }
  },
  { passive: true },
);

/* ============================================================
   SEARCH
   ============================================================ */
const searchInput = document.querySelector(".search-input");
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      state.filteredProducts = [...state.allProducts];
    } else {
      state.filteredProducts = state.allProducts.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query),
      );
    }
    state.currentPage = 1;
    renderProducts();
    renderPagination();
  }, 350);
});

/* ============================================================
   SMOOTH SCROLL for CTA link
   ============================================================ */
document.querySelectorAll('a[href="#products"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  });
});

/* ============================================================
   INIT
   ============================================================ */
const init = () => {
  startSlider();
  fetchProducts();
};

document.addEventListener("DOMContentLoaded", init);
