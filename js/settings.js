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

function showLagreStatus(message = "Lagret") {
  let status = document.querySelector("#settingsLagreStatus");

  if (!status) return;

  status.textContent = message;
  status.classList.add("visible");

  clearTimeout(saveStatusTimer);

  saveStatusTimer = setTimeout(() => {
    status.classList.remove("visible");
  }, 1400);
}

export async function initInnstillinger() {
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
            <h2>Kunder</h2>
            <p>
              <span>${customers.length} registrerte kunder</span>
              <span id="settingsLagreStatus" class="settings-save-status">Lagret</span>
            </p>
          </div>
        </div>

        <div class="settings-table-wrap">
          <div class="settings-table customer-table">
            <div class="settings-table-head customer-row">
              <div>Nr.</div>
              <div>Navn</div>
              <div>Kontaktperson</div>
              <div>Adresse</div>
              <div>Telefon</div>
              <div>Status</div>
              <div>Handlinger</div>
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
                          placeholder="Adresse"
                          data-customer-field="${customer.id}:address"
                        />
                      </div>

                      <div>
                        <input
                          value="${customer.phone || ""}"
                          placeholder="Telefon"
                          data-customer-field="${customer.id}:phone"
                        />
                      </div>

                      <div>
                        ${
                          customer.active
                            ? `<span class="status-pill active">Aktiv</span>`
                            : `<span class="status-pill inactive">Inaktiv</span>`
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
                                Deaktiver
                              </button>`
                            : `<button
                                type="button"
                                class="small-secondary-btn"
                                data-restore-customer="${customer.id}"
                              >
                                Gjenopprett
                              </button>`
                        }
                      </div>
                    </div>
                  `,
                )
                .join("")}
            </div>
          
        <form id="addCustomerForm" class="settings-add-bar customer-add-bar">
          <input name="name" placeholder="Kundenavn" required />
          <input name="contactPerson" placeholder="Kontaktperson" />
          <input name="address" placeholder="Adresse" />
          <input name="phone" placeholder="Telefon" />
          <button type="submit">Legg til kunde</button>
        </form>

</div>
        </div>
      </section>

      <section class="settings-panel">
        <div class="settings-panel-header">
          <div>
            <h2>Produkter og emballasje</h2>
            <p>${products.length} registrerte produkter</p>
          </div>
        </div>

        <div class="settings-table-wrap">
          <div class="settings-table product-table">
            <div class="settings-table-head product-row">
              <div>Produkt</div>
              <div>Status</div>
              <div>Emballasje</div>
              <div>Handlinger</div>
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
                            ? `<span class="status-pill active">Aktiv</span>`
                            : `<span class="status-pill inactive">Inaktiv</span>`
                        }
                      </div>

                      <div class="packaging-area">
                        <div class="packaging-mini-table">
                          <div class="packaging-mini-row packaging-mini-head">
                            <div>Emballasje</div>
                            <div>Vekt, g</div>
                            <div>Handlinger</div>
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
                                      Fjern
                                    </button>
                                  </div>
                                </div>
                              `,
                            )
                            .join("")}
                        </div>

                        <form class="packaging-add-form" data-add-pack="${product.id}">
                          <input
                            name="packagingNavn"
                            placeholder="Emballasje"
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

                          <button type="submit">Legg til</button>
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
                                Deaktiver
                              </button>`
                            : `<button
                                type="button"
                                class="small-secondary-btn"
                                data-restore-product="${product.id}"
                              >
                                Gjenopprett
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
          <input id="productNavn" placeholder="Nytt produkt" required />
          <button type="submit">Legg til produkt</button>
        </form>
</section>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  bindAddCustomer();
  bindCustomerAutosave();
  bindKundeStatusHandlinger();

  bindAddProduct();
  bindProductAutosave();
  bindProduktStatusHandlinger();

  bindAddPackaging();
  bindPackagingAutosave();
  bindRemovePackaging();
}

function bindAddCustomer() {
  const form = document.querySelector("#addCustomerForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = form.elements.name?.value || "";
    const contactPerson = form.elements.contactPerson?.value || "";
    const address = form.elements.address?.value || "";
    const phone = form.elements.phone?.value || "";

    if (!name.trim()) return;

    await addCustomer({
      name,
      contactPerson,
      address,
      phone,
    });

    form.reset();
    render();
  });
}

function bindCustomerAutosave() {
  document.querySelectorAll("[data-customer-field]").forEach((input) => {
    input.addEventListener("blur", async () => {
      const [customerId, fieldNavn] = input.dataset.customerField.split(":");

      await runWithLagreStatus(() =>
        updateCustomer(customerId, {
          [fieldNavn]: input.value.trim(),
        }),
      );

      showLagreStatus();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      input.blur();
    });
  });
}

function bindKundeStatusHandlinger() {
  document.querySelectorAll("[data-disable-customer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm(
        "Deaktiver this customer? Old weeks will keep their history.",
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

    const input = document.querySelector("#productNavn");
    await addProduct(input.value);

    render();
  });
}

function bindProductAutosave() {
  document.querySelectorAll("[data-product-field]").forEach((input) => {
    input.addEventListener("blur", async () => {
      const [productId, fieldNavn] = input.dataset.productField.split(":");

      await runWithLagreStatus(() =>
        updateProduct(productId, {
          [fieldNavn]: input.value.trim(),
        }),
      );

      showLagreStatus();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      input.blur();
    });
  });
}

function bindProduktStatusHandlinger() {
  document.querySelectorAll("[data-disable-product]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm(
        "Deaktiver this product? Old weeks will keep their history.",
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
      const packagingNavn = form.elements.packagingNavn.value;
      const weightGrams = form.elements.weightGrams.value;

      await addPackaging(productId, packagingNavn, weightGrams);

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

      showLagreStatus();
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
      const confirmed = confirm("Fjern this packaging?");

      if (!confirmed) return;

      const [productId, packagingId] = button.dataset.removePackaging.split(":");

      await removePackaging(productId, packagingId);

      render();
    });
  });
}
