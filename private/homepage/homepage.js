document.addEventListener('DOMContentLoaded', () => {

    /* ------------------------------
       THEME + LANGUAGE
    ------------------------------ */
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    const languageInputs = document.querySelectorAll('input[name="language"]');
    const languageLabel = document.getElementById('language-label');

    const dictionary = {
        en: {
            chooseTheme: 'Choose Theme',
            dark: 'Dark',
            light: 'Light',
            welcome: 'Welcome back, Student',
            subtitle: 'Fresh meal offerings near you.',
            geoNotFound: 'Address not found. Try a more specific address.',
            geoError: 'Could not look up this address. Please try again.',
            geoMapUnavailable: 'Map could not be loaded. Check your connection and refresh.'
        },
        gr: {
            chooseTheme: 'Επιλογή Θέματος',
            dark: 'Σκούρο',
            light: 'Ανοιχτό',
            welcome: 'Καλώς ήρθες ξανά',
            subtitle: 'Φρέσκα γεύματα κοντά σου.'
        }
    };

    let currentLang = 'en';

    const setTheme = (theme) => {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
        localStorage.setItem('unibites-theme', theme);
    };

    const setLanguage = (lang) => {
        currentLang = dictionary[lang] ? lang : 'en';
        const selected = dictionary[currentLang];

        if (languageLabel) {
            languageLabel.textContent = lang === 'gr' ? 'ΕΛΛ' : 'ENG';
        }

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (selected[key]) el.textContent = selected[key];
        });

        const heading = document.querySelector('.page-heading h1');
        const subtitle = document.querySelector('.page-heading p');

        if (heading) heading.textContent = selected.welcome;
        if (subtitle) subtitle.textContent = selected.subtitle;

        localStorage.setItem('unibites-language', currentLang);
    };

    /* LOAD SAVED SETTINGS */
    const savedTheme = localStorage.getItem('unibites-theme') || 'light';
    const savedLang = localStorage.getItem('unibites-language') || 'en';

    setTheme(savedTheme);
    setLanguage(savedLang);

    const selectedTheme = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    const selectedLang = document.querySelector(`input[name="language"][value="${savedLang}"]`);

    if (selectedTheme) selectedTheme.checked = true;
    if (selectedLang) selectedLang.checked = true;

    /* ------------------------------
       UTILITY MENU
    ------------------------------ */
    /* EVENTS */
    themeInputs.forEach(input => {
        input.addEventListener('change', () => {
            setTheme(input.value);
        });
    });

    languageInputs.forEach(input => {
        input.addEventListener('change', () => {
            setLanguage(input.value);
        });
    });

    /* ------------------------------
       ADDRESS MAP + DROPDOWN
    ------------------------------ */
    const addressBtn = document.querySelector('.address-btn');
    const addressDropdown = document.querySelector('.address-dropdown');
    const addressInput = document.getElementById('homepage-address-input');
    const btnSearchAddress = document.getElementById('homepage-btn-search');
    const btnAddAddress = document.getElementById('homepage-btn-add-address');
    const addressMapPanel = document.getElementById('homepage-address-map-panel');
    const geoErrorEl = document.getElementById('homepage-geo-error');
    const homepageMapEl = document.getElementById('homepage-map');
    const defaultAddresses = ['Aratou 60, Patras', 'Miaouli 13, Patras'];
    let homepageMap = null;
    let homepageMarker = null;
    let selectedAddress = '';

    function readUserSetup() {
        try {
            return JSON.parse(localStorage.getItem('unibites-user-setup')) || {};
        } catch {
            return {};
        }
    }

    function shortenAddress(address) {
        const normalized = String(address || '').replace(/\s+/g, ' ').trim();
        if (!normalized.includes(',')) return normalized;
        const parts = normalized
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
        const houseNumberPattern = /^\d+[^\d\s,]?$/;
        const postcode = parts.find((part) => /\b\d{3}\s?\d{2}\b/.test(part));

        if (parts.length >= 3 && houseNumberPattern.test(parts[1])) {
            const neighborhood = postcode
                ? `${parts[2]} ${postcode.replace(/\s+/g, '')}`
                : parts[2];
            return `${parts[0]}, ${parts[1]}, ${neighborhood}`;
        }

        return parts.slice(0, 2).join(', ');
    }

    function getInitialAddresses() {
        const setup = readUserSetup();
        const storedAddresses = Array.isArray(setup.addresses) ? setup.addresses : [];
        const source = storedAddresses.length ? storedAddresses : defaultAddresses;
        return [...new Set(source.map(shortenAddress).filter(Boolean))];
    }

    const addresses = getInitialAddresses();

    function saveAddresses() {
        const setup = readUserSetup();
        setup.addresses = addresses;
        localStorage.setItem('unibites-user-setup', JSON.stringify(setup));
    }

    function setSelectedAddress(address) {
        selectedAddress = address || addresses[0] || '';
        if (addressBtn) {
            addressBtn.textContent = selectedAddress ? `${selectedAddress} ▼` : 'Select address ▼';
        }
    }

    function renderAddressDropdown() {
        if (!addressDropdown) return;

        addressDropdown.innerHTML = '';
        addresses.forEach((address) => {
            const item = document.createElement('li');
            item.textContent = address;
            item.title = address;
            addressDropdown.appendChild(item);
        });

        const addItem = document.createElement('li');
        addItem.className = 'add-new';
        addItem.textContent = '+ Add New Address';
        addressDropdown.appendChild(addItem);
    }

    function openAddressMapPanel() {
        if (!addressMapPanel) return;

        addressMapPanel.hidden = false;
        clearGeoError();
        addressInput?.focus();
        initHomepageMap();
        setTimeout(() => homepageMap?.invalidateSize(), 60);
    }

    function closeAddressMapPanel() {
        if (!addressMapPanel) return;

        addressMapPanel.hidden = true;
    }

    function showGeoError(key) {
        if (!geoErrorEl) return;
        const dict = dictionary[currentLang] || dictionary.en;
        geoErrorEl.textContent = dict[key] || dictionary.en[key] || key;
        geoErrorEl.hidden = false;
    }

    function clearGeoError() {
        if (!geoErrorEl) return;
        geoErrorEl.hidden = true;
        geoErrorEl.textContent = '';
    }

    function placeHomepageMarker(lat, lng) {
        if (!homepageMap || !window.L) return;

        if (homepageMarker) {
            homepageMarker.setLatLng([lat, lng]);
        } else {
            homepageMarker = L.marker([lat, lng]).addTo(homepageMap);
        }

        homepageMap.setView([lat, lng], 16);
    }

    function initHomepageMap() {
        if (homepageMap || !homepageMapEl) return;

        if (!window.L) {
            showGeoError('geoMapUnavailable');
            return;
        }

        homepageMap = L.map('homepage-map').setView([38.2466, 21.7346], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(homepageMap);

        homepageMap.on('click', async (event) => {
            clearGeoError();
            const { lat, lng } = event.latlng;
            placeHomepageMarker(lat, lng);

            try {
                addressInput.value = await reverseGeocode(lat, lng);
            } catch {
                addressInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            }
        });

        setTimeout(() => homepageMap.invalidateSize(), 60);
    }

    async function geocodeAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': currentLang === 'gr' ? 'el' : 'en' } });
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        if (!data.length) throw new Error('not_found');
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: shortenAddress(data[0].display_name) };
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, { headers: { 'Accept-Language': currentLang === 'gr' ? 'el' : 'en' } });
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        return shortenAddress(data.display_name) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    if (addressBtn && addressDropdown) {
        renderAddressDropdown();
        setSelectedAddress(addresses[0]);

        addressBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = addressDropdown.classList.toggle('show');
            addressBtn.setAttribute('aria-expanded', String(isOpen));
        });

        addressDropdown.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;

            if (li.classList.contains('add-new')) {
                openAddressMapPanel();
            } else {
                setSelectedAddress(li.textContent.trim());
                closeAddressMapPanel();
            }

            addressDropdown.classList.remove('show');
            addressBtn.setAttribute('aria-expanded', 'false');
        });

        document.addEventListener('click', () => {
            addressDropdown.classList.remove('show');
            addressBtn.setAttribute('aria-expanded', 'false');
        });
    }

    btnSearchAddress?.addEventListener('click', async () => {
        clearGeoError();
        const query = addressInput.value.trim();
        if (!query) return;

        btnSearchAddress.disabled = true;
        try {
            const { lat, lng, display } = await geocodeAddress(query);
            placeHomepageMarker(lat, lng);
            addressInput.value = display;
        } catch (err) {
            showGeoError(err.message === 'not_found' ? 'geoNotFound' : 'geoError');
        } finally {
            btnSearchAddress.disabled = false;
        }
    });

    addressInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnSearchAddress?.click();
        }
    });

    btnAddAddress?.addEventListener('click', () => {
        clearGeoError();
        const val = shortenAddress(addressInput.value);
        if (!val || addresses.includes(val)) return;

        addresses.push(val);
        saveAddresses();
        renderAddressDropdown();
        setSelectedAddress(val);
        closeAddressMapPanel();
    });

    /* ------------------------------
       ALLERGY FILTER
    ------------------------------ */
    const allergyCheckbox = document.getElementById('filter-allergies');
    if (allergyCheckbox) {
        allergyCheckbox.addEventListener('change', () => {
            console.log(`Allergy filter: ${allergyCheckbox.checked}`);
        });
    }

    /* ------------------------------
       CATEGORY TOGGLE
    ------------------------------ */
    const categoryButtons = document.querySelectorAll('.category');
    categoryButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
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

    /* fields */
    const viewTitle = document.getElementById("viewTitle");
    const viewPortions = document.getElementById("viewPortions");
    const viewDescription = document.getElementById("viewDescription");
    const viewAddress = document.getElementById("viewAddress");
    const viewPickupTimes = document.getElementById("viewPickupTimes");
    const viewImage = document.getElementById("viewImage");
    const viewTags = document.getElementById("viewTags");
    const viewAllergens = document.getElementById("viewAllergens");
    const viewCreator = document.getElementById("viewCreator");
    const viewDistance = document.getElementById("viewDistance");
    const viewTimeRemaining = document.getElementById("viewTimeRemaining");

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
        const title = postItem.querySelector(".post-title")?.textContent || "";
        /* meta (creator + distance + time) */
        const metaText = postItem.querySelector(".post-meta span:first-child")?.textContent || "";
        const [creatorRaw, distanceRaw] = metaText.split("•");
        const creator = creatorRaw?.trim() || "";
        const distance = distanceRaw?.trim() || "";
        const timeRemaining = postItem.querySelector(".post-time-remaining")?.textContent?.trim() || "";
        /* portions */
        const portions = postItem.querySelector(".post-portions")?.textContent || "";
        /* allergens (from data attribute) */
        const allergensRaw = postItem.querySelector(".post-allergens")?.dataset.allergens || "";
        const allergens = allergensRaw
            ? allergensRaw.split(",").map(a => a.trim()).filter(Boolean)
            : [];

        /* fill fields (with test/placeholder data) */
        viewTitle.textContent = title;
        viewCreator.textContent = `Posted by ${creator}`;
        viewDistance.textContent = distance;
        viewTimeRemaining.textContent = timeRemaining;
        viewPortions.textContent = portions;
        viewDescription.textContent = "Fresh pasta with tomato sauce and basil.";
        viewAddress.textContent = "Aratou 60, Patras";
        viewPickupTimes.textContent = "18:00 - 21:00";
        viewImage.innerHTML = "No Image Set";
        viewTags.innerHTML = `<span class="view-chip">Pasta</span><span class="view-chip">Vegetarian</span>`;
        /* allergens logic */
        if (allergens.length === 0) {
            viewAllergens.innerHTML = `<span class="view-no-allergens">No allergens noted</span>`;
        } else {
            viewAllergens.innerHTML = allergens.map(a => `<span class="view-chip allergen-view-chip">${a}</span>`).join("");
        }

        /* show modal */
        disablePageScroll();
        viewModal.classList.remove("hidden");

        /* reset scroll to top */
        const content = viewModal.querySelector(".view-modal-content");
        if (content) content.scrollTop = 0;
    }

    /* close modal */
    function closeViewModal() {
        viewModal.classList.add("hidden");
        enablePageScroll();
    }

    /* open events */
    document.querySelectorAll(".view-details-btn")
        .forEach(button => {
            button.addEventListener("click", () => {
                const postItem = button.closest(".post-card");
                openViewModal(postItem);
            });
        });

    /* close events */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);

    /* request (to be expanded) */
    const requestBtn = document.querySelector(".request-btn");
    requestBtn?.addEventListener("click", () => {
        alert("Serving request submitted!");
        closeViewModal();
    });

    /* close modal when clicking outside */
    viewModal.querySelector(".modal-overlay").addEventListener("click", closeViewModal);


/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
        CREATE POST MODAL
    ----------------------------- */

    document.querySelector(".open-create-modal").addEventListener("click", () => {
        openEditModal();
    });

    const editModal = document.getElementById("editModal");
    const closeEditBtn = document.querySelector(".close-edit-modal");
    const cancelEditBtn = document.querySelector(".cancel-edit");

    /* fields */
    const editTitle = document.getElementById("editTitle");
    const editDescription = document.getElementById("editDescription");
    const editPortions = document.getElementById("editTotalPortions");
    const editAddress = document.getElementById("editAddress");
    const pickupDate = document.getElementById("pickupDate");
    const pickupStart = document.getElementById("pickupStart");
    const pickupEnd = document.getElementById("pickupEnd");
    const addPickupWindowBtn = document.getElementById("addPickupWindow");
    const pickupWindowList = document.getElementById("pickupWindowList");
    const pickupAddressSearchBtn = document.getElementById("pickupAddressSearch");
    const pickupGeoError = document.getElementById("pickupGeoError");
    const pickupMapEl = document.getElementById("pickupMap");
    const tagButtons = document.querySelectorAll(".chip-option");
    const allergenDropdown = document.querySelector(".allergen-dropdown");
    const allergyCheckboxes = document.querySelectorAll('.allergen-list input[type="checkbox"]');
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

    /* open modal */
    function openEditModal(card) {
        editModal.classList.remove("hidden");
        disablePageScroll();
        // reset fields
        editTitle.value = "";
        editDescription.value = "";
        editPortions.value = "";
        editAddress.value = "";
        resetPickupMap();
        pickupWindows = [];
        renderPickupWindows();
        pickupDate.value = "";
        pickupStart.value = "";
        pickupEnd.value = "";
        pickupStart.dataset.raw = "";
        pickupEnd.dataset.raw = "";
        imagePreview.innerHTML = "No Image Set";
        imageInput.value = "";
        /* reset all checkboxes (tags) */
        document.querySelectorAll('.chip-option input').forEach(cb => {cb.checked = false;});
        /* reset allergens */
        document.querySelectorAll('.allergen-list input').forEach(cb => {cb.checked = false;});
        /* always show first page */
        showEditPage(1);
        /* always scroll to top */
        editModal.querySelector(".edit-modal-content").scrollTop = 0;
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

    /* allergens dropdown behavior */
    document.addEventListener("click", (e) => {
        if (allergenDropdown && allergenDropdown.open && !allergenDropdown.contains(e.target)) {
            allergenDropdown.removeAttribute("open");
        }
    });

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

    const editPrevBtn = document.querySelector(".prev-edit-page");
    const editNextBtn = document.querySelector(".next-edit-page");

    function showEditPage(page) {
        currentEditPage = page;

        page1.classList.toggle("active", page === 1);
        page2.classList.toggle("active", page === 2);

        if (page === 1) {
            editNextBtn.style.display = "inline-flex";
            editPrevBtn.style.display = "none";
        } else {
            editNextBtn.style.display = "none";
            editPrevBtn.style.display = "inline-flex";
        }
        editModal.classList.toggle("page-2", page === 2);

        if (page === 2) {
            refreshPickupMap();
        }
    }

    editNextBtn.addEventListener("click", () => {
        showEditPage(2);
    });
    editPrevBtn.addEventListener("click", () => {
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
    /* ------------------------------
       AVATAR
    ------------------------------ */
    const avatar = document.getElementById("avatar");
    const menu = document.getElementById("dropdownMenu");

    avatar.addEventListener("click", () => {
        menu.style.display =
            menu.style.display === "flex" ? "none" : "flex";
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
        if (!avatar.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

/*----------------------------------------------------------------------------------------------------*/
    /* ------------------------------
       PAGINATION
    ------------------------------ */
    const posts = document.querySelectorAll('.post-card');
    const prevBtn = document.querySelector('.page-btn.prev');
    const nextBtn = document.querySelector('.page-btn.next');

    let currentPage = 0;
    const postsPerPage = 12;

    function showPage(page) {
        posts.forEach((post, index) => {
            post.style.display =
                index >= page * postsPerPage &&
                index < (page + 1) * postsPerPage
                    ? 'block'
                    : 'none';
        });

        /* disable buttons when needed */
        if (prevBtn) prevBtn.disabled = page === 0;
        if (nextBtn) nextBtn.disabled = (page + 1) * postsPerPage >= posts.length;
    }

    if (prevBtn && nextBtn) {
        showPage(currentPage);

        nextBtn.addEventListener('click', () => {
            if ((currentPage + 1) * postsPerPage < posts.length) {
                currentPage++;
                showPage(currentPage);

                setTimeout(() => {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }, 0);
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                showPage(currentPage);

                setTimeout(() => {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }, 0);
            }
        });
    }
});
