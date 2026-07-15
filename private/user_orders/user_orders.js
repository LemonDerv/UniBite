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

        document.querySelectorAll(".view-details-btn").forEach(btn => {
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

    /* ------------------------------
       DISABLE SCROLL WHEN MODALS APPEAR
    ------------------------------ */
    function disablePageScroll() {
        document.body.style.overflow = "hidden";
    }

    function enablePageScroll() {
        document.body.style.overflow = "";
    }

/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
        VIEW DETAILS MODAL
    ----------------------------- */

    const viewModal = document.getElementById("viewModal");
    const closeViewBtn = document.querySelector(".close-view-modal");
    const closeViewFooterBtn = document.querySelector(".close-view-btn");

    /* modal fields */
    const viewTitle = document.getElementById("viewTitle");
    const viewDescription = document.getElementById("viewDescription");
    const viewAddress = document.getElementById("viewAddress");
    const viewPickupTimes = document.getElementById("viewPickupTimes");
    const viewImage = document.getElementById("viewImage");
    const viewTags = document.getElementById("viewTags");
    const viewAllergens = document.getElementById("viewAllergens");

    const viewCreator = document.getElementById("viewCreator");
    const viewOrderDate = document.getElementById("viewOrderDate");
    const viewOrderStatus = document.getElementById("viewOrderStatus");


    /* render allergens */
    function renderAllergens(allergens) {
        if (!allergens || allergens.length === 0) {
            viewAllergens.innerHTML =
                `<span class="view-no-allergens">No allergens noted</span>`;
            return;
        }

        viewAllergens.innerHTML = allergens
            .map(a =>
                `<span class="view-chip allergen-view-chip">${a}</span>`
            )
            .join("");
    }


    /* open modal */
    function openViewModal(orderItem) {

        const title = orderItem.querySelector(".order-list-title")?.textContent || "";
        const meta = orderItem.querySelector(".order-list-meta")?.textContent || "";

        /* placeholder */
        const [status, date] = meta.split("•");

        /* fill fields */
        viewTitle.textContent = title;
        viewCreator.textContent = "Posted by Maria";
        viewOrderDate.textContent = `Ordered on • ${date?.trim() || "11/04 @ 20:15"}`;
        viewOrderStatus.textContent = status?.trim() || "Confirmed";

        viewDescription.textContent = "Fresh pasta with tomato sauce and basil.";
        viewAddress.textContent = "Aratou 60, Patras";
        viewPickupTimes.textContent = "18:00 - 21:00";
        viewImage.innerHTML = "No Image Set";
        viewTags.innerHTML = `<span class="view-chip">Pasta</span><span class="view-chip">Vegetarian</span>`;
        renderAllergens(["Gluten"]);

        /* show modal */
        viewModal.classList.remove("hidden");
        disablePageScroll();

        /* reset scroll */
        const content = viewModal.querySelector(".view-modal-content");
        if (content) content.scrollTop = 0;
    }

    /* close modal */
    function closeViewModal() {
        viewModal.classList.add("hidden");
        enablePageScroll();
    }

    /* open buttons */
    document.querySelectorAll(".view-details-btn").forEach(button => {
            button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                openViewModal(orderItem);
            });
        });

    /* close buttons */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);

    /* click outside */
    viewModal.querySelector(".modal-overlay").addEventListener("click", closeViewModal);


/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
    RATE MODAL
    ----------------------------- */

    const rateModal = document.getElementById("rateModal");
    const closeRateBtn = document.querySelector(".close-rate-modal");
    const closeRateFooterBtn = document.querySelector(".close-rate-btn");
    const submitRatingBtn = document.querySelector(".submit-rating-btn");

    const rateMealTitle = document.getElementById("rateMealTitle");
    const stars = document.querySelectorAll("#starRating span");

    let selectedRating = 0;


    /* open */
    function openRateModal(orderItem) {
        const title =
            orderItem.querySelector(".order-list-title")?.textContent || "";
        rateMealTitle.textContent = title;
        selectedRating = 0;
        updateStars();
        rateModal.classList.remove("hidden");
        disablePageScroll();
    }

    /* close */
    function closeRateModal() {
        rateModal.classList.add("hidden");
        enablePageScroll();
    }

    /* stars */
    function updateStars() {
        stars.forEach(star => {
            const value = Number(star.dataset.value);

            if (value <= selectedRating) {
                star.textContent = "★";
                star.classList.add("active");
            } else {
                star.textContent = "☆";
                star.classList.remove("active");
            }
        });
    }

    stars.forEach(star => {
        star.addEventListener("click", () => {
            selectedRating = Number(star.dataset.value);
            updateStars();
        });
    });

    /* open buttons */
    document.querySelectorAll(".btn.primary").forEach(button => {
        button.addEventListener("click", () => {
            const orderItem = button.closest(".order-list-item");
            openRateModal(orderItem);
        });
    });

    /* close */
    closeRateBtn.addEventListener("click", closeRateModal);
    closeRateFooterBtn.addEventListener("click", closeRateModal);

    rateModal
        .querySelector(".modal-overlay")
        .addEventListener("click", closeRateModal);

    /* submit */
    submitRatingBtn.addEventListener("click", () => {
        if (selectedRating === 0) {
            alert("Please select a rating first.");
            return;
        }

        alert(`Thanks! You rated ${selectedRating}/5`);
        closeRateModal();
    });
    
});