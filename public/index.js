document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.carousel-container').forEach((container) => {
        const carousel = container.querySelector('.carousel');
        const leftButton = container.querySelector('.arrow.left');
        const rightButton = container.querySelector('.arrow.right');

        if (!carousel || !leftButton || !rightButton) {
            return;
        }

        const scrollAmount = 220;

        leftButton.addEventListener('click', () => {
            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        rightButton.addEventListener('click', () => {
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    });
});
