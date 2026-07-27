document.addEventListener("DOMContentLoaded", () => {

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


    /* render allergens */
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


    /* open modal */
    function openViewModal(orderItem) {

        const title = orderItem.querySelector(".order-list-title")?.textContent || "";
        const meta = orderItem.querySelector(".order-list-meta")?.textContent || "";

        /* placeholder */
        const [status, date] = meta.split("•");

        /* fill fields */
        viewTitle.textContent = title;
        viewCreator.textContent = "Posted by Maria";
        viewOrderDate.textContent = `Ordered on • ${date?.trim() || "11/04 @ 20:15"}`;
        viewOrderStatus.textContent = status?.trim() || "Confirmed";

        viewDescription.textContent = "Fresh pasta with tomato sauce and basil.";
        viewAddress.textContent = "Aratou 60, Patras";
        viewPickupTimes.textContent = "18:00 - 21:00";
        viewImage.innerHTML = "No Image Set";
        viewTags.innerHTML = `<span class="view-chip">Pasta</span><span class="view-chip">Vegetarian</span>`;
        renderAllergens(["Gluten"]);

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
    document.querySelectorAll(".view-details-btn").forEach(button => {
            button.addEventListener("click", () => {
                const orderItem = button.closest(".order-list-item");
                openViewModal(orderItem);
            });
        });

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
        const title =
            orderItem.querySelector(".order-list-title")?.textContent || "";
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

    /* open buttons */
    document.querySelectorAll(".btn.primary").forEach(button => {
        button.addEventListener("click", () => {
            const orderItem = button.closest(".order-list-item");
            openRateModal(orderItem);
        });
    });

    /* close */
    closeRateBtn.addEventListener("click", closeRateModal);
    closeRateFooterBtn.addEventListener("click", closeRateModal);

    rateModal
        .querySelector(".modal-overlay")
        .addEventListener("click", closeRateModal);

    /* submit */
    submitRatingBtn.addEventListener("click", () => {
        if (selectedRating === 0) {
            alert("Please select a rating first.");
            return;
        }

        alert(`Thanks! You rated ${selectedRating}/5`);
        closeRateModal();
    });
    
});