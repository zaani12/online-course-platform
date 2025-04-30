// js/views/authViews.js
import * as auth from '../auth.js';
import { t } from '../i18n.js';
import { render, toggleAdminSidebar, renderTemporaryMessage } from './common.js';

// --- Login Page ---
export function renderLoginPage() {
    try {
        if (auth.isLoggedIn()) { window.location.hash = '#dashboard'; return; }
        toggleAdminSidebar(false);
        const contentHtml = `
            <div data-page-title-key="navLogin"></div>
            <div class="row justify-content-center fade-in">
                <div class="col-md-7 col-lg-5 col-xl-4">
                    <div class="card shadow-lg border-0 rounded-3 mt-4">
                        <div class="card-body p-4 p-lg-5">
                            <div class="text-center mb-4"> <a href="#home"><img src="./assets/logo/logo-no-background.svg" alt="ClassHome logo" style="height: 40px;"></a> <h2 class="card-title mt-3 fw-bold">${t('welcomeBack')}</h2> <p class="text-muted">${t('loginPrompt')}</p> </div>
                            <form id="login-form" novalidate>
                                <div id="login-form-alert" class="alert d-none mb-3" role="alert"></div>
                                <div class="form-floating mb-3"> <input type="text" class="form-control" id="login-username" name="username" placeholder="${t('loginUsernameLabel')}" required autocomplete="username"> <label for="login-username">${t('loginUsernameLabel')}</label> </div>
                                <div class="form-floating mb-4"> <input type="password" class="form-control" id="login-password" name="password" placeholder="${t('loginPasswordLabel')}" required autocomplete="current-password"> <label for="login-password">${t('loginPasswordLabel')}</label> </div>
                                <div class="d-grid mb-3"> <button type="submit" class="btn btn-primary btn-lg"> <i class="bi bi-box-arrow-in-right"></i> ${t('loginButton')} </button> </div>
                             </form>
                            <p class="mt-4 text-center text-muted small mb-0"> ${t('loginNoAccount')} <a href="#register" class="fw-medium link-primary">${t('loginSignUpLink')}</a> </p>
                        </div>
                    </div>
                </div>
            </div>`;
        render(contentHtml, false, true);
    } catch(e) {
        console.error("Error rendering login page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}

// --- Registration Page ---
export function renderRegisterPage() {
    try {
        if (auth.isLoggedIn()) { window.location.hash = '#dashboard'; return; }
        toggleAdminSidebar(false);
        const contentHtml = `
            <div data-page-title-key="navRegister"></div>
            <div class="row justify-content-center fade-in">
                <div class="col-md-9 col-lg-7 col-xl-6">
                    <div class="card shadow-lg border-0 rounded-3 mt-4">
                        <div class="card-body p-4 p-lg-5">
                            <div class="text-center mb-4"> <a href="#home"><img src="./assets/logo/logo-no-background.svg" alt="ClassHome logo" style="height: 40px;"></a> <h2 class="card-title mt-3 fw-bold">${t('registerTitle')}</h2> <p class="text-muted">${t('registerPrompt')}</p> </div>
                            <form id="register-form" novalidate>
                                <div id="register-form-alert" class="alert d-none mb-3" role="alert"></div>
                                <div class="form-floating mb-3"> <input type="text" class="form-control" id="register-username" placeholder="${t('registerUsernameLabel')}" required minlength="3"> <label for="register-username">${t('registerUsernameLabel')}</label> <div class="form-text small px-2 text-muted">${t('registerUsernameHint')}</div> </div>
                                <div class="row g-2 mb-3"> <div class="col-md-6"> <div class="form-floating"> <input type="password" class="form-control" id="register-password" placeholder="${t('registerPasswordLabel')}" required minlength="6"> <label for="register-password">${t('registerPasswordLabel')}</label> </div> <div class="form-text small px-2 text-muted">${t('registerPasswordHint')}</div> </div> <div class="col-md-6"> <div class="form-floating"> <input type="password" class="form-control" id="register-confirm-password" placeholder="${t('registerConfirmPasswordLabel')}" required minlength="6"> <label for="register-confirm-password">${t('registerConfirmPasswordLabel')}</label> </div> </div> </div>
                                <div class="form-floating mb-3"> <select class="form-select" id="register-role" required> <option value="" selected disabled>${t('registerRoleSelectDefault')}</option> <option value="client">${t('roleClient')}</option> <option value="provider">${t('roleProvider')}</option> <option value="admin">${t('registerRoleAdminOption')}</option> </select> <label for="register-role">${t('registerRoleLabel')}</label> </div>
                                <div class="form-floating mb-4" id="admin-code-group" style="display: none;"> <input type="password" class="form-control" id="register-admin-code" placeholder="${t('registerAdminCodeLabel')}"> <label for="register-admin-code">${t('registerAdminCodeLabel')}</label> </div>
                                <div class="d-grid"> <button type="submit" class="btn btn-accent btn-lg text-white"> <i class="bi bi-check-circle-fill"></i> ${t('registerButton')} </button> </div>
                            </form>
                            <p class="mt-4 text-center text-muted small mb-0"> ${t('registerHaveAccount')} <a href="#login" class="fw-medium link-primary">${t('registerLoginLink')}</a> </p>
                        </div>
                    </div>
                </div>
            </div>`;
        render(contentHtml, false, true);
        setupDynamicFormFields(); // Call helper after rendering
    } catch(e) {
        console.error("Error rendering register page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}

// --- Helper for Register Page ---
// *** Keep 'export' as it's used by main.js ***
export function setupDynamicFormFields() {
     try {
        const r = document.getElementById('register-role'), a = document.getElementById('admin-code-group'), i = document.getElementById('register-admin-code');
        if (!r || !a || !i) { console.warn("Register form dynamic fields not found."); return; }
        const toggleAdminField = () => {
            a.style.display = r.value === 'admin' ? 'block' : 'none';
            i.required = r.value === 'admin';
            if (r.value !== 'admin') i.value = '';
        };
        r.removeEventListener('change', toggleAdminField);
        toggleAdminField();
        r.addEventListener('change', toggleAdminField);
    } catch(e) {
        console.error("Error in setupDynamicFormFields:", e);
    }
}