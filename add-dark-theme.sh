#!/bin/bash

python3 - << 'PY'
from pathlib import Path

# index.html
index_path = Path("index.html")
index = index_path.read_text()

if 'id="themeToggleBtn"' not in index:
    index = index.replace(
        '</header>',
        '  <button id="themeToggleBtn" class="theme-toggle-btn" title="Tema">🌙</button>\n</header>'
    )

index_path.write_text(index)


# app.js
app_path = Path("js/app.js")
app = app_path.read_text()

theme_block = '''
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "light" ? "dark" : "light");
}

function updateThemeIcon(theme) {
  const button = document.querySelector("#themeToggleBtn");

  if (!button) return;

  button.textContent = theme === "dark" ? "☀️" : "🌙";
}

function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  const button = document.querySelector("#themeToggleBtn");

  if (button) {
    button.addEventListener("click", toggleTheme);
  }
}
'''

if "function initTheme()" not in app:
    app = app + "\\n" + theme_block

if "initTheme();" not in app:
    app = app.replace(
        "showAppView();",
        "showAppView();\\n    initTheme();"
    )

app_path.write_text(app)


# base.css
base_path = Path("css/base.css")
base = base_path.read_text()

dark_css = '''
/* =========================
   Dark theme
   ========================= */

:root[data-theme="dark"] {
  --bg: #0f172a;
  --surface: #111827;
  --surface-soft: #1f2937;
  --surface-hover: #243244;
  --card: #111827;
  --text: #e5e7eb;
  --muted: #9ca3af;
  --border: #374151;
  --header: #1f2937;

  --accent: #3b82f6;
  --accent-dark: #2563eb;

  --danger: #f87171;
  --danger-soft: rgba(248, 113, 113, 0.15);
  --danger-dark: #ef4444;

  --success-soft: rgba(34, 197, 94, 0.15);
  --success-text: #22c55e;

  --warning-soft: rgba(251, 191, 36, 0.15);
  --warning-text: #fbbf24;

  --shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  --soft-shadow: none;
}

.theme-toggle-btn {
  margin-left: auto;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 8px;
}
'''

if ':root[data-theme="dark"]' not in base:
    base = base + "\\n" + dark_css

base_path.write_text(base)
PY

npx prettier index.html js/app.js css/base.css --write

git add .
git commit -m "Add dark theme"
git push
