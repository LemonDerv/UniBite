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


    
    const deliveriesList = document.querySelector(".delivery-list");
    let selectedRequest,del_id;
    let currentAction = null;
    const modal = document.getElementById("confirmModal");
    const title = document.getElementById("confirmTitle");
    const text = document.getElementById("confirmText");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");
    /* ------------------------------
    DISABLE SCROLL WHEN MODALS APPEAR
    ------------------------------ */
    function disablePageScroll() {
        document.body.style.overflow = "hidden";
    }

    function enablePageScroll() {
        document.body.style.overflow = "";
    }

    function renderRequests( requests){
        if(requests.length){
            requests.forEach(delivery=>{

            const pickupWindows = delivery.meal_info.pickup_windows.map(window =>{
                return `${window[0].slice(0,16).replace('T',' ').replaceAll('-','/')} - ${window[1].slice(0,16).replace('T',' ').replaceAll('-','/')}`;
            }).join(' , ');

            deliveriesList.insertAdjacentHTML('beforeend',  `<article class="delivery-list-item highlight" data-id="${delivery.req_info.req_id}">
                                <div class="delivery-list-info">
                                    <div class="delivery-title-row">
                                        <h3 class="delivery-list-title">${delivery.meal_info.meal_title}</h3>
                                        <span class="delivery-user">${delivery.req_info.req_user}.</span>
                                        <span class="delivery-status">${delivery.req_info.req_status}</span>
                                    </div>
                                    <p class="delivery-list-meta">${delivery.meal_info.location} • ${pickupWindows}</p>
                                </div>
                                <div class="delivery-actions">
                                    <button class="btn confirm-request">Confirmed</button>
                                    <button class="btn danger fail-request">Failed</button>
                                </div>
                            </article>`
                        );
            });
        }
    }

    function renderDeliveries(deliveries){
        if(deliveries.length){
            deliveries.forEach(delivery=>{
                const pickupWindows = delivery.meal_info.pickup_windows.map(window =>{
                    return `${window[0].slice(0,16).replace('T',' ').replaceAll('-','/')} - ${window[1].slice(0,16).replace('T',' ').replaceAll('-','/')}`;
                }).join(' , ');

                deliveriesList.insertAdjacentHTML('beforeend',  `<article class="delivery-list-item highlight" data-id="${delivery.del_info.del_id}">
                            <div class="delivery-list-info">
                                <div class="delivery-title-row">
                                    <h3 class="delivery-list-title">${delivery.meal_info.meal_title}</h3>
                                    <span class="delivery-status">${delivery.del_info.del_user}</span>
                                </div>
                                <p class="delivery-list-meta">${delivery.meal_info.location} • ${pickupWindows}</p>
                            </div>
                            <div class="delivery-actions">
                                <button class="btn confirm-delivery">Delivered.</button>
                            </div>
                        </article>`
                        );
            });
        }
    }

    function attachEvents(){
        document.querySelectorAll(".confirm-request").forEach(btn => {
            btn.addEventListener("click", () => {
                currentAction = "confirm";
                title.textContent = "Confirm Delivery";
                text.textContent = "Mark this delivery as completed?";
                modal.classList.remove("hidden");
                selectedRequest = btn.closest(".delivery-list-item").dataset.id;
                disablePageScroll();
            });
        });

        document.querySelectorAll(".fail-request").forEach(btn => {
            btn.addEventListener("click", () => {
                currentAction = "fail";
                title.textContent = "Fail Delivery";
                text.textContent = "Mark this delivery as failed?";
                modal.classList.remove("hidden");
                selectedRequest = btn.closest(".delivery-list-item").dataset.id;
                disablePageScroll();
            });
        });

        document.querySelectorAll(".confirm-delivery").forEach(btn=>{
            btn.addEventListener('click',()=>{
                currentAction='updateDelivery';
                title.textContent = "Delivery.";
                text.textContent = "Mark this delivery as delivered?";
                modal.classList.remove("hidden");
                disablePageScroll();
                del_id = btn.closest(".delivery-list-item").dataset.id;
            });
        });
    }

    fetch('/api/posts/deliveries',{
        method: "GET"
    })
    .then(async (res)=>{
        const data = await res.json();
        const deliveries = data.body.deliveries || [];
        const requests = data.body.requests || [];
        if(!deliveries)
            alert("No pending deliveries found.")

        if(!requests)
            alert("No pending requests found.")

        renderDeliveries(deliveries);
        renderRequests(requests);
        attachEvents();
    })
    .catch((err)=>{console.log(err)});

    /* -----------------------------
        CONFIRM MODAL
    ----------------------------- */

    noBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        enablePageScroll();
    });

    yesBtn.addEventListener("click", async () => {
        if (currentAction === "confirm" || currentAction === "fail") {
            await fetch('/api/user/updateRequest' , {
                method : "POST",
                headers : {
                    'Content-Type': 'application/json'
                },
                body : JSON.stringify({
                    req_id : selectedRequest,
                    action : currentAction
                })
            })
            .then(async (res)=>{
                const data = await res.json();

                if(res.status !== 200){
                    alert(data.message);
                    return ;
                }

                await fetch('/api/posts/deliveries',{
                    method: "GET"
                })
                .then(async (res)=>{
                    const data = await res.json();
                    const deliveries = data.body.deliveries || [];
                    const requests = data.body.requests || [];
                    if(!deliveries)
                        alert("No pending deliveries found.")

                    if(!requests)
                        alert("No pending requests found.")
                    deliveriesList.innerHTML='';
                    renderDeliveries(deliveries);
                    renderRequests(requests);
                    attachEvents();
                })
                .catch((err)=>{console.log(err)});
            })
            .catch((err)=>console.log(err));
        }
        else if(currentAction === 'updateDelivery' && del_id){
            await fetch('/api/user/updateDelivery', {
                method : "POST",
                headers : {
                    'Content-Type': 'application/json'
                },
                body : JSON.stringify({
                    del_id : del_id ,
                    action : "UPDATE"
                })
            })
            .then(async (res)=>{
                const data = await res.json();
                if(res.status === 500){
                    alert("Couldnt update delivery");
                    return ;
                }

                await fetch('/api/posts/deliveries',{
                    method: "GET"
                })
                .then(async (res)=>{
                    const data = await res.json();
                    const deliveries = data.body.deliveries || [];
                    const requests = data.body.requests || [];
                    if(!deliveries)
                        alert("No pending deliveries found.")

                    if(!requests)
                        alert("No pending requests found.")

                    deliveriesList.innerHTML='';
                    renderDeliveries(deliveries);
                    renderRequests(requests);
                    attachEvents();
                })
                .catch((err)=>{console.log(err)});
            })
            .catch((err)=>console.log(err));
        }

        modal.classList.add("hidden");
        enablePageScroll();
    });
});