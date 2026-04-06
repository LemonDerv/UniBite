document.addEventListener('DOMContentLoaded', () => {
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    const languageInputs = document.querySelectorAll('input[name="language"]');
    const languageLabel = document.getElementById('language-label');

    const dictionary = {
        en: {
            chooseTheme: 'Choose Theme',
            dark: 'Dark',
            light: 'Light',
            moreAboutUs: 'More About us',
            heroTitle: 'Cooked Up By Students\n For Students',
            statsMeals: 'Meals Shared Last Week',
            statsUsers: 'Registered Users',
            statsTotal: 'Total Meals Shared',
            aboutTitle: 'About UniBites',
            aboutText: 'UniBite is a website that aims to blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah',
            popularMeals: 'Popular Meal Offerings',
            nearbyMeals: 'Meal Offerings near you',
            login: 'Login',
            signup: 'Sign Up',
            quickLinks: 'Quick Links',
            home: 'Home',
            about: 'About',
            contact: 'Contact'
        },
        gr: {
            chooseTheme: 'Επιλογή Θέματος',
            dark: 'Σκούρο',
            light: 'Ανοιχτό',
            moreAboutUs: 'Περισσότερα για εμάς',
            heroTitle: 'Μαγειρεμένο από φοιτητές\n για φοιτητές',
            statsMeals: 'Γεύματα που μοιράστηκαν την περασμένη εβδομάδα',
            statsUsers: 'Εγγεγραμμένοι χρήστες',
            statsTotal: 'Συνολικά γεύματα που μοιράστηκαν',
            aboutTitle: 'Σχετικά με το UniBites',
            aboutText: 'Το UniBite είναι μια ιστοσελίδα που στοχεύει στο blah blah blah blah blah blah blah blah Ζήτω το Τελ Αβίβ blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah',
            popularMeals: 'Δημοφιλείς προσφορές γευμάτων',
            nearbyMeals: 'Προσφορές γευμάτων κοντά σου',
            login: 'Σύνδεση',
            signup: 'Εγγραφή',
            quickLinks: 'Σύντομοι Σύνδεσμοι',
            home: 'Αρχική',
            about: 'Σχετικά',
            contact: 'Επικοινωνία'
        }
    };

    const setTheme = (theme) => {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
        localStorage.setItem('unibites-theme', theme);
    };

    const setLanguage = (lang) => {
        const selected = dictionary[lang] || dictionary.en;
        languageLabel.textContent = lang === 'gr' ? 'ΕΛΛ' : 'ENG';
        document.documentElement.lang = lang === 'gr' ? 'el' : 'en';

        document.querySelectorAll('[data-i18n]').forEach((element) => {
            const key = element.getAttribute('data-i18n');
            if (selected[key]) {
                element.textContent = selected[key];
            }
        });

        const heroTitle = document.querySelector('.hero-text h1');
        if (heroTitle) {
            heroTitle.innerHTML = selected.heroTitle.replace('\n', '<br>');
        }

        const statsParagraphs = document.querySelectorAll('.stats .stat p');
        if (statsParagraphs[0]) {
            statsParagraphs[0].textContent = selected.statsMeals;
        }
        if (statsParagraphs[1]) {
            statsParagraphs[1].textContent = selected.statsUsers;
        }
        if (statsParagraphs[2]) {
            statsParagraphs[2].textContent = selected.statsTotal;
        }

        const sectionTitles = document.querySelectorAll('.carousel-section h2');
        if (sectionTitles[0]) {
            sectionTitles[0].textContent = selected.popularMeals;
        }
        if (sectionTitles[1]) {
            sectionTitles[1].textContent = selected.nearbyMeals;
        }

        const loginLink = document.querySelector('.nav-buttons .login a');
        const signupLink = document.querySelector('.nav-buttons .signup a');
        if (loginLink) {
            loginLink.textContent = selected.login;
        }
        if (signupLink) {
            signupLink.textContent = selected.signup;
        }

        const footerTitle = document.querySelector('.footer-section.links h4');
        const footerLinks = document.querySelectorAll('.footer-section.links a');
        const contactTitle = document.querySelector('.footer-section.contact h4');

        if (footerTitle) {
            footerTitle.textContent = selected.quickLinks;
        }
        if (footerLinks[0]) {
            footerLinks[0].textContent = selected.home;
        }
        if (footerLinks[1]) {
            footerLinks[1].textContent = selected.about;
        }
        if (footerLinks[2]) {
            footerLinks[2].textContent = selected.contact;
        }
        if (contactTitle) {
            contactTitle.textContent = selected.contact;
        }

        localStorage.setItem('unibites-language', lang);
    };

    themeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            setTheme(input.value);
        });
    });

    languageInputs.forEach((input) => {
        input.addEventListener('change', () => {
            setLanguage(input.value);
        });
    });

    const savedTheme = localStorage.getItem('unibites-theme') || 'light';
    const savedLanguage = localStorage.getItem('unibites-language') || 'en';
    const selectedThemeInput = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
    const selectedLanguageInput = document.querySelector(`input[name="language"][value="${savedLanguage}"]`);

    if (selectedThemeInput) {
        selectedThemeInput.checked = true;
    }
    if (selectedLanguageInput) {
        selectedLanguageInput.checked = true;
    }

    setTheme(savedTheme);
    setLanguage(savedLanguage);

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
