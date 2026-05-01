import {
  getCustomers,
  getProducts,
  updateCustomer,
  getISOWeekId,
  getOrdersByWeek,
  getOrderItemsByOrderIds,
  ensureOrder,
  setOrderItem,
  deleteOrder,
} from "./storage.js";

const container = document.querySelector("#mainTab");

let state = {
  currentDate: new Date(),
  weekId: getISOWeekId(new Date()),
  customers: [],
  products: [],
  orders: [],
  items: [],
  draftRows: [],
  unlockedWeeks: new Set(),
};

export async function initMainTable() {
  await loadData();
  render();
}

async function loadData() {
  const [customers, products] = await Promise.all([getCustomers(), getProducts()]);

  state.customers = customers;
  state.products = products.filter((product) => product.active);
  state.orders = await getOrdersByWeek(state.weekId);

  const orderIds = state.orders.map((order) => order.id);
  state.items = await getOrderItemsByOrderIds(orderIds);
}

function setWeekFromDate(date) {
  state.currentDate = date;
  state.weekId = getISOWeekId(date);
  state.draftRows = [];
}

async function goToPreviousWeek() {
  const date = new Date(state.currentDate);
  date.setDate(date.getDate() - 7);
  setWeekFromDate(date);

  await loadData();
  render();
}

async function goToNextWeek() {
  const date = new Date(state.currentDate);
  date.setDate(date.getDate() + 7);
  setWeekFromDate(date);

  await loadData();
  render();
}

async function goToCurrentWeek() {
  setWeekFromDate(new Date());

  await loadData();
  render();
}

function isCurrentWeek() {
  return state.weekId === getISOWeekId(new Date());
}

function isWeekUnlocked() {
  return isCurrentWeek() || state.unlockedWeeks.has(state.weekId);
}

function toggleWeekLock() {
  if (isCurrentWeek()) return;

  if (state.unlockedWeeks.has(state.weekId)) {
    state.unlockedWeeks.delete(state.weekId);
  } else {
    state.unlockedWeeks.add(state.weekId);
  }

  render();
}

function getCustomerById(customerId) {
  return state.customers.find((customer) => customer.id === customerId);
}

function getVisibleOrders() {
  return state.orders
    .map((order) => ({
      ...order,
      customer: getCustomerById(order.customerId),
    }))
    .filter((order) => order.customer)
    .sort((a, b) => (a.customer.order ?? 0) - (b.customer.order ?? 0));
}

function getAvailableCustomers() {
  const usedCustomerIds = new Set(state.orders.map((order) => order.customerId));

  return state.customers.filter(
    (customer) => customer.active && !usedCustomerIds.has(customer.id),
  );
}

function getCellItems(orderId, productId) {
  return state.items.filter(
    (item) =>
      item.orderId === orderId &&
      item.productId === productId &&
      Number(item.quantity) > 0,
  );
}

function getPackagingName(productId, packagingId) {
  const product = state.products.find((item) => item.id === productId);
  const packaging = (product?.packaging || []).find((item) => item.id === packagingId);

  return packaging?.name || "";
}

function getExistingQuantity(orderId, productId, packagingId) {
  const item = state.items.find(
    (item) =>
      item.orderId === orderId &&
      item.productId === productId &&
      item.packagingId === packagingId,
  );

  return item?.quantity || "";
}

function renderCell(orderId, productId) {
  const items = getCellItems(orderId, productId);

  if (!items.length) {
    return `<span class="empty-cell">—</span>`;
  }

  return items
    .map(
      (item) => `
        <div class="cell-line">
          <span>${getPackagingName(productId, item.packagingId)}</span>
          <strong>${item.quantity}</strong>
        </div>
      `,
    )
    .join("");
}

function renderDraftRow(draftRow) {
  return `
    <div class="order-grid-row draft-row" data-draft-row="${draftRow.id}">
      <div class="order-grid-cell customer-cell">
        <div class="customer-autocomplete">
          <input
            type="text"
            placeholder="Begynn å skrive kundenavn..."
            autocomplete="off"
            data-draft-customer-input="${draftRow.id}"
          />
        </div>
      </div>

      ${state.products
        .map(() => `<div class="order-grid-cell draft-cell">—</div>`)
        .join("")}

      <div class="order-grid-cell actions-cell">—</div>
    </div>
  `;
}

function render() {
  const productCount = state.products.length;
  const visibleOrders = getVisibleOrders();
  const canEdit = isWeekUnlocked();

  container.innerHTML = `
    <section class="main-table-view ${canEdit ? "" : "week-locked"}">
      <div class="main-table-toolbar">
        <div>
          <h2>Bestillinger</h2>
          <p>
            Uke: <strong>${state.weekId}</strong>
            ${
              canEdit
                ? `<span class="week-status unlocked">Ulåst</span>`
                : `<span class="week-status locked">Låst</span>`
            }
          </p>
        </div>

        <div class="week-controls">
          <button type="button" id="previousWeekBtn">← Forrige</button>
          <button type="button" id="currentWeekBtn">Nåværende</button>
          <button type="button" id="nextWeekBtn">Neste →</button>

          ${
            isCurrentWeek()
              ? ""
              : `
                <button type="button" id="toggleWeekLockBtn">
                  ${canEdit ? "🔓 Lås" : "🔒 Lås opp"}
                </button>
              `
          }
        </div>

        <button type="button" id="addRowBtn" ${canEdit ? "" : "disabled"}>
          + Legg til row
        </button>
      </div>

      ${
        canEdit
          ? ""
          : `
            <div class="locked-week-message">
              🔒 Denne uken er låst. Lås opp for å redigere gamle data.
            </div>
          `
      }

      <div class="order-grid" style="--product-count: ${productCount};">
        <div class="order-grid-header order-grid-row">
          <div class="order-grid-cell customer-cell">Kunde</div>

          ${state.products
            .map(
              (product) => `
                <div class="order-grid-cell product-header-cell">
                  ${product.name}
                </div>
              `,
            )
            .join("")}

          <div class="order-grid-cell actions-cell">Handlinger</div>
        </div>

        <div class="order-grid-body">
          ${visibleOrders
            .map(
              (order) => `
                <div
                  class="order-grid-row customer-row"
                  ${canEdit ? `draggable="true"` : ""}
                  data-customer-row="${order.customerId}"
                >
                  <div class="order-grid-cell customer-cell">
                    <span class="drag-handle ${canEdit ? "" : "disabled-handle"}">☰</span>
                    <strong>${order.customer.name}</strong>
                  </div>

                  ${state.products
                    .map((product) => {
                      const hasItems = getCellItems(order.id, product.id).length > 0;

                      return `
                        <button
                          type="button"
                          class="order-grid-cell order-cell ${hasItems ? "filled-cell" : ""}"
                          data-order-cell="${order.id}:${product.id}"
                          ${canEdit ? "" : "disabled"}
                        >
                          ${renderCell(order.id, product.id)}
                        </button>
                      `;
                    })
                    .join("")}

                  <div class="order-grid-cell actions-cell">
                    <button
                      type="button"
                      class="remove-row-btn"
                      data-remove-order="${order.id}"
                      title="Fjern rad"
                      ${canEdit ? "" : "disabled"}
                    >
                      ×
                    </button>
                  </div>
                </div>
              `,
            )
            .join("")}

          ${canEdit ? state.draftRows.map(renderDraftRow).join("") : ""}

          ${
            !visibleOrders.length && (!canEdit || !state.draftRows.length)
              ? `
                <div class="empty-main-table">
                  ${canEdit ? "Klikk Legg til row for å legge til en kunde for denne uken." : "Ingen rader for denne uken."}
                </div>
              `
              : ""
          }
        </div>
      </div>

      <div id="customerSuggestionPortal" class="customer-suggestions hidden"></div>
      <div id="orderModal" class="order-modal hidden"></div>
    </section>
  `;

  bindEvents();
}

function bindEvents() {
  document.querySelector("#previousWeekBtn").addEventListener("click", goToPreviousWeek);
  document.querySelector("#currentWeekBtn").addEventListener("click", goToCurrentWeek);
  document.querySelector("#nextWeekBtn").addEventListener("click", goToNextWeek);

  const toggleWeekLockBtn = document.querySelector("#toggleWeekLockBtn");

  if (toggleWeekLockBtn) {
    toggleWeekLockBtn.addEventListener("click", toggleWeekLock);
  }

  const addRowBtn = document.querySelector("#addRowBtn");

  if (!addRowBtn.disabled) {
    addRowBtn.addEventListener("click", () => {
      state.draftRows.push({
        id: crypto.randomUUID(),
      });

      render();
    });
  }

  if (!isWeekUnlocked()) return;

  bindCustomerAutocomplete();

  document.querySelectorAll("[data-order-cell]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const [orderId, productId] = cell.dataset.orderCell.split(":");
      openOrderModal(orderId, productId);
    });
  });

  document.querySelectorAll("[data-remove-order]").forEach((button) => {
    button.addEventListener("click", async () => {
      const orderId = button.dataset.removeOrder;

      const confirmed = confirm(
        "Fjerne denne raden fra gjeldende uke? Kunden blir værende i Innstillinger.",
      );

      if (!confirmed) return;

      await deleteOrder(orderId);

      await loadData();
      render();
    });
  });

  initRowDragAndDrop();
}

function bindCustomerAutocomplete() {
  const portal = document.querySelector("#customerSuggestionPortal");

  document.querySelectorAll("[data-draft-customer-input]").forEach((input) => {
    const draftRowId = input.dataset.draftCustomerInput;

    input.addEventListener("input", () => {
      renderCustomerSuggestions(portal, input, draftRowId);
    });

    input.addEventListener("focus", () => {
      renderCustomerSuggestions(portal, input, draftRowId);
    });

    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();

      const customerName = input.value.trim().toLowerCase();

      const customer = getAvailableCustomers().find(
        (item) => item.name.toLowerCase() === customerName,
      );

      if (!customer) return;

      await addCustomerToWeek(customer.id, draftRowId);
    });
  });

  portal.addEventListener("mousedown", async (event) => {
    const option = event.target.closest("[data-select-customer]");

    if (!option) return;

    event.preventDefault();
    event.stopPropagation();

    const [draftRowId, customerId] = option.dataset.selectCustomer.split(":");

    await addCustomerToWeek(customerId, draftRowId);
  });

  document.addEventListener("mousedown", (event) => {
    if (
      event.target.closest(".customer-autocomplete") ||
      event.target.closest("#customerSuggestionPortal")
    ) {
      return;
    }

    hideSuggestions(portal);
  });
}

function renderCustomerSuggestions(portal, input, draftRowId) {
  const query = input.value.trim().toLowerCase();

  if (!query) {
    hideSuggestions(portal);
    return;
  }

  const matches = getAvailableCustomers().filter((customer) =>
    customer.name.toLowerCase().startsWith(query),
  );

  positionSuggestionPortal(portal, input);

  if (!matches.length) {
    portal.innerHTML = `
      <div class="customer-suggestion-empty">
        Fant ingen kunde
      </div>
    `;

    portal.classList.remove("hidden");
    return;
  }

  portal.innerHTML = matches
    .map(
      (customer) => `
        <button
          type="button"
          class="customer-suggestion"
          data-select-customer="${draftRowId}:${customer.id}"
        >
          ${customer.name}
        </button>
      `,
    )
    .join("");

  portal.classList.remove("hidden");
}

async function addCustomerToWeek(customerId, draftRowId) {
  const portal = document.querySelector("#customerSuggestionPortal");

  await ensureOrder(customerId, state.weekId);

  state.draftRows = state.draftRows.filter((row) => row.id !== draftRowId);

  hideSuggestions(portal);

  await loadData();
  render();
}

function positionSuggestionPortal(portal, input) {
  const rect = input.getBoundingClientRect();

  portal.style.left = `${rect.left}px`;
  portal.style.top = `${rect.bottom + 4}px`;
  portal.style.width = `${rect.width}px`;
}

function hideSuggestions(portal) {
  portal.classList.add("hidden");
  portal.innerHTML = "";
}

function openOrderModal(orderId, productId) {
  const modal = document.querySelector("#orderModal");
  const product = state.products.find((item) => item.id === productId);

  if (!product) return;

  modal.classList.remove("hidden");

  modal.innerHTML = `
    <div class="order-modal-backdrop" data-close-modal></div>

    <div class="order-modal-card">
      <div class="order-modal-header">
        <div>
          <h3>${product.name}</h3>
          <p>Rediger antall per emballasje</p>
        </div>

        <button type="button" data-close-modal>×</button>
      </div>

      <form id="orderModalForm" class="order-modal-form">
        <div class="order-modal-table">
          <div class="order-modal-table-row order-modal-table-head">
            <div>Emballasje</div>
            <div>Vekt</div>
            <div>Antall</div>
          </div>

          ${
            product.packaging?.length
              ? product.packaging
                  .map(
                    (packaging) => `
                      <label class="order-modal-table-row">
                        <div>${packaging.name}</div>
                        <div>${packaging.weightGrams} g</div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            name="${packaging.id}"
                            value="${getExistingQuantity(
                              orderId,
                              product.id,
                              packaging.id,
                            )}"
                            placeholder="0"
                          />
                        </div>
                      </label>
                    `,
                  )
                  .join("")
              : `
                <div class="order-modal-empty">
                  Ingen emballasje registrert for dette produktet.
                </div>
              `
          }
        </div>

        <div class="order-modal-actions">
          <button type="button" class="secondary-btn" data-close-modal>Avbryt</button>
          <button type="submit">Lagre</button>
        </div>
      </form>
    </div>
  `;

  modal.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeOrderModal);
  });

  modal.querySelector("#orderModalForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    for (const packaging of product.packaging || []) {
      const input = event.target.elements[packaging.id];

      await setOrderItem({
        orderId,
        productId,
        packagingId: packaging.id,
        quantity: input.value || 0,
      });
    }

    closeOrderModal();

    await loadData();
    render();
  });
}

function closeOrderModal() {
  const modal = document.querySelector("#orderModal");
  modal.classList.add("hidden");
  modal.innerHTML = "";
}

function initRowDragAndDrop() {
  let draggedRow = null;

  document.querySelectorAll(".customer-row").forEach((row) => {
    row.addEventListener("dragstart", () => {
      draggedRow = row;
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", async () => {
      row.classList.remove("dragging");

      await saveCustomerRowOrder();

      draggedRow = null;

      await loadData();
      render();
    });

    row.addEventListener("dragover", (event) => {
      event.preventDefault();

      const body = document.querySelector(".order-grid-body");
      const afterElement = getDragAfterElement(body, event.clientY);

      if (!draggedRow) return;

      if (afterElement == null) {
        body.appendChild(draggedRow);
      } else {
        body.insertBefore(draggedRow, afterElement);
      }
    });
  });
}

async function saveCustomerRowOrder() {
  const rows = [...document.querySelectorAll(".customer-row")];

  const updates = rows.map((row, index) => {
    const customerId = row.dataset.customerRow;

    return updateCustomer(customerId, {
      order: index + 1,
    });
  });

  await Promise.all(updates);
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".customer-row:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset,
          element: child,
        };
      }

      return closest;
    },
    {
      offset: Number.NEGATIVE_INFINITY,
      element: null,
    },
  ).element;
}
