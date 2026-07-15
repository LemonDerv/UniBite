document.addEventListener('DOMContentLoaded', () => {
    const modal = document.querySelector(".info-modal");
    const openButtons = document.querySelectorAll(".btn.primary");
    const closeButton = document.querySelector(".btn.secondary");
    const overlay = document.querySelector(".modal-overlay");

    function openModal() {
        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    }

    function closeModal() {
        modal.classList.add("hidden");
        document.body.classList.remove("modal-open");
    }

    openButtons.forEach(button => {
        button.addEventListener("click", openModal);
    });

    closeButton.addEventListener("click", closeModal);

    overlay.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal();
        }
    });
});