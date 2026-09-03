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
    let del_id;
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
            const deliveryCard = counter.closest('.delivery-list-item');
            if (deliveryCard) {
                deliveryCard.style.display = 'none';
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
                                    <span class="delivery-time-inline active-time" data-timer></span>
                                </div>
                                <p class="delivery-list-meta">${delivery.meal_info.location} • ${pickupWindows}</p>
                            </div>
                            <div class="delivery-actions">
                                <button class="btn confirm-delivery">Confirm</button>
                                <button class="btn danger fail-delivery">Fail</button>
                            </div>
                        </article>`
                        );
                    startTimer(delivery.meal_info.lst_expiry, deliveriesList.querySelector(`.delivery-list-item[data-id="${delivery.del_info.del_id}"] .delivery-time-inline`));
            });
        }
    }

    function attachEvents() {
        document.querySelectorAll(".confirm-delivery").forEach(btn => {
            btn.addEventListener("click", () => {
                currentAction = "DELIVERED";
                title.textContent = "Confirm Delivery";
                text.textContent = "Mark this delivery as delivered?";
                del_id = btn.closest(".delivery-list-item").dataset.id;

                modal.classList.remove("hidden");
                disablePageScroll();
            });
        });

        document.querySelectorAll(".fail-delivery").forEach(btn => {
            btn.addEventListener("click", () => {
                currentAction = "REJECTED";
                title.textContent = "Fail Delivery";
                text.textContent = "Mark this delivery as failed?";
                del_id = btn.closest(".delivery-list-item").dataset.id;

                modal.classList.remove("hidden");
                disablePageScroll();
            });
        });
    }

    async function loadDeliveries() { 
        await fetch('/api/posts/deliveries', { 
            method: "GET"
        })
        .then(async (res) => {
            const data = await res.json();
            const deliveries = data.body.deliveries || [];

            if (!deliveries.length) {
                console.log("No pending deliveries found.");
                //return ;
            }
            
            deliveriesList.innerHTML = '';
            renderDeliveries(deliveries);
            attachEvents();
        }) 
        .catch((err) => {
        console.log(err);
        });
    }
    loadDeliveries();


    /* -----------------------------
        CONFIRM MODAL
    ----------------------------- */

    noBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        enablePageScroll();
    });

    yesBtn.addEventListener("click", async () => {
        if (!del_id || !currentAction) {
            return;
        }
        await fetch('/api/user/updateDelivery', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                del_id: del_id,
                action: currentAction
            })
        })
        .then(async (res)=>{
            const data = await res.json();
            if (res.status !== 200) {
                alert(data.message);
                return;
            }

            await loadDeliveries();
        })
        .catch((err) => {
            console.log(err);
        });
        modal.classList.add("hidden");
        enablePageScroll();

        currentAction = null;
        del_id = null;
    });
});