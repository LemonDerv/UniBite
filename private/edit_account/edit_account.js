document.addEventListener("DOMContentLoaded", async () => {

    const addressList = document.getElementById("addressList");
    const btnAddAddress = document.getElementById("btnSaveAddress");
    const showAddAddress = document.getElementById("showAddAddress");
    const addressMapEl = document.getElementById("addressMap");
    const geoErrorEl = document.getElementById("geoError") || document.getElementById("geo-error");
    const addressInput = document.getElementById("addressInput");
    const addressMapPanel = document.getElementById("addressMapPanel");
    const btnSearchAddress = document.getElementById("btnSearchAddress");
    const btnUseLocationAddress = document.getElementById("btnUseLocationAddress") || document.querySelector(".address-use-location-btn");

    /* ------------------------------
       FETCH USER DATA
    ------------------------------ */
    const usr_id = JSON.parse(localStorage.getItem('unibites-user-setup'))?.usr_id || JSON.parse(sessionStorage.getItem('session'))?.usr_id;
    if (!usr_id) {
        console.error("User ID not found in session.");
        return;
    }

    let userData;
    let addresses = [];
    try {
        const response = await fetch(`/api/user/${usr_id}`, {credentials: 'include', cache: 'no-store'});
        if (!response.ok) throw new Error("Failed to fetch user data.");
        userData = await response.json();
        addresses = userData.user.addresses;
        document.querySelector(".account-box .username").textContent = userData.user.username;
        document.querySelector(".account-box .credits").textContent = `Credits: ${userData.user.credits}`;
        renderAddresses();
    } catch (err) {
        console.error("Error fetching user data:", err);
        return;
    }

    //username
    const usernameInput = document.getElementById("username");
    usernameInput.value = userData.user.username;

    //credits and delivered meals
    document.querySelector(".stats-grid .stat-card:nth-child(1) .stat-value").textContent = userData.user.credits;
    document.querySelector(".stats-grid .stat-card:nth-child(2) .stat-value").textContent = userData.user.deliveredMeals;

    //allergies
    const allergyCheckboxes = document.querySelectorAll('.allergy-chip input[type="checkbox"]');
    allergyCheckboxes.forEach(checkbox => {
        const chip = checkbox.closest('.allergy-chip');
        const allergId = parseInt(chip.dataset.allergId);
        const isChecked = userData.user.allergies.includes(allergId);
        checkbox.checked = isChecked;
        checkbox.parentElement.classList.toggle("selected", isChecked);

        checkbox.addEventListener('change', () => {
            checkbox.parentElement.classList.toggle("selected", checkbox.checked);
        });
    });

    //addresses
    function renderAddresses() {
        addressList.innerHTML = "";
        addresses.forEach(addr => {
            const card = document.createElement("div");
            card.className = "address-card";
            const isOnlyAddress = addresses.length === 1;
            const isDefault = addr.isDefault ? "(Default)" : "";
            const shortenedText = shortenAddress(addr.text);

            card.innerHTML = `
                <div class="address-info">
                    <span>📍</span>
                    <span>${shortenedText} ${isDefault}</span>
                </div>
                <div class="address-actions">
                    <button class="btn secondary set-default" data-addr_id="${addr.addr_id}">Set as Default</button>
                    <button class="delete-address"
                            data-addr_id="${addr.addr_id}"
                            ${isOnlyAddress ? 'title="Cannot delete the only address"' : ''}>Delete
                    </button>
                </div>
            `;
            addressList.appendChild(card);
        });
    }

    /* ------------------------------
       USERNAME CHANGE
    ------------------------------ */
    document.querySelector(".username-form .btn.primary").addEventListener("click", async () => {
        const newUsername = usernameInput.value;
        try {
            const response = await fetch("/api/user/username", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: newUsername })
            });
            if (!response.ok) throw new Error("Failed to update username.");
            alert("Username updated!");
            document.querySelector(".account-box .username").textContent = newUsername;
        } catch (err) {
            console.error("Error updating username:", err);
        }
    });

    /* ------------------------------
       ALLERGIES UPDATE
    ------------------------------ */
    document.getElementById("btnSaveAllergies").addEventListener("click", async () => {
        const selectedAllergies = Array.from(allergyCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => {
                const chip = checkbox.closest('.allergy-chip');
                return parseInt(chip.dataset.allergId);
            });
        try {
            const response = await fetch("/api/user/allergies", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ allergies: selectedAllergies })
            });
            if (!response.ok) throw new Error("Failed to update allergies.");
            alert("Allergies updated!");
        } catch (err) {
            console.error("Error updating allergies:", err);
        }
    });

    /* ------------------------------
       ADDRESS MAP
    ------------------------------ */
    let addressMap = null;
    let addressMarker = null;
    let currentLatLng = null;
    let currentFullAddress = null; //for displaying the shortened version

    function shortenAddress(address) {
        const normalized = String(address || '').replace(/\s+/g, ' ').trim();
        if (!normalized.includes(',')) return normalized;
        const parts = normalized
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean);
        const houseNumberPattern = /^\d+[^\d\s,]?$/;
        const postcode = parts.find((part) => /\b\d{3}\s?\d{2}\b/.test(part));

        if (parts.length >= 2) {
            if (houseNumberPattern.test(parts[1])) {
                const streetNum = `${parts[0]} ${parts[1]}`;
                const neighborhood = postcode && parts.length > 2 ? postcode : (parts.length > 2 ? parts[2] : '');
                return neighborhood ? `${streetNum}, ${neighborhood}` : streetNum;
            }
            if (houseNumberPattern.test(parts[0])) {
                const streetNum = `${parts[1]} ${parts[0]}`;
                const neighborhood = postcode && parts.length > 2 ? postcode : (parts.length > 2 ? parts[2] : '');
                return neighborhood ? `${streetNum}, ${neighborhood}` : streetNum;
            }
        }

        return parts.slice(0, 2).join(', ');
    }

    btnAddAddress?.addEventListener('click', async () => {
        clearGeoError();
        const addressText = currentFullAddress; //save full address string to db
        if (!addressText) return;
        //check if user selected a location
        if (!addressMarker) {
            showGeoError("Please select a location on the map.");
            return;
        }
        const {lat, lng} = addressMarker.getLatLng();
        try {9
            const response = await fetch("/api/user/addresses/single", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address: addressText,
                    lat: lat,
                    lng: lng,
                    isDefault: false
                })
            });
            if (!response.ok) throw new Error("Failed to add address.");

            //refresh the address list
            await refreshAddresses();
            addressMapPanel.hidden = true;
            addressInput.value = "";
            if (addressMarker) {
                addressMap.removeLayer(addressMarker);
                addressMarker = null;
            }
        } catch (err) {
            console.error("Error adding address:", err);
        }
    });

    async function refreshAddresses() {
        try {
            const response = await fetch(`/api/user/${usr_id}`, { cache: 'no-store' });
            if (!response.ok) throw new Error("Failed to refresh user data.");
            userData = await response.json();
            addresses = userData.user.addresses; //update the addresses array
            renderAddresses(); //re-render the list
        } catch (err) {
            console.error("Error refreshing addresses:", err);
        }
    }

    //change default address
    addressList.addEventListener("click", async (e) => {
        if (e.target.classList.contains("set-default")) {
            const addr_id = e.target.dataset.addr_id;
            try {
                const response = await fetch(`/api/user/addresses/${addr_id}/set-default`, {
                    method: "PATCH"
                });
                if (!response.ok) throw new Error("Failed to set default address.");
                await refreshAddresses();
            } catch (err) {
                console.error("Error setting default:", err);
            }
        }
    });

    //display errors from deleting addresses
    addressList.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("delete-address")) return;
        const addr_id = e.target.dataset.addr_id;
        try {
            const response = await fetch(`/api/user/addresses/${addr_id}`, {
                method: "DELETE"
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to delete address.");
            }
            await refreshAddresses();
        } catch (err) {
            alert(err.message);
        }
    });

    showAddAddress.addEventListener("click",()=>{
        addressMapPanel.hidden = false;
        initAddressMap();
        addressMap.invalidateSize();
        currentFullAddress = null;
    });

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

    function placeAddressMarker(lat, lng) {
        if (!addressMap || !window.L) return;
        if (addressMarker) {
            addressMarker.setLatLng([lat, lng]);
        } else {
            addressMarker = L.marker([lat, lng]).addTo(addressMap);
        }
        addressMap.setView([lat, lng], 16);
    }

    function initAddressMap() {
        if (addressMap || !addressMapEl) return;

        if (!window.L) {
            showGeoError('Map could not be loaded. Check your connection and refresh.');
            return;
        }
        addressMap = L.map("addressMap").setView([38.2466, 21.7346], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(addressMap);

        addressMap.on('click', async (event) => {
            clearGeoError();
            const { lat, lng } = event.latlng;
            placeAddressMarker(lat, lng);

            try {
                currentFullAddress = await reverseGeocode(lat, lng); // save full address
                addressInput.value = shortenAddress(currentFullAddress); //display shortened
            } catch {
                addressInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                currentFullAddress = addressInput.value;
            }
        });

        setTimeout(() => addressMap.invalidateSize(), 60);
    }

    async function geocodeAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        if (!data.length) throw new Error('not_found');
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    btnSearchAddress?.addEventListener('click', async () => {
        clearGeoError();
        const query = addressInput.value.trim();
        if (!query) return;

        btnSearchAddress.disabled = true;
        try {
            const { lat, lng, display } = await geocodeAddress(query);
            currentFullAddress = display; //store full address
            placeAddressMarker(lat, lng);
            addressInput.value = shortenAddress(display); //display shortened
        } catch (err) {
            showGeoError(err.message === 'not_found' ? 'Address not found. Try a more specific address.' : 'Could not look up this address. Please try again.');
        } finally {
            btnSearchAddress.disabled = false;
        }
    });

    btnUseLocationAddress?.addEventListener('click', () => {
        clearGeoError();
        if (!navigator.geolocation) {
            showGeoError('Geolocation is not supported by your browser.');
            return;
        }
        btnUseLocationAddress.disabled = true;
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                placeAddressMarker(lat, lng);
                try {
                    currentFullAddress = await reverseGeocode(lat, lng);
                    addressInput.value = shortenAddress(currentFullAddress);
                } catch {
                    addressInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                    currentFullAddress = addressInput.value;
                } finally {
                    btnUseLocationAddress.disabled = false;
                }
            },
            (err) => {
                showGeoError('Could not retrieve your location. Please check browser permissions.');
                btnUseLocationAddress.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    addressInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnSearchAddress?.click();
        }
    });

    const cancelAddressBtn = document.getElementById("btn-address-cancel");
        if (cancelAddressBtn) {
            cancelAddressBtn.addEventListener("click", () => {
                addressMapPanel.hidden = true;
                clearGeoError();
                addressInput.value = "";
                currentFullAddress = null;
                if (addressMarker) {
                    addressMap.removeLayer(addressMarker);
                    addressMarker = null;
                }
            });
        }

});