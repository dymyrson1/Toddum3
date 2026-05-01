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

async function goToNåværendeWeek() {
  setWeekFromDate(new Date());

  await loadData();
  render();
}

function getEmballasjeById(product, packagingId) {
  return (product.packaging || []).find((packaging) => packaging.id === packagingId);
}

function buildRapportRows() {
  return state.products
    .filter((product) => product.active)
    .map((product) => {
      const productItems = state.items.filter(
        (item) => item.productId === product.id && Number(item.quantity) > 0,
      );

      const packagingMap = new Map();

      productItems.forEach((item) => {
        const packaging = getEmballasjeById(product, item.packagingId);

        if (!packaging) return;

        const current = packagingMap.get(packaging.id) || {
          id: packaging.id,
          name: packaging.name,
          weightGrams: Number(packaging.weightGrams || 0),
          quantity: 0,
          totalVektGrams: 0,
        };

        const quantity = Number(item.quantity || 0);

        current.quantity += quantity;
        current.totalVektGrams += quantity * Number(packaging.weightGrams || 0);

        packagingMap.set(packaging.id, current);
      });

      const packagingRows = [...packagingMap.values()];

      const totalUnits = packagingRows.reduce((sum, row) => sum + row.quantity, 0);

      const totalVektGrams = packagingRows.reduce(
        (sum, row) => sum + row.totalVektGrams,
        0,
      );

      return {
        productId: product.id,
        productNavn: product.name,
        packagingRows,
        totalUnits,
        totalVektGrams,
      };
    })
    .filter((row) => row.totalUnits > 0 || row.totalVektGrams > 0);
}

function formatVekt(grams) {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }

  return `${grams} g`;
}

function renderEmballasjeBreakdown(packagingRows) {
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
          <span>${formatVekt(row.totalVektGrams)}</span>
        </div>
      `,
    )
    .join("");
}

function render() {
  const rows = buildRapportRows();

  const totalUnits = rows.reduce((sum, row) => sum + row.totalUnits, 0);

  const totalVektGrams = rows.reduce((sum, row) => sum + row.totalVektGrams, 0);

  container.innerHTML = `
    <section class="rapport-view">
      <div class="rapport-toolbar">
        <div>
          <h2>Rapport</h2>
          <p>Uke: <strong>${state.weekId}</strong></p>
        </div>

        <div class="week-controls">
          <button type="button" id="rapportPreviousWeekBtn">Forrige uke</button>
          <button type="button" id="rapportNåværendeWeekBtn">Nåværende week</button>
          <button type="button" id="rapportNextWeekBtn">Neste uke</button>
        </div>
      </div>

      <div class="rapport-summary">
        <div class="rapport-summary-card">
          <span>Totalt antall</span>
          <strong>${totalUnits}</strong>
        </div>

        <div class="rapport-summary-card">
          <span>Total vekt</span>
          <strong>${formatVekt(totalVektGrams)}</strong>
        </div>
      </div>

      <div class="rapport-table">
        <div class="rapport-table-header rapport-table-row">
          <div>Produkt</div>
          <div>Emballasje breakdown</div>
          <div>Totalt antall</div>
          <div>Total vekt</div>
        </div>

        <div class="rapport-table-body">
          ${
            rows.length
              ? rows
                  .map(
                    (row) => `
                      <div class="rapport-table-row">
                        <div class="rapport-product-name">
                          ${row.productNavn}
                        </div>

                        <div>
                          ${renderEmballasjeBreakdown(row.packagingRows)}
                        </div>

                        <div>
                          <strong>${row.totalUnits}</strong>
                        </div>

                        <div>
                          <strong>${formatVekt(row.totalVektGrams)}</strong>
                        </div>
                      </div>
                    `,
                  )
                  .join("")
              : `
                <div class="rapport-empty-state">
                  Ingen produksjonsdata for denne uken.
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
    .querySelector("#rapportNåværendeWeekBtn")
    .addEventListener("click", goToNåværendeWeek);

  document.querySelector("#rapportNextWeekBtn").addEventListener("click", goToNextWeek);
}
