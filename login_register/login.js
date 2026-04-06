document.addEventListener('DOMContentLoaded', () => {
	const triggerButtons = document.querySelectorAll('.utility-trigger');
	const menus = document.querySelectorAll('.utility-menu');
	const themeInputs = document.querySelectorAll('input[name="theme"]');
	const languageInputs = document.querySelectorAll('input[name="language"]');
	const languageLabel = document.getElementById('language-label');

	const dictionary = {
		en: {
			chooseTheme: 'Choose Theme',
			dark: 'Dark',
			light: 'Light',
			login: 'Login',
			signup: 'Sign Up',
			loginTitle: 'Login to UniBites',
			email: 'Email',
			password: 'Password',
			noAccount: "Don't have an account?",
			signupHere: 'Sign up here',
			quickLinks: 'Quick Links',
			home: 'Home',
			about: 'About',
			contact: 'Contact'
		},
		gr: {
			chooseTheme: 'Επιλογή Θέματος',
			dark: 'Σκούρο',
			light: 'Ανοιχτό',
			login: 'Σύνδεση',
			signup: 'Εγγραφή',
			loginTitle: 'Σύνδεση στο UniBites',
			email: 'Email',
			password: 'Κωδικός',
			noAccount: 'Δεν έχεις λογαριασμό;',
			signupHere: 'Κάνε εγγραφή εδώ',
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

		if (languageLabel) {
			languageLabel.textContent = lang === 'gr' ? 'ΕΛΛ' : 'ENG';
		}

		document.documentElement.lang = lang === 'gr' ? 'el' : 'en';

		document.querySelectorAll('[data-i18n]').forEach((element) => {
			const key = element.getAttribute('data-i18n');
			if (selected[key]) {
				element.textContent = selected[key];
			}
		});

		localStorage.setItem('unibites-language', lang);
	};

	const closeAllMenus = () => {
		triggerButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
		menus.forEach((menu) => {
			menu.hidden = true;
		});
	};

	triggerButtons.forEach((button) => {
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			const menuId = button.getAttribute('data-menu-target');
			const currentMenu = document.getElementById(menuId);
			const isOpen = button.getAttribute('aria-expanded') === 'true';

			closeAllMenus();

			if (currentMenu && !isOpen) {
				button.setAttribute('aria-expanded', 'true');
				currentMenu.hidden = false;
			}
		});
	});

	document.addEventListener('click', (event) => {
		if (!event.target.closest('.utility-group')) {
			closeAllMenus();
		}
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

	themeInputs.forEach((input) => {
		input.addEventListener('change', () => {
			setTheme(input.value);
			closeAllMenus();
		});
	});

	languageInputs.forEach((input) => {
		input.addEventListener('change', () => {
			setLanguage(input.value);
			closeAllMenus();
		});
	});
});
