document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------
        CONFIRM MODAL
    ----------------------------- */
    const modal = document.getElementById("confirmModal");
    const title = document.getElementById("confirmTitle");
    const text = document.getElementById("confirmText");
    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    let currentAction = null;

    document.querySelectorAll(".confirm-delivery").forEach(btn => {
        btn.addEventListener("click", () => {
            currentAction = "confirm";
            title.textContent = "Confirm Delivery";
            text.textContent = "Mark this delivery as completed?";
            modal.classList.remove("hidden");
        });
    });

    document.querySelectorAll(".fail-delivery").forEach(btn => {
        btn.addEventListener("click", () => {
            currentAction = "fail";
            title.textContent = "Fail Delivery";
            text.textContent = "Mark this delivery as failed?";
            modal.classList.remove("hidden");
        });
    });

    noBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    yesBtn.addEventListener("click", () => {
        if (currentAction === "confirm") {
            console.log("delivery confirmed");
        }

        if (currentAction === "fail") {
            console.log("delivery failed");
        }

        modal.classList.add("hidden");
    });
    
});