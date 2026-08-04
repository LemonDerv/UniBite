document.addEventListener('DOMContentLoaded', () => {
    let file = null;
    let meal_location = null;
    const user  = localStorage.getItem('username') || 'User';
    const heading = document.querySelector('.page-heading h1');
    const subtitle = document.querySelector('.page-heading p');

    if (heading) {
        heading.textContent = `Welcome back, ${user}`;
    }

    if (subtitle) {
        subtitle.textContent = 'Fresh meals near you.';
    }

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

    function updateTime(expires_at, counter) {
        let now = new Date();
        const diff = expires_at - now;

        const hours  = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        counter.textContent = `${hours}h : ${minutes}m : ${seconds}s `;

        if(diff < 0){
            if(counter.dataset.timer) clearInterval(counter.dataset.timer);
            counter.dataset.timer = null;
            counter.textContent = "Expired";
            return ;
        }
        else if(diff < 60 * 1000 * 60 * 2){
            counter.classList.add("blink");
            counter.style.color = "red";
        }
    }

    function startTimer(expires , counter){
        const expires_at = new Date(expires);
        expires_at.setHours(expires_at.getHours() - 3);

        if(counter.timer){
            clearInterval(counter.dataset.timer);
            counter.dataset.timer = null;
        }
        updateTime(expires_at,counter);
        counter.dataset.timer = setInterval(()=>{updateTime(expires_at,counter)},1000);
    }

    const feedGrid = document.querySelector(".feed-grid");
    const interactiveMapEl = document.getElementById('interactive-map');
    const radiusSlider = document.getElementById('radius-slider');
    const radiusValueEl = document.getElementById('radius-value');
    const allergyCheckbox = document.getElementById('filter-allergies');
    const categoryButtons = document.querySelectorAll('.category');
    const btnUseLocation = document.getElementById('homepage-btn-use-location');
    const prevBtn = document.querySelector('.page-btn.prev');
    const nextBtn = document.querySelector('.page-btn.next');

    let allMeals = [];
    let interactiveMap = null;
    let userMarker = null;
    let userCircle = null;
    let offerMarkers = [];
    let userLatLng = [38.2466, 21.7346]; // Patras default fallback
    let activeCategories = new Set();
    let currentPage = 0;
    const postsPerPage = 12;

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

    function showGeoError(message) {
        if (!geoErrorEl) return;
        geoErrorEl.textContent = message;
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
            showGeoError('Map could not be loaded. Check your connection and refresh.');
            return;
        }

        homepageMap = L.map('homepage-map').setView(userLatLng, 14);
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
        const res = await fetch(url);
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        if (!data.length) throw new Error('not_found');
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: shortenAddress(data[0].display_name) };
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        return shortenAddress(data.display_name) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
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
                updateInteractiveMapLocation();
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
            showGeoError(err.message === 'not_found' ? 'Address not found. Try a more specific address.' : 'Could not look up this address. Please try again.');
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
        updateInteractiveMapLocation();
    });

    const cancelAddressBtn = document.getElementById('homepage-btn-address-cancel');
    if (cancelAddressBtn) {
        cancelAddressBtn.addEventListener('click', () => {
            closeAddressMapPanel();
        });
    }

    btnUseLocation?.addEventListener('click', () => {
        clearGeoError();
        if (!navigator.geolocation) {
            showGeoError('Geolocation is not supported by your browser.');
            return;
        }

        btnUseLocation.disabled = true;
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                placeHomepageMarker(latitude, longitude);
                userLatLng = [latitude, longitude];

                if (userMarker) userMarker.setLatLng(userLatLng);
                if (userCircle) userCircle.setLatLng(userLatLng);
                if (interactiveMap) interactiveMap.setView(userLatLng, 14);

                try {
                    const disp = await reverseGeocode(latitude, longitude);
                    addressInput.value = disp;
                } catch {
                    addressInput.value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                }
                btnUseLocation.disabled = false;
            },
            (err) => {
                btnUseLocation.disabled = false;
                showGeoError('Could not access current location. Please check browser permissions.');
            },
            { timeout: 10000 }
        );
    });

    /* ------------------------------
       INTERACTIVE MAP FOR MEALS
    ------------------------------ */
    function initInteractiveMap() {
        if (interactiveMap || !interactiveMapEl) return;

        if (!window.L) {
            console.error('Leaflet not loaded');
            return;
        }

        interactiveMap = L.map('interactive-map').setView(userLatLng, 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(interactiveMap);

        // Add user marker
        userMarker = L.marker(userLatLng, {
            icon: L.divIcon({
                className: 'user-marker',
                html: '📍',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            })
        }).addTo(interactiveMap);

        // Add circle for radius
        const initialRadiusKm = parseFloat(radiusSlider?.value || 10);
        userCircle = L.circle(userLatLng, {
            radius: initialRadiusKm * 1000,
            color: '#cc5500',
            fillColor: '#cc5500',
            fillOpacity: 0.2
        }).addTo(interactiveMap);

        if (radiusValueEl && radiusSlider) {
            radiusValueEl.textContent = `${radiusSlider.value} km`;
        }

        setTimeout(() => {
            if (interactiveMap) interactiveMap.invalidateSize();
        }, 200);

        window.addEventListener('resize', () => {
            if (interactiveMap) interactiveMap.invalidateSize();
        });

        // Update circle radius when slider changes
        radiusSlider?.addEventListener('input', (e) => {
            const radiusKm = parseFloat(e.target.value);
            const radiusMeters = radiusKm * 1000;
            if (userCircle) userCircle.setRadius(radiusMeters);
            if (radiusValueEl) radiusValueEl.textContent = `${radiusKm} km`;
            applyAllFilters();
        });

        // Center map on user's selected address
        updateInteractiveMapLocation();
    }

    function updateInteractiveMapLocation() {
        if (!selectedAddress) return;

        geocodeAddress(selectedAddress).then(({ lat, lng }) => {
            userLatLng = [lat, lng];
            if (userMarker) userMarker.setLatLng(userLatLng);
            if (userCircle) userCircle.setLatLng(userLatLng);
            if (interactiveMap) interactiveMap.setView(userLatLng, 14);
            updateOfferMarkers();
            applyAllFilters();
        }).catch(() => {
            console.log('Could not geocode selected address, keeping current coords.');
            updateOfferMarkers();
            applyAllFilters();
        });
    }

    function updateOfferMarkers() {
        if (!interactiveMap || !window.L) return;

        // Clear existing markers
        offerMarkers.forEach(({ marker }) => {
            interactiveMap.removeLayer(marker);
        });
        offerMarkers = [];

        allMeals.forEach(meal => {
            const lat = parseFloat(meal.pickup_latitude);
            const lng = parseFloat(meal.pickup_longitude);
            if (isNaN(lat) || isNaN(lng)) return;

            const marker = L.marker([lat, lng]);
            const dist = calculateDistance(userLatLng[0], userLatLng[1], lat, lng);
            const distText = dist !== null ? `${dist.toFixed(1)} km away` : 'Distance unknown';

            const popupContent = document.createElement('div');
            popupContent.className = 'map-meal-popup';
            popupContent.innerHTML = `
                <div style="font-family: inherit; font-size: 13px; line-height: 1.4; min-width: 150px;">
                    <strong style="display: block; font-size: 14px; margin-bottom: 2px; color: #222;">${meal.title}</strong>
                    <span class="map-popup-dist" style="color: #666; font-size: 12px; display: block; margin-bottom: 4px;">By ${meal.usr_username || 'User'} • ${distText}</span>
                    <span style="display: block; margin-bottom: 6px; font-size: 12px; font-weight: 500;">Portions: <strong>${meal.portions}</strong></span>
                    <button type="button" class="map-popup-view-btn" style="background: #cc5500; color: white; border: none; padding: 5px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%;">View Details</button>
                </div>
            `;

            popupContent.querySelector('.map-popup-view-btn').addEventListener('click', () => {
                const postItem = document.querySelector(`.post-card[data-id="${meal.lst_id}"]`);
                if (postItem) {
                    openViewModal(postItem);
                }
            });

            marker.bindPopup(popupContent);
            offerMarkers.push({ marker, meal, lat, lng });
        });
    }

    function renderMealCards() {
        if (!feedGrid) return;
        feedGrid.innerHTML = '';

        if (!allMeals.length) {
            feedGrid.innerHTML = '<div class="no-meals-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #777;">No active meals found.</div>';
            updatePagination();
            return;
        }

        allMeals.forEach(meal => {
            const lat = parseFloat(meal.pickup_latitude);
            const lng = parseFloat(meal.pickup_longitude);
            const dist = (!isNaN(lat) && !isNaN(lng))
                ? calculateDistance(userLatLng[0], userLatLng[1], lat, lng)
                : null;
            const distText = dist !== null ? `${dist.toFixed(1)} km away` : 'Distance unknown';

            const tagsAttr = Array.isArray(meal.meal_tags) ? meal.meal_tags.join(',') : '';
            const allergensAttr = Array.isArray(meal.allergens) ? meal.allergens.join(',') : '';

            feedGrid.insertAdjacentHTML('beforeend', `<article class="post-card" 
                    data-id="${meal.lst_id}"
                    data-location="${meal.pickup_location || ''}"
                    data-lat="${meal.pickup_latitude || ''}"
                    data-lng="${meal.pickup_longitude || ''}"
                    data-pickup_windows='${JSON.stringify(meal.pickup_windows || [])}' 
                    data-img="${meal.img || ''}" 
                    data-expires_at="${meal.expires_at || ''}"
                >
                    <div class="post-thumb"></div>
                    <div class="post-body">
                        <div class="post-header">
                            <div class="post-title-group">
                                <h2 class="post-title">${meal.title}</h2>
                                <span class="post-portions">${meal.portions}</span>
                            </div>
                        </div>
                        <p class="post-description">${meal.description ? meal.description : "No description found."}</p>
                        <div class="post-tags" data-tags="${tagsAttr}"></div>
                        <div class="post-meta">
                            <span>By ${meal.usr_username || 'User'} • <span class="post-dist-text">${distText}</span></span>
                            <span class="post-time-remaining" data-timer> remaining</span>
                        </div>
                        <div class="post-allergens" data-allergens="${allergensAttr}"></div>
                        <div class="post-actions">
                            <button class="btn secondary view-details-btn">View Details</button>
                        </div>
                    </div>
                </article>`);

            const postCardEl = feedGrid.querySelector(`.post-card[data-id="${meal.lst_id}"]`);
            if (meal.expires_at) {
                startTimer(meal.expires_at, postCardEl.querySelector('.post-time-remaining'));
            }

            const cardTagsEl = postCardEl.querySelector('.post-tags');
            const postImg = postCardEl.querySelector('.post-thumb');
            if (meal.img) {
                postImg.innerHTML = `<canvas></canvas>`;
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = meal.img;

                img.onload = () => {
                    renderMealImg(img, postImg.clientWidth, 0.5, postImg.querySelector("canvas"));
                };

                window.addEventListener('resize', () => {
                    renderMealImg(img, postImg.clientWidth, 0.5, postImg.querySelector("canvas"));
                });
            } else {
                postImg.innerHTML = "No Image Set";
            }

            if (meal.meal_tags && meal.meal_tags.length) {
                meal.meal_tags.forEach(tag => {
                    cardTagsEl.insertAdjacentHTML('beforeend', `<span class="tag">${tag}</span>`);
                });
            } else {
                cardTagsEl.innerHTML = 'This meal has no tags.';
                cardTagsEl.classList.add('no-tags');
            }

            const allergensCard = postCardEl.querySelector('.post-allergens');
            if (meal.allergens && meal.allergens.length) {
                allergensCard.innerHTML = 'This meal has allergens noted.';
                allergensCard.classList.add('yes-allergens');
            } else {
                allergensCard.innerHTML = 'This meal has no allergens noted.';
                allergensCard.classList.add('no-allergens');
            }
        });

        feedGrid.querySelectorAll(".view-details-btn").forEach(button => {
            button.addEventListener("click", () => {
                const postItem = button.closest(".post-card");
                openViewModal(postItem);
            });
        });
    }

    function applyAllFilters() {
        const radiusKm = parseFloat(radiusSlider?.value || 10);
        const setup = readUserSetup();
        const userAllergies = (Array.isArray(setup.allergies) ? setup.allergies : []).map(a => a.toLowerCase().trim());
        const shouldFilterAllergies = allergyCheckbox?.checked || false;

        let visibleCount = 0;
        const postCards = Array.from(document.querySelectorAll('.feed-grid .post-card'));

        // 1. Filter Map Markers
        offerMarkers.forEach(({ marker, meal, lat, lng }) => {
            const dist = calculateDistance(userLatLng[0], userLatLng[1], lat, lng);
            let matchesRadius = dist === null || dist <= radiusKm;

            let matchesCategory = true;
            if (activeCategories.size > 0) {
                const mealTags = (meal.meal_tags || []).map(t => t.toLowerCase().trim());
                matchesCategory = Array.from(activeCategories).some(cat => mealTags.includes(cat.toLowerCase().trim()));
            }

            let matchesAllergies = true;
            if (shouldFilterAllergies && userAllergies.length > 0) {
                const mealAllergens = (meal.allergens || []).map(a => a.toLowerCase().trim());
                const hasConflict = mealAllergens.some(a => userAllergies.includes(a));
                if (hasConflict) matchesAllergies = false;
            }

            if (matchesRadius && matchesCategory && matchesAllergies) {
                marker.addTo(interactiveMap);
                const distText = dist !== null ? `${dist.toFixed(1)} km away` : 'Distance unknown';
                const popup = marker.getPopup();
                if (popup) {
                    const distSpan = popup.getElement()?.querySelector('.map-popup-dist');
                    if (distSpan) distSpan.textContent = `By ${meal.usr_username || 'User'} • ${distText}`;
                }
            } else {
                interactiveMap.removeLayer(marker);
            }
        });

        // 2. Filter Post Cards
        postCards.forEach(card => {
            const id = parseInt(card.dataset.id);
            const meal = allMeals.find(m => m.lst_id === id);
            if (!meal) {
                card.dataset.filterVisible = 'false';
                return;
            }

            const lat = parseFloat(meal.pickup_latitude);
            const lng = parseFloat(meal.pickup_longitude);
            const dist = (!isNaN(lat) && !isNaN(lng))
                ? calculateDistance(userLatLng[0], userLatLng[1], lat, lng)
                : null;

            // Update distance text on card
            const distSpan = card.querySelector('.post-dist-text');
            if (distSpan) {
                distSpan.textContent = dist !== null ? `${dist.toFixed(1)} km away` : 'Distance unknown';
            }

            let matchesRadius = dist === null || dist <= radiusKm;

            let matchesCategory = true;
            if (activeCategories.size > 0) {
                const mealTags = (meal.meal_tags || []).map(t => t.toLowerCase().trim());
                matchesCategory = Array.from(activeCategories).some(cat => mealTags.includes(cat.toLowerCase().trim()));
            }

            let matchesAllergies = true;
            if (shouldFilterAllergies && userAllergies.length > 0) {
                const mealAllergens = (meal.allergens || []).map(a => a.toLowerCase().trim());
                const hasConflict = mealAllergens.some(a => userAllergies.includes(a));
                if (hasConflict) matchesAllergies = false;
            }

            if (matchesRadius && matchesCategory && matchesAllergies) {
                card.dataset.filterVisible = 'true';
                visibleCount++;
            } else {
                card.dataset.filterVisible = 'false';
            }
        });

        // Empty state handling
        let noMealsEl = feedGrid?.querySelector('.no-meals-msg');
        if (visibleCount === 0 && allMeals.length > 0) {
            if (!noMealsEl && feedGrid) {
                feedGrid.insertAdjacentHTML('beforeend', '<div class="no-meals-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #777;">No meals match your current distance, food type, or allergy filters.</div>');
            }
        } else if (noMealsEl) {
            noMealsEl.remove();
        }

        currentPage = 0;
        updatePagination();
    }

    function updatePagination() {
        const visibleCards = Array.from(document.querySelectorAll('.feed-grid .post-card[data-filter-visible="true"]'));
        const allCards = Array.from(document.querySelectorAll('.feed-grid .post-card'));

        allCards.forEach(card => {
            if (card.dataset.filterVisible === 'false') {
                card.style.display = 'none';
            }
        });

        visibleCards.forEach((card, index) => {
            const shouldShow = index >= currentPage * postsPerPage && index < (currentPage + 1) * postsPerPage;
            card.style.display = shouldShow ? 'block' : 'none';
        });

        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = (currentPage + 1) * postsPerPage >= visibleCards.length;
    }

    // Initialize the interactive map immediately on page load
    initInteractiveMap();

    // Fetch active meals directly from MySQL via Backend API
    fetch('/api/posts/meals', {
        method: 'GET'
    })
    .then(async (res) => {
        if (!res.ok) {
            console.error('Error fetching meals from server, status:', res.status);
            allMeals = [];
            renderMealCards();
            return;
        }
        const data = await res.json();
        allMeals = data.body || [];

        renderMealCards();
        updateOfferMarkers();
        applyAllFilters();
    })
    .catch((err) => {
        console.error('API connection failed:', err);
        allMeals = [];
        renderMealCards();
    });

    /* ------------------------------
       ALLERGY FILTER
    ------------------------------ */
    if (allergyCheckbox) {
        allergyCheckbox.addEventListener('change', () => {
            applyAllFilters();
        });
    }

    /* ------------------------------
       CATEGORY TOGGLE
    ------------------------------ */
    categoryButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const catName = btn.textContent.trim();
            btn.classList.toggle('active');
            if (btn.classList.contains('active')) {
                activeCategories.add(catName);
            } else {
                activeCategories.delete(catName);
            }
            applyAllFilters();
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

    function renderMealImg(img, displayWidth, step,canvas) {
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        const targetWidth = displayWidth * dpr;
        const targetHeight = (displayWidth * (img.height / img.width)) * dpr;

        canvas.width = targetWidth;
        const offX = (canvas.width-targetWidth) / 2;
        canvas.height = targetHeight;
        const offY = (canvas.height-targetHeight) / 2;
        canvas.style.width = displayWidth + "px";
        canvas.style.height = (displayWidth * (img.height / img.width)) + "px";

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        if (img.width * step > targetWidth) {
            let curWidth = Math.floor(img.width * step);
            let curHeight = Math.floor(img.height * step);

            let oc = document.createElement('canvas');
            let octx = oc.getContext('2d');
            oc.width = curWidth;
            oc.height = curHeight;

            octx.imageSmoothingEnabled = true;
            octx.imageSmoothingQuality = "high";
            octx.drawImage(img, 0, 0, curWidth, curHeight);

            while (curWidth * step > targetWidth) {
                const nextWidth = Math.floor(curWidth * step);
                const nextHeight = Math.floor(curHeight * step);

                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = nextWidth;
                tempCanvas.height = nextHeight;

                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = "high";
                tempCtx.drawImage(oc, 0, 0, curWidth, curHeight, 0, 0, nextWidth, nextHeight);

                oc = tempCanvas;
                curWidth = nextWidth;
                curHeight = nextHeight;
            }
            ctx.drawImage(oc, 0, 0, curWidth, curHeight, offX, offY, targetWidth, targetHeight);
        } else {
            ctx.drawImage(img, 0, 0,img.width,img.height,offX,offY, targetWidth, targetHeight);
        }
    }
    /* open modal */
    function openViewModal(postItem) {
        viewModal.dataset.id=postItem.dataset.id;
        const title = postItem.querySelector(".post-title")?.textContent || "";
        const metaText = postItem.querySelector(".post-meta span:first-child")?.textContent || "";
        const [creatorRaw, distanceRaw] = metaText.split("•");
        const creator = creatorRaw?.trim() || "";
        const distance = distanceRaw?.trim() || "";
        const timeRemaining = postItem.querySelector(".post-time-remaining")?.textContent?.trim() || "";
        const portions = postItem.querySelector(".post-portions")?.textContent || "";
        const allergens = postItem.querySelector(".post-allergens")?.dataset.allergens === "" ? [] : postItem.querySelector(".post-allergens").dataset.allergens.split(',');
        const tags = postItem.querySelector(".post-tags").dataset.tags === "" ? [] : postItem.querySelector(".post-tags").dataset.tags.split(',');

        viewTitle.textContent = title;
        viewCreator.textContent = `Posted ${creator}`;
        viewDistance.textContent = distance;

        if(timeRemaining === "Expired"){
            viewTimeRemaining.textContent = "Expired";
        }
        else startTimer(postItem.dataset.expires_at , viewTimeRemaining);

        viewPortions.textContent = portions;
        viewDescription.textContent = postItem.querySelector(".post-description")?.textContent;
        viewAddress.textContent = postItem.dataset.location;
        viewPickupTimes.textContent = JSON.parse(postItem.dataset.pickup_windows).map(window => `${window.start.replace('T',' ').replaceAll('-','/').slice(0,16)} - ${window.end.replace('T',' ').replaceAll('-','/').slice(0,16)}`).join(' , ');

        if(postItem.dataset.img !== ''){
            viewImage.innerHTML = "<canvas></canvas>";
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = postItem.dataset.img;

            img.onload = ()=>{
                renderMealImg(img,viewImage.clientWidth , 0.5,viewImage.querySelector("canvas"));
            };

            window.addEventListener('resize' , ()=>{
                renderMealImg(img,viewImage.clientWidth , 0.5,viewImage.querySelector("canvas"));
            });
        }
        else viewImage.innerHTML = "No Image Set";

        viewTags.innerHTML = !tags.length ? `<span class="view-no-tags">No meal tags noted.</span>` : tags.map(tag => `<span class="view-chip">${tag}</span>`).join('');
        viewAllergens.innerHTML = !allergens.length ? `<span class="view-no-allergens">No allergens noted</span>` : allergens.map(allergen => `<span class="view-chip allergen-view-chip">${allergen}</span>`).join('');

        /* show modal */
        disablePageScroll();
        viewModal.classList.remove("hidden");

        /* reset scroll to top */
        const content = viewModal.querySelector(".view-modal-content");
        if (content) content.scrollTop = 0;
    }

    /* close modal */
    function closeViewModal() {
        if (viewTimeRemaining.dataset.timer) {
            clearInterval(viewTimeRemaining.dataset.timer);
            viewTimeRemaining.dataset.timer = null;
        }
        viewModal.classList.add("hidden");
        viewModal.dataset.id="";
        enablePageScroll();
    }

    /* close events */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);

    const requestBtn = document.querySelector(".request-btn");
    requestBtn?.addEventListener("click", () => {
        const request = {
            lst_id : viewModal.dataset.id
        };
        fetch('/api/user/request', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        })
        .then(async (res)=>{
            const data = await res.json();
            if(res.status === 500 ){
                alert(data.message);
                return ;
            }
            alert("Serving request submitted!");
            closeViewModal();
        })
        .catch((err)=>{console.log(err)});
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

    const startPickupDate = document.getElementById("startPickupDate");
    const endPickupDate = document.getElementById("endPickupDate");

    const pickupStartTime = document.getElementById("startPickupTime");
    const pickupEndTime = document.getElementById("endPickupTime");

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

    startPickupDate.min = now.toISOString().split("T")[0];
    startPickupDate.max = max.toISOString().split("T")[0];

    endPickupDate.min = startPickupDate.min;
    endPickupDate.max = startPickupDate.max;

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

    formatTimeInput(pickupStartTime);
    formatTimeInput(pickupEndTime);

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

            meal_location = {lat,lng};

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
        startPickupDate.value = "";
        endPickupDate.value = "";
        pickupStartTime.value = "";
        pickupEndTime.value = "";
        pickupStartTime.dataset.raw = "";
        pickupEndTime.dataset.raw = "";
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
                    ${w.startDate} : ${w.startTime} - ${w.endDate} : ${w.endTime}
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

    /* Additional check for integer input. */
    editPortions.addEventListener('keydown' , (e)=>{
        console.log(editPortions.value);
        if(e.key ==='Backspace' || e.key ==='Delete' || e.key ==='ArrowLeft' || e.key ==='ArrowRight' )
            return;
        else if(!e.key.match(/^[1-9]\d*$/))
            e.preventDefault();
    });

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
        btn.addEventListener("change", () => {
            btn.classList.toggle("selected");
        });
    });

    addPickupWindowBtn.addEventListener("click", () => {
        const startDate = startPickupDate.value; 
        const endDate = endPickupDate.value;
        const startTime = pickupStartTime.value;
        const endTime = pickupEndTime.value;
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`); 
        const now = new Date();

        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (!startDate || !endDate || !startTime || !endTime) {
            alert("Fill all pickup fields.");
            return;
        }

        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            alert("Use HH:MM format (example: 15:30)");
            return;
        }

        if(start < now){
            alert(`Start date must be after : ${now}`);
            return ;
        }

        if ((end-start) > 48 * 60 * 60 * 1000) {
            alert("Pickup must be within 48 hours.");
            return;
        }

        if(startDate > endDate){
            alert("Start date must be after end date.");
            return;
        }

        if(startDate === endDate && startTime > endTime){
            alert("Start time must be after end time");
            return ;
        }

        pickupWindows.push({
            startDate,
            startTime,
            endDate,
            endTime
        });

        renderPickupWindows();
        startPickupDate.value = "";
        endPickupDate.value = "";
        pickupStartTime.value = "";
        pickupEndTime.value = "";
        pickupStartTime.dataset.raw = "";
        pickupEndTime.dataset.raw = "";
    });
    
    /* save changes */
    document.querySelector(".save-edit")
        .addEventListener("click", async () => {
            if(!editTitle.value){
                alert("Enter a title.");
                return ;
            }
            if(!editPortions.value){
                alert("Enter portions.");
                return ;
            }
            if(!meal_location || !editAddress.value){
                alert("Enter a pickup location");
                return ; 
            }
            if(pickupWindows.length === 0){
                alert("Enter a pickup Date");
                return;
            }

            const mealPost = new FormData();
            
            /* RAW TEXT */
            mealPost.append('mealInfo'  , JSON.stringify({
                title: editTitle.value,
                description: editDescription.value.trim() || null,
                portions: editPortions.value,
                address: {
                    address : editAddress.value,
                    latlong : meal_location
                },
                pickupWindows: pickupWindows,
                tags: Array.from(tagButtons).filter(btn => btn.classList.contains("selected")).map(btn => btn.firstElementChild.value),
                allergens: Array.from(allergyCheckboxes).filter(cb => cb.checked).map(cb => cb.value)
            }));    
            
            if(!file)
                console.log("No image Found");
            else
                mealPost.append('image' , file);

            const res = await fetch('/api/user/createMeal' ,{
                method : "POST",
                body: mealPost
            })
            .then(async (res)=>{
                const data = await res.json();

                if(res.status === 500){
                    alert(data.message);
                    return;
                }
                else if(res.status === 201)
                    alert(data.status);
                else{
                    alert("Unknown Error.Try Again.");
                    return ; 
                }
            })
            .catch((err)=>{console.log(err)});

            closeEditModal();

            file = null;
            tagButtons.forEach(btn => btn.classList.remove('selected'));
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
        file = e.target.files[0];
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
       PAGINATION CONTROLS
    ------------------------------ */
    if (prevBtn && nextBtn) {
        nextBtn.addEventListener('click', () => {
            const visibleCards = Array.from(document.querySelectorAll('.feed-grid .post-card[data-filter-visible="true"]'));
            if ((currentPage + 1) * postsPerPage < visibleCards.length) {
                currentPage++;
                updatePagination();
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                updatePagination();
                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        });
    }
});