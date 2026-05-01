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
  weekId: getISOWeekId(),
  customers: [],
  products: [],
  orders: [],
  items: [],
  draftRows: [],
};

export async function initMainTable() {
  await loadData();
  render();
}

async function loadData() {
  const [customers, products] = await Promise.all([
    getCustomers(),
    getProducts(),
  ]);

  state.customers = customers;
  state.products = products.filter((product) => product.active);
  state.orders = await getOrdersByWeek(state.weekId);

  const orderIds = state.orders.map((order) => order.id);
  state.items = await getOrderItemsByOrderIds(orderIds);
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
    (customer) => customer.active && !usedCustomerIds.has(customer.id)
  );
}

function getCellItems(orderId, productId) {
  return state.items.filter(
    (item) =>
      item.orderId === orderId &&
      item.productId === productId &&
      Number(item.quantity) > 0
  );
}

function getPackagingName(productId, packagingId) {
  const product = state.products.find((item) => item.id === productId);
  const packaging = (product?.packaging || []).find(
    (item) => item.id === packagingId
  );

  return packaging?.name || "";
}

function getExistingQuantity(orderId, productId, packagingId) {
  const item = state.items.find(
    (item) =>
      item.orderId === orderId &&
      item.productId === productId &&
      item.packagingId === packagingId
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
      `
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
            placeholder="Start typing customer..."
            autocomplete="off"
            data-draft-customer-input="${draftRow.id}"
          />
        </div>
      </div>

      ${state.products
        .map(
          () => `
            <div class="order-grid-cell draft-cell">
              —
            </div>
          `
        )
        .join("")}

      <div class="order-grid-cell actions-cell">
        —
      </div>
    </div>
  `;
}

function render() {
  const productCount = state.products.length;
  const totalColumns = productCount + 2; // customer + products + actions
  const visibleOrders = getVisibleOrders();

  container.innerHTML = `
    <section class="main-table-view">
      <div class="main-table-toolbar">
        <div>
          <h2>Main table</h2>
          <p>Week: <strong>${state.weekId}</strong></p>
        </div>

        <button type="button" id="addRowBtn">Add row</button>
      </div>

      <div class="order-grid" style="--product-count: ${productCount};">
        <!-- HEADER -->
        <div class="order-grid-header order-grid-row">
          <div class="order-grid-cell customer-cell">Customer</div>

          ${state.products
            .map(
              (product) => `
                <div class="order-grid-cell product-header-cell">
                  ${product.name}
                </div>
              `
            )
            .join("")}

          <div class="order-grid-cell actions-cell">Actions</div>
        </div>

        <!-- BODY -->
        <div class="order-grid-body">
          ${visibleOrders
            .map(
              (order) => `
                <div
                  class="order-grid-row customer-row"
                  draggable="true"
                  data-customer-row="${order.customerId}"
                >
                  <div class="order-grid-cell customer-cell">
                    <span class="drag-handle">☰</span>
                    <strong>${order.customer.name}</strong>
                  </div>

                  ${state.products
                    .map(
                      (product) => `
                        <button
                          type="button"
                          class="order-grid-cell order-cell"
                          data-order-cell="${order.id}:${product.id}"
                        >
                          ${renderCell(order.id, product.id)}
                        </button>
                      `
                    )
                    .join("")}

                  <div class="order-grid-cell actions-cell">
                    <button
                      type="button"
                      class="remove-row-btn"
                      data-remove-order="${order.id}"
                    >
                      ×
                    </button>
                  </div>
                </div>
              `
            )
            .join("")}

          ${state.draftRows.map(renderDraftRow).join("")}

          ${
            !visibleOrders.length && !state.draftRows.length
              ? `
                <div class="empty-main-table">
                  Click Add row to add a customer for this week.
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
  document.querySelector("#addRowBtn").addEventListener("click", () => {
    state.draftRows.push({
      id: crypto.randomUUID(),
    });

    render();
  });

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
        "Remove this row from the current week? Customer will remain in Settings."
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
      const query = input.value.trim().toLowerCase();

      if (!query) {
        hideSuggestions(portal);
        return;
      }

      const matches = getAvailableCustomers().filter((customer) =>
        customer.name.toLowerCase().startsWith(query)
      );

      positionSuggestionPortal(portal, input);

      if (!matches.length) {
        portal.innerHTML = `
          <div class="customer-suggestion-empty">
            No customer found
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
          `
        )
        .join("");

      portal.classList.remove("hidden");

      portal.querySelectorAll("[data-select-customer]").forEach((button) => {
        button.addEventListener("click", async () => {
          const [, customerId] = button.dataset.selectCustomer.split(":");

          await ensureOrder(customerId, state.weekId);

          state.draftRows = state.draftRows.filter(
            (row) => row.id !== draftRowId
          );

          hideSuggestions(portal);

          await loadData();
          render();
        });
      });
    });

    input.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();

      const customerName = input.value.trim().toLowerCase();

      const customer = getAvailableCustomers().find(
        (item) => item.name.toLowerCase() === customerName
      );

      if (!customer) return;

      await ensureOrder(customer.id, state.weekId);

      state.draftRows = state.draftRows.filter((row) => row.id !== draftRowId);

      hideSuggestions(portal);

      await loadData();
      render();
    });

    input.addEventListener("focus", () => {
      const query = input.value.trim().toLowerCase();

      if (!query) return;

      positionSuggestionPortal(portal, input);
      portal.classList.remove("hidden");
    });
  });

  document.addEventListener("click", (event) => {
    if (
      event.target.closest(".customer-autocomplete") ||
      event.target.closest("#customerSuggestionPortal")
    ) {
      return;
    }

    hideSuggestions(portal);
  });
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
        <h3>${product.name}</h3>
        <button type="button" data-close-modal>×</button>
      </div>

      <form id="orderModalForm" class="order-modal-form">
        ${
          product.packaging?.length
            ? product.packaging
                .map(
                  (packaging) => `
                    <label class="order-modal-row">
                      <span>
                        <strong>${packaging.name}</strong>
                        <small>${packaging.weightGrams} g</small>
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        name="${packaging.id}"
                        value="${getExistingQuantity(
                          orderId,
                          productId,
                          packaging.id
                        )}"
                        placeholder="0"
                      />
                    </label>
                  `
                )
                .join("")
            : `
              <p class="empty-cell">
                No packaging registered for this product.
              </p>
            `
        }

        <div class="order-modal-actions">
          <button type="button" data-close-modal>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  `;

  modal.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", closeOrderModal);
  });

  modal
    .querySelector("#orderModalForm")
    .addEventListener("submit", async (event) => {
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
    }
  ).element;
}