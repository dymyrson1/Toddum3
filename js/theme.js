function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  updateThemeButton(theme);
}

function getCurrentTheme() {
  return localStorage.getItem("theme") || "light";
}

function toggleTheme() {
  const currentTheme = getCurrentTheme();
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

function updateThemeButton(theme) {
  const button = document.querySelector("#themeToggleBtn");

  if (!button) return;

  button.textContent = theme === "dark" ? "☀️" : "🌙";
  button.title = theme === "dark" ? "Lys modus" : "Mørk modus";
}

function initTheme() {
  applyTheme(getCurrentTheme());

  const button = document.querySelector("#themeToggleBtn");

  if (!button) return;

  button.addEventListener("click", toggleTheme);
}

initTheme();
