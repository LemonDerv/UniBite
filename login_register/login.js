document.addEventListener('DOMContentLoaded', () => {
	const languageInputs = document.querySelectorAll('input[name="language"]');
	const languageLabel = document.getElementById('language-label');

	const dictionary = {
		en: {
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

	languageInputs.forEach((input) => {
		input.addEventListener('change', () => {
			setLanguage(input.value);
		});
	});

	const savedLanguage = localStorage.getItem('unibites-language') || 'en';
	const selectedLanguageInput = document.querySelector(`input[name="language"][value="${savedLanguage}"]`);

	if (selectedLanguageInput) {
		selectedLanguageInput.checked = true;
	}

	setLanguage(savedLanguage);
});
