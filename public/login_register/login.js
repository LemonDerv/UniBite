document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.querySelector(".auth-form form");
	const referenceElement = document.querySelector(".auth-form h2");
	const sibling = document.querySelector(".auth-form h4");

	if (loginForm){
		loginForm.addEventListener('submit',(e)=>{
			e.preventDefault();
			sibling.classList.add("hidden");

			const inputEmail = document.getElementById("email");
			const inputPassword = document.getElementById("password");

			const user = {
				email : inputEmail.value,
				password: inputPassword.value
			}

			fetch("/api/user/login", {
				method: "POST",
				headers: {
					"Content-Type" : "application/json"
				},
				body: JSON.stringify(user)
			})
			.then(async(response)=>{
				const data = await response.json();

				localStorage.setItem('username' , data.username);

				if(response.status === 401){
					inputEmail.value="";
					inputPassword.value="";
					sibling.textContent=data.message;
					referenceElement.parentNode.insertBefore(sibling, referenceElement.nextSibling);
					sibling.classList.remove("hidden");
					return ;
				}
				else if(response.status === 200 && data.status === 'ADMIN-Successful_Response')
					window.location.href = "../../private/admin/admin_dashboard.html";
				else if(response.status === 200 && data.status === 'STUDENT-Successful_Response')
					window.location.href = "../../private/homepage/homepage.html";
				else
					sibling.textContent=data.message;
					sibling.classList.remove("hidden");
			})
			.catch((err)=>{console.log("Error verifying user" , err);})
		});
	}
});
