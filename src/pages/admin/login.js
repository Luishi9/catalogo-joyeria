// src/pages/admin/login.js
// Login del panel admin con Supabase Auth (email/password).
import { supabase } from '../../lib/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const messageContainer = document.getElementById('loginMessage');

    function showMessage(msg, type) {
        messageContainer.textContent = msg;
        messageContainer.className = `message ${type}`;
        messageContainer.style.display = 'block';
    }

    // Si ya hay sesion activa, ir directo al panel.
    supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
            window.location.href = '/insert/index.html';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('Iniciando sesión...', 'info');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('Por favor, completa email y contraseña.', 'error');
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            if (data.session) {
                window.location.href = '/insert/index.html';
            } else {
                showMessage('No se pudo iniciar sesión.', 'error');
            }
        } catch (error) {
            console.error('Error de login:', error);
            const friendly = error?.message || 'Credenciales incorrectas. Revisa email y contraseña.';
            showMessage(friendly, 'error');
        }
    });
});