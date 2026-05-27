(function () {
    const storageKey = "theme";

    function getPreferredTheme() {
        let theme = null;

        try {
            theme = localStorage.getItem(storageKey);
        } catch {
            theme = null;
        }

        if (theme === "light" || theme === "dark") {
            return theme;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    }

    function applyTheme(theme, themeToggle) {
        document.documentElement.setAttribute("data-bs-theme", theme);
        if (themeToggle) {
            themeToggle.checked = theme === "dark";
        }
    }

    function persistTheme(theme) {
        try {
            localStorage.setItem(storageKey, theme);
        } catch {
            return;
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        const themeToggle = document.querySelector("[data-theme-toggle]");

        if (!(themeToggle instanceof HTMLInputElement)) {
            return;
        }

        applyTheme(getPreferredTheme(), themeToggle);

        themeToggle.addEventListener("change", function () {
            const theme = themeToggle.checked ? "dark" : "light";
            persistTheme(theme);
            applyTheme(theme, themeToggle);
        });
    });
})();
