document.addEventListener('DOMContentLoaded', async () => {
    /* ------------------------------
       FETCH STATS
    ------------------------------ */
    /* total meals this month */
    const mealsThisMonth = await fetch('/api/admin/meals-this-month').then(res => res.json())
        .catch(err => console.error('Error fetching total meals this month:', err));
    
    document.querySelector('.stat-number').textContent = mealsThisMonth?.total_meals || 0;

    /* top donor */
    const topDonor = await fetch('/api/admin/top-donor').then(res => res.json())
        .catch(err => console.error('Error fetching top donor:', err));

    if (topDonor?.usr_username) {
        document.querySelector('.donor-name').textContent = topDonor.usr_username;
        document.querySelector('.donor-meta').textContent = `${topDonor.given_meals || 0} total meals delivered`;
    }

    /* top 5 listings */
     const topPosts = await fetch('/api/admin/top-posts').then(res => res.json())
        .catch(err => console.error('Error fetching top posts:', err));

    const postList = document.querySelector('.post-list');
    postList.innerHTML = '';

    topPosts.forEach((post, index) => {
        const postItem = document.createElement('article');
        postItem.className = 'post-item';
        postItem.innerHTML = `
            <span class="rank">#${index + 1}</span>
            <div class="post-info">
                <h3>${post.title}</h3>
                <p>Rating: ${post.lst_rating} ★</p>
            </div>
            <div class="post-actions">
                <button class="btn primary" data-lst-id="${post.lst_id}" data-title="${post.title}">View Info</button>
            </div>
            `;
        postList.appendChild(postItem);
    });

    document.querySelectorAll('.post-actions .btn').forEach(button => {
        button.addEventListener('click', async (e) => {
        const lst_id = e.target.getAttribute('data-lst-id');
        const title = e.target.getAttribute('data-title');
        await showPostDetails(lst_id, title);
        });
    });

    /* ------------------------------
    MODAL FUNCTIONALITY
    ------------------------------ */
    const modal = document.querySelector(".info-modal");
    const closeButton = document.querySelector(".btn.secondary");
    const overlay = document.querySelector(".modal-overlay");

    function closeModal() {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    }

    closeButton.addEventListener("click", closeModal);
    overlay.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeModal();
        }
    });

    async function showPostDetails(lst_id, title) {
    const post = await fetch(`/api/admin/post-details/${lst_id}`)
        .then(res => res.json())
        .catch(err => console.error('Error fetching post details:', err));

    //modal content
    modal.querySelector('h2').textContent = title || 'Post Details';
    modal.querySelector('p:nth-of-type(1)').innerHTML = `<strong>Posted by:</strong> ${post?.poster_name || 'Unknown'}`;
    modal.querySelector('p:nth-of-type(2)').innerHTML = `<strong>Posted:</strong> ${new Date(post?.created_at).toLocaleDateString()}`;
    modal.querySelector('p:nth-of-type(3)').innerHTML = `<strong>Portions Delivered:</strong> ${post?.delivered_portions || 0}`;
    modal.querySelector('p:nth-of-type(4)').innerHTML = `<strong>Rating:</strong> ${post?.lst_rating || 0} ★`;

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    }

});