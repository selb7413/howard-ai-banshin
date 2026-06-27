const PRODUCTS_KEY = "muwa-products";

const productGrid = document.querySelector("#product-grid");
const wishlistForm = document.querySelector(".wishlist-form");

function loadProducts() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProducts() {
  if (!productGrid) return;

  const products = loadProducts();
  if (!products.length) {
    productGrid.innerHTML = `
      <div class="empty-products">
        <h3>商品準備中</h3>
        <p>目前還沒有正式上架的商品。新品準備好後，會在這裡公布。</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = products
    .map((product) => {
      const image = product.image
        ? `<img src="${product.image}" alt="${escapeHtml(product.name)}" />`
        : `<span></span>`;
      const price = product.price ? `<strong>${escapeHtml(product.price)}</strong>` : "";
      const link = product.link
        ? `<a class="product-link" href="${escapeHtml(product.link)}" target="_blank" rel="noreferrer">查看商品</a>`
        : "";

      return `
        <article class="product-card">
          <div class="product-visual ${product.image ? "has-image" : "visual-bowl"}" aria-hidden="${product.image ? "false" : "true"}">
            ${image}
          </div>
          <div class="product-copy">
            <p>${escapeHtml(product.category || "全部")}</p>
            <h3>${escapeHtml(product.name)}</h3>
            <span>${escapeHtml(product.description)}</span>
            <div class="product-meta">
              ${price}
              ${link}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

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

renderProducts();

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
