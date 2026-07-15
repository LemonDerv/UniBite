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
    let currentLang = "en";

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
        currentLang = dictionary[lang] ? lang : "en";
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
    document.addEventListener("click", (e) => {
        const button = e.target.closest(".menu-trigger");
        if (!button) return;

        e.stopPropagation();
        const dropdown = button.nextElementSibling;
        if (!dropdown) return;

        document.querySelectorAll(".menu-dropdown").forEach(menu => {
            if (menu !== dropdown) {
                menu.classList.remove("active");
                menu.previousElementSibling?.setAttribute("aria-expanded", "false");
            }
        });

        const isOpen = dropdown.classList.toggle("active");
        button.setAttribute("aria-expanded", String(isOpen));
    });

    // close when clicking outside
    document.addEventListener("click", () => {
        document.querySelectorAll(".menu-dropdown").forEach(menu => {
            menu.classList.remove("active");
            menu.previousElementSibling?.setAttribute("aria-expanded", "false");
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
        disablePageScroll();
    }

    /* close modal */
    function closeModal() {
        if (!modal) return;
        modal.classList.add("hidden");
        enablePageScroll();
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
    /* pickup windows */
    const pickupDate = document.getElementById("pickupDate");
    const pickupStart = document.getElementById("pickupStart");
    const pickupEnd = document.getElementById("pickupEnd");
    const addPickupWindowBtn = document.getElementById("addPickupWindow");
    const pickupWindowList = document.getElementById("pickupWindowList");
    const pickupAddressSearchBtn = document.getElementById("pickupAddressSearch");
    const pickupGeoError = document.getElementById("pickupGeoError");
    const pickupMapEl = document.getElementById("pickupMap");
    /* tags */
    const tagButtons = document.querySelectorAll(".edit-tag");
    /* allergens */
    const allergenDropdown = document.querySelector(".allergen-dropdown");
    const allergyCheckboxes = document.querySelectorAll(".allergen-list input[type='checkbox']");

    let pickupWindows = [];
    let pickupMap = null;
    let pickupMarker = null;
    const now = new Date();
    const max = new Date();
    max.setHours(now.getHours() + 48);
    pickupDate.min = now.toISOString().split("T")[0];
    pickupDate.max = max.toISOString().split("T")[0];

    function formatTimeInput(input) {
        input.dataset.raw = "";
        input.addEventListener("keydown", (e) => {
            const allowedKeys = ["Backspace","Delete","Tab","ArrowLeft","ArrowRight"];
            // allow control keys
            if (allowedKeys.includes(e.key)) {
                if (e.key === "Backspace") {
                    e.preventDefault();
                    let raw = input.dataset.raw || "";
                    raw = raw.slice(0, -1);   // remove last digit
                    input.dataset.raw = raw;
                    updateDisplay(input, raw);
                }
                return;
            }
            // allow only digits
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
                return;
            }
            e.preventDefault();
            let raw = input.dataset.raw || "";
            if (raw.length >= 4) return;
            raw += e.key;
            input.dataset.raw = raw;
            updateDisplay(input, raw);
        });
    }

    function updateDisplay(input, raw) {
        if (raw.length === 0) {
            input.value = "";
            return;
        }
        if (raw.length <= 2) {
            input.value = raw;
            return;
        }
        // 3 digits: preview with leading zero
        if (raw.length === 3) {
            const padded = raw.padStart(4, "0");
            input.value =
                padded.slice(0, 2) + ":" + padded.slice(2);
            return;
        }
        // 4 digits: validate
        const formatted = raw.slice(0, 2) + ":" + raw.slice(2);
        const [hours, minutes] = formatted.split(":").map(Number);
        if (hours > 23 || minutes > 59) {
            input.dataset.raw = raw.slice(0, -1);
            updateDisplay(input, input.dataset.raw);
            return;
        }
        input.value = formatted;
    }

    formatTimeInput(pickupStart);
    formatTimeInput(pickupEnd);

    function shortenAddress(address) {
        const normalized = String(address || "").replace(/\s+/g, " ").trim();
        if (!normalized.includes(",")) return normalized;
        const parts = normalized
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        const houseNumberPattern = /^\d+[^\d\s,]?$/;
        const postcode = parts.find((part) => /\b\d{3}\s?\d{2}\b/.test(part));

        if (parts.length >= 3 && houseNumberPattern.test(parts[1])) {
            const neighborhood = postcode
                ? `${parts[2]} ${postcode.replace(/\s+/g, "")}`
                : parts[2];
            return `${parts[0]}, ${parts[1]}, ${neighborhood}`;
        }

        return parts.slice(0, 2).join(", ");
    }

    async function geocodeAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { "Accept-Language": currentLang === "gr" ? "el" : "en" } });
        if (!res.ok) throw new Error("network");
        const data = await res.json();
        if (!data.length) throw new Error("not_found");
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: shortenAddress(data[0].display_name) };
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, { headers: { "Accept-Language": currentLang === "gr" ? "el" : "en" } });
        if (!res.ok) throw new Error("network");
        const data = await res.json();
        return shortenAddress(data.display_name) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    function showPickupGeoError(message) {
        if (!pickupGeoError) return;
        pickupGeoError.textContent = message;
        pickupGeoError.hidden = false;
    }

    function clearPickupGeoError() {
        if (!pickupGeoError) return;
        pickupGeoError.textContent = "";
        pickupGeoError.hidden = true;
    }

    function placePickupMarker(lat, lng) {
        if (!pickupMap || !window.L) return;

        if (pickupMarker) {
            pickupMarker.setLatLng([lat, lng]);
        } else {
            pickupMarker = L.marker([lat, lng]).addTo(pickupMap);
        }

        pickupMap.setView([lat, lng], 16);
    }

    function resetPickupMap() {
        clearPickupGeoError();
        if (pickupMarker && pickupMap) {
            pickupMap.removeLayer(pickupMarker);
            pickupMarker = null;
        }
        pickupMap?.setView([38.2466, 21.7346], 14);
    }

    function initPickupMap() {
        if (pickupMap || !pickupMapEl) return;

        if (!window.L) {
            showPickupGeoError("Map could not be loaded. Check your connection and refresh.");
            return;
        }

        pickupMap = L.map("pickupMap").setView([38.2466, 21.7346], 14);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
            subdomains: "abcd",
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(pickupMap);

        pickupMap.on("click", async (event) => {
            clearPickupGeoError();
            const { lat, lng } = event.latlng;
            placePickupMarker(lat, lng);

            try {
                editAddress.value = await reverseGeocode(lat, lng);
            } catch {
                editAddress.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            }
        });
    }

    function refreshPickupMap() {
        initPickupMap();
        setTimeout(() => pickupMap?.invalidateSize(), 80);
    }

    async function locatePickupAddress() {
        clearPickupGeoError();
        const query = editAddress.value.trim();
        if (!query) return;

        pickupAddressSearchBtn.disabled = true;
        try {
            const { lat, lng, display } = await geocodeAddress(query);
            placePickupMarker(lat, lng);
            editAddress.value = display;
        } catch (err) {
            showPickupGeoError(err.message === "not_found"
                ? "Address not found. Try a more specific address."
                : "Could not look up this address. Please try again.");
        } finally {
            pickupAddressSearchBtn.disabled = false;
        }
    }

    function renderPickupWindows() {
        pickupWindowList.innerHTML = "";

        pickupWindows.forEach((w, index) => {
            pickupWindowList.innerHTML += `
                <div class="pickup-chip">
                    ${w.date} | ${w.start} - ${w.end}
                    <button
                        type="button"
                        class="remove-window"
                        data-index="${index}">
                        ✕
                    </button>
                </div>
            `;
        });

        document.querySelectorAll(".remove-window")
            .forEach(btn => {
                btn.addEventListener("click", () => {
                    const i = btn.dataset.index;
                    pickupWindows.splice(i, 1);
                    renderPickupWindows();
                });
            });
    }

    /* open modal */
    function openEditModal(card) {
        // retrieve data
        const title = card.querySelector(".post-title")?.textContent.trim() || "";
        const description = card.querySelector(".post-description")?.textContent.trim() || "";
        const portions = card.querySelector(".post-portions")?.textContent.replace(" left", "").trim() || "";
        const address = card.querySelector(".post-address")?.textContent.trim() || "";
        pickupWindows = card.dataset.pickup
            ? JSON.parse(card.dataset.pickup)
            : [];
        const tags = card.dataset.tags
            ? card.dataset.tags.split(",").map(t => t.trim())
            : [];
        let allergens = card.dataset.allergens
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
        resetPickupMap();
        renderPickupWindows();
        pickupDate.value = "";
        pickupStart.value = "";
        pickupEnd.value = "";
        pickupStart.dataset.raw = "";
        pickupEnd.dataset.raw = "";
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
        disablePageScroll();
        /* always show first page */
        showEditPage(1);
        /* always scroll to top */
        editModal.querySelector(".edit-modal-content").scrollTop = 0;
    }

    /* close modal */
    function closeEditModal() {
        editModal.classList.add("hidden");
        enablePageScroll();
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

    addPickupWindowBtn.addEventListener("click", () => {
        const date = pickupDate.value;
        const start = pickupStart.value;
        const end = pickupEnd.value;
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!date || !start || !end) {
            alert("Fill all pickup fields.");
            return;
        }
        if (!timeRegex.test(start) || !timeRegex.test(end)) {
            alert("Use HH:MM format (example: 15:30)");
            return;
        }
        if (start >= end) {
            alert("End time must be after start.");
            return;
        }

        const selected = new Date(`${date}T${start}`);
        const limit = new Date();
        limit.setHours(limit.getHours() + 48);

        if (selected > limit) {
            alert("Pickup must be within 48 hours.");
            return;
        }
        pickupWindows.push({
            date,
            start,
            end
        });
        renderPickupWindows();
        pickupDate.value = "";
        pickupStart.value = "";
        pickupEnd.value = "";
        pickupStart.dataset.raw = "";
        pickupEnd.dataset.raw = "";
    });

    /* save changes */
    document.querySelector(".save-edit")
        .addEventListener("click", () => {
            console.log({
                title: editTitle.value,
                description: editDescription.value,
                portions: editPortions.value,
                address: editAddress.value,
                pickupWindows: pickupWindows,
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

        if (page === 2) {
            refreshPickupMap();
            if (editAddress.value.trim() && !pickupMarker) {
                locatePickupAddress();
            }
        }
    }

    nextBtn.addEventListener("click", () => {
        showEditPage(2);
    });
    prevBtn.addEventListener("click", () => {
        showEditPage(1);
    });

    pickupAddressSearchBtn?.addEventListener("click", locatePickupAddress);
    editAddress?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && currentEditPage === 2) {
            e.preventDefault();
            locatePickupAddress();
        }
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
        disablePageScroll();
        // always open at top
        viewModal.querySelector(".view-modal-content").scrollTop = 0;

    }

    /* close */
    function closeViewModal() {
        viewModal.classList.add("hidden");
        enablePageScroll();
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
