document.addEventListener('DOMContentLoaded', () => {

    /* ============================================================
       DICTIONARY
    ============================================================ */
    const dictionary = {
        en: {
            setupAllergyTitle:    'Select your allergies',
            setupAllergySubtitle: 'Select all that apply, or skip if you have none.',
            setupAddressTitle:    'Add your delivery address',
            setupAddressSubtitle: 'Type an address or click on the map to pin your location.',
            allergyGluten:        'Gluten',
            allergyCrustaceans:   'Crustaceans',
            allergyEggs:          'Eggs',
            allergyFish:          'Fish',
            allergyPeanuts:       'Peanuts',
            allergySoybeans:      'Soybeans',
            allergyMilk:          'Milk',
            allergyNuts:          'Nuts',
            allergyCelery:        'Celery',
            allergyMustard:       'Mustard',
            allergySesame:        'Sesame',
            allergySulphites:     'Sulphites',
            allergyLupin:         'Lupin',
            allergyMolluscs:      'Molluscs',
            next:                 'Next →',
            back:                 '← Back',
            finish:               'Finish',
            search:               'Search',
            addAddress:           '＋ Add this address',
            addressHint:          'Add at least one address to continue.',
            addressPlaceholder:   'e.g. Aratou 60, Patras',
            geoNotFound:          'Address not found. Try a different search.',
            geoError:             'Could not reach the geocoding service. Check your connection.',
            stepLabel:            'Step {n} of 2',
        },
        gr: {
            setupAllergyTitle:    'Επιλέξτε αλλεργίες σας',
            setupAllergySubtitle: 'Επιλέξτε όσες ισχύουν, ή παραλείψτε αν δεν έχετε.',
            setupAddressTitle:    'Προσθέστε διεύθυνση παράδοσης',
            setupAddressSubtitle: 'Πληκτρολογήστε διεύθυνση ή κάντε κλικ στον χάρτη.',
            allergyGluten:        'Γλουτένη',
            allergyCrustaceans:   'Καρκινοειδή',
            allergyEggs:          'Αυγά',
            allergyFish:          'Ψάρια',
            allergyPeanuts:       'Αράπικα φιστίκια',
            allergySoybeans:      'Σόγια',
            allergyMilk:          'Γάλα',
            allergyNuts:          'Ξηροί καρποί',
            allergyCelery:        'Σέλινο',
            allergyMustard:       'Μουστάρδα',
            allergySesame:        'Σουσάμι',
            allergySulphites:     'Θειώδη',
            allergyLupin:         'Λούπινο',
            allergyMolluscs:      'Μαλάκια',
            next:                 'Επόμενο →',
            back:                 '← Πίσω',
            finish:               'Ολοκλήρωση',
            search:               'Αναζήτηση',
            addAddress:           '＋ Προσθήκη διεύθυνσης',
            addressHint:          'Προσθέστε τουλάχιστον μία διεύθυνση για να συνεχίσετε.',
            addressPlaceholder:   'π.χ. Αράτου 60, Πάτρα',
            geoNotFound:          'Η διεύθυνση δεν βρέθηκε.',
            geoError:             'Αδυναμία επικοινωνίας με την υπηρεσία γεωκωδικοποίησης.',
            stepLabel:            'Βήμα {n} από 2',
        }
    };

    /* ============================================================
       DOM REFERENCES  (all gathered before any function runs)
    ============================================================ */
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

    /* ============================================================
       STATE
    ============================================================ */
    let currentLang = 'en';
    let currentStep = 1;
    let map         = null;
    let marker      = null;
    const addresses = [];

    /* ============================================================
       THEME & LANGUAGE
    ============================================================ */
    function applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
        localStorage.setItem('unibites-theme', theme);
    }

    function applyLanguage(lang) {
        currentLang = lang;
        const dict = dictionary[lang] || dictionary.en;
        document.documentElement.lang = lang === 'gr' ? 'el' : 'en';

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.textContent = dict[key];
        });

        if (addressInput) addressInput.placeholder = dict.addressPlaceholder;
        updateStepLabel();
        localStorage.setItem('unibites-language', lang);
    }

    /* ============================================================
       STEP INDICATOR
    ============================================================ */
    function updateStepLabel(step) {
        if (step !== undefined) currentStep = step;
        const dict = dictionary[currentLang] || dictionary.en;
        stepLabelEl.textContent = dict.stepLabel.replace('{n}', currentStep);
    }

    /* ============================================================
       STEP NAVIGATION
    ============================================================ */
    btnNext.addEventListener('click', () => {
        stepAllergies.classList.remove('active');
        stepAddress.classList.add('active');
        pip1.classList.remove('active');
        pip2.classList.add('active');
        updateStepLabel(2);
        setTimeout(() => { initMap(); map.invalidateSize(); }, 60);
    });

    btnBack.addEventListener('click', () => {
        stepAddress.classList.remove('active');
        stepAllergies.classList.add('active');
        pip2.classList.remove('active');
        pip1.classList.add('active');
        updateStepLabel(1);
    });

    /* ============================================================
       ALLERGY CHIP TOGGLE
    ============================================================ */
    document.querySelectorAll('.allergy-chip').forEach((chip) => {
        const checkbox = chip.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            chip.classList.toggle('selected', checkbox.checked);
        });
    });

    /* ============================================================
       LEAFLET MAP  (lazy-initialised when Step 2 first opens)
    ============================================================ */
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

    /* ============================================================
       GEOCODING  (Nominatim — no API key required)
    ============================================================ */
    function showGeoError(key) {
        const dict = dictionary[currentLang] || dictionary.en;
        geoErrorEl.textContent = dict[key] || key;
        geoErrorEl.hidden = false;
    }

    function clearGeoError() {
        geoErrorEl.hidden = true;
        geoErrorEl.textContent = '';
    }

    async function geocodeAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': currentLang === 'gr' ? 'el' : 'en' } });
        if (!res.ok) throw new Error('network');
        const data = await res.json();
        if (!data.length) throw new Error('not_found');
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, { headers: { 'Accept-Language': currentLang === 'gr' ? 'el' : 'en' } });
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
            showGeoError(err.message === 'not_found' ? 'geoNotFound' : 'geoError');
        } finally {
            btnSearch.disabled = false;
        }
    });

    addressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); btnSearch.click(); }
    });

    /* ============================================================
       ADDRESS LIST
    ============================================================ */
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
            removeBtn.textContent = '×';
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

    /* ============================================================
       FINISH
    ============================================================ */
    btnFinish.addEventListener('click', () => {
        const allergies = Array.from(
            document.querySelectorAll('input[name="allergy"]:checked')
        ).map((cb) => cb.value);

        localStorage.setItem('unibites-user-setup', JSON.stringify({ allergies, addresses }));
        window.location.href = '../homepage/homepage.html';
    });

    /* ============================================================
       INIT  (called last, after everything is defined)
    ============================================================ */
    applyTheme(localStorage.getItem('unibites-theme') || 'light');
    applyLanguage(localStorage.getItem('unibites-language') || 'en');
    renderAddresses();
    updateStepLabel(1);
});
