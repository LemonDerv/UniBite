document.addEventListener('DOMContentLoaded', () => {
	/* ── REGISTER FORM SUBMIT → redirect to account setup ── */
	const registerForm = document.querySelector('.auth-form form');
	const referenceElement = document.querySelector(".auth-form h2");
	const sibling = document.querySelector(".auth-form h4");

	if (registerForm) {
		registerForm.addEventListener('submit', (e) => {
			e.preventDefault();
			const password = document.getElementById('password').value;
			const confirmPassword = document.getElementById('confirm-password').value;

			if (password !== confirmPassword) {
				alert('Passwords do not match.');
				return;
			}
			
			const user = {
				username: document.getElementById('name').value,
				email: document.getElementById('email').value,
				password: password,
			};

			fetch("/api/user/register", {
            	method: "POST",
            	headers: {
                	"Content-Type": "application/json"
            	},
            	body: JSON.stringify(user)
        	})
        	.then(async (response) => {
				const data = await response.json();
				localStorage.setItem('username', data.username);
				if(response.status === 409){
					alert(data.message);
					window.location.href = './login.html';
					return ;
				}
				else if(response.status === 201)
					window.location.href = '../../private/account_setup/setup.html';
				else{
					sibling.textContent=data.message;
					referenceElement.parentNode.insertBefore(sibling, referenceElement.nextSibling);
					sibling.classList.remove("hidden");
				}
			})
        	.catch((error) => console.log("Error saving user:",error));
		});
	}
});

