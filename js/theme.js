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
  document.querySelectorAll("#themeToggleBtn").forEach((button) => {
    button.textContent = theme === "dark" ? "☀️" : "🌙";
    button.title = theme === "dark" ? "Lys modus" : "Mørk modus";
  });
}

function initTheme() {
  applyTheme(getCurrentTheme());

  document.addEventListener("click", (event) => {
    const button = event.target.closest("#themeToggleBtn");

    if (!button) return;

    event.preventDefault();
    toggleTheme();
  });
}

initTheme();
