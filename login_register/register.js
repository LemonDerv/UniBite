document.addEventListener('DOMContentLoaded', () => {
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
			registerTitle: 'Create Your UniBites Account',
			fullName: 'Full Name',
			email: 'Email',
			password: 'Password',
			confirmPassword: 'Confirm Password',
			allergies: 'Allergies',
			allergyMolluscs: 'Molluscs',
			allergyLupin: 'Lupin',
			allergyCelery: 'Celery',
			allergyMustard: 'Mustard',
			allergySesameSeeds: 'Sesame seeds',
			allergyMilk: 'Milk',
			allergySoybeans: 'Soybeans',
			allergyPeanuts: 'Peanuts',
			allergyNuts: 'Nuts',
			allergyFish: 'Fish',
			allergyEggs: 'Eggs',
			allergyCrustaceans: 'Crustaceans',
			allergyCerealsContainingGluten: 'Cereals containing gluten',
			allergySulphurDioxideAndSulphites: 'Sulphur dioxide and sulphites',
			haveAccount: 'Already have an account?',
			loginHere: 'Login here',
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
			registerTitle: 'Δημιούργησε λογαριασμό στο UniBites',
			fullName: 'Ονοματεπώνυμο',
			email: 'Email',
			password: 'Κωδικός',
			confirmPassword: 'Επιβεβαίωση Κωδικού',
			allergies: 'Αλλεργίες',
			allergyMolluscs: 'Μαλάκια',
			allergyLupin: 'Λούπινο',
			allergyCelery: 'Σέλινο',
			allergyMustard: 'Μουστάρδα',
			allergySesameSeeds: 'Σπόροι σησαμιού',
			allergyMilk: 'Γάλα',
			allergySoybeans: 'Σόγια',
			allergyPeanuts: 'Αράπικα φιστίκια',
			allergyNuts: 'Ξηροί καρποί',
			allergyFish: 'Ψάρια',
			allergyEggs: 'Αυγά',
			allergyCrustaceans: 'Καρκινοειδή',
			allergyCerealsContainingGluten: 'Δημητριακά που περιέχουν γλουτένη',
			allergySulphurDioxideAndSulphites: 'Διοξείδιο του θείου και θειώδη',
			haveAccount: 'Έχεις ήδη λογαριασμό;',
			loginHere: 'Σύνδεση εδώ',
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
		});
	});

	languageInputs.forEach((input) => {
		input.addEventListener('change', () => {
			setLanguage(input.value);
		});
	});

	/* ── REGISTER FORM SUBMIT → redirect to account setup ── */
	const registerForm = document.querySelector('.auth-form form');
	if (registerForm) {
		registerForm.addEventListener('submit', (e) => {
			e.preventDefault();
			const password = document.getElementById('password').value;
			const confirmPassword = document.getElementById('confirm-password').value;
			if (password !== confirmPassword) {
				alert('Passwords do not match.');
				return;
			}
			window.location.href = '../account_setup/setup.html';
		});
	}
});
