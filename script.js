const productGrid = document.querySelector("#product-grid");
const wishlistForm = document.querySelector(".wishlist-form");
let productStore = [];
let activeProduct = null;
let activeImageIndex = 0;
let cartItems = {};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(price) {
  const value = String(price || "").trim();
  if (!value) return "";
  if (value.startsWith("NT$")) return value.replace(/^NT\$\s*/, "NT$ ");
  return `NT$ ${value}`;
}

function parsePrice(price) {
  const numeric = String(price || "").replace(/[^\d]/g, "");
  return Number(numeric || 0);
}

function formatMoney(amount) {
  return `NT$ ${Number(amount || 0).toLocaleString("zh-TW")}`;
}

function normalizeImageUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  const idMatch = value.match(/[?&]id=([^&]+)/) || value.match(/\/d\/([^/]+)/);
  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1600`;
  }

  return value;
}

function getProductImages(product) {
  const rawImages = Array.isArray(product.images)
    ? product.images
    : String(product.images || product.image || "")
        .split(" || ");
  const images = rawImages.map(normalizeImageUrl).filter(Boolean);
  if (!images.length && product.image) images.push(normalizeImageUrl(product.image));
  return [...new Set(images)];
}

function renderEmptyProducts() {
  if (!productGrid) return;

  productGrid.innerHTML = `
    <div class="empty-products">
      <h3>商品準備中</h3>
      <p>目前還沒有正式上架的商品。新品準備好後，會在這裡公布。</p>
    </div>
  `;
}

function renderProductList(products) {
  if (!productGrid) return;

  productStore = products.map((product) => ({
    ...product,
    images: getProductImages(product),
    price: formatPrice(product.price),
    imagePosition: product.imagePosition || "50% 50%",
  }));

  if (!productStore.length) {
    renderEmptyProducts();
    return;
  }

  productGrid.innerHTML = productStore
    .map((product, index) => {
      const image = product.images[0]
        ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}" style="object-position: ${escapeHtml(product.imagePosition)}" />`
        : `<span></span>`;
      const price = product.price ? `<strong>${escapeHtml(product.price)}</strong>` : "";

      return `
        <article class="product-card">
          <button class="product-open" type="button" data-product-index="${index}" aria-label="查看 ${escapeHtml(product.name)} 商品詳情">
            <div class="product-visual ${product.images[0] ? "has-image" : "visual-bowl"}" aria-hidden="${product.images[0] ? "false" : "true"}">
              ${image}
            </div>
            <div class="product-copy">
              <p>${escapeHtml(product.category || "全部")}</p>
              <h3>${escapeHtml(product.name)}</h3>
              <span>${escapeHtml(product.description)}</span>
              <div class="product-meta">
                ${price}
                <span class="product-detail-pill">查看詳情</span>
              </div>
            </div>
          </button>
        </article>
      `;
    })
    .join("");
}

function loadProductFeed() {
  const feedUrl = window.MUWA_CONFIG?.productFeedUrl || "";
  if (!feedUrl) {
    renderEmptyProducts();
    return;
  }

  const callbackName = `muwaProducts_${Date.now()}`;
  const script = document.createElement("script");
  const separator = feedUrl.includes("?") ? "&" : "?";

  window[callbackName] = (payload) => {
    renderProductList(payload.products || []);
    delete window[callbackName];
    script.remove();
  };

  script.onerror = () => {
    renderEmptyProducts();
    delete window[callbackName];
    script.remove();
  };

  script.src = `${feedUrl}${separator}action=products&callback=${callbackName}`;
  document.body.appendChild(script);
}

function ensureProductModal() {
  let modal = document.querySelector("#product-detail");
  if (modal) return modal;

  modal = document.createElement("section");
  modal.id = "product-detail";
  modal.className = "product-detail";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="product-detail-backdrop" data-close-detail></div>
    <article class="product-detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <button class="detail-close" type="button" data-close-detail aria-label="關閉商品詳情">×</button>
      <div class="detail-gallery">
        <div class="detail-main-image"></div>
        <div class="detail-thumbs" aria-label="商品圖片選擇"></div>
      </div>
      <div class="detail-info">
        <p class="section-kicker detail-category"></p>
        <h2 id="detail-title"></h2>
        <p class="detail-description"></p>
        <div class="detail-note">下單前如需溝通設計，請先聯絡 MUWA 確認細節。</div>
        <strong class="detail-price"></strong>
        <div class="quantity-control" aria-label="數量">
          <button type="button" data-qty-minus aria-label="減少數量">−</button>
          <span data-qty>1</span>
          <button type="button" data-qty-plus aria-label="增加數量">+</button>
        </div>
        <p class="cart-message" data-cart-message aria-live="polite"></p>
        <div class="detail-actions">
          <button class="button secondary detail-cart" type="button" data-add-cart>加到購物車</button>
          <button class="button primary" type="button" data-detail-checkout>結帳</button>
        </div>
      </div>
      <div class="detail-tabs">
        <button class="is-active" type="button" data-tab="description">商品描述</button>
        <button type="button" data-tab="shipping">送貨及付款方式</button>
        <button type="button" data-tab="review">顧客評價</button>
      </div>
      <div class="detail-tab-panel" data-tab-panel></div>
    </article>
  `;
  document.body.appendChild(modal);
  return modal;
}

function ensureCartButton() {
  let button = document.querySelector("#cart-button");
  if (button) return button;

  button = document.createElement("button");
  button.id = "cart-button";
  button.className = "cart-button";
  button.type = "button";
  button.setAttribute("aria-label", "查看購物車");
  button.innerHTML = `
    <span class="cart-icon" aria-hidden="true">購物車</span>
    <span class="cart-count" data-cart-count>0</span>
  `;
  document.body.appendChild(button);
  button.addEventListener("click", openCart);
  return button;
}

function ensureCartModal() {
  let modal = document.querySelector("#cart-detail");
  if (modal) return modal;

  modal = document.createElement("section");
  modal.id = "cart-detail";
  modal.className = "cart-detail";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="cart-backdrop" data-close-cart></div>
    <article class="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <h2 id="cart-title">購物車</h2>
      <p>選擇想購買的商品與數量，結帳後請加入官方 LINE，跟 MUWA 討論細節。</p>
      <div class="cart-list" data-cart-list></div>
      <div class="cart-actions">
        <button class="button secondary" type="button" data-close-cart>回到上一頁</button>
        <button class="button primary" type="button" data-checkout>結帳</button>
      </div>
    </article>
  `;
  document.body.appendChild(modal);
  return modal;
}

function ensureLineModal() {
  let modal = document.querySelector("#line-checkout");
  if (modal) return modal;

  modal = document.createElement("section");
  modal.id = "line-checkout";
  modal.className = "line-checkout";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="line-backdrop" data-close-line></div>
    <article class="line-panel" role="dialog" aria-modal="true" aria-labelledby="line-title">
      <button class="detail-close" type="button" data-close-line aria-label="關閉 LINE 視窗">×</button>
      <h2 id="line-title">加入官方LINE，跟MUWA討論 !</h2>
      <img src="./assets/line-qr.jpg" alt="MUWA 官方 LINE QR Code" />
    </article>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openProductDetail(productIndex) {
  const product = productStore[Number(productIndex)];
  if (!product) return;

  activeProduct = product;
  activeImageIndex = 0;
  renderProductDetail();

  const modal = ensureProductModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
}

function closeProductDetail() {
  const modal = ensureProductModal();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".cart-detail.is-open") && !document.querySelector(".line-checkout.is-open")) {
    document.body.classList.remove("detail-open");
  }
}

function renderProductDetail() {
  const modal = ensureProductModal();
  const product = activeProduct;
  if (!product) return;

  const images = product.images.length ? product.images : [""];
  const activeImage = images[activeImageIndex] || images[0] || "";
  const buyLink = product.link || `mailto:muwa.to.sales@gmail.com?subject=${encodeURIComponent(`想詢問 ${product.name}`)}`;

  modal.querySelector(".detail-category").textContent = product.category || "全部";
  modal.querySelector("#detail-title").textContent = product.name || "MUWA 商品";
  modal.querySelector(".detail-description").textContent = product.description || "商品介紹準備中。";
  modal.querySelector(".detail-price").textContent = product.price || "價格請私訊";
  modal.querySelector("[data-qty]").textContent = "1";
  modal.querySelector("[data-cart-message]").textContent = "";
  modal.querySelector(".detail-main-image").innerHTML = activeImage
    ? `<img src="${escapeHtml(activeImage)}" alt="${escapeHtml(product.name)}" style="object-position: ${escapeHtml(product.imagePosition || "50% 50%")}" />`
    : `<div class="detail-image-placeholder">MUWA</div>`;
  modal.querySelector(".detail-thumbs").innerHTML = images
    .map((image, index) => `
      <button class="${index === activeImageIndex ? "is-active" : ""}" type="button" data-image-index="${index}">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} 圖片 ${index + 1}" />` : "<span>MUWA</span>"}
      </button>
    `)
    .join("");

  renderDetailTab("description");
}

function getProductKey(product) {
  return String(product?.id || product?.name || "");
}

function addActiveProductToCart() {
  if (!activeProduct) return;
  const qty = Number(document.querySelector("[data-qty]")?.textContent || 1);
  const key = getProductKey(activeProduct);
  cartItems[key] = (cartItems[key] || 0) + qty;
  updateCartButton();
  const message = document.querySelector("[data-cart-message]");
  if (message) {
    message.textContent = `已加入購物車：${activeProduct.name} × ${cartItems[key]}`;
  }
}

function openCart() {
  const modal = ensureCartModal();
  renderCart();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
}

function closeCart() {
  const modal = ensureCartModal();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".product-detail.is-open") && !document.querySelector(".line-checkout.is-open")) {
    document.body.classList.remove("detail-open");
  }
}

function renderCart() {
  const modal = ensureCartModal();
  const list = modal.querySelector("[data-cart-list]");
  const selectedProducts = productStore.filter((product) => (cartItems[getProductKey(product)] || 0) > 0);
  if (!productStore.length) {
    list.innerHTML = "<p>目前沒有可購買商品。</p>";
    return;
  }

  if (!selectedProducts.length) {
    list.innerHTML = "<p>購物車目前是空的。可以回到商品頁加入想購買的商品。</p>";
    return;
  }

  const rows = selectedProducts
    .map((product) => {
      const key = getProductKey(product);
      const qty = cartItems[key] || 0;
      const subtotal = parsePrice(product.price) * qty;
      const image = product.images[0]
        ? `<img src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}" />`
        : `<span>MUWA</span>`;

      return `
        <article class="cart-row">
          <div class="cart-row-image">${image}</div>
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.price || "價格請私訊")} / 小計 ${escapeHtml(formatMoney(subtotal))}</p>
          </div>
          <div class="cart-qty">
            <button type="button" data-cart-minus="${escapeHtml(key)}">−</button>
            <span>${qty}</span>
            <button type="button" data-cart-plus="${escapeHtml(key)}">+</button>
          </div>
        </article>
      `;
    })
    .join("");
  const total = selectedProducts.reduce((sum, product) => {
    return sum + parsePrice(product.price) * (cartItems[getProductKey(product)] || 0);
  }, 0);
  list.innerHTML = `${rows}<div class="cart-total"><span>總共</span><strong>${escapeHtml(formatMoney(total))}</strong></div>`;
}

function updateCartButton() {
  const button = ensureCartButton();
  const count = Object.values(cartItems).reduce((sum, qty) => sum + Number(qty || 0), 0);
  button.querySelector("[data-cart-count]").textContent = String(count);
  button.classList.toggle("has-items", count > 0);
}

function openLineCheckout() {
  const modal = ensureLineModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
}

function closeLineCheckout() {
  const modal = ensureLineModal();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".product-detail.is-open") && !document.querySelector(".cart-detail.is-open")) {
    document.body.classList.remove("detail-open");
  }
}

function renderDetailTab(tabName) {
  const modal = ensureProductModal();
  const product = activeProduct;
  const panel = modal.querySelector("[data-tab-panel]");
  if (!product || !panel) return;

  modal.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabName);
  });

  const content = {
    description: `
      <h3>商品描述</h3>
      <p>${escapeHtml(product.detailDescription || product.description || "商品介紹準備中。")}</p>
      <p>每件商品會依照實際製作狀態上架，若需要確認尺寸、材質或設計細節，建議下單後主動聯絡 MUWA。</p>
    `,
    shipping: `
      <h3>送貨及付款方式</h3>
      <p>${escapeHtml(product.shippingInfo || "MUWA 為小型個人工作室，需溝通設計的商品，請下單後主動聯絡 Line 官方，勿擅自先付款。")}</p>
    `,
    review: `
      <h3>顧客評價</h3>
      <p>${escapeHtml(product.reviewInfo || "評價區準備中。等商品正式累積回饋後，會陸續補上大家的使用心得。")}</p>
    `,
  };

  panel.innerHTML = content[tabName] || content.description;
}

if (productGrid) {
  productGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-product-index]");
    if (!button) return;
    openProductDetail(button.dataset.productIndex);
  });
}

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-detail]");
  if (closeButton) closeProductDetail();

  const addCartButton = event.target.closest("[data-add-cart]");
  if (addCartButton) addActiveProductToCart();

  const detailCheckoutButton = event.target.closest("[data-detail-checkout]");
  if (detailCheckoutButton) openLineCheckout();

  const closeCartButton = event.target.closest("[data-close-cart]");
  if (closeCartButton) closeCart();

  const checkoutButton = event.target.closest("[data-checkout]");
  if (checkoutButton) openLineCheckout();

  const closeLineButton = event.target.closest("[data-close-line]");
  if (closeLineButton) closeLineCheckout();

  const cartPlus = event.target.closest("[data-cart-plus]");
  if (cartPlus) {
    const key = cartPlus.dataset.cartPlus;
    cartItems[key] = (cartItems[key] || 0) + 1;
    updateCartButton();
    renderCart();
  }

  const cartMinus = event.target.closest("[data-cart-minus]");
  if (cartMinus) {
    const key = cartMinus.dataset.cartMinus;
    cartItems[key] = Math.max(0, (cartItems[key] || 0) - 1);
    updateCartButton();
    renderCart();
  }

  const imageButton = event.target.closest("[data-image-index]");
  if (imageButton && activeProduct) {
    activeImageIndex = Number(imageButton.dataset.imageIndex);
    renderProductDetail();
  }

  const tabButton = event.target.closest("[data-tab]");
  if (tabButton) renderDetailTab(tabButton.dataset.tab);

  const qty = event.target.closest("[data-qty-plus], [data-qty-minus]");
  if (qty) {
    const qtyNode = document.querySelector("[data-qty]");
    const current = Number(qtyNode.textContent || 1);
    const next = qty.matches("[data-qty-plus]") ? current + 1 : Math.max(1, current - 1);
    qtyNode.textContent = String(next);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLineCheckout();
    closeCart();
    closeProductDetail();
  }
});

if (wishlistForm) {
  wishlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(wishlistForm);
    const wishTitle = String(data.get("wishTitle") || "").trim();
    const wishDetail = String(data.get("wishDetail") || "").trim();
    const image = data.get("wishImage");
    const imageNote = image && image.name ? `，示意圖「${image.name}」也已放進參考` : "";
    const title = wishTitle || "這個商品想法";
    const endpoint = window.MUWA_CONFIG?.wishlistEndpoint || "";
    const message = wishlistForm.querySelector(".form-message");

    if (!endpoint) {
      message.textContent = "表單端點尚未設定。請先到 config.js 填入 Google Apps Script Web App URL。";
      return;
    }

    message.textContent = "送出中...";

    try {
      submitToGoogleScript(endpoint, {
        wishTitle: title,
        wishDetail,
        imageName: image && image.name ? image.name : "",
      });

      wishlistForm.reset();
      message.textContent = `${title} 已送出${imageNote}。請到 Google Sheet 確認是否新增資料。`;
    } catch {
      message.textContent = "送出失敗，請稍後再試，或直接來信 muwa.to.sales@gmail.com。";
    }
  });
}

loadProductFeed();
ensureCartButton();
updateCartButton();

function submitToGoogleScript(endpoint, payload) {
  const iframeName = `muwa_submit_${Date.now()}`;
  const iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.hidden = true;
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = endpoint;
  form.target = iframeName;
  form.hidden = true;

  Object.entries(payload).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();

  window.setTimeout(() => {
    form.remove();
    iframe.remove();
  }, 5000);
}
