const PRODUCTS = {
  apple: { name: "Apple", emoji: "🍏" },
  banana: { name: "Banana", emoji: "🍌" },
  lemon: { name: "Lemon", emoji: "🍋" },
};

function getBasket() {
  try {
    const basket = localStorage.getItem("basket");
    if (!basket) return [];
    const parsed = JSON.parse(basket);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Error parsing basket from localStorage:", error);
    return [];
  }
}

function addToBasket(product) {
  const basket = getBasket();
  basket.push(product);
  localStorage.setItem("basket", JSON.stringify(basket));
}

function clearBasket() {
  localStorage.removeItem("basket");
}

function renderBasket() {
  const basket = getBasket();
  const basketList = document.getElementById("basketList");
  const cartButtonsRow = document.querySelector(".cart-buttons-row");
  if (!basketList) return;
  basketList.innerHTML = "";
  if (basket.length === 0) {
    basketList.innerHTML = "<li>No products in basket.</li>";
    if (cartButtonsRow) cartButtonsRow.style.display = "none";
    return;
  }
  // Separate regular products and requested items
  const regular = [];
  const requested = [];
  basket.forEach((product, idx) => {
    if (product && typeof product === "object" && product.__requested) {
      requested.push({ product, idx });
    } else {
      regular.push({ product, idx });
    }
  });

  // Render regular products
  regular.forEach(({ product, idx }) => {
    const item = PRODUCTS[product];
    const li = document.createElement("li");
    if (item) {
      li.innerHTML = `
        <div class="order-row">
          <span><span class='basket-emoji'>${item.emoji}</span> <span>${item.name}</span></span>
          <span class="item-actions"><button data-remove-index="${idx}" class="remove-btn">Remove</button></span>
        </div>`;
    } else {
      li.textContent = String(product);
    }
    basketList.appendChild(li);
  });

  // Separator for requested items
  if (requested.length > 0) {
    const sep = document.createElement("li");
    sep.innerHTML = "<strong>Requested items</strong>";
    basketList.appendChild(sep);
  }

  // Render requested items with edit/remove and notification text
  requested.forEach(({ product, idx }) => {
    const li = document.createElement("li");
    const refLink = product.link
      ? `<div><a href="${product.link}" target="_blank" rel="noopener">Reference</a></div>`
      : "";
    li.innerHTML = `
      <div class="order-row">
        <span><span class='basket-emoji'>📝</span> <span>${escapeHtml(product.name)}</span></span>
        <span class="item-actions">
          <button data-edit-index="${idx}" class="edit-btn">Edit</button>
          <button data-remove-index="${idx}" class="remove-btn">Remove</button>
        </span>
      </div>
      <div class="requested-desc">${escapeHtml(product.description || "")}</div>
      ${refLink}
      <div class="requested-note">Requested item — staff will contact you to confirm availability.</div>
    `;
    basketList.appendChild(li);
  });

  // attach listeners for remove/edit
  basketList.querySelectorAll("button[data-remove-index]").forEach((b) => {
    b.onclick = function () {
      const i = Number(this.getAttribute("data-remove-index"));
      removeFromBasket(i);
      renderBasket();
    };
  });
  basketList.querySelectorAll("button[data-edit-index]").forEach((b) => {
    b.onclick = function () {
      const i = Number(this.getAttribute("data-edit-index"));
      const basket = getBasket();
      showRequestModal(basket[i], i);
    };
  });
  if (cartButtonsRow) cartButtonsRow.style.display = "flex";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function removeFromBasket(index) {
  const basket = getBasket();
  if (index >= 0 && index < basket.length) {
    basket.splice(index, 1);
    localStorage.setItem("basket", JSON.stringify(basket));
    renderBasketIndicator();
  }
}

function updateBasketAt(index, value) {
  const basket = getBasket();
  if (index >= 0 && index < basket.length) {
    basket[index] = value;
    localStorage.setItem("basket", JSON.stringify(basket));
    renderBasket();
    renderBasketIndicator();
  }
}

// Create floating request button and modal
function ensureRequestModal() {
  if (document.getElementById("requestModal")) return;
  const modal = document.createElement("div");
  modal.id = "requestModal";
  modal.className = "request-modal";
  modal.innerHTML = `
    <div class="request-modal-backdrop"></div>
    <div class="request-modal-panel">
      <h2>Request a Product</h2>
      <div class="form-group">
        <label for="reqName">Product name</label>
        <input id="reqName" type="text" />
      </div>
      <div class="form-group">
        <label for="reqDesc">Description</label>
        <input id="reqDesc" type="text" />
      </div>
      <div class="form-group">
        <label for="reqLink">Reference link (optional)</label>
        <input id="reqLink" type="text" />
      </div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button id="reqSubmit">Submit Request</button>
        <button id="reqCancel">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.querySelector(".request-modal-backdrop").onclick = hideRequestModal;
  modal.querySelector("#reqCancel").onclick = hideRequestModal;
}

function showRequestModal(data = null, editIndex = null) {
  ensureRequestModal();
  const modal = document.getElementById("requestModal");
  modal.style.display = "block";
  const name = document.getElementById("reqName");
  const desc = document.getElementById("reqDesc");
  const link = document.getElementById("reqLink");
  name.value = data && data.name ? data.name : "";
  desc.value = data && data.description ? data.description : "";
  link.value = data && data.link ? data.link : "";

  const submit = document.getElementById("reqSubmit");
  const handler = function () {
    const obj = {
      __requested: true,
      id: data && data.id ? data.id : Date.now(),
      name: name.value || "Requested product",
      description: desc.value || "",
      link: link.value || "",
    };
    if (editIndex !== null && editIndex !== undefined) {
      updateBasketAt(editIndex, obj);
    } else {
      // use window.addToBasket so indicator is updated
      window.addToBasket(obj);
    }
    hideRequestModal();
    renderBasket();
  };
  submit.onclick = handler;
}

function hideRequestModal() {
  const modal = document.getElementById("requestModal");
  if (modal) modal.style.display = "none";
}

// floating button
function ensureRequestButton() {
  if (document.getElementById("requestFloatingBtn")) return;
  const btn = document.createElement("button");
  btn.id = "requestFloatingBtn";
  btn.className = "request-floating-btn";
  btn.textContent = "Request Item";
  btn.onclick = () => showRequestModal();
  document.body.appendChild(btn);
}

// init modal/button on DOM ready
if (document.readyState !== "loading") {
  ensureRequestButton();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    ensureRequestButton();
  });
}

function renderBasketIndicator() {
  const basket = getBasket();
  let indicator = document.querySelector(".basket-indicator");
  if (!indicator) {
    const basketLink = document.querySelector(".basket-link");
    if (!basketLink) return;
    indicator = document.createElement("span");
    indicator.className = "basket-indicator";
    basketLink.appendChild(indicator);
  }
  if (basket.length > 0) {
    indicator.textContent = basket.length;
    indicator.style.display = "flex";
  } else {
    indicator.style.display = "none";
  }
}

// Call this on page load and after basket changes
if (document.readyState !== "loading") {
  renderBasketIndicator();
} else {
  document.addEventListener("DOMContentLoaded", renderBasketIndicator);
}

// Patch basket functions to update indicator
const origAddToBasket = window.addToBasket;
window.addToBasket = function (product) {
  origAddToBasket(product);
  renderBasketIndicator();
};
const origClearBasket = window.clearBasket;
window.clearBasket = function () {
  origClearBasket();
  renderBasketIndicator();
};
