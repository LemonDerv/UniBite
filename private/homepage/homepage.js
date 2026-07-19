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
                updateInteractiveMapRadius();
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
        updateInteractiveMapRadius();
    });

    const cancelAddressBtn = document.getElementById('homepage-btn-address-cancel');
    if (cancelAddressBtn) {
        cancelAddressBtn.addEventListener('click', () => {
            closeAddressMapPanel();
        });
    }

    /* ------------------------------
       INTERACTIVE MAP FOR OFFERS
    ------------------------------ */
    const interactiveMapEl = document.getElementById('interactive-map');
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValueEl = document.getElementById('radius-value');
    let interactiveMap = null;
    let userMarker = null;
    let offerMarkers = [];
    let userCircle = null;
    let userLatLng = [38.2466, 21.7346]; // Patra as default

    // Sample data for offers (to be replaced with real data)
    const sampleOffers = [
        { id: 1, title: 'Homemade Pasta Plate', lat: 38.2466, lng: 21.7346, distance: 1.2 },
        { id: 2, title: 'Greek Salad', lat: 38.2500, lng: 21.7350, distance: 1.5 },
        { id: 3, title: 'Vegetable Soup', lat: 38.2450, lng: 21.7400, distance: 2.0 },
        { id: 4, title: 'Chicken Curry', lat: 38.2550, lng: 21.7250, distance: 3.0 },
        { id: 5, title: 'Beef Stew', lat: 38.2600, lng: 21.7300, distance: 4.0 }
    ];

    function initInteractiveMap() {
        if (interactiveMap || !interactiveMapEl) return;

        if (!window.L) {
            console.error('Leaflet not loaded');
            return;
        }

        interactiveMap = L.map('interactive-map').setView(userLatLng, 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(interactiveMap);

        // Add user marker
        userMarker = L.marker(userLatLng, {
            icon: L.divIcon({
                className: 'user-marker',
                html: '📍',
                iconSize: [50, 50],
                iconAnchor: [25, 50]
            })
        }).addTo(interactiveMap);

        // Add circle for radius
        userCircle = L.circle(userLatLng, {
            radius: 1000, // Default radius in meters (1 km)
            color: '#cc5500',
            fillColor: '#cc5500',
            fillOpacity: 0.2
        }).addTo(interactiveMap);

        // Add sample offer markers
        sampleOffers.forEach(offer => {
            const marker = L.marker([offer.lat, offer.lng]).addTo(interactiveMap);
            marker.bindPopup(`<b>${offer.title}</b><br>Distance: ${offer.distance} km`);
            offerMarkers.push(marker);
        });

        // Update circle radius when slider changes
        radiusSlider?.addEventListener('input', (e) => {
            const radiusKm = parseFloat(e.target.value);
            const radiusMeters = radiusKm * 1000;
            userCircle.setRadius(radiusMeters);
            radiusValueEl.textContent = `${radiusKm} km`;
            filterOffersByRadius(radiusKm);
        });

        // Set initial radius value
        radiusSlider.value = 1;
        radiusValueEl.textContent = `${radiusSlider.value} km`;

        // Center map on user's selected address
        updateInteractiveMapRadius();
    }

    function updateInteractiveMapRadius() {
        if (!interactiveMap || !selectedAddress) return;

        // Geocode the selected address to get coordinates
        geocodeAddress(selectedAddress).then(({ lat, lng }) => {
            userLatLng = [lat, lng];
            userMarker.setLatLng(userLatLng);
            userCircle.setLatLng(userLatLng);
            interactiveMap.setView(userLatLng, 14);
            filterOffersByRadius(parseInt(radiusSlider?.value || 1));
        }).catch(() => {
            console.error('Could not geocode selected address');
        });
    }

    function filterOffersByRadius(radiusKm) {
        const radiusMeters = radiusKm * 1000;
        const userLat = userLatLng[0];
        const userLng = userLatLng[1];

        offerMarkers.forEach((marker, index) => {
            const offer = sampleOffers[index];
            const distance = calculateDistance(userLat, userLng, offer.lat, offer.lng);
            
            // Show/hide markers based on distance
            if (distance <= radiusMeters) {
                marker.addTo(interactiveMap);
            } else {
                interactiveMap.removeLayer(marker);
            }
        });

        // Filter post cards in the feed
        filterPostCardsByRadius(radiusKm);
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula for the distance between two points
        const R = 6371000; // Earth radius in meters
        const f1 = lat1 * Math.PI / 180;
        const f2 = lat2 * Math.PI / 180;
        const Df = (lat2 - lat1) * Math.PI / 180;
        const Dl = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Df / 2) * Math.sin(Df / 2) +
                  Math.cos(f1) * Math.cos(f2) *
                  Math.sin(Dl / 2) * Math.sin(Dl / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    function filterPostCardsByRadius(radiusKm) {
        const postCards = document.querySelectorAll('.post-card');
        const radiusMeters = radiusKm * 1000;

        postCards.forEach((card, index) => {
            const offer = sampleOffers[index % sampleOffers.length]; // Cycle through sample offers
            const distance = calculateDistance(userLatLng[0], userLatLng[1], offer.lat, offer.lng);
            
            if (distance <= radiusMeters) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    /* Initialize the interactive map */
    initInteractiveMap();

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
            btn.classList.toggle('active');
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

    /* ------------------------------
       VIEW DETAILS MODAL
    ------------------------------ */
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
            viewAllergens.innerHTML = `<span class="no-allergens">No allergens noted</span>`;
            return;
        }

        viewAllergens.innerHTML = allergens
            .map(allergen => `<span class="view-chip allergen-view-chip">${allergen}</span>`)
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
        viewAddress.textContent = selectedAddress || "Aratou 60, Patras";
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

    /* ------------------------------
       CREATE POST MODAL
    ------------------------------ */
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
            if (allowedKeys.includes(e.key)) {
                if (e.key === "Backspace") {
                    e.preventDefault();
                    let raw = input.dataset.raw || "";
                    raw = raw.slice(0, -1);
                    input.dataset.raw = raw;
                    updateDisplay(input, raw);
                }
                return;
            }
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
        if (raw.length === 3) {
            const padded = raw.padStart(4, "0");
            input.value = padded.slice(0, 2) + ":" + padded.slice(2);
            return;
        }
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
        document.querySelectorAll('.chip-option input').forEach(cb => {cb.checked = false;});
        document.querySelectorAll('.allergen-list input').forEach(cb => {cb.checked = false;});
        showEditPage(1);
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

    /* ------------------------------
       AVATAR
    ------------------------------ */
    const avatar = document.getElementById("avatar");
    const menu = document.getElementById("dropdownMenu");

    avatar.addEventListener("click", () => {
        menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    });

    document.addEventListener("click", (e) => {
        if (!avatar.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

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