function getCurrentTheme() {
  return localStorage.getItem("theme") || "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  updateThemeButtons(theme);
}

function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  applyTheme(nextTheme);
}

function updateThemeButtons(theme) {
  document.querySelectorAll("#themeToggleBtn").forEach((button) => {
    button.textContent = theme === "dark" ? "☀️" : "🌙";
    button.title = theme === "dark" ? "Lys modus" : "Mørk modus";
    button.setAttribute("aria-label", button.title);
  });
}

function initTheme() {
  applyTheme(getCurrentTheme());

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("#themeToggleBtn");

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      toggleTheme();
    },
    true,
  );
}

initTheme();
