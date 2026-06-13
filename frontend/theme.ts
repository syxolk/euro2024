const storageKey = "theme";
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

function getStoredTheme() {
    let theme: string | null;

    try {
        theme = localStorage.getItem(storageKey);
    } catch {
        theme = null;
    }

    if (theme === "light" || theme === "dark" || theme === "system") {
        return theme;
    }

    return "system";
}

function resolveTheme(theme: string) {
    if (theme === "system") {
        return mediaQuery.matches ? "dark" : "light";
    }

    return theme;
}

function applyTheme(theme: string, themeSelect?: HTMLSelectElement | null) {
    document.documentElement.setAttribute("data-bs-theme", resolveTheme(theme));

    if (themeSelect) {
        themeSelect.value = theme;
    }
}

function persistTheme(theme: string) {
    try {
        localStorage.setItem(storageKey, theme);
    } catch {
        return;
    }
}

applyTheme(getStoredTheme());

document.addEventListener("DOMContentLoaded", function () {
    const themeSelect = document.querySelector("[data-theme-select]");

    if (!(themeSelect instanceof HTMLSelectElement)) {
        return;
    }

    applyTheme(getStoredTheme(), themeSelect);

    themeSelect.addEventListener("change", function () {
        const theme = themeSelect.value;
        persistTheme(theme);
        applyTheme(theme, themeSelect);
    });

    mediaQuery.addEventListener("change", function () {
        if (getStoredTheme() === "system") {
            applyTheme("system", themeSelect);
        }
    });
});
