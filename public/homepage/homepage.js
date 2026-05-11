document.addEventListener('DOMContentLoaded', () => {

    /* ------------------------------
       THEME + LANGUAGE
    ------------------------------ */
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    const languageInputs = document.querySelectorAll('input[name="language"]');
    const languageLabel = document.getElementById('language-label');

    const dictionary = {
        en: {
            chooseTheme: 'Choose Theme',
            dark: 'Dark',
            light: 'Light',
            welcome: 'Welcome back, Student',
            subtitle: 'Fresh meal offerings near you.'
        },
        gr: {
            chooseTheme: 'Επιλογή Θέματος',
            dark: 'Σκούρο',
            light: 'Ανοιχτό',
            welcome: 'Καλώς ήρθες ξανά',
            subtitle: 'Φρέσκα γεύματα κοντά σου.'
        }
    };

    const setTheme = (theme) => {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
        localStorage.setItem('unibites-theme', theme);
    };

    const setLanguage = (lang) => {
        const selected = dictionary[lang] || dictionary.en;

        if (languageLabel) {
            languageLabel.textContent = lang === 'gr' ? 'ΕΛΛ' : 'ENG';
        }

        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (selected[key]) el.textContent = selected[key];
        });

        const heading = document.querySelector('.page-heading h1');
        const subtitle = document.querySelector('.page-heading p');

        if (heading) heading.textContent = selected.welcome;
        if (subtitle) subtitle.textContent = selected.subtitle;

        localStorage.setItem('unibites-language', lang);
    };

    /* LOAD SAVED SETTINGS */
    const savedTheme = localStorage.getItem('unibites-theme') || 'light';
    const savedLang = localStorage.getItem('unibites-language') || 'en';

    setTheme(savedTheme);
    setLanguage(savedLang);

    const selectedTheme = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    const selectedLang = document.querySelector(`input[name="language"][value="${savedLang}"]`);

    if (selectedTheme) selectedTheme.checked = true;
    if (selectedLang) selectedLang.checked = true;

    /* ------------------------------
       UTILITY MENU
    ------------------------------ */
    /* EVENTS */
    themeInputs.forEach(input => {
        input.addEventListener('change', () => {
            setTheme(input.value);
        });
    });

    languageInputs.forEach(input => {
        input.addEventListener('change', () => {
            setLanguage(input.value);
        });
    });

    /* ------------------------------
       ADDRESS DROPDOWN
    ------------------------------ */
    const addressBtn = document.querySelector('.address-btn');
    const addressDropdown = document.querySelector('.address-dropdown');

    if (addressBtn && addressDropdown) {
        addressBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addressDropdown.classList.toggle('show');
        });

        addressDropdown.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;

            if (li.classList.contains('add-new')) {
                const newAddress = prompt('Enter new address:');
                if (newAddress) {
                    const newLi = document.createElement('li');
                    newLi.textContent = newAddress;
                    addressDropdown.insertBefore(newLi, li);
                    addressBtn.textContent = newAddress + " ▼";
                }
            } else {
                addressBtn.textContent = li.textContent + " ▼";
            }

            addressDropdown.classList.remove('show');
        });

        document.addEventListener('click', () => {
            addressDropdown.classList.remove('show');
        });
    }

    /* ------------------------------
       ALLERGY FILTER
    ------------------------------ */
    const allergyCheckbox = document.getElementById('filter-allergies');
    if (allergyCheckbox) {
        allergyCheckbox.addEventListener('change', () => {
            console.log(`Allergy filter: ${allergyCheckbox.checked}`);
        });
    }

    /* ------------------------------
       CATEGORY TOGGLE
    ------------------------------ */
    const categoryButtons = document.querySelectorAll('.category');
    categoryButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
        VIEW DETAILS MODAL
    ----------------------------- */

    const viewModal = document.getElementById("viewModal");
    const closeViewBtn = document.querySelector(".close-view-modal");
    const closeViewFooterBtn = document.querySelector(".close-view-btn");

    /* fields */
    const viewTitle = document.getElementById("viewTitle");
    const viewPortions = document.getElementById("viewPortions");
    const viewDescription = document.getElementById("viewDescription");
    const viewAddress = document.getElementById("viewAddress");
    const viewPickupTimes = document.getElementById("viewPickupTimes");
    const viewImage = document.getElementById("viewImage");
    const viewTags = document.getElementById("viewTags");
    const viewAllergens = document.getElementById("viewAllergens");
    const viewCreator = document.getElementById("viewCreator");
    const viewDistance = document.getElementById("viewDistance");
    const viewTimeRemaining = document.getElementById("viewTimeRemaining");

    function renderAllergens(allergens) {
        if (!allergens || allergens.length === 0) {
            viewAllergens.innerHTML =
                `<span class="no-allergens">No allergens noted</span>`;
            return;
        }

        viewAllergens.innerHTML = allergens
            .map(allergen =>
                `<span class="view-chip allergen-view-chip">${allergen}</span>`
            )
            .join("");
    }

    /* open modal */
    function openViewModal(postItem) {
        const title = postItem.querySelector(".post-title")?.textContent || "";
        /* meta (creator + distance + time) */
        const metaText = postItem.querySelector(".post-meta span:first-child")?.textContent || "";
        const [creatorRaw, distanceRaw] = metaText.split("•");
        const creator = creatorRaw?.trim() || "";
        const distance = distanceRaw?.trim() || "";
        const timeRemaining = postItem.querySelector(".post-time-remaining")?.textContent?.trim() || "";
        /* portions */
        const portions = postItem.querySelector(".post-portions")?.textContent || "";
        /* allergens (from data attribute) */
        const allergensRaw = postItem.querySelector(".post-allergens")?.dataset.allergens || "";
        const allergens = allergensRaw
            ? allergensRaw.split(",").map(a => a.trim()).filter(Boolean)
            : [];

        /* fill fields (with test/placeholder data) */
        viewTitle.textContent = title;
        viewCreator.textContent = `Posted by ${creator}`;
        viewDistance.textContent = distance;
        viewTimeRemaining.textContent = timeRemaining;
        viewPortions.textContent = portions;
        viewDescription.textContent = "Fresh pasta with tomato sauce and basil.";
        viewAddress.textContent = "Aratou 60, Patras";
        viewPickupTimes.textContent = "18:00 - 21:00";
        viewImage.innerHTML = "No Image Set";
        viewTags.innerHTML = `<span class="view-chip">Pasta</span><span class="view-chip">Vegetarian</span>`;
        /* allergens logic */
        if (allergens.length === 0) {
            viewAllergens.innerHTML = `<span class="view-no-allergens">No allergens noted</span>`;
        } else {
            viewAllergens.innerHTML = allergens.map(a => `<span class="view-chip allergen-view-chip">${a}</span>`).join("");
        }

        /* show modal */
        viewModal.classList.remove("hidden");

        /* reset scroll to top */
        const content = viewModal.querySelector(".view-modal-content");
        if (content) content.scrollTop = 0;
    }

    /* close modal */
    function closeViewModal() {
        viewModal.classList.add("hidden");
    }

    /* open events */
    document.querySelectorAll(".view-details-btn")
        .forEach(button => {
            button.addEventListener("click", () => {
                const postItem = button.closest(".post-card");
                openViewModal(postItem);
            });
        });

    /* close events */
    closeViewBtn.addEventListener("click", closeViewModal);
    closeViewFooterBtn.addEventListener("click", closeViewModal);

    /* request (to be expanded) */
    const requestBtn = document.querySelector(".request-btn");
    requestBtn?.addEventListener("click", () => {
        alert("Serving request submitted!");
        closeViewModal();
    });

    /* close modal when clicking outside */
    viewModal.querySelector(".modal-overlay").addEventListener("click", closeViewModal);


/*----------------------------------------------------------------------------------------------------*/
    /* -----------------------------
        CREATE POST MODAL
    ----------------------------- */

    document.querySelector(".open-create-modal").addEventListener("click", () => {
        openEditModal();
    });

    const editModal = document.getElementById("editModal");
    const closeEditBtn = document.querySelector(".close-edit-modal");
    const cancelEditBtn = document.querySelector(".cancel-edit");

    /* fields */
    const editTitle = document.getElementById("editTitle");
    const editDescription = document.getElementById("editDescription");
    const editPortions = document.getElementById("editTotalPortions");
    const editAddress = document.getElementById("editAddress");
    const editPickupTimes = document.getElementById("editPickupTimes");
    const tagButtons = document.querySelectorAll(".chip-option");
    const allergenDropdown = document.querySelector(".allergen-dropdown");
    const allergyCheckboxes = document.querySelectorAll('.allergen-list input[type="checkbox"]');

    /* open modal */
    function openEditModal(card) {
        editModal.classList.remove("hidden");
        // reset fields
        editTitle.value = "";
        editDescription.value = "";
        editPortions.value = "";
        editAddress.value = "";
        editPickupTimes.value = "";
        imagePreview.innerHTML = "No Image Set";
        imageInput.value = "";
        /* reset all checkboxes (tags) */
        document.querySelectorAll('.chip-option input').forEach(cb => {cb.checked = false;});
        /* reset allergens */
        document.querySelectorAll('.allergen-list input').forEach(cb => {cb.checked = false;});
        /* always show first page */
        showEditPage(1);
        /* always scroll to top */
        editModal.querySelector(".edit-modal-content").scrollTop = 0;
    }

    /* allergens dropdown behavior */
    document.addEventListener("click", (e) => {
        if (allergenDropdown && allergenDropdown.open && !allergenDropdown.contains(e.target)) {
            allergenDropdown.removeAttribute("open");
        }
    });
    
    /* close modal */
    function closeEditModal() {
        editModal.classList.add("hidden");
    }

    /* edit button */
    document.querySelectorAll(".menu-dropdown .edit-post").forEach(editBtn => {
            editBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const card = editBtn.closest(".post-card");
                openEditModal(card);
                /* close dropdown */
                editBtn.closest(".menu-dropdown").classList.remove("active");
            });
        });

    /* tag selection */
    tagButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.toggle("selected");
        });
    });

    /* save changes */
    document.querySelector(".save-edit")
        .addEventListener("click", () => {

            console.log({
                title: editTitle.value,
                description: editDescription.value,
                portions: editPortions.value,
                address: editAddress.value,
                pickupTimes: editPickupTimes.value,
                tags: Array.from(tagButtons).filter(btn => btn.classList.contains("selected")).map(btn => btn.dataset.tag),
                allergens: Array.from(allergyCheckboxes).filter(cb => cb.checked).map(cb => cb.value)
            });

            /*
            send data to backend
            */

            closeEditModal();
        });

    let currentEditPage = 1;

    const page1 = document.getElementById("editPage1");
    const page2 = document.getElementById("editPage2");

    const editPrevBtn = document.querySelector(".prev-edit-page");
    const editNextBtn = document.querySelector(".next-edit-page");

    function showEditPage(page) {
        currentEditPage = page;

        page1.classList.toggle("active", page === 1);
        page2.classList.toggle("active", page === 2);

        if (page === 1) {
            editNextBtn.style.display = "inline-flex";
            editPrevBtn.style.display = "none";
        } else {
            editNextBtn.style.display = "none";
            editPrevBtn.style.display = "inline-flex";
        }
        editModal.classList.toggle("page-2", page === 2);
    }

    editNextBtn.addEventListener("click", () => {
        showEditPage(2);
    });
    editPrevBtn.addEventListener("click", () => {
        showEditPage(1);
    });

    const imageInput = document.getElementById("editImage");
    const imagePreview = document.getElementById("editImagePreview");

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) {
            imagePreview.innerHTML = "No Image Set";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            imagePreview.innerHTML = `<img src="${event.target.result}" />`;
        };
        reader.readAsDataURL(file);
    });

    showEditPage(1);

    /* image reset */
    imagePreview.innerHTML = "No Image Set";
    imageInput.value = "";

    /* close events */
    closeEditBtn.addEventListener("click", closeEditModal);
    cancelEditBtn.addEventListener("click", closeEditModal);

    /* close modal when clicking outside */
    editModal.querySelector(".modal-overlay").addEventListener("click", closeEditModal);



/*----------------------------------------------------------------------------------------------------*/
    /* ------------------------------
       AVATAR
    ------------------------------ */
    const avatar = document.getElementById("avatar");
    const menu = document.getElementById("dropdownMenu");

    avatar.addEventListener("click", () => {
        menu.style.display = 
            menu.style.display === "flex" ? "none" : "flex";
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
        if (!avatar.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });

/*----------------------------------------------------------------------------------------------------*/
    /* ------------------------------
       PAGINATION
    ------------------------------ */
    const posts = document.querySelectorAll('.post-card');
    const prevBtn = document.querySelector('.page-btn.prev');
    const nextBtn = document.querySelector('.page-btn.next');

    let currentPage = 0;
    const postsPerPage = 12;

    function showPage(page) {
        posts.forEach((post, index) => {
            post.style.display =
                index >= page * postsPerPage &&
                index < (page + 1) * postsPerPage
                    ? 'block'
                    : 'none';
        });

        /* disable buttons when needed */
        if (prevBtn) prevBtn.disabled = page === 0;
        if (nextBtn) nextBtn.disabled = (page + 1) * postsPerPage >= posts.length;
    }

    if (prevBtn && nextBtn) {
        showPage(currentPage);

        nextBtn.addEventListener('click', () => {
            if ((currentPage + 1) * postsPerPage < posts.length) {
                currentPage++;
                showPage(currentPage);

                setTimeout(() => {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }, 0);
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                showPage(currentPage);

                setTimeout(() => {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }, 0);
            }
        });
    }
});