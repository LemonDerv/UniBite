const mockPosts = [
    {
        id: 1,
        hasRequests: true,
        requests: [
            { name: "Alex", timestamp: "2026-05-03 12:14" },
            { name: "Maria", timestamp: "2026-05-03 13:02" }
        ]
    },
    {
        id: 2,
        hasRequests: false,
        requests: []
    }
];

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
            pageTitle: "Your Meal Posts",
            pageSubtitle: "Manage your listings",
            activePosts: "Active Listings",
            expiredPosts: "Expired / Closed Posts",
            viewDetails: "View Details"
        },
        gr: {
            chooseTheme: "Επιλογή Θέματος",
            dark: "Σκούρο",
            light: "Ανοιχτό",
            pageTitle: "Οι Αγγελίες Φαγητού σου",
            pageSubtitle: "Διαχείριση των αγγελιών σου",
            activePosts: "Ενεργές Αγγελίες",
            expiredPosts: "Ληγμένες / Κλειστές Αγγελίες",
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

        /* PAGE HEADER */
        const h1 = document.querySelector(".page-heading h1");
        const subtitle = document.querySelector(".page-heading p");

        if (h1) h1.textContent = selected.pageTitle;
        if (subtitle) subtitle.textContent = selected.pageSubtitle;

        /* SECTION TITLES */
        const activeTitle = document.querySelector(".section-title span");
        const expiredTitle = document.querySelector(".section-title-collapsible span");

        if (activeTitle) activeTitle.textContent = selected.activePosts;
        if (expiredTitle) expiredTitle.textContent = selected.expiredPosts;

        /* BUTTONS */
        document.querySelectorAll(".view-btn").forEach(btn => {
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

/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
       COLLAPSIBLE (EXPIRED POSTS)
    ------------------------------ */

    document.querySelectorAll(".section-title-collapsible").forEach(header => {
        header.addEventListener("click", () => {
            const section = header.closest(".posts-section");
            const list = section.querySelector(".post-list");

            if (!list) return;

            const isCollapsed = header.classList.toggle("collapsed");
            list.classList.toggle("hidden");

            header.setAttribute("aria-expanded", !isCollapsed);
        });
    });

    // 3 DOT MENU BEHAVIOR
    document.querySelectorAll(".menu-trigger").forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const dropdown = button.nextElementSibling;
            // close all other dropdowns first
            document.querySelectorAll(".menu-dropdown").forEach(menu => {
                if (menu !== dropdown) {
                    menu.classList.remove("active");
                }
            });
            // toggle current one
            dropdown.classList.toggle("active");
        });
    });

    // close when clicking outside
    document.addEventListener("click", () => {
        document.querySelectorAll(".menu-dropdown").forEach(menu => {
            menu.classList.remove("active");
        });
    });

/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
       REQUESTS MODAL
    ------------------------------ */
    const modal = document.getElementById("requestsModal");
    const requestsList = document.querySelector(".requests-list");
    const closeBtn = document.querySelector(".close-requests-modal");
    const overlay = document.querySelector(".modal-overlay");

    /* open modal */
    function openRequestsModal(requests) {
        if (!modal) return;
        requestsList.innerHTML = "";
        requests.forEach(req => {
            const item = document.createElement("div");
            item.classList.add("request-item");

            item.innerHTML = `
                <div class="request-info">
                    <strong>${req.name}</strong>
                    <p class="request-time">${req.timestamp}</p>
                </div>
                <div class="request-actions">
                    <button class="request-btn accept" title="Accept">✓</button>
                    <button class="request-btn decline" title="Decline">✕</button>
                </div>
            `;
            requestsList.appendChild(item);
        });
        modal.classList.remove("hidden");
    }

    /* close modal */
    function closeModal() {
        if (!modal) return;
        modal.classList.add("hidden");
    }

    /* events */
    closeBtn?.addEventListener("click", closeModal);
    overlay?.addEventListener("click", closeModal);

    /* request items */
    document.querySelectorAll(".post-card").forEach((card, index) => {
        const post = mockPosts?.[index];
        const statusBar = card.querySelector(".post-status-bar");

        if (!post || !statusBar) return;
        if (post.hasRequests && post.requests?.length) {
            statusBar.textContent = `${post.requests.length} new requests!`;
            statusBar.classList.add("yes-requests");
            statusBar.addEventListener("click", (e) => {
                e.stopPropagation();
                openRequestsModal(post.requests);
            });
        } else {
            statusBar.textContent = "No new requests";
            statusBar.classList.add("no-requests");
        }
    });

/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
        EDIT POST MODAL
    ----------------------------- */

    const editModal = document.getElementById("editModal");
    const closeEditBtn = document.querySelector(".close-edit-modal");
    const cancelEditBtn = document.querySelector(".cancel-edit");

    /* fields */
    const editTitle = document.getElementById("editTitle");
    const editDescription = document.getElementById("editDescription");
    const editPortions = document.getElementById("editTotalPortions");
    const editAddress = document.getElementById("editAddress");
    const editPickupTimes = document.getElementById("editPickupTimes");
    /* tags */
    const tagButtons = document.querySelectorAll(".edit-tag");
    /* allergens */
    const allergenDropdown = document.querySelector(".allergen-dropdown");
    const allergyCheckboxes = document.querySelectorAll(".allergen-list input[type='checkbox']");

    /* open modal */
    function openEditModal(card) {
        // retrieve data
        const title = card.querySelector(".post-title")?.textContent.trim() || "";
        const description = card.querySelector(".post-description")?.textContent.trim() || "";
        const portions = card.querySelector(".post-portions")?.textContent.replace(" left", "").trim() || "";
        const address = card.querySelector(".post-address")?.textContent.trim() || "";
        const pickupTimes = card.dataset.pickup || "";
        const tags = card.dataset.tags
            ? card.dataset.tags.split(",").map(t => t.trim())
            : [];
        const allergens = card.dataset.allergens
            ? card.dataset.allergens.split(",").map(a => a.trim())
            : [];
        const allergensBox = card.querySelector(".post-card");

        if (allergensBox?.dataset.allergens) {
            allergens = allergensBox.dataset.allergens
                .split(",")
                .map(a => a.trim())
                .filter(Boolean);
        }

        /* fill fields */
        editTitle.value = title;
        editDescription.value = description;
        editPortions.value = portions;
        editAddress.value = address;
        editPickupTimes.value = pickupTimes;
        /* reset tags */
        tagButtons.forEach(btn => { btn.classList.remove("selected");
        if (tags.includes(btn.dataset.tag)) { btn.classList.add("selected"); } });
        /* reset allergens */
        allergyCheckboxes.forEach(cb => {
            cb.checked = allergens.includes(cb.value);
        });

        document.addEventListener("click", (e) => {
            if (allergenDropdown && allergenDropdown.open && !allergenDropdown.contains(e.target)) {
                allergenDropdown.removeAttribute("open");
            }
        });

        /* show modal */
        editModal.classList.remove("hidden");
        /* always show first page */
        showEditPage(1);
        /* always scroll to top */
        editModal.querySelector(".edit-modal-content").scrollTop = 0;
    }

    /* close modal */
    function closeEditModal() {
        editModal.classList.add("hidden");
    }

    /* edit button */
    document.querySelectorAll(".menu-dropdown .edit-post").forEach(editBtn => {
            editBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const card = editBtn.closest(".post-card");
                openEditModal(card);

                /* close dropdown */
                editBtn.closest(".menu-dropdown").classList.remove("active");
            });
        });

    /* tag selection */
    tagButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("selected");
        });
    });

    /* save changes */
    document.querySelector(".save-edit")
        .addEventListener("click", () => {
            console.log({
                title: editTitle.value,
                description: editDescription.value,
                portions: editPortions.value,
                address: editAddress.value,
                pickupTimes: editPickupTimes.value,
                tags: Array.from(tagButtons).filter(btn => btn.classList.contains("selected")).map(btn => btn.dataset.tag),
                allergens: Array.from(allergyCheckboxes).filter(cb => cb.checked).map(cb => cb.value)
            });

            /*
            send data to backend
            */

            closeEditModal();
        });

    let currentEditPage = 1;

    const page1 = document.getElementById("editPage1");
    const page2 = document.getElementById("editPage2");

    const nextBtn = document.querySelector(".next-edit-page");
    const prevBtn = document.querySelector(".prev-edit-page");

    function showEditPage(page) {
        currentEditPage = page;

        page1.classList.toggle("active", page === 1);
        page2.classList.toggle("active", page === 2);

        if (page === 1) {
            nextBtn.style.display = "inline-flex";
            prevBtn.style.display = "none";
        } else {
            nextBtn.style.display = "none";
            prevBtn.style.display = "inline-flex";
        }
        editModal.classList.toggle("page-2", page === 2);
    }

    nextBtn.addEventListener("click", () => {
        showEditPage(2);
    });
    prevBtn.addEventListener("click", () => {
        showEditPage(1);
    });

    const imageInput = document.getElementById("editImage");
    const imagePreview = document.getElementById("editImagePreview");

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) {
            imagePreview.innerHTML = "No Image Set";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            imagePreview.innerHTML = `<img src="${event.target.result}" />`;
        };
        reader.readAsDataURL(file);
    });

    showEditPage(1);

    /* image reset */
    imagePreview.innerHTML = "No Image Set";
    imageInput.value = "";

    /* close events */
    closeEditBtn.addEventListener("click", closeEditModal);
    cancelEditBtn.addEventListener("click", closeEditModal);

    /* close modal when clicking outside */
    editModal.querySelector(".modal-overlay").addEventListener("click", closeEditModal);

/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
        VIEW DETAILS MODAL
    ----------------------------- */

    const viewModal = document.getElementById("viewModal");
    const closeViewBtn = document.querySelector(".close-view-modal");
    const closeViewFooterBtn = document.querySelector(".close-view-btn");

    /* fields */
    const viewTitle = document.getElementById("viewTitle");
    const viewPortions = document.getElementById("viewPortions");
    const viewDescription = document.getElementById("viewDescription");
    const viewAddress = document.getElementById("viewAddress");
    const viewPickupTimes = document.getElementById("viewPickupTimes");
    const viewImage = document.getElementById("viewImage");
    const viewTags = document.getElementById("viewTags");
    const viewAllergens = document.getElementById("viewAllergens");
    const viewPostedDate = document.getElementById("viewPostedDate");
    const viewRating = document.getElementById("viewRating");

    function renderAllergens(allergens) {
        if (!allergens || allergens.length === 0) {
            viewAllergens.innerHTML =
                `<span class="no-allergens">No allergens noted</span>`;
            return;
        }

        viewAllergens.innerHTML = allergens
            .map(allergen =>
                `<span class="view-chip allergen-view-chip">${allergen}</span>`
            )
            .join("");
    }

    /* open modal */
    function openViewModal(postItem) {
        const title = postItem.querySelector(".post-list-title")?.textContent || "";
        const meta = postItem.querySelector(".post-list-meta")?.textContent || "";
        const rating = postItem.dataset.rating || 0;
        const allergens = postItem.dataset.allergens? postItem.dataset.allergens.split(",").map(a => a.trim()): [];
        viewTitle.textContent = title;
        /* placeholder values */
        viewPortions.textContent = "5";
        viewDescription.textContent = "Fresh pasta with tomato sauce and basil.";
        viewAddress.textContent = "Aratou 60, Patras";
        viewPickupTimes.textContent = "18:00 - 21:00";
        /* image placeholder */
        viewImage.innerHTML = "No Image Set";
        /* tags placeholder */
        viewTags.innerHTML = `<span class="view-chip">Pasta</span><span class="view-chip">Vegetarian</span>`;
        /* allergens */
        if (allergens.length === 0) {
            viewAllergens.innerHTML = `<span class="view-no-allergens">No allergens noted</span>`;
        } else {
            viewAllergens.innerHTML = allergens.map(a => `<span class="view-chip allergen-view-chip">${a}</span>`).join("");
        }
        viewPostedDate.textContent = meta;
        /* star rating */
        viewRating.textContent = `${Number(rating).toFixed(1)} ★`;
        /* show modal */
        viewModal.classList.remove("hidden");
        // always open at top
        viewModal.querySelector(".view-modal-content").scrollTop = 0;
        
    }

    /* close */
    function closeViewModal() {
        viewModal.classList.add("hidden");
    }

    /* open events */
    document.querySelectorAll(".view-details-btn")
        .forEach(button => {
            button.addEventListener("click", () => {
                const postItem = button.closest(".post-list-item");
                openViewModal(postItem);
            });
        });

    /* close events */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);

    /* close modal when clicking outside */
    viewModal.querySelector(".modal-overlay").addEventListener("click", closeViewModal);

});