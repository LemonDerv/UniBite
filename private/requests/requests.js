document.addEventListener("DOMContentLoaded", () => {

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

        /* fill modal */
        viewTitle.textContent = title;
        viewCreator.textContent = "Posted by Maria";
        viewOrderDate.textContent =
            `Requested on • ${date?.trim() || "11/04 @ 20:15"}`;
        viewOrderStatus.textContent = status;

        viewDescription.textContent =
            "Fresh pasta with tomato sauce and basil.";

        viewAddress.textContent =
            "Aratou 60, Patras";

        viewPickupTimes.textContent =
            "18:00 - 21:00";

        viewImage.innerHTML =
            "No Image Set";

        viewTags.innerHTML =
            `<span class="view-chip">Pasta</span>
             <span class="view-chip">Vegetarian</span>`;

        renderAllergens(["Gluten"]);

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
       OPEN BUTTONS
    --------------------------------------------------- */
    document.querySelectorAll(".view-details-btn").forEach(button => {
        button.addEventListener("click", () => {
            const requestItem =
                button.closest(".request-list-item");

            if (requestItem) {
                openViewModal(requestItem);
            }
        });
    });


    /* ---------------------------------------------------
       CLOSE BUTTONS
    --------------------------------------------------- */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);
    modalOverlay.addEventListener("click", closeViewModal);

});