document.addEventListener("DOMContentLoaded", () => {

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

    fetch('/api/posts/requests', {
        method: "GET"
    })
    .then(async (res)=>{
        const data  = await res.json();
        const meals = data.body;
        const requestSection = document.querySelector(".request-list");
        if(!meals)
            return;
        meals.forEach(meal=>{
            requestSection.insertAdjacentHTML('beforeend' ,`<article class="request-list-item highlight" 
                data-id="${meal.lst_id}" 
                data-description="${meal.description || ""}" 
                data-location="${meal.pickup_location}"
                data-windows='${JSON.stringify(meal.pickup_windows)}'
                data-allergens="${meal.allergens}"
                data-tags="${meal.meal_tags}"
                data-poster="${meal.usr_username}"
                data-img="${meal.img}">
                        <div class="request-list-info">
                            <div class="request-title-row">
                                <h3 class="request-list-title">${meal.title}</h3>
                                <span class="request-time-inline active-time" data-timer>remaining</span>
                                <span class="request-status"></span>
                            </div>
                            <p class="request-list-meta">Requested • ${meal.requests[0].created_at.slice(5,10).replace('-','/')} @ ${meal.requests[0].created_at.slice(11,16)}</p>
                        </div>
                        <div class="request-actions">
                             <button class="btn secondary view-details-btn">View Details</button>
                        </div>
                    </article>`);

            startTimer(meal.expires_at, requestSection.querySelector(`.request-list-item[data-id="${meal.lst_id}"] .request-time-inline`));

            const reqStatus = document.querySelector(`.request-list-item[data-id="${meal.lst_id}"] .request-status`);

            switch(meal.requests[0].status){
                case "PENDING":
                    reqStatus.classList.add("pending");
                    reqStatus.textContent = "Pending";
                    break ; 
                case  "ACCEPTED":
                    reqStatus.classList.add("accepted");
                    reqStatus.textContent = "Accepted";
                    break ;
                case "REJECTED":
                    reqStatus.classList.add("denied");
                    reqStatus.textContent = "Denied";
                    break ;
                default :
                    console.log("Invalid status.");
                    break;
            }
        })

        document.querySelectorAll(".view-details-btn").forEach(button => {
            button.addEventListener("click", () => {
                const requestItem =
                    button.closest(".request-list-item");

                if (requestItem) {
                    openViewModal(requestItem);
                }
            });
        });
    })
    .catch((err)=>{console.log(err)});

    /* ------------------------------
       DISABLE SCROLL WHEN MODALS APPEAR
    ------------------------------ */
    function disablePageScroll() {
        document.body.style.overflow = "hidden";
    }

    function enablePageScroll() {
        document.body.style.overflow = "";
    }
    
    /* ---------------------------------------------------
       VIEW DETAILS MODAL
    --------------------------------------------------- */

    const viewModal = document.getElementById("viewModal");
    const closeViewBtn = document.querySelector(".close-view-modal");
    const closeViewFooterBtn = document.querySelector(".close-view-btn");
    const modalOverlay = viewModal.querySelector(".modal-overlay");

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


    /* ---------------------------------------------------
       RENDER ALLERGENS
    --------------------------------------------------- */
    function renderAllergens(allergens) {
        if (!allergens || allergens.length === 0) {
            viewAllergens.innerHTML =
                `<span class="view-no-allergens">No allergens noted</span>`;
            return;
        }

        viewAllergens.innerHTML = allergens
            .map(a =>
                `<span class="view-chip allergen-view-chip">${a}</span>`
            )
            .join("");
    }


    /* ---------------------------------------------------
       OPEN MODAL
    --------------------------------------------------- */
    function openViewModal(requestItem) {
        const title =
            requestItem.querySelector(".request-list-title")?.textContent || "";

        const meta =
            requestItem.querySelector(".request-list-meta")?.textContent || "";

        const status =
            requestItem.querySelector(".request-status")?.textContent || "Pending";

        const [, date] = meta.split("•");

        const allergens = requestItem.dataset.allergens === "" ? [] : requestItem.dataset.allergens.split(',');
        const tags = requestItem.dataset.tags === "" ? [] : requestItem.dataset.tags.split(',');
        /* fill modal */
        viewTitle.textContent = title;
        viewCreator.textContent = `Posted by ${requestItem.dataset.poster.trim()}`;
        viewOrderDate.textContent =`Requested on • ${date?.trim()}`;
        viewOrderStatus.textContent = status;
        viewDescription.textContent = requestItem.dataset.description || "No description found." ;
        viewAddress.textContent =requestItem.dataset.location.trim();
        viewPickupTimes.textContent = JSON.parse(requestItem.dataset.windows).map(window => `${window[0].replace('T',' ').replaceAll('-','/').slice(0,16)} - ${window[1].replace('T',' ').replaceAll('-','/').slice(0,16)}`).join(' , ');

        if(requestItem.dataset.img){
            viewImage.innerHTML = "<canvas></canvas>";
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.src = requestItem.dataset.img;

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
        viewModal.classList.remove("hidden");
        disablePageScroll();

        /* reset scroll */
        const content =
            viewModal.querySelector(".view-modal-content");

        if (content) content.scrollTop = 0;
    }

    /* ---------------------------------------------------
       CLOSE MODAL
    --------------------------------------------------- */
    function closeViewModal() {
        viewModal.classList.add("hidden");
        enablePageScroll();
    }

    /* ---------------------------------------------------
       CLOSE BUTTONS
    --------------------------------------------------- */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);
    modalOverlay.addEventListener("click", closeViewModal);

});