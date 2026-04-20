document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------
       THEME + LANGUAGE
    ------------------------------ */

    const themeInputs = document.querySelectorAll('input[name="theme"]');
    const languageInputs = document.querySelectorAll('input[name="language"]');
    const languageLabel = document.getElementById('language-label');

    const dictionary = {
        en: {
            chooseTheme: "Choose Theme",
            dark: "Dark",
            light: "Light",
            yourOrdersTitle: "Your Orders",
            yourOrdersSubtitle: "Rate and view your past orders",
            recentOrders: "Recent Orders (Rate Now)",
            pastOrders: "Past Orders",
            rateOrder: "Rate Order",
            viewDetails: "View Details"
        },
        gr: {
            chooseTheme: "Επιλογή Θέματος",
            dark: "Σκούρο",
            light: "Ανοιχτό",
            yourOrdersTitle: "Οι Παραγγελίες σου",
            yourOrdersSubtitle: "Αξιολόγησε και δες τις προηγούμενες παραγγελίες σου",
            recentOrders: "Πρόσφατες Παραγγελίες (Αξιολόγησε Άμεσα)",
            pastOrders: "Προηγούμενες Παραγγελίες",
            rateOrder: "Αξιολόγηση",
            viewDetails: "Λεπτομέρειες"
        }
    };

    function setTheme(theme) {
        document.body.classList.remove("theme-dark", "theme-light");
        document.body.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
        localStorage.setItem("unibites-theme", theme);
    }

    function setLanguage(lang) {
        const selected = dictionary[lang] || dictionary.en;

        if (languageLabel) {
            languageLabel.textContent = lang === "gr" ? "ΕΛΛ" : "ENG";
        }
        document.documentElement.lang = lang === "gr" ? "el" : "en";

        /* ---------------- UI TEXT ---------------- */

        const h1 = document.querySelector(".page-heading h1");
        const subtitle = document.querySelector(".page-heading p");

        if (h1) h1.textContent = selected.yourOrdersTitle;
        if (subtitle) subtitle.textContent = selected.yourOrdersSubtitle;

        const sectionTitles = document.querySelectorAll(".section-title span:first-child");

        if (sectionTitles[0]) sectionTitles[0].textContent = selected.recentOrders;
        if (sectionTitles[1]) sectionTitles[1].textContent = selected.pastOrders;

        document.querySelectorAll(".btn.primary").forEach(btn => {
            btn.textContent = selected.rateOrder;
        });

        document.querySelectorAll(".btn.secondary").forEach(btn => {
            btn.textContent = selected.viewDetails;
        });

        localStorage.setItem("unibites-language", lang);
    }

    /* -----------------------------
       EVENTS
    ------------------------------ */

    themeInputs.forEach(input => {
        input.addEventListener("change", () => setTheme(input.value));
    });

    languageInputs.forEach(input => {
        input.addEventListener("change", () => setLanguage(input.value));
    });

    /* -----------------------------
       LOAD SAVED SETTINGS
    ------------------------------ */

    const savedTheme = localStorage.getItem("unibites-theme") || "light";
    const savedLanguage = localStorage.getItem("unibites-language") || "en";

    const themeInput = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    const langInput = document.querySelector(`input[name="language"][value="${savedLanguage}"]`);

    if (themeInput) themeInput.checked = true;
    if (langInput) langInput.checked = true;

    setTheme(savedTheme);
    setLanguage(savedLanguage);

    /* -----------------------------
       COLLAPSIBLE ORDERS
    ------------------------------ */

    document.querySelectorAll(".toggle-header").forEach(header => {
        header.addEventListener("click", () => {
            const section = header.closest(".orders-section");
            const list = section.querySelector(".order-list");

            if (!section || !list) return;

            const isCollapsed = header.classList.toggle("collapsed");
            list.classList.toggle("hidden");

            header.setAttribute("aria-expanded", !isCollapsed);
        });
    });
    
});