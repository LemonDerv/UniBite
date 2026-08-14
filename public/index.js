document.addEventListener('DOMContentLoaded', async () => {
    /* ------------------------------
       FETCH STATS
    ------------------------------ */
    const stats = await fetch('/api/public/stats').then(res => res.json())
        .catch(err => console.error('Error fetching platform statistics', err));
    if (stats) {
        document.getElementById('stat-meals-now').querySelector('h3').textContent = stats.postCount || 0;
        document.getElementById('stat-users').querySelector('h3').textContent = stats.userCount || 0;
        document.getElementById('stat-total-deliveries').querySelector('h3').textContent = stats.mealCount || 0;
    }

    /* ------------------------------
       FETCH POSTS FOR CAROUSEL
    ------------------------------ */
    const data = await fetch('/api/public/public-meals')
        .then(res => res.json())
        .catch(err => console.error('Error fetching posts', err));

    if (data?.body) {
        let listings = data.body;
        
        if(!listings.length){
            document.querySelector(".carousel-section").innerHTML = "";
            return ;
        }

        // put listings with images first
        listings.sort((a, b) => {
        const aHasImg = a.imgUrl && a.imgUrl.trim() !== '';
        const bHasImg = b.imgUrl && b.imgUrl.trim() !== '';
        return bHasImg - aHasImg;
        });

        // keep the first 10 listings
        const carouselListings = listings.slice(0, 10);

        const carousel = document.getElementById('carousel-posts');
        carousel.innerHTML = '';

        carouselListings.forEach(listing => {
            const card = document.createElement('div');
            card.className = 'card';

            // render image if available
            if (listing.imgUrl && listing.imgUrl.trim() !== '') {
                const imgContainer = document.createElement('div');
                imgContainer.className = 'card-img';
                imgContainer.innerHTML = '<canvas></canvas>';
                card.appendChild(imgContainer);

                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = listing.imgUrl;

                img.onload = () =>{
                    const canvas = imgContainer.querySelector("canvas");
                    if (canvas && imgContainer.clientWidth > 0) {
                        renderMealImg(img, imgContainer.clientWidth, 0.5, canvas);
                    }
                };
                window.addEventListener('resize' , ()=>{
                    const canvas = imgContainer.querySelector("canvas");
                    if (canvas && imgContainer.clientWidth > 0) {
                        renderMealImg(img, imgContainer.clientWidth, 0.5, canvas);
                    }
                });
            } else {
                const noImagePlaceholder = document.createElement('div');
                noImagePlaceholder.className = 'card-img';
                noImagePlaceholder.textContent = 'No Image Set';
                noImagePlaceholder.style.backgroundColor = '#e0e0e0';
                card.appendChild(noImagePlaceholder);
            };

            // title
            const text = document.createElement('div');
            text.className = 'card-title';
            text.textContent = listing.title;
            card.appendChild(text);
            
            carousel.appendChild(card);
        });
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

    document.querySelectorAll('.carousel-container').forEach((container) => {
        const carousel = container.querySelector('.carousel');
        const leftButton = container.querySelector('.arrow.left');
        const rightButton = container.querySelector('.arrow.right');

        if (!carousel || !leftButton || !rightButton) {
            return;
        }

        const scrollAmount = 400;

        leftButton.addEventListener('click', () => {
            carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });

        rightButton.addEventListener('click', () => {
            carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
    });

    
});
