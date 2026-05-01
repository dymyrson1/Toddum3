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

let saveStatusTimer = null;

function showSaveStatus(message = "Saved") {
  let status = document.querySelector("#settingsSaveStatus");

  if (!status) return;

  status.textContent = message;
  status.classList.add("visible");

  clearTimeout(saveStatusTimer);

  saveStatusTimer = setTimeout(() => {
    status.classList.remove("visible");
  }, 1400);
}

export async function initSettings() {
  render();
}

async function render() {
  const customers = await getCustomers();
  const products = await getProducts();

  container.innerHTML = `
    <div class="settings">
      <section class="settings-panel">
        <div class="settings-panel-header">
          <div>
            <h2>Customers</h2>
            <p>
              <span>${customers.length} registered customers</span>
              <span id="settingsSaveStatus" class="settings-save-status">Saved</span>
            </p>
          </div>
        </div>

        <div class="settings-table-wrap">
          <div class="settings-table customer-table">
            <div class="settings-table-head customer-row">
              <div>Nr.</div>
              <div>Name</div>
              <div>Kontaktperson</div>
              <div>Address</div>
              <div>Phone</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            <div class="settings-table-body">
              ${customers
                .map(
                  (customer, index) => `
                    <div class="settings-table-row customer-row ${
                      customer.active ? "" : "is-inactive"
                    }">
                      <div>${index + 1}</div>

                      <div>
                        <input
                          value="${customer.name || ""}"
                          data-customer-field="${customer.id}:name"
                        />
                      </div>

                      <div>
                        <input
                          value="${customer.contactPerson || ""}"
                          placeholder="Kontaktperson"
                          data-customer-field="${customer.id}:contactPerson"
                        />
                      </div>

                      <div>
                        <input
                          value="${customer.address || ""}"
                          placeholder="Address"
                          data-customer-field="${customer.id}:address"
                        />
                      </div>

                      <div>
                        <input
                          value="${customer.phone || ""}"
                          placeholder="Phone"
                          data-customer-field="${customer.id}:phone"
                        />
                      </div>

                      <div>
                        ${
                          customer.active
                            ? `<span class="status-pill active">Active</span>`
                            : `<span class="status-pill inactive">Inactive</span>`
                        }
                      </div>

                      <div class="settings-actions">
                        ${
                          customer.active
                            ? `<button
                                type="button"
                                class="small-danger-btn"
                                data-disable-customer="${customer.id}"
                              >
                                Deactivate
                              </button>`
                            : `<button
                                type="button"
                                class="small-secondary-btn"
                                data-restore-customer="${customer.id}"
                              >
                                Restore
                              </button>`
                        }
                      </div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          
        <form id="addCustomerForm" class="settings-add-bar">
          <input id="customerName" placeholder="New customer name" required />
          <button type="submit">Add customer</button>
        </form>

</div>
        </div>
      </section>

      <section class="settings-panel">
        <div class="settings-panel-header">
          <div>
            <h2>Products & packaging</h2>
            <p>${products.length} registered products</p>
          </div>
        </div>

        <div class="settings-table-wrap">
          <div class="settings-table product-table">
            <div class="settings-table-head product-row">
              <div>Product</div>
              <div>Status</div>
              <div>Packaging</div>
              <div>Actions</div>
            </div>

            <div class="settings-table-body">
              ${products
                .map(
                  (product) => `
                    <div class="settings-table-row product-row ${
                      product.active ? "" : "is-inactive"
                    }">
                      <div>
                        <input
                          class="product-name-input"
                          value="${product.name || ""}"
                          data-product-field="${product.id}:name"
                        />
                      </div>

                      <div>
                        ${
                          product.active
                            ? `<span class="status-pill active">Active</span>`
                            : `<span class="status-pill inactive">Inactive</span>`
                        }
                      </div>

                      <div class="packaging-area">
                        <div class="packaging-mini-table">
                          <div class="packaging-mini-row packaging-mini-head">
                            <div>Packaging</div>
                            <div>Weight, g</div>
                            <div>Actions</div>
                          </div>

                          ${(product.packaging || [])
                            .map(
                              (packaging) => `
                                <div class="packaging-mini-row">
                                  <div>
                                    <input
                                      value="${packaging.name || ""}"
                                      data-packaging-field="${product.id}:${packaging.id}:name"
                                    />
                                  </div>

                                  <div>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value="${packaging.weightGrams || ""}"
                                      data-packaging-field="${product.id}:${packaging.id}:weightGrams"
                                    />
                                  </div>

                                  <div class="settings-actions">
                                    <button
                                      type="button"
                                      class="small-danger-btn"
                                      data-remove-packaging="${product.id}:${packaging.id}"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              `,
                            )
                            .join("")}
                        </div>

                        <form class="packaging-add-form" data-add-pack="${product.id}">
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
                            placeholder="g"
                            required
                          />

                          <button type="submit">Add</button>
                        </form>
                      </div>

                      <div class="settings-actions">
                        ${
                          product.active
                            ? `<button
                                type="button"
                                class="small-danger-btn"
                                data-disable-product="${product.id}"
                              >
                                Deactivate
                              </button>`
                            : `<button
                                type="button"
                                class="small-secondary-btn"
                                data-restore-product="${product.id}"
                              >
                                Restore
                              </button>`
                        }
                      </div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      
        <form id="addProductForm" class="settings-add-bar">
          <input id="productName" placeholder="New product name" required />
          <button type="submit">Add product</button>
        </form>
</section>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  bindAddCustomer();
  bindCustomerAutosave();
  bindCustomerStatusActions();

  bindAddProduct();
  bindProductAutosave();
  bindProductStatusActions();

  bindAddPackaging();
  bindPackagingAutosave();
  bindRemovePackaging();
}

function bindAddCustomer() {
  document.querySelector("#addCustomerForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.querySelector("#customerName");
    await addCustomer(input.value);

    render();
  });
}

function bindCustomerAutosave() {
  document.querySelectorAll("[data-customer-field]").forEach((input) => {
    input.addEventListener("blur", async () => {
      const [customerId, fieldName] = input.dataset.customerField.split(":");

      await runWithSaveStatus(() =>
        updateCustomer(customerId, {
          [fieldName]: input.value.trim(),
        }),
      );

      showSaveStatus();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      input.blur();
    });
  });
}

function bindCustomerStatusActions() {
  document.querySelectorAll("[data-disable-customer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm(
        "Deactivate this customer? Old weeks will keep their history.",
      );

      if (!confirmed) return;

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
}

function bindAddProduct() {
  document.querySelector("#addProductForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const input = document.querySelector("#productName");
    await addProduct(input.value);

    render();
  });
}

function bindProductAutosave() {
  document.querySelectorAll("[data-product-field]").forEach((input) => {
    input.addEventListener("blur", async () => {
      const [productId, fieldName] = input.dataset.productField.split(":");

      await runWithSaveStatus(() =>
        updateProduct(productId, {
          [fieldName]: input.value.trim(),
        }),
      );

      showSaveStatus();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      input.blur();
    });
  });
}

function bindProductStatusActions() {
  document.querySelectorAll("[data-disable-product]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm(
        "Deactivate this product? Old weeks will keep their history.",
      );

      if (!confirmed) return;

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
}

function bindAddPackaging() {
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
}

function bindPackagingAutosave() {
  document.querySelectorAll("[data-packaging-field]").forEach((input) => {
    input.addEventListener("blur", async () => {
      const [productId, packagingId] = input.dataset.packagingField.split(":");

      const nameInput = document.querySelector(
        `[data-packaging-field="${productId}:${packagingId}:name"]`,
      );

      const weightInput = document.querySelector(
        `[data-packaging-field="${productId}:${packagingId}:weightGrams"]`,
      );

      await updatePackaging(
        productId,
        packagingId,
        nameInput.value.trim(),
        weightInput.value,
      );

      showSaveStatus();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      input.blur();
    });
  });
}

function bindRemovePackaging() {
  document.querySelectorAll("[data-remove-packaging]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm("Remove this packaging?");

      if (!confirmed) return;

      const [productId, packagingId] = button.dataset.removePackaging.split(":");

      await removePackaging(productId, packagingId);

      render();
    });
  });
}
