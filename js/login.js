document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    // Credenciales quemadas de tu boceto
    const CREDENTIALS = {
        user: 'admin',
        pass: 'elpez2024'
    };

    loginForm.addEventListener('submit', (e) => {
        // Evitamos que la página se recargue automáticamente
        e.preventDefault(); 

        // Capturamos los valores de los inputs limpios de espacios en blanco
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value;

        // Ocultamos cualquier error previo
        errorMessage.classList.add('d-none');
        errorMessage.textContent = '';

        // Validación estricta
        if (usernameInput === CREDENTIALS.user && passwordInput === CREDENTIALS.pass) {
            // ¡Éxito! Aquí lo mandamos a la futura página del panel de control
            // Por ahora puedes crear un "dashboard.html" básico para probarlo
            window.location.href = 'dashboard.html'; 
        } else {
            // Error: Mostramos el mensaje quitando la clase 'd-none' de Bootstrap
            errorMessage.classList.remove('d-none');
            
            if (usernameInput !== CREDENTIALS.user) {
                errorMessage.textContent = 'El usuario ingresado no existe.';
            } else {
                errorMessage.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
            }
        }
    });
});