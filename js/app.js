import { listenToAuthState, login, logout } from "./auth.js";
import { initInnstillinger } from "./settings.js";
import { initMainTable } from "./main-table.js";
import { initRapport } from "./rapport.js";

const authView = document.querySelector("#authView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const authError = document.querySelector("#authError");
const logoutBtn = document.querySelector("#logoutBtn");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = {
  settings: document.querySelector("#settingsTab"),
  main: document.querySelector("#mainTab"),
  rapport: document.querySelector("#rapportTab"),
};

function showAuthView() {
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
}

function showAppView() {
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
}

function switchTab(tabNavn) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabNavn);
  });

  Object.entries(tabPanels).forEach(([name, panel]) => {
    panel.classList.toggle("active", name === tabNavn);
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  authError.textContent = "";

  try {
    await login(emailInput.value, passwordInput.value);
    loginForm.reset();
  } catch (error) {
    authError.textContent = "Feil e-post eller passord.";
    console.error(error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await logout();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);

    if (button.dataset.tab === "rapport") {
      initRapport();
    }
  });
});

listenToAuthState((user) => {
  if (user) {
    showAppView();
    switchTab("main");

    initInnstillinger();
    initMainTable();
    initRapport();
  } else {
    showAuthView();
  }
});
