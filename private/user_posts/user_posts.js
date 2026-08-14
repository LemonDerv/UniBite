document.addEventListener("DOMContentLoaded", async () => {

    /* ------------------------------
       FETCH USERNAME + CREDITS
    ------------------------------ */
    const usr_id = JSON.parse(localStorage.getItem('unibites-user-setup'))?.usr_id || JSON.parse(sessionStorage.getItem('session'))?.usr_id;
    if (!usr_id) {
        console.error("User ID not found in session.");
        return;
    }

    fetch(`/api/user/${usr_id}`, { credentials: 'include' })
    .then(response => {
        if (!response.ok) throw new Error("Failed to fetch user data.");
        return response.json();
    })
    .then(userData => {
        document.querySelector(".account-box .username").textContent = userData.user.username;
        document.querySelector(".account-box .credits").textContent = `Credits: ${userData.user.credits}`;
    })
    .catch(err => {
        console.error("Error fetching user data:", err);
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

    function closeModal(modal){
        modal.classList.add("hidden");
        enablePageScroll();
    }

    let pickup_windows = [];
    let tags = [];
    let allergies = [];

    /* GET POSTS FROM DB */ 
    await fetch('/api/posts/activeMeals' , {
        method: 'GET'
    })
    .then(async (res)=>{
        const data = await res.json();
        const meals = data.body;

        if(res.status === 404){
            console.log(data.message);
            return ;
        }

        pickup_windows = meals.reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id]=[];
            acc[curr.lst_id].push(...curr.pickup_windows);
            return acc;
        }, {});

        allergies = meals.reduce((acc,curr)=>{
            if(!acc[curr.lst_id]) acc[curr.lst_id] = [];
            acc[curr.lst_id].push(...curr.allergens);
            return acc;
        },{});

        let orders;
        // update portion after each request

        meals.forEach((meal,idx)=>{
            orders = meal.requests.count ?? 0 ;
            
            const postHtml =  `<article class="post-card" id="post-card_${idx}" data-id="${meal.lst_id}">
                        <div class="post-status-bar ${orders === 0 ? '' : 'yes-requests'}">${orders === 0 ? 'No' : orders} new requests!</div>
                        <div class="post-thumb">
                            <canvas id="post-canvas_${idx}" data-id="${meal.lst_id}"></canvas>
                        </div>

                        <div class="post-body">
                            <div class="post-header">
                                <div class="post-title-group">
                                    <h2 class="post-title">${meal.title}</h2>
                                    <span class="post-portions">${meal.portions}</span>
                                </div>
                                <div class="post-menu">
                                    <button class="menu-trigger" type="button" aria-label="Post actions" aria-expanded="false">
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <circle cx="12" cy="5" r="2" fill="currentColor"/>
                                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                                            <circle cx="12" cy="19" r="2" fill="currentColor"/>
                                        </svg>
                                    </button>
                                    <div class="menu-dropdown">
                                        <a href="#" class="edit-post">Edit</a>
                                        <a href="#" class="delete">Delete</a>
                                    </div>
                                </div>
                            </div>
                            <p class="post-description">${meal.description? meal.description : "No description found."}</p>
                            <div class="post-tags" id="post-tags_${idx}">
                            </div>
                            <div class="post-meta">
                                <span class="post-time">Posted on • ${meal.created_at.slice(5,10).replace('-','/')} @ ${meal.created_at.slice(11,16).replace('-','/')}</span>
                                <span class="post-time-remaining" data-timer></span>
                            </div>
                            <div class="post-meta">
                                <span class="post-address">${shortenAddress(meal.pickup_location)}</span>
                            </div>
                            <div class="post-allergens ${meal.allergens.length ===0 ? 'no-allergens': 'yes-allergens'} ">${meal.allergens.length ===0? "This meal has no allergens noted." :"This meal has allergens."}</div>
                        </div>
                    </article>

                    <div class="requests-modal hidden" id="requestsModal_${idx}" data-listing-id="${meal.lst_id}">
                        <div class="modal-overlay"></div>
                            <div class="requests-modal-content">
                                <h2>Requests</h2>
                                <div class="requests-list">

                                </div>
                                <button class="btn primary close-requests-modal">Close</button>
                            </div>
                        </div>
                    </div>`;


            document.querySelector(".posts-grid").insertAdjacentHTML('beforeend',postHtml);
            if (meal.expires_at) {
                const timerEl = document.querySelector(".posts-grid").querySelector(`.post-card[data-id="${meal.lst_id}"] .post-time-remaining`);
                if (timerEl) startTimer(meal.expires_at, timerEl);
            }

            const reqModal = document.getElementById(`requestsModal_${idx}`);

            const card = document.getElementById(`post-card_${idx}`);
            const reqlist = reqModal.querySelector(".requests-list");

            const requests = meal.requests===0 ? [] : meal.requests.info;

            requests.forEach(request=>{
                reqlist.insertAdjacentHTML( 'beforeend',`<div class="request-item" data-id="${request.rq_id}">
                                        <div class="request-info">
                                            <strong>${request.username}</strong>
                                            <p class="request-time">${request.created_at.replace('T',' ').slice(0,16)}</p>
                                        </div>
                                        <div class="request-actions">
                                            <button class="request-btn accept" title="Accept">✓</button>
                                            <button class="request-btn decline" title="Decline">✕</button>
                                        </div>
                                    </div>`);
            });

            reqlist.querySelectorAll(".accept").forEach(btn => {
                btn.addEventListener("click", () => {
                    const reqId = btn.closest(".request-item").dataset.id;

                    updateRequest(reqId, "confirm");
                });
            });

            reqlist.querySelectorAll(".decline").forEach(btn => {
                btn.addEventListener("click", () => {
                    const reqId = btn.closest(".request-item").dataset.id;

                    updateRequest(reqId, "fail");
                });
            });

            reqModal?.querySelector(".modal-overlay").addEventListener('click',()=> closeModal(reqModal));

            reqModal?.querySelector(".close-requests-modal").addEventListener('click',()=> closeModal(reqModal));

            card.querySelector('.post-status-bar').textContent.trim() === 'No new requests!'? [] :card.querySelector('.post-status-bar').addEventListener('click',(e)=>{
                e.stopPropagation();
                reqModal.classList.remove("hidden");
                disablePageScroll();
            });

            const tagContainer =document.getElementById(`post-tags_${idx}`);
            meal.tags.length===0 ? tagContainer.insertAdjacentHTML('beforeend','<p class="no-tags">No meal tags.</p>') : meal.tags.forEach(tag=>{
                tagContainer.insertAdjacentHTML('beforeend',`<span class="tag">${tag}</span>`);                    
            });

            /* RENDER POST IMAGE*/ 
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = meal.imgUrl;
            img.onload = ()=>{
                renderMealImg(img,document.querySelector(".post-thumb").clientWidth , 0.5,document.querySelector(`#post-canvas_${idx}`));
            };

            window.addEventListener('resize' , ()=>{
                renderMealImg(img,document.querySelector(".post-thumb").clientWidth , 0.5, document.querySelector(`#post-canvas_${idx}`));
            });
        });
    })
    .catch((err)=>{console.log(err)});


/* REQUEST ACCEPTING/REJECTING LOGIC */
    async function updateRequest(reqId, action) {
        const res = await fetch('/api/user/updateRequest', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                req_id: reqId,
                action: action
            })
        });

        const data = await res.json();
        if (res.status !== 200) {
            alert(data.message);
            return;
        }
        const requestItem = document.querySelector(
            `.request-item[data-id="${reqId}"]`
        );
        if (!requestItem) {
            return;
        }
        const modal = requestItem.closest(".requests-modal");
        const listingId = modal.dataset.listingId;
        
        const card = document.querySelector(
            `.post-card[data-id="${listingId}"]`
        );

        //decrease displayed portions when request was accepted to avoid reloading entire post
        if (action === "confirm") {
            const portionsElement = card.querySelector(".post-portions");
            if (portionsElement) {
                let portions = parseInt(portionsElement.textContent, 10);

                if (!isNaN(portions) && portions > 0) {
                    portionsElement.textContent = portions - 1;
                }
            }
        }
        await reloadRequests(listingId, modal, card);
    }

    async function reloadRequests(listingId, modal, card) {
        const res = await fetch('/api/posts/activeMeals', {
            method: 'GET'
        });
        const data = await res.json();

        if (res.status !== 200) {
            console.log(data.message);
            return;
        }

        const meal = data.body.find(
            meal => meal.lst_id == listingId
        );

        const requests = meal?.requests?.info ?? [];
        const requestsList = modal.querySelector(".requests-list");

        requestsList.innerHTML = "";
        requests.forEach(request => {
            requestsList.insertAdjacentHTML(
                'beforeend',
                `<div class="request-item" data-id="${request.rq_id}">
                    <div class="request-info">
                        <strong>${request.username}</strong>
                        <p class="request-time">
                            ${request.created_at.replace('T', ' ').slice(0, 16)}
                        </p>
                    </div>
                    <div class="request-actions">
                        <button class="request-btn accept" title="Accept">✓</button>
                        <button class="request-btn decline" title="Decline">✕</button>
                    </div>
                </div>`
            );
        });

        requestsList.querySelectorAll(".accept").forEach(btn => {
            btn.addEventListener("click", () => {
                const reqId = btn.closest(".request-item").dataset.id;
                updateRequest(reqId, "confirm");
            });
        });

        requestsList.querySelectorAll(".decline").forEach(btn => {
            btn.addEventListener("click", () => {
                const reqId = btn.closest(".request-item").dataset.id;
                updateRequest(reqId, "fail");
            });
        });

        const statusBar = card.querySelector(".post-status-bar");

        if (requests.length === 0) {
            statusBar.textContent = "No new requests!";
            statusBar.classList.remove("yes-requests");
        } else {
            statusBar.textContent =
                `${requests.length} new request${requests.length === 1 ? "" : "s"}!`;

            statusBar.classList.add("yes-requests");
        }
    }

/* POST TIMER LOGIC */
    function updateTime(expires_at, counter) {
        let now = new Date();
        const diff = expires_at - now;

        const hours  = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        counter.textContent = `${hours}h : ${minutes}m : ${seconds}s remaining`;

        if(diff < 0){
            if(counter.dataset.timer) clearInterval(counter.dataset.timer);
            counter.dataset.timer = null;
            const postCard = counter.closest('.post-card');
            if (postCard) {
                postCard.style.display = 'none';
            }
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

    
    const pickupMapEl = document.getElementById("pickupMap");
    const pickupWindowList = document.getElementById("pickupWindowList");
    const pickupAddressSearchBtn = document.getElementById("pickupAddressSearch");
    const pickupUseLocationBtn = document.getElementById("pickupUseLocation");
    const pickupGeoError = document.getElementById("pickupGeoError");

    const addPickupWindowBtn = document.getElementById("addPickupWindow");
    const imagePreview = document.getElementById("editImagePreview");

    const editTitle = document.getElementById("editTitle");
    const editDescription = document.getElementById("editDescription");
    const editPortions = document.getElementById("editTotalPortions");
    const editAddress = document.getElementById("editAddress");

    const startPickupDate = document.getElementById("startPickupDate");
    const endPickupDate = document.getElementById("endPickupDate");
    const pickupStart = document.getElementById("startPickupTime");
    const pickupEnd = document.getElementById("endPickupTime");

    const tagButtons = document.querySelectorAll(".chip-option input");

    const allergenDropdown = document.querySelector(".allergen-dropdown");
    const allergyCheckboxes = document.querySelectorAll(".allergen-list input[type='checkbox']");

    const editModal = document.getElementById("editModal");
    const closeEditBtn = document.querySelector(".close-edit-modal");
    const cancelEditBtn = document.querySelector(".cancel-edit");

    let pickupMap = null;
    let pickupMarker = null;

    let currentEditPage = 1;

    const page1 = document.getElementById("editPage1");
    const page2 = document.getElementById("editPage2");

    const nextBtn = document.querySelector(".next-edit-page");
    const prevBtn = document.querySelector(".prev-edit-page");

    const now = new Date();
    const max = new Date();
    max.setHours(now.getHours() + 48);
    startPickupDate.min = now.toISOString().split("T")[0];
    startPickupDate.max = max.toISOString().split("T")[0];
    endPickupDate.min = now.toISOString().split("T")[0];
    endPickupDate.max = max.toISOString().split("T")[0];

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

    let selectedCard;
    const editBtn = document.querySelectorAll(".menu-dropdown .edit-post").forEach((btn,idx) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            selectedCard =btn.closest(".post-card");
            tagButtons.forEach(btn => btn.classList.remove('selected'));

            openEditModal(selectedCard); 
            /* close dropdown */
            btn.closest(".menu-dropdown").classList.remove("active");
        });
    });
    
    /*OPEN POST EDIT MODAL*/ 
    function openEditModal(card){
        // retrieve data
        console.log(card);
        const title = card.querySelector(".post-title")?.textContent.trim() || "";
        const description = card.querySelector(".post-description")?.textContent.trim() || "";
        const portions = card.querySelector(".post-portions")?.textContent.replace(" left", "").trim() || "";
        const address = card.querySelector(".post-address")?.textContent.trim() || "";
        const imgUrl = card.querySelector('canvas').toDataURL();
        tags = [...card.querySelectorAll('.tag')].map(tag => tag.textContent);
        const selectedCardAllergen =card.dataset.allergens ||  allergies[card.dataset.id] ;
        imagePreview.innerHTML = '';

        /* fill fields */
        editTitle.value = title;
        editDescription.value = description;
        editPortions.value = portions;
        editAddress.value = address;
        resetPickupMap();
        startPickupDate.value = "";
        endPickupDate.value = "";
        pickupStart.value = "";
        pickupEnd.value = "";
        pickupStart.dataset.raw = "";
        pickupEnd.dataset.raw = "";
        imagePreview.innerHTML = `<img src="${imgUrl}">`;

        /* reset tags*/ 
        tagButtons.forEach(input => {
            input.checked = tags.includes(input.value);
        });

        // /* reset allergens */
        allergyCheckboxes.forEach(cb => {
            cb.checked = selectedCardAllergen.includes(cb.value);
        });

        document.addEventListener("click", (e) => {
            if (allergenDropdown && allergenDropdown.open && !allergenDropdown.contains(e.target)) {
                allergenDropdown.removeAttribute("open");
            }
        });

        editModal.classList.remove("hidden");

        disablePageScroll();
        /* always show first page */
        showEditPage(1);

        /* always scroll to top */
        editModal.querySelector(".edit-modal-content").scrollTop = 0;
    }

    addPickupWindowBtn.addEventListener('click',()=>{
        if(!selectedCard) return;
        addPickupWindow();
        renderPickupWindows(selectedCard);
    });

    /* close modal */
    function closeEditModal() {
        tagButtons.forEach(btn=> btn.classList.remove('selected'));
        editModal.classList.add("hidden");
        enablePageScroll();
    }

    function addPickupWindow(){
        const startDate = startPickupDate.value; 
        const endDate = endPickupDate.value;
        const startTime = pickupStart.value;
        const endTime = pickupEnd.value;
        
        let start = new Date(`${startDate}T${startTime}`);
        let end = new Date(`${endDate}T${endTime}`); 
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
        
        start = `${startDate}T${startTime}:00.000Z`;
        end = `${endDate}T${endTime}:00.000Z`;

        pickup_windows[Number(selectedCard.dataset.id)].push({
            start,
            end
        });

        startPickupDate.value = "";
        endPickupDate.value = "";
        pickupStart.value = "";
        pickupEnd.value = "";
        pickupStart.dataset.raw = "";
        pickupEnd.dataset.raw = "";
    }

    function renderPickupWindows(card) {
        pickupWindowList.innerHTML = "";

        pickup_windows[Number(card.dataset.id)].forEach((w, index) => {
            pickupWindowList.innerHTML += `
                <div class="pickup-chip">
                   ${w.start.replace('T' , ' ').replaceAll('-', '/').slice(0,16)}  - ${w.end.replace('T' , ' ').replaceAll('-' , '/').slice(0,16)}
                    <button
                        type="button"
                        class="remove-window"
                        data-index="${index}">
                        ✕
                    </button>
                </div>
            `;
        });
        document.querySelectorAll(".remove-window").forEach(btn => {
            btn.addEventListener("click", () => {
                const i = btn.dataset.index;
                pickup_windows[Number(card.dataset.id)].splice(i, 1);
                renderPickupWindows(card);
            });
        });
    }

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
        resetPickupMap();
        renderPickupWindows(selectedCard);
        showEditPage(2);
    });

    prevBtn.addEventListener("click", () => {
        showEditPage(1);
    });


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
    };

    async function geocodeAddress(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "gr"} });
        if (!res.ok) throw new Error("network");
        const data = await res.json();
        if (!data.length) throw new Error("not_found");
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: shortenAddress(data[0].display_name) };
    }

    async function reverseGeocode(lat, lng) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        const res = await fetch(url, { headers: { "Accept-Language": "gr" } });
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
        
    const imageInput = document.getElementById("editImage");
    let newImage;

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) {
            imagePreview.innerHTML = "No Image Set";
            return;
        }
        newImage = {url:URL.createObjectURL(file) , name : file.name , raw : file};

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
    editModal.querySelector(".modal-overlay").addEventListener("click", closeEditModal);
    const posts = document.querySelectorAll(".post-card");

    function updateModal(info){
        selectedCard.dataset.allergens = info.allergens;

        selectedCard.querySelector(".post-tags").innerHTML = '';
        selectedCard.querySelector(".post-title").textContent = info.title;
        selectedCard.querySelector(".post-description").textContent = info.description;
        selectedCard.querySelector(".post-portions").textContent = info.portions;
        selectedCard.querySelector(".post-description").text;
        info.tags.length===0 ? selectedCard.querySelector(".post-tags").insertAdjacentHTML('beforeend','<p class="no-tags">No meal tags.</p>') : info.tags.forEach(tag=>{
            selectedCard.querySelector(".post-tags").insertAdjacentHTML('beforeend',`<span class="tag">${tag}</span>`);                    
        });

        selectedCard.querySelector(".post-address").textContent=info.address;
        
        selectedCard.querySelector(".post-allergens").textContent = info.allergens.length ===0 ? "This meal has no allergens noted." : "This meal has allergens."; 
        selectedCard.querySelector(".post-allergens").classList.toggle('no-allergens' , info.allergens.length ===0);
        selectedCard.querySelector(".post-allergens").classList.toggle('yes-allergens' , info.allergens.length !==0);

        if(newImage){
            const img = new Image();
            img.crossOrigin = 'Anonymous';
    
            img.src = newImage.url;

            img.onload= ()=>{
                renderMealImg(img,selectedCard.querySelector(".post-thumb").clientWidth , 0.5, selectedCard.querySelector(`canvas[data-id='${selectedCard.dataset.id}']`));
            };

            window.addEventListener('resize',()=>renderMealImg(img,selectedCard.querySelector(".post-thumb").clientWidth , 0.5, selectedCard.querySelector(`canvas[data-id='${selectedCard.dataset.id}']`)));
        }
    }

    /* save changes */
    document.querySelector(".save-edit").addEventListener("click", async () => {
        const long_lat = await geocodeAddress(editAddress.value.trim());

        const info = {
                lst_id : selectedCard.dataset.id,
                title: editTitle.value,
                description: editDescription.value,
                portions: editPortions.value,
                address: editAddress.value,
                long_lat :long_lat,
                pickupWindows: pickup_windows[selectedCard.dataset.id].map(window=>
                ({start : window.start.toString().replace('T',' ').slice(0,19), end : window.end.toString().replace('T',' ').slice(0,19)})
                ),
                tags: Array.from(tagButtons).filter(btn => btn.checked).map(btn=>btn.value),
                allergens: Array.from(allergyCheckboxes).filter(cb => cb.checked).map(cb => cb.value),
        };

        updateModal(info);

        const data = new FormData();
        data.append("lst_id" , selectedCard.dataset.id);
        data.append("title" , editTitle.value);
        data.append("description" ,editDescription.value);
        data.append("portions",editPortions.value);
        data.append("address",editAddress.value);
        data.append("long_lat",JSON.stringify(long_lat));
        data.append("pickupWindows",JSON.stringify(pickup_windows[selectedCard.dataset.id].map(window=>({start : window.start.slice(0,19).replace('T',' ') , end : window.end.slice(0,19).replace('T',' ')}))));
        data.append("tags", JSON.stringify(Array.from(tagButtons).filter(btn => btn.checked).map(btn=>btn.value)));
        data.append("allergens",JSON.stringify(Array.from(allergyCheckboxes).filter(cb => cb.checked).map(cb => cb.value)));

        if(newImage){
            data.append("fileName" , newImage.name);
            data.append("image", newImage.raw);
        }

        /*SEND EDITED VALUES TO BACKEND*/ 
        await fetch('/api/posts/edit',{
            method: 'POST',
			body: data
        })
        .then(async (res)=>{
            const data = await res.json();
            if(res.status === 200)
                alert(data.message);
            else if(res.status === 500){
                alert(data.message);
                return;
            }
        })
        .catch(err=>{console.log(err)});
        
        closeEditModal();
    });

    closeEditBtn.addEventListener("click", closeEditModal);
    cancelEditBtn.addEventListener("click", closeEditModal);

    pickupAddressSearchBtn?.addEventListener("click", locatePickupAddress);
    pickupUseLocationBtn?.addEventListener("click", () => {
        clearPickupGeoError();
        if (!navigator.geolocation) {
            showPickupGeoError("Geolocation is not supported by your browser.");
            return;
        }
        pickupUseLocationBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                placePickupMarker(lat, lng);
                meal_location = { lat, lng };
                try {
                    editAddress.value = await reverseGeocode(lat, lng);
                } catch {
                    editAddress.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                } finally {
                    pickupUseLocationBtn.disabled = false;
                }
            },
            (err) => {
                showPickupGeoError("Could not retrieve your location. Please check browser permissions.");
                pickupUseLocationBtn.disabled = false;
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
    editAddress?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && currentEditPage === 2) {
            e.preventDefault();
            locatePickupAddress();
        }
    });

    document.querySelectorAll(".delete").forEach((btn,idx)=> {
        btn.addEventListener('click', ()=>{
            const cardId = btn.closest('article').dataset.id;
            if(confirm("Are you sure.")){
                console.log("you are going to delete a post");
                fetch('/api/posts/delete',{
                    method: 'DELETE',
                    headers:{'Content-Type': 'application/json'},
                    body: JSON.stringify({post_id :cardId })
                })
                .then(async (res)=>{
                    const data = await res.json();
                    if(res.status === 200 )
                        alert(data.message);
                    else if ([400,404,500].includes(res.status)){
                        alert(data.message);
                        return ;
                    }
                })
                .catch((err)=>{
                    console.log('Error deleting post.',err)
                    return;
                });

                window.location.reload();
            }
        });
    });

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

    let selectedExpiredPost;
    let expiredMeals;

    await fetch("/api/posts/expiredMeals" , {method : 'GET'})
    .then(async (res)=>{
        const data =await res.json();
        const list = document.querySelector(".post-list");
        expiredMeals = data.body;

        if(!expiredMeals)
            return;

        expiredMeals.forEach((meal,idx)=>{
            const allergens = meal.allergens.reduce((acc,curr)=>{
                if(acc === "") return curr;
                return acc=`${acc} , ${curr}`;
            } , "");

            const expiredPostHtml = `<article class="post-list-item" data-id="${meal.lst_id}" data-rating="${meal.lst_rating}" , data-allergens="${allergens}">
                                        <div class="post-list-info">
                                            <h3 class="post-list-title">${meal.title}</h3>
                                            <p class="post-list-meta">Posted on ${meal.created_at.replace('T', ' @ ').replaceAll('-','/').slice(5,18)}</p>
                                        </div>
                                        <button class="btn secondary view-details-btn">View Details</button>
                                    </article>
                                    `;

            list.insertAdjacentHTML('beforeend', expiredPostHtml);
        });
    })

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
        const rating = postItem.dataset.rating==="null" ? 0 : Number(postItem.dataset.rating);
        const allergens = postItem.dataset.allergens? postItem.dataset.allergens.split(",").map(a => a.trim()): [];
        viewTitle.textContent= title;
        const mealInfo = expiredMeals.filter(meal => meal.lst_id === Number(postItem.dataset.id))[0];
        /* placeholder values */
        viewPortions.textContent = mealInfo.portions;
        viewDescription.textContent = mealInfo.description;
        viewAddress.textContent = mealInfo.pickup_location;
        viewPickupTimes.textContent = mealInfo.pickup_windows.reduce((acc,curr)=>{
            if(acc === "") return `${curr.start.replace('T', ' ').replaceAll('-', '/').slice(5,16)} - ${curr.end.replace('T', ' ').replaceAll('-', '/').slice(5,16)}`; 
            return acc = `${acc} , ${curr.start.replace('T', ' ').replaceAll('-', '/').slice(5,16)} - ${curr.end.replace('T', ' ').replaceAll('-', '/').slice(5,16)}`;
        }, "");

        /* image placeholder */
        viewImage.innerHTML = "";
        console.log(mealInfo);
        if(mealInfo.img){
            viewImage.innerHTML = "<canvas></canvas>";
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = mealInfo.img;

            img.onload = ()=>{
                renderMealImg(img,document.querySelector("#viewImage").clientWidth , 0.5,viewImage.querySelector("canvas"));
            };

            window.addEventListener('resize' , ()=>{
                renderMealImg(img,document.querySelector("#viewImage").clientWidth , 0.5,viewImage.querySelector("canvas"));
            });
        }
        else{
            viewImage.innerHTML = "No image set.";
        }

        /* tags placeholder */
        const tags = mealInfo.tags.length === 0? `<span class="view-no-tags">No meal tags noted.</span>` : mealInfo.tags.reduce((acc,curr)=>{
                return `${acc}<span class="view-chip">${curr}</span>`;
        } , ``);


        viewTags.innerHTML = "";
        viewTags.insertAdjacentHTML('beforeend',tags);

        /* allergens */
        if (allergens.length === 0) {
            viewAllergens.innerHTML = `<span class="view-no-allergens">No allergens noted</span>`;
        } else {
            viewAllergens.innerHTML = allergens.map(a => `<span class="view-chip allergen-view-chip">${a}</span>`).join("");
        }

        viewPostedDate.textContent = meta;
        /* star rating */
        viewRating.textContent = `${rating.toFixed(1)} ★`;
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
    document.querySelectorAll(".view-details-btn").forEach((button,idx) => {
        button.addEventListener("click", () => {
            const selectedExpiredPost = button.closest(".post-list-item");
            openViewModal(selectedExpiredPost);
        });
    });

    /* close events */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);

    /* close modal when clicking outside */
    viewModal.querySelector(".modal-overlay").addEventListener("click", closeViewModal);
});
