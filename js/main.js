// js/main.js
import { initializeRouter, router as navigate } from './router.js';
import * as auth from './auth.js';
import * as store from './store.js';
import * as views from './views.js';
import { initializeI18n, setLanguage, t, SUPPORTED_LANGS } from './i18n.js';

$(async function() {
    console.log('DOM Ready, Initializing App...');
    const $body = $(document.body);

    try {
        // --- 0. Initialize i18n ---
        console.log('Initializing i18n...');
        const i18nReady = await initializeI18n();
        if (!i18nReady) { console.error("FATAL: Failed to load initial translations."); }
        else { console.log('i18n ready.'); }

        // --- 1. Initialize Store ---
        console.log('Initializing store...');
        const storeReady = await store.initializeStore();
        if (!storeReady) { console.warn("Store initialization partially failed."); }
        else { console.log('Store ready.'); }

        // --- 2. Initialize Router ---
        console.log('Initializing router...');
        initializeRouter(); // Initialize hashchange listener
        if (typeof navigate !== 'function') { throw new Error("Router function not available."); }
        console.log('Router ready.');

        // --- 3. Initialize Auth State (AFTER store is ready) ---
        auth.initializeAuthUserState(); // Load logged-in user state from store
        console.log('Auth state initialized.');

        // --- 4. Trigger Initial Route ---
        navigate(); // Call the router function to render the initial view
        console.log('Initial route processed.');

        // --- 5. Attach Global Event Listeners ---
        console.log('Attaching global event listeners...');

        // Helper Functions for UI Feedback (Alerts) - Standardized
        function showFormAlert(formId, messageOrKey, type = 'danger', variables = {}) {
            const alertSelector = `#${formId}-alert`; // Standardized ID: formId + '-alert'
            const message = t(messageOrKey, variables, messageOrKey); // Use key as default text
            const $form = $(`#${formId}`);
            let $alert = $form.find(alertSelector); // Find alert *within* the form

            if (!$alert.length) {
                console.warn(`Form Alert element "${alertSelector}" not found within "#${formId}". Creating dynamically.`);
                $form.prepend(`<div id="${formId}-alert" class="alert d-none mb-3" role="alert"></div>`);
                $alert = $form.find(alertSelector);
                 if (!$alert.length) { console.error(`Failed to create or find alert element: ${alertSelector}`); return; }
            }
            $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info').addClass(`alert-${type}`).html(message);
            void $alert[0].offsetWidth; // Force reflow for transition
            $alert.addClass('show fade');
            if (type !== 'danger' && type !== 'warning') { setTimeout(() => { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); if ($alert.hasClass('show')) instance?.close(); }, 4000); }
        }

        function hideFormAlert(formId) {
             const alertSelector = `#${formId}-alert`;
             const $form = $(`#${formId}`);
             const $alert = $form.find(alertSelector);
             if ($alert.length && $alert.hasClass('show')) { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); instance?.close(); }
             else if ($alert.length) { $alert.addClass('d-none').removeClass('fade'); }
        }

        function showActionAlert(alertSelector, messageOrKey, type = 'danger', variables = {}) {
             const message = t(messageOrKey, variables, messageOrKey);
             const $alert = $(alertSelector);
             if (!$alert.length) { console.warn(`Action Alert selector "${alertSelector}" not found.`); return; }
             $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info').addClass(`alert-${type}`).html(message);
             void $alert[0].offsetWidth; $alert.addClass('show fade');
             if (type !== 'danger' && type !== 'warning') { setTimeout(() => { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); if ($alert.hasClass('show')) instance?.close(); }, 4000); }
        }

        function hideActionAlert(alertSelector) {
            const $alert = $(alertSelector);
            if ($alert.length && $alert.hasClass('show')) { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); instance?.close(); }
            else if ($alert.length) { $alert.addClass('d-none').removeClass('fade'); }
        }

        // --- Form Submission Handler ---
        $body.on('submit', 'form', function(event) {
            event.preventDefault();
            const form = this;
            const $form = $(form);
            const formId = $form.attr('id');

            // Prevent double submission
            if ($form.data('isSubmitting')) {
                console.warn(`Form #${formId} is already submitting. Ignoring.`);
                return;
            }
            $form.data('isSubmitting', true); // Set flag

            console.log(`Handling submit for form: #${formId}`);
            hideFormAlert(formId); // Use standardized hide function

            // --- Login Form ---
            if (formId === 'login-form') {
                const username = $form.find('#login-username').val().trim(); const password = $form.find('#login-password').val();
                if (!username || !password) { showFormAlert(formId, 'loginErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                const result = auth.login(username, password);
                if (result.success) { navigate('#dashboard'); /* Flag resets implicitly on nav */ }
                else { showFormAlert(formId, result.messageKey || 'loginErrorInvalid', 'danger'); $form.data('isSubmitting', false); }
            }
            // --- Registration Form ---
            else if (formId === 'register-form') {
                const username = $form.find('#register-username').val().trim(); const password = $form.find('#register-password').val(); const confirmPassword = $form.find('#register-confirm-password').val(); const role = $form.find('#register-role').val(); const adminCode = $form.find('#register-admin-code').val();
                 if (!username || !password || !confirmPassword || !role) { showFormAlert(formId, 'registerErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                 if (password !== confirmPassword) { showFormAlert(formId, 'registerErrorPasswordMatch', 'warning'); $form.data('isSubmitting', false); return; }
                 if (username.length < 3) { showFormAlert(formId, 'registerErrorUsernameLength', 'warning'); $form.data('isSubmitting', false); return; }
                 if (password.length < 6) { showFormAlert(formId, 'registerErrorPasswordLength', 'warning'); $form.data('isSubmitting', false); return; }
                 if (role === 'admin' && !adminCode) { showFormAlert(formId, 'registerErrorAdminCodeRequired', 'warning'); $form.data('isSubmitting', false); return; }

                const result = auth.register(username, password, role, adminCode);
                if (result.success) {
                    // *** CORRECTED ALERT MESSAGE GENERATION ***
                    const successMsg = t(result.messageKey || 'registerSuccessMessage');
                    const loginLink = t('registerSuccessLoginLink'); // t() returns the HTML link
                    const combinedMessage = `${successMsg} ${loginLink}`;
                    showFormAlert(formId, combinedMessage, 'success'); // Pass combined HTML
                    form.reset();
                    views.setupDynamicFormFields();
                    $form.data('isSubmitting', false); // Reset flag after success
                } else {
                    showFormAlert(formId, result.messageKey || 'registerErrorGeneric', 'danger');
                    $form.data('isSubmitting', false); // Reset flag on error
                }
            }
            // --- Create Course Form ---
            else if (formId === 'create-course-form') {
                const currentUser = auth.getCurrentUser();
                if (!currentUser || currentUser.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); $form.data('isSubmitting', false); return; }
                const title = $form.find('#course-title').val().trim(); const description = $form.find('#course-description').val().trim(); const priceStr = $form.find('#course-price').val().trim();
                if (!title || !description || priceStr === '') { showFormAlert(formId, 'createCourseErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                const price = parseFloat(priceStr);
                if (isNaN(price) || price < 0) { showFormAlert(formId, 'createCourseErrorPrice', 'warning'); $form.data('isSubmitting', false); return; }
                const newCourse = store.addCourse({ title, description, price, providerId: currentUser.id });
                if(newCourse) {
                    showFormAlert(formId, 'createCourseSuccess', 'success'); form.reset();
                    setTimeout(() => { navigate('#my-courses'); /* Flag resets implicitly on nav */ }, 1500);
                } else { showFormAlert(formId, 'createCourseErrorGeneric', 'danger'); $form.data('isSubmitting', false); }
            }
            // --- Schedule Live Session Form ---
            else if (formId === 'schedule-session-form') {
                 const courseId = $form.data('course-id'); const currentUser = auth.getCurrentUser();
                 if (!currentUser || currentUser.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); $form.data('isSubmitting', false); return; }
                 if (!courseId) { showFormAlert(formId, 'scheduleSessionErrorMissingId', 'danger'); $form.data('isSubmitting', false); return; }
                 const title = $form.find('#session-title').val().trim(); const dateTime = $form.find('#session-datetime').val(); const meetingLink = $form.find('#session-link').val().trim();
                 if (!title || !dateTime || !meetingLink) { showFormAlert(formId, 'scheduleSessionErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                 try { new URL(meetingLink); } catch (_) { showFormAlert(formId, 'scheduleSessionErrorInvalidLink', 'warning'); $form.data('isSubmitting', false); return; }
                 try { if(isNaN(new Date(dateTime).getTime())) throw new Error("Invalid Date"); } catch(_) { showFormAlert(formId, 'scheduleSessionErrorInvalidDate', 'warning'); $form.data('isSubmitting', false); return; }
                 const success = store.addLiveSession(courseId, { title, dateTime, meetingLink });
                 if (success) {
                     showFormAlert(formId, 'scheduleSessionSuccess', 'success'); form.reset();
                     setTimeout(() => {
                         const modalElement = document.getElementById('scheduleSessionModal');
                         bootstrap.Modal.getInstance(modalElement)?.hide();
                         if (window.location.hash.startsWith('#course-detail')) { views.renderCourseDetailPage(); }
                         $form.data('isSubmitting', false); // Reset flag AFTER action complete
                     }, 1500);
                 } else { showFormAlert(formId, 'scheduleSessionErrorFailed', 'danger'); $form.data('isSubmitting', false); }
            }
            // --- Add Material Form ---
            else if (formId === 'add-material-form') {
                const courseId = $form.data('course-id'); const currentUser = auth.getCurrentUser();
                if (!currentUser || currentUser.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); $form.data('isSubmitting', false); return; }
                if (!courseId) { showFormAlert(formId, 'Error: Course ID missing.', 'danger'); $form.data('isSubmitting', false); return; }
                const title = $form.find('#material-title').val().trim(); const type = $form.find('#material-type').val(); const url = $form.find('#material-url').val().trim(); const description = $form.find('#material-description').val().trim();
                if (!title || !type) { showFormAlert(formId, 'addMaterialErrorRequiredCore', 'warning'); $form.data('isSubmitting', false); return; }
                if (type !== 'text' && !url) { showFormAlert(formId, 'addMaterialErrorRequiredUrl', 'warning'); $form.data('isSubmitting', false); return; }
                if (type !== 'text') { try { new URL(url); } catch (_) { showFormAlert(formId, 'addMaterialErrorInvalidUrl', 'warning'); $form.data('isSubmitting', false); return; } }
                if (type === 'text' && !description) { showFormAlert(formId, 'addMaterialErrorRequiredDescText', 'warning'); $form.data('isSubmitting', false); return; }
                const materialData = { title, type, url: (type === 'text' ? '#' : url), description };
                const success = store.addCourseMaterial(courseId, materialData);
                if (success) {
                    showFormAlert(formId, 'addMaterialSuccess', 'success'); form.reset(); $('#material-type-note').hide();
                    setTimeout(() => {
                        const modalElement = document.getElementById('addMaterialModal');
                        bootstrap.Modal.getInstance(modalElement)?.hide();
                        if (window.location.hash.startsWith('#course-detail')) { views.renderCourseDetailPage(); }
                        $form.data('isSubmitting', false); // Reset flag AFTER action complete
                    }, 1500);
                } else {
                    showFormAlert(formId, 'addMaterialErrorFailed', 'danger');
                    $form.data('isSubmitting', false); // Reset flag on failure
                }
            }
            // --- Fallback for unrecognized forms ---
            else { console.warn(`Submit handler triggered for unrecognized form ID: #${formId}`); $form.data('isSubmitting', false); }
        });

        // --- Button Click Handler ---
        $body.on('click', 'button', async function(event) {
            const $btn = $(this);
            const buttonId = $btn.attr('id');
            const btnClasses = $btn.attr('class') || '';
            // console.log(`[Click Handler] Button clicked. ID: "${buttonId}", Classes: "${btnClasses}"`); // Keep for debugging if needed

            // --- Language Switcher ---
            if ($btn.closest('#language-switcher').length > 0 && $btn.data('lang')) {
                 const lang = $btn.data('lang');
                 if (lang && SUPPORTED_LANGS.includes(lang)) {
                     console.log(`[i18n] Language change requested: ${lang}`);
                     $('#language-switcher button').prop('disabled', true);
                     try {
                         const success = await setLanguage(lang);
                         if (success) { console.log(`[i18n] Language ${lang} loaded. Re-navigating.`); navigate(); }
                         else { console.error("Failed to load language resources for:", lang); showActionAlert('#nav-links .navbar-nav', 'Error loading language.', 'danger'); }
                     } catch (error) { console.error("Error during language change:", error); showActionAlert('#nav-links .navbar-nav', 'Error changing language.', 'danger'); }
                     finally { $('#language-switcher button').prop('disabled', false); }
                 }
             }
             // --- Logout Button ---
             else if (buttonId === 'logout-button') {
                 console.log('[Click Handler] Logout button condition met.');
                 try { auth.logout(); console.log('[Click Handler] auth.logout() called.'); navigate('#login'); console.log('[Click Handler] navigate("#login") called.'); }
                 catch (error) { console.error("Error during logout process:", error); showActionAlert('#global-alert-area', 'Logout failed. Please try again.', 'danger'); } // Add a global alert area if you don't have one
             }
             // --- Enroll Button ---
             else if (btnClasses.includes('enroll-button')) {
                 // console.log("[Click Handler] Enroll button clicked."); // Uncomment for debug
                 const cid = $btn.data('course-id'); const user = auth.getCurrentUser();
                 let primaryAlertSel = '#enroll-alert'; if (window.location.hash.startsWith('#course-detail')) primaryAlertSel = '#course-action-alert';
                 hideActionAlert(primaryAlertSel);
                 if (!user) { showActionAlert(primaryAlertSel, 'alertEnrollLogin', 'warning'); return; }
                 if (user.role !== 'client') { showActionAlert(primaryAlertSel, 'alertEnrollRole', 'warning', { role: user.role }); return; }
                 if (!cid) { showActionAlert(primaryAlertSel, 'alertEnrollMissingId', 'danger'); return; }
                 const success = store.enrollStudentInCourse(cid, user.id);
                 const badgeHtml = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
                 const actionAreaSelector = '.enroll-section, .enroll-action-area'; const $actionArea = $btn.closest(actionAreaSelector);
                 if (success) {
                     showActionAlert(primaryAlertSel, 'alertEnrollSuccess', 'success');
                     if ($actionArea.length) $actionArea.html(badgeHtml); else $btn.replaceWith(badgeHtml);
                 } else {
                     const c = store.findCourseById(cid);
                     if (c?.enrolledStudentIds?.includes(user.id)) { showActionAlert(primaryAlertSel, 'alertEnrollAlready', 'info'); if ($actionArea.length) $actionArea.html(badgeHtml); else $btn.replaceWith(badgeHtml); }
                     else { showActionAlert(primaryAlertSel, 'alertEnrollFailed', 'danger'); }
                 }
             }
            // --- Delete Course Button ---
            else if (btnClasses.includes('delete-course-button')) {
                // console.log("[Click Handler] Delete course button clicked."); // Uncomment for debug
                const cid = $btn.data('course-id'); const user = auth.getCurrentUser();
                const alertSelector = '#course-action-alert'; hideActionAlert(alertSelector);
                if (!user) { return; } if (!cid) { showActionAlert(alertSelector, 'alertDeleteMissingId', 'danger'); return; }
                const c = store.findCourseById(cid); if (!c) { showActionAlert(alertSelector, 'alertDeleteFailed', 'warning'); return; }
                let canDelete = (user.role === 'provider' && c.providerId === user.id) || (user.role === 'admin');
                if (!canDelete) { showActionAlert(alertSelector, 'alertDeleteNoPermission', 'danger'); return; }
                const title = c.title || t('untitledCourse'); const confirmTitle = t('alertDeleteConfirmTitle'); const confirmText = t('alertDeleteConfirmText', { title: title });
                if (window.confirm(`${confirmTitle}\n\n${confirmText}`)) {
                    const success = store.deleteCourse(cid);
                    if (success) {
                        showActionAlert(alertSelector, 'alertDeleteSuccess', 'success', { title: title });
                        setTimeout(() => { const currentHashBase = window.location.hash.split('/')[0]; if (currentHashBase === '#my-courses') views.renderMyCoursesPage(); else if (currentHashBase === '#admin-courses') views.renderAdminCoursesPage(); else navigate(isAdmin ? '#admin-courses' : '#my-courses'); }, 1200);
                     } else { showActionAlert(alertSelector, 'alertDeleteFailed', 'danger'); }
                }
            }
            // --- Other button handlers ---
        }); // End of button click handler

        // --- Modal Trigger Setup for Add Material ---
         $body.on('click', '[data-bs-target="#addMaterialModal"]', function() {
             const button = this; const courseId = button.getAttribute('data-course-id'); const courseTitle = button.getAttribute('data-course-title') || ''; const modalTitleEl = document.getElementById('addMaterialModalLabel'); const form = document.getElementById('add-material-form'); const typeSelect = document.getElementById('material-type'); const urlInput = document.getElementById('material-url'); const urlLabel = $('label[for="material-url"]'); const typeNote = $('#material-type-note');
             if (modalTitleEl) { modalTitleEl.textContent = t('addMaterialModalTitle'); }
             if (form) { $(form).data('course-id', courseId); form.reset(); hideFormAlert('add-material-form'); }
             typeNote.hide(); urlInput.required = true; urlLabel.text(t('addMaterialUrlLabel'));
             $(typeSelect).off('change.materialType').on('change.materialType', function() { if (this.value === 'text') { typeNote.show(); urlInput.required = false; urlLabel.text(t('addMaterialUrlLabelOptional')); } else { typeNote.hide(); urlInput.required = true; urlLabel.text(t('addMaterialUrlLabel')); } });
         });

        // Modal close listener
        $('.modal').on('hidden.bs.modal', function () {
            const form = $(this).find('form')[0];
            if(form) { form.reset(); hideFormAlert(form.id); if (form.id === 'register-form') { $('#admin-code-group').hide(); $('#register-admin-code').required = false; } if (form.id === 'add-material-form') { $('#material-type-note').hide(); $('#material-url').required = true; $('label[for="material-url"]').text(t('addMaterialUrlLabel')); } }
        });

        console.log('Global event listeners ready.');

    } catch (error) {
        console.error("FATAL: App initialization failed:", error);
        $('#initial-loading').remove();
        const errorMsg = typeof t === 'function' ? t('fatalErrorText', { message: error.message }, `A critical problem occurred: ${error.message}`) : `A critical problem occurred: ${error.message}`;
        $('#app-container').html(`<div class="container pt-5"><div class="alert alert-danger mt-4"><h4><i class="bi bi-exclamation-triangle-fill me-2"></i> Application Error</h4><p>${errorMsg}</p><hr><p class="mb-0 small">Check console (F12) & refresh.</p></div></div>`);
    }
}); // End of DOM Ready