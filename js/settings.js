import {
  getCustomers,
  addCustomer,
  updateCustomer,
  softDeleteCustomer,
  restoreCustomer,
  getProducts,
  addProduct,
  updateProduct,
  softDeleteProduct,
  restoreProduct,
  addPackaging,
  updatePackaging,
  removePackaging,
} from "./storage.js";

const container = document.querySelector("#settingsTab");

export async function initSettings() {
  render();
}

async function render() {
  const customers = await getCustomers();
  const products = await getProducts();

  container.innerHTML = `
    <div class="settings">
      <section class="settings-section">
        <h2>Customers</h2>

        <form id="addCustomerForm" class="settings-form">
          <input id="customerName" placeholder="Customer name" required />
          <button type="submit">Add customer</button>
        </form>

        <div class="settings-list">
          ${customers
            .map(
              (customer) => `
                <div class="settings-row ${customer.active ? "" : "inactive"}">
                  <input
                    value="${customer.name}"
                    data-customer-name="${customer.id}"
                  />

                  <div class="settings-actions">
                    <button type="button" data-save-customer="${customer.id}">
                      Save
                    </button>

                    ${
                      customer.active
                        ? `<button type="button" class="danger-btn" data-disable-customer="${customer.id}">
                            Deactivate
                          </button>`
                        : `<button type="button" data-restore-customer="${customer.id}">
                            Restore
                          </button>`
                    }
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="settings-section">
        <h2>Products</h2>

        <form id="addProductForm" class="settings-form">
          <input id="productName" placeholder="Product name" required />
          <button type="submit">Add product</button>
        </form>

        <div class="products-list">
          ${products
            .map(
              (product) => `
                <article class="product-card ${product.active ? "" : "inactive"}">
                  <div class="product-header">
                    <input
                      class="product-name-input"
                      value="${product.name}"
                      data-product-name="${product.id}"
                    />

                    <div class="settings-actions">
                      <button type="button" data-save-product="${product.id}">
                        Save
                      </button>

                      ${
                        product.active
                          ? `<button type="button" class="danger-btn" data-disable-product="${product.id}">
                              Deactivate
                            </button>`
                          : `<button type="button" data-restore-product="${product.id}">
                              Restore
                            </button>`
                      }
                    </div>
                  </div>

                  <div class="packaging-list">
                    ${(product.packaging || [])
                      .map(
                        (packaging) => `
                          <div class="packaging-item">
                            <input
                              value="${packaging.name}"
                              data-packaging-name="${product.id}:${packaging.id}"
                            />

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value="${packaging.weightGrams}"
                              data-packaging-weight="${product.id}:${packaging.id}"
                            />

                            <span>g</span>

                            <button
                              type="button"
                              data-save-packaging="${product.id}:${packaging.id}"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              class="danger-btn"
                              data-remove-packaging="${product.id}:${packaging.id}"
                            >
                              Remove
                            </button>
                          </div>
                        `
                      )
                      .join("")}
                  </div>

                  <form class="packaging-form" data-add-pack="${product.id}">
                    <input
                      name="packagingName"
                      placeholder="Packaging name"
                      required
                    />

                    <input
                      name="weightGrams"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Weight in grams"
                      required
                    />

                    <button type="submit">Add packaging</button>
                  </form>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  document
    .querySelector("#addCustomerForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = document.querySelector("#customerName");
      await addCustomer(input.value);

      render();
    });

  document.querySelectorAll("[data-save-customer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const customerId = button.dataset.saveCustomer;
      const input = document.querySelector(`[data-customer-name="${customerId}"]`);

      await updateCustomer(customerId, {
        name: input.value.trim(),
      });

      render();
    });
  });

  document.querySelectorAll("[data-disable-customer]").forEach((button) => {
    button.addEventListener("click", async () => {
      await softDeleteCustomer(button.dataset.disableCustomer);
      render();
    });
  });

  document.querySelectorAll("[data-restore-customer]").forEach((button) => {
    button.addEventListener("click", async () => {
      await restoreCustomer(button.dataset.restoreCustomer);
      render();
    });
  });

  document
    .querySelector("#addProductForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = document.querySelector("#productName");
      await addProduct(input.value);

      render();
    });

  document.querySelectorAll("[data-save-product]").forEach((button) => {
    button.addEventListener("click", async () => {
      const productId = button.dataset.saveProduct;
      const input = document.querySelector(`[data-product-name="${productId}"]`);

      await updateProduct(productId, {
        name: input.value.trim(),
      });

      render();
    });
  });

  document.querySelectorAll("[data-disable-product]").forEach((button) => {
    button.addEventListener("click", async () => {
      await softDeleteProduct(button.dataset.disableProduct);
      render();
    });
  });

  document.querySelectorAll("[data-restore-product]").forEach((button) => {
    button.addEventListener("click", async () => {
      await restoreProduct(button.dataset.restoreProduct);
      render();
    });
  });

  document.querySelectorAll("[data-add-pack]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const productId = form.dataset.addPack;
      const packagingName = form.elements.packagingName.value;
      const weightGrams = form.elements.weightGrams.value;

      await addPackaging(productId, packagingName, weightGrams);

      render();
    });
  });

  document.querySelectorAll("[data-save-packaging]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [productId, packagingId] = button.dataset.savePackaging.split(":");

      const nameInput = document.querySelector(
        `[data-packaging-name="${productId}:${packagingId}"]`
      );

      const weightInput = document.querySelector(
        `[data-packaging-weight="${productId}:${packagingId}"]`
      );

      await updatePackaging(
        productId,
        packagingId,
        nameInput.value,
        weightInput.value
      );

      render();
    });
  });

  document.querySelectorAll("[data-remove-packaging]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [productId, packagingId] = button.dataset.removePackaging.split(":");

      await removePackaging(productId, packagingId);

      render();
    });
  });
}