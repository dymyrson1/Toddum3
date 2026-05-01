import {
  getProducts,
  getISOWeekId,
  getOrdersByWeek,
  getOrderItemsByOrderIds,
} from "./storage.js";

const container = document.querySelector("#rapportTab");

let state = {
  currentDate: new Date(),
  weekId: getISOWeekId(new Date()),
  products: [],
  orders: [],
  items: [],
};

export async function initRapport() {
  await loadData();
  render();
}

async function loadData() {
  state.products = await getProducts();
  state.orders = await getOrdersByWeek(state.weekId);

  const orderIds = state.orders.map((order) => order.id);
  state.items = await getOrderItemsByOrderIds(orderIds);
}

function setWeekFromDate(date) {
  state.currentDate = date;
  state.weekId = getISOWeekId(date);
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

function getPackagingById(product, packagingId) {
  return (product.packaging || []).find((packaging) => packaging.id === packagingId);
}

function buildRapportRows() {
  return state.products
    .filter((product) => product.active)
    .map((product) => {
      const productItems = state.items.filter(
        (item) => item.productId === product.id && Number(item.quantity) > 0
      );

      const packagingMap = new Map();

      productItems.forEach((item) => {
        const packaging = getPackagingById(product, item.packagingId);

        if (!packaging) return;

        const current = packagingMap.get(packaging.id) || {
          id: packaging.id,
          name: packaging.name,
          weightGrams: Number(packaging.weightGrams || 0),
          quantity: 0,
          totalWeightGrams: 0,
        };

        const quantity = Number(item.quantity || 0);

        current.quantity += quantity;
        current.totalWeightGrams += quantity * Number(packaging.weightGrams || 0);

        packagingMap.set(packaging.id, current);
      });

      const packagingRows = [...packagingMap.values()];

      const totalUnits = packagingRows.reduce((sum, row) => sum + row.quantity, 0);

      const totalWeightGrams = packagingRows.reduce(
        (sum, row) => sum + row.totalWeightGrams,
        0
      );

      return {
        productId: product.id,
        productName: product.name,
        packagingRows,
        totalUnits,
        totalWeightGrams,
      };
    })
    .filter((row) => row.totalUnits > 0 || row.totalWeightGrams > 0);
}

function formatWeight(grams) {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }

  return `${grams} g`;
}

function renderPackagingBreakdown(packagingRows) {
  if (!packagingRows.length) {
    return `<span class="rapport-empty">—</span>`;
  }

  return packagingRows
    .map(
      (row) => `
        <div class="rapport-packaging-line">
          <span>
            <strong>${row.name}</strong>
            <small>${row.weightGrams} g</small>
          </span>

          <span>${row.quantity} stk</span>
          <span>${formatWeight(row.totalWeightGrams)}</span>
        </div>
      `
    )
    .join("");
}

function render() {
  const rows = buildRapportRows();

  const totalUnits = rows.reduce((sum, row) => sum + row.totalUnits, 0);

  const totalWeightGrams = rows.reduce(
    (sum, row) => sum + row.totalWeightGrams,
    0
  );

  container.innerHTML = `
    <section class="rapport-view">
      <div class="rapport-toolbar">
        <div>
          <h2>Rapport</h2>
          <p>Week: <strong>${state.weekId}</strong></p>
        </div>

        <div class="week-controls">
          <button type="button" id="rapportPreviousWeekBtn">Previous week</button>
          <button type="button" id="rapportCurrentWeekBtn">Current week</button>
          <button type="button" id="rapportNextWeekBtn">Next week</button>
        </div>
      </div>

      <div class="rapport-summary">
        <div class="rapport-summary-card">
          <span>Total units</span>
          <strong>${totalUnits}</strong>
        </div>

        <div class="rapport-summary-card">
          <span>Total weight</span>
          <strong>${formatWeight(totalWeightGrams)}</strong>
        </div>
      </div>

      <div class="rapport-table">
        <div class="rapport-table-header rapport-table-row">
          <div>Product</div>
          <div>Packaging breakdown</div>
          <div>Total units</div>
          <div>Total weight</div>
        </div>

        <div class="rapport-table-body">
          ${
            rows.length
              ? rows
                  .map(
                    (row) => `
                      <div class="rapport-table-row">
                        <div class="rapport-product-name">
                          ${row.productName}
                        </div>

                        <div>
                          ${renderPackagingBreakdown(row.packagingRows)}
                        </div>

                        <div>
                          <strong>${row.totalUnits}</strong>
                        </div>

                        <div>
                          <strong>${formatWeight(row.totalWeightGrams)}</strong>
                        </div>
                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="rapport-empty-state">
                  No production data for this week.
                </div>
              `
          }
        </div>
      </div>
    </section>
  `;

  bindEvents();
}

function bindEvents() {
  document
    .querySelector("#rapportPreviousWeekBtn")
    .addEventListener("click", goToPreviousWeek);

  document
    .querySelector("#rapportCurrentWeekBtn")
    .addEventListener("click", goToCurrentWeek);

  document
    .querySelector("#rapportNextWeekBtn")
    .addEventListener("click", goToNextWeek);
}