document.addEventListener('DOMContentLoaded', () => {
     /* DOM REFERENCES */
    const stepAllergies = document.getElementById('step-allergies');
    const stepAddress   = document.getElementById('step-address');
    const pip1          = document.getElementById('pip-1');
    const pip2          = document.getElementById('pip-2');
    const stepLabelEl   = document.getElementById('step-label');
    const btnNext       = document.getElementById('btn-next');
    const btnBack       = document.getElementById('btn-back');
    const geoErrorEl    = document.getElementById('geo-error');
    const addressInput  = document.getElementById('address-input');
    const btnSearch     = document.getElementById('btn-search');
    const addressList   = document.getElementById('address-list');
    const addressHint   = document.getElementById('address-hint');
    const btnAddAddr    = document.getElementById('btn-add-address');
    const btnFinish     = document.getElementById('btn-finish');

    /* STATE */
    let currentStep = 1;
    let map         = null;
    let marker      = null;
    const addresses = [];

    /* STEP INDICATOR */
    function updateStepLabel(step) {
        if (step !== undefined) currentStep = step;
        stepLabelEl.textContent = `Step ${currentStep} of 2`;
    }

    /* STEP NAVIGATION */
    btnNext.addEventListener('click', () => {
        stepAllergies.classList.remove('active');
        stepAddress.classList.add('active');
        pip1.classList.remove('active');
        pip2.classList.add('active');
        updateStepLabel(2);
        setTimeout(() => { initMap(); map.invalidateSize(); }, 60);

        const selectedAllergies = [...document.querySelectorAll(".allergy-chip")].filter(chip => chip.classList.contains('selected')).map(chip => chip.querySelector("input").value);

        if(selectedAllergies.length){
            // send user allergies
            await fetch("/api/user/allergies", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(selectedAllergies)
            })
            .then(async (res)=>{
                const data = await res.json();

                if(res.status === 404){
                    console.log(data.message);
                    return ;
                }
            })
            .catch((error) => console.log("Error saving allergies:",error));
        }
    });

    btnBack.addEventListener('click', () => {
        stepAddress.classList.remove('active');
        stepAllergies.classList.add('active');
        pip2.classList.remove('active');
        pip1.classList.add('active');
        updateStepLabel(1);
    });

    /* ALLERGY CHIP TOGGLE */
    document.querySelectorAll('.allergy-chip').forEach((chip) => {
        const checkbox = chip.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            chip.classList.toggle('selected', checkbox.checked);
        });
    });

    /* LEAFLET MAP  (lazy-initialised when Step 2 first opens) */
    function initMap() {
        if (map) return;
        map = L.map('map').setView([38.2466, 21.7346], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(map);

        map.on('click', async (e) => {
            clearGeoError();
            const { lat, lng } = e.latlng;
            placeMarker(lat, lng);
            try {
                addressInput.value = await reverseGeocode(lat, lng);
            } catch {
                addressInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            }
        });
    }

    function placeMarker(lat, lng) {
        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng]).addTo(map);
        }
        map.setView([lat, lng], 16);
    }

    /* GEOCODING  (Nominatim) */
    function showGeoError(key) {
        geoErrorEl.textContent = message;
        geoErrorEl.hidden = false;
    }

    function clearGeoError() {
        geoErrorEl.hidden = true;
        geoErrorEl.textContent = '';
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

    btnSearch.addEventListener('click', async () => {
        clearGeoError();
        const query = addressInput.value.trim();
        if (!query) return;
        btnSearch.disabled = true;
        try {
            const { lat, lng, display } = await geocodeAddress(query);
            placeMarker(lat, lng);
            addressInput.value = display;
        } catch (err) { 
            showGeoError(err.message === 'not_found' ? 'Address not found. Try a different search.' : 'Could not reach the geocoding service. Check your connection.');
        } finally {
            btnSearch.disabled = false;
        }
    });

    addressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); btnSearch.click(); }
    });

    /* ADDRESS LIST */
    function renderAddresses() {
        addressList.innerHTML = '';
        addresses.forEach((addr, i) => {
            const pill = document.createElement('div');
            pill.className = 'address-pill';

            const text = document.createElement('span');
            text.className = 'address-pill-text';
            text.textContent = addr;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-pill-btn';
            removeBtn.textContent = '✕';
            removeBtn.setAttribute('aria-label', 'Remove address');
            removeBtn.addEventListener('click', () => {
                addresses.splice(i, 1);
                renderAddresses();
            });

            pill.appendChild(text);
            pill.appendChild(removeBtn);
            addressList.appendChild(pill);
        });

        const hasAddress = addresses.length > 0;
        btnFinish.disabled = !hasAddress;
        addressHint.hidden = hasAddress;
    }

    btnAddAddr.addEventListener('click', () => {
        const val = addressInput.value.trim();
        if (!val || addresses.includes(val)) return;
        addresses.push(val);
        renderAddresses();
    });

    /* FINISH */
    btnFinish.addEventListener('click', async () => {
        const allergies = Array.from(
            document.querySelectorAll('input[name="allergy"]:checked')
        ).map((cb) => cb.value);

        let location = [];
        await Promise.all(
            addresses.map(async (addr) =>{
                const res = await geocodeAddress(addr);
                location.push(res);
            })
        );
        
        await fetch('/api/user/addresses' , {
            method:'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body : JSON.stringify(location)
        })
        .then(async (res) =>{
            const data =await res.json();
            if(res.status === 500){
                alert(data.message);
                return ;
            }
        })
        .catch((err)=>{console.log(err)});

        localStorage.setItem('unibites-user-setup', JSON.stringify({ allergies, addresses }));
        window.location.href = '../homepage/homepage.html';
    });

    /* INIT  (called last, after everything is defined) */
    renderAddresses();
    updateStepLabel(1);
});