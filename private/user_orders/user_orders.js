document.addEventListener("DOMContentLoaded", () => {
    const [pendingDeliveriesList,deliveredDeliveriesList,completeDeliveriesList] = document.querySelectorAll(".order-list");
    let selectedDelivery;

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

    fetch('/api/posts/pendingDeliveries' , {
        method: "GET"
    })
    .then(async (res) =>{
        const data = await res.json();

        data.body.forEach(delivery =>{
            console.log(delivery.meal_info);
            pendingDeliveriesList.insertAdjacentHTML('beforeend',`<article class="order-list-item highlight"
                data-id="${delivery.del_info.del_id}"
                data-description="${delivery.meal_info.description || ""}"
                data-location="${delivery.meal_info.pickup_location}"
                data-windows='${JSON.stringify(delivery.meal_info.pickup_windows)}'
                data-allergens="${delivery.meal_info.allergens}"
                data-tags="${delivery.meal_info.meal_tags}"
                data-poster="${delivery.meal_info.poster}"
                data-image="${delivery.meal_info.image}"
                >
                        <div class="order-list-info">
                            <div class="order-title-row">
                                <h3 class="order-list-title">${delivery.meal_info.title}</h3>
                                <span class="order-time-inline active-time data-timer"></span>
                            </div>
                            <p class="order-list-meta">Request Accepted • ${delivery.req_info.created_at.replace('T', ' ').replaceAll('-','/').slice(5,11)} @ ${delivery.req_info.created_at.slice(11,16)} </p>
                        </div>
                        <div class="order-actions">
                            <button class="btn secondary view-details-btn">View Details</button>
                        </div>
                    </article>`);
            startTimer(delivery.meal_info.expires_at, pendingDeliveriesList.querySelector(`article[data-id="${delivery.del_info.del_id}"] .order-time-inline`));
        });

        document.querySelectorAll(".view-details-btn").forEach(button => {button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                openViewModal(orderItem);
            });
        });
    })
    .catch((err)=>console.log(err));


    fetch('/api/posts/nonRatedDeliveries' , {
        method : "GET"
    })
    .then(async (res)=>{
        const data = await res.json();
        
        if(!data.body){
            alert("No Meals");
            return 
        }
        data.body.forEach(delivery =>{
            const ratingLimit = new Date(delivery.meal_info.expires_at);
            ratingLimit.setTime(ratingLimit.getTime() + (24*60*60*1000));

            deliveredDeliveriesList.insertAdjacentHTML('beforeend',`<article class="order-list-item highlight"
                data-id="${delivery.del_info.del_id}"
                data-description="${delivery.meal_info.description || ""}"
                data-location="${delivery.meal_info.pickup_location}"
                data-windows='${JSON.stringify(delivery.meal_info.pickup_windows)}'
                data-allergens="${delivery.meal_info.allergens}"
                data-tags="${delivery.meal_info.meal_tags}"
                data-poster="${delivery.meal_info.poster}"
                data-image="${delivery.meal_info.image}"
                >
                        <div class="order-list-info">
                            <div class="order-title-row">
                                <h3 class="order-list-title">${delivery.meal_info.title}</h3>
                                <span class="order-time-inline active-time data-timer"></span>
                            </div>
                            <p class="order-list-meta">Request Accepted • ${delivery.req_info.created_at.replace('T', ' ').replaceAll('-','/').slice(5,11)} @ ${delivery.req_info.created_at.slice(11,16)} </p>
                        </div>
                        <div class="order-actions">
                            <button class="btn secondary view-details-btn">View Details</button>
                            <button class="btn primary">Rate Order</button>
                        </div>
                    </article>`);
            startTimer(ratingLimit.toISOString(), deliveredDeliveriesList.querySelector(`article[data-id="${delivery.del_info.del_id}"] .order-time-inline`));
        });

        document.querySelectorAll(".view-details-btn").forEach(button => {button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                openViewModal(orderItem);
            });
        });

        /* open buttons */
        document.querySelectorAll(".btn.primary").forEach(button => {
            button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                selectedDelivery = orderItem;
                openRateModal(orderItem);
            });
        });
    })
    .catch((err) => console.log(err));
    

        fetch('/api/posts/completedDeliveries' , {
        method : "GET"
    })
    .then(async (res)=>{
        const data = await res.json();
        
        if(!data.body){
            alert("No Meals");
            return 
        }
        data.body.forEach(delivery =>{
            completeDeliveriesList.insertAdjacentHTML('beforeend',`<article class="order-list-item"
                data-id="${delivery.del_info.del_id}"
                data-description="${delivery.meal_info.description || ""}"
                data-location="${delivery.meal_info.pickup_location}"
                data-windows='${JSON.stringify(delivery.meal_info.pickup_windows)}'
                data-allergens="${delivery.meal_info.allergens}"
                data-tags="${delivery.meal_info.meal_tags}"
                data-poster="${delivery.meal_info.poster}"
                data-image="${delivery.meal_info.image}"
                >
                        <div class="order-list-info">
                            <div class="order-title-row">
                                <h3 class="order-list-title">${delivery.meal_info.title}</h3>
                                <p class="order-list-meta">Delivery Confirmed • ${delivery.req_info.created_at.replace('T', ' ').replaceAll('-','/').slice(5,11)} @ ${delivery.req_info.created_at.slice(11,16)} </p>
                            </div>                            
                        </div>
                        <div class="order-actions">
                            <button class="btn secondary view-details-btn">View Details</button>

                        </div>
                    </>`);
                });

        document.querySelectorAll(".view-details-btn").forEach(button => {button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                openViewModal(orderItem);
            });
        });

        /* open buttons */
        document.querySelectorAll(".btn.primary").forEach(button => {
            button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                selectedDelivery = orderItem;
                openRateModal(orderItem);
            });
        });
    })
    .catch((err) => console.log(err));

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


    /* open modal */
    function openViewModal(orderItem) {

        const title = orderItem.querySelector(".order-list-title")?.textContent || "";
        const meta = orderItem.querySelector(".order-list-meta")?.textContent || "";

        /* placeholder */
        const [status, date] = meta.split("•");

        /* fill fields */
        viewTitle.textContent = title;
        viewCreator.textContent = `Posted by ${orderItem.dataset.poster}`;
        viewOrderDate.textContent = `Ordered on • ${date?.trim()}`;
        viewOrderStatus.textContent = status?.trim() || "Confirmed";
        viewDescription.textContent = orderItem.dataset.description || "No description found";
        viewAddress.textContent = orderItem.dataset.location;
        viewPickupTimes.textContent = JSON.parse(orderItem.dataset.windows).map(window => `${window[0].replace('T',' ').replaceAll('-','/').slice(0,16)} - ${window[1].replace('T',' ').replaceAll('-','/').slice(0,16)}`).join(' , ');

        viewImage.innerHTML = "No Image Set";

        const allergens = orderItem.dataset.allergens === "" ? [] : orderItem.dataset.allergens.split(',');
        const tags = orderItem.dataset.tags === "" ? [] : orderItem.dataset.tags.split(',');

        viewTags.innerHTML = !tags.length ? `<span class="view-no-tags">No meal tags noted.</span>` : tags.map(tag => `<span class="view-chip">${tag}</span>`).join('');
        viewAllergens.innerHTML = !allergens.length ? `<span class="view-no-allergens">No allergens noted</span>` : allergens.map(allergen => `<span class="view-chip allergen-view-chip">${allergen}</span>`).join('');
    
        if(orderItem.dataset.image){
                viewImage.innerHTML = "<canvas></canvas>";
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = orderItem.dataset.image;

                img.onload = ()=>{
                    renderMealImg(img,viewImage.clientWidth , 0.5,viewImage.querySelector("canvas"));
                };

                window.addEventListener('resize' , ()=>{
                    renderMealImg(img,viewImage.clientWidth , 0.5,viewImage.querySelector("canvas"));
                });
        }
        else viewImage.innerHTML = "No Image Set";
        
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
        const title =orderItem.querySelector(".order-list-title")?.textContent || "";
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


    /* close */
    closeRateBtn.addEventListener("click", closeRateModal);
    closeRateFooterBtn.addEventListener("click", closeRateModal);

    rateModal.querySelector(".modal-overlay").addEventListener("click", closeRateModal);

    /* submit */
    submitRatingBtn.addEventListener("click", () => {
        if (selectedRating === 0) {
            alert("Please select a rating first.");
            return;
        }

        fetch('/api/user/updateRating' , {
            method:'POST',
            headers :{
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rating: selectedRating,
                del_id : selectedDelivery.dataset.id
            })
        })
        .then(async (res)=>{
            const data = await res.json();
        })
        .catch((err)=>console.log(err));
        alert(`Thanks! You rated ${selectedRating}/5`);
        closeRateModal();
    });
    
});