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

    /* ------------------------------
       POST BUTTONS
    ------------------------------ */
    document.querySelectorAll('.post-card .btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const postTitle = btn.closest('.post-card')
                .querySelector('.post-title').textContent;

            console.log(`View Offer: ${postTitle}`);
        });
    });

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