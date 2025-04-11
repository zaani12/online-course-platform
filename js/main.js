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
        const route = initializeRouter();
        if (typeof route !== 'function') { throw new Error("Router initialization failed."); }
        console.log('Router ready.');

        // --- 3. Trigger Initial Route ---
        navigate();
        console.log('Initial route processed.');

        // --- 4. Attach Global Event Listeners ---
        console.log('Attaching global event listeners...');

        // Helper Functions for UI Feedback (Alerts)
        function showFormAlert(formId, messageOrKey, type = 'danger', variables = {}) {
            const alertSelector = `#${formId}-alert`; // Standardized ID based on form ID
            const message = t(messageOrKey, variables);
            // Find the alert *within* the specific form
            const $alert = $(`#${formId}`).find(alertSelector);
            if (!$alert.length) { console.warn(`Form Alert selector "${alertSelector}" not found within "#${formId}".`); return; }
            $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info').addClass(`alert-${type}`).html(message);
            void $alert[0].offsetWidth; $alert.addClass('show fade');
            if (type !== 'danger' && type !== 'warning') { setTimeout(() => { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); if ($alert.hasClass('show')) instance?.close(); }, 4000); }
        }

        function hideFormAlert(formId) {
             const alertSelector = `#${formId}-alert`; // Standardized ID
             const $alert = $(`#${formId}`).find(alertSelector); // Find within form
            if ($alert.length && $alert.hasClass('show')) { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); instance?.close(); }
            else if ($alert.length) { $alert.addClass('d-none').removeClass('fade show'); }
        }

        function showActionAlert(alertSelector, messageOrKey, type = 'danger', variables = {}) {
             const message = t(messageOrKey, variables);
             const $alert = $(alertSelector); // Select globally or within current view area
             if (!$alert.length) { console.warn(`Action Alert selector "${alertSelector}" not found.`); return; }
             $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info').addClass(`alert-${type}`).html(message);
             void $alert[0].offsetWidth; $alert.addClass('show fade');
             if (type !== 'danger' && type !== 'warning') { setTimeout(() => { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); if ($alert.hasClass('show')) instance?.close(); }, 4000); }
        }

        function hideActionAlert(alertSelector) {
            const $alert = $(alertSelector);
            if ($alert.length && $alert.hasClass('show')) { const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]); instance?.close(); }
            else if ($alert.length) { $alert.addClass('d-none').removeClass('fade show'); }
        }

        // --- Form Submission Handler ---
        $body.on('submit', 'form', function(event) {
            event.preventDefault();
            const form = this; const $form = $(form); const formId = $form.attr('id');
            // console.log(`Handling submit for form: #${formId}`);
            hideFormAlert(formId); // Hide previous alert using standardized ID

            if (formId === 'login-form') {
                const u = $form.find('#login-username').val().trim(); const p = $form.find('#login-password').val();
                if (!u || !p) { showFormAlert(formId, 'loginErrorRequired', 'warning'); return; }
                const r = auth.login(u, p); if (r.success) { navigate('#dashboard'); } else { showFormAlert(formId, r.messageKey || 'loginErrorInvalid', 'danger'); }
            }
            else if (formId === 'register-form') {
                const u = $form.find('#register-username').val().trim(); const p = $form.find('#register-password').val(); const cp = $form.find('#register-confirm-password').val(); const role = $form.find('#register-role').val(); const ac = $form.find('#register-admin-code').val();
                if (!u || !p || !cp || !role) { showFormAlert(formId, 'registerErrorRequired', 'warning'); return; }
                if (p !== cp) { showFormAlert(formId, 'registerErrorPasswordMatch', 'warning'); return; }
                if (u.length < 3) { showFormAlert(formId, 'registerErrorUsernameLength', 'warning'); return; }
                if (p.length < 6) { showFormAlert(formId, 'registerErrorPasswordLength', 'warning'); return; }
                if (role === 'admin' && !ac) { showFormAlert(formId, 'registerErrorAdminCodeRequired', 'warning'); return; }
                const r = auth.register(u, p, role, ac);
                if (r.success) { const msg = t(r.messageKey) + " " + t('registerSuccessLoginLink'); showFormAlert(formId, msg, 'success'); form.reset(); $('#register-role').val(""); $('#admin-code-group').hide(); }
                else { showFormAlert(formId, r.messageKey, 'danger'); }
            }
            else if (formId === 'create-course-form') {
                const user = auth.getCurrentUser();
                if (!user || user.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); return; }
                const title = $form.find('#course-title').val().trim(); const desc = $form.find('#course-description').val().trim(); const priceStr = $form.find('#course-price').val().trim();
                if (!title || !desc || priceStr === '') { showFormAlert(formId, 'createCourseErrorRequired', 'warning'); return; }
                const price = parseFloat(priceStr); if (isNaN(price) || price < 0) { showFormAlert(formId, 'createCourseErrorPrice', 'warning'); return; }
                const newCourse = store.addCourse({ title, description: desc, price, providerId: user.id });
                if (newCourse) { showFormAlert(formId, 'createCourseSuccess', 'success'); form.reset(); setTimeout(() => { navigate('#my-courses'); }, 1500); }
                else { showFormAlert(formId, 'createCourseErrorGeneric', 'danger'); } // Use a generic error key
            }
            else if (formId === 'schedule-session-form') {
                 const courseId = $form.data('course-id'); const user = auth.getCurrentUser();
                 const modalFormAlertSelector = `#${formId}-alert`; // Use standardized ID within the modal's form

                 if (!user || user.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); return; }
                 if (!courseId) { showFormAlert(formId, 'scheduleSessionErrorMissingId', 'danger'); return; } // Use specific key if exists
                 const title = $form.find('#session-title').val().trim(); const dt = $form.find('#session-datetime').val(); const link = $form.find('#session-link').val().trim();
                 if (!title || !dt || !link) { showFormAlert(formId, 'scheduleSessionErrorRequired', 'warning'); return; }
                 try { new URL(link); } catch (_) { showFormAlert(formId, 'scheduleSessionErrorInvalidLink', 'warning'); return; }
                 try { if(isNaN(new Date(dt).getTime())) throw new Error("Invalid Date"); } catch(_) { showFormAlert(formId, 'scheduleSessionErrorInvalidDate', 'warning'); return; }
                 const success = store.addLiveSession(courseId, { title, dateTime: dt, meetingLink: link });
                 if (success) {
                     showFormAlert(formId, 'scheduleSessionSuccess', 'success'); form.reset();
                     setTimeout(() => {
                         const modalElement = document.getElementById('scheduleSessionModal');
                         const modalInstance = bootstrap.Modal.getInstance(modalElement);
                         modalInstance?.hide();
                         if (window.location.hash.startsWith('#course-detail')) {
                            // console.log("Refreshing course detail page after scheduling...");
                            views.renderCourseDetailPage(); // Re-render directly
                         }
                    }, 1500);
                 } else { showFormAlert(formId, 'scheduleSessionErrorFailed', 'danger'); }
            }
        });

        // Button Click Handler
        $body.on('click', 'button', async function(event) {
            const $btn = $(this);
            const buttonId = $btn.attr('id');

            // --- Language Switcher ---
            if ($btn.closest('#language-switcher').length > 0 && $btn.data('lang')) {
                 const lang = $btn.data('lang');
                 if (lang && SUPPORTED_LANGS.includes(lang)) {
                     // console.log(`[i18n] Language change requested: ${lang}`);
                     $('#language-switcher button').prop('disabled', true);
                     try {
                         const success = await setLanguage(lang);
                         if (success) {
                             // console.log(`[i18n] Language ${lang} loaded. Re-navigating.`);
                             navigate(); // Re-run router
                         } else {
                             console.error("Failed to load language resources for:", lang);
                             alert(`Error loading language: ${lang}. Check console.`);
                         }
                     } catch (error) {
                         console.error("Error during language change:", error);
                         alert(`Error changing language. Check console.`);
                     } finally {
                         $('#language-switcher button').prop('disabled', false);
                     }
                 }
             }
             // --- Logout Button ---
             else if (buttonId === 'logout-button') {
                 auth.logout();
                 navigate('#login');
             }
             // --- Enroll Button ---
            else if ($btn.hasClass('enroll-button')) {
                const cid = $btn.data('course-id'); const user = auth.getCurrentUser();
                const $courseDetailContainer = $btn.closest('.course-detail');
                const $cardContainer = $btn.closest('.course-card');
                // Prioritize alert within course detail, then browse cards, fallback to a general area if needed
                const alertSelector = $courseDetailContainer.length ? '#course-action-alert' : ($cardContainer.length ? '#enroll-alert' : '#global-alert'); // Add #global-alert if you create one

                 hideActionAlert(alertSelector);

                if (!user) { showActionAlert(alertSelector, 'alertEnrollLogin', 'warning'); return; }
                if (user.role !== 'client') { showActionAlert(alertSelector, 'alertEnrollRole', 'warning', { role: user.role }); return; }
                if (cid) {
                    const success = store.enrollStudentInCourse(cid, user.id);
                    if (success) {
                        showActionAlert(alertSelector, 'alertEnrollSuccess', 'success');
                        const area = $btn.closest('.enroll-section, .enroll-action-area');
                        const badge = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
                        if (area.length) area.html(badge); else $btn.replaceWith(badge);
                    } else {
                        const c = store.findCourseById(cid);
                        const enrolled = c?.enrolledStudentIds?.includes(user.id);
                        if(enrolled) {
                            showActionAlert(alertSelector, 'alertEnrollAlready', 'info');
                             const area = $btn.closest('.enroll-section, .enroll-action-area');
                             const badge = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
                             if (area.length) area.html(badge); else $btn.replaceWith(badge);
                        } else {
                            showActionAlert(alertSelector, 'alertEnrollFailed', 'danger');
                        }
                    }
                } else { showActionAlert(alertSelector, 'alertEnrollMissingId', 'danger'); }
            }
            // --- Delete Course Button ---
            else if ($btn.hasClass('delete-course-button')) {
                const cid = $btn.data('course-id'); const user = auth.getCurrentUser();
                const alertSelector = '#course-action-alert'; // Assumes this exists on pages with delete buttons
                hideActionAlert(alertSelector);

                const c = cid ? store.findCourseById(cid) : null;
                 let canDelete = false;
                 if (user && c) {
                     if (user.role === 'provider' && c.providerId === user.id) { canDelete = true; }
                     else if (user.role === 'admin') { canDelete = true; }
                 }

                if (!canDelete) { showActionAlert(alertSelector, 'alertDeleteNoPermission', 'danger'); return; }
                if (!cid) { showActionAlert(alertSelector, 'alertDeleteMissingId', 'danger'); return; }

                const title = c?.title || `ID ${cid}`;
                const confirmText = t('alertDeleteConfirmText', { title: title });
                if (confirm(`${t('alertDeleteConfirmTitle')}\n\n${confirmText}`)) {
                    // console.log(`[Action] Deleting course: ${cid}`);
                    const success = store.deleteCourse(cid);
                    if (success) {
                        showActionAlert(alertSelector, 'alertDeleteSuccess', 'success', { title: title });
                        const hashBase = window.location.hash.split('/')[0];
                        setTimeout(() => {
                            if (hashBase === '#my-courses') { views.renderMyCoursesPage(); }
                            else if (hashBase === '#admin-courses') { views.renderAdminCoursesPage(); }
                            else { navigate(user.role === 'admin' ? '#admin-courses' : '#my-courses'); }
                        }, 500);
                     } else { showActionAlert(alertSelector, 'alertDeleteFailed', 'danger'); }
                } else { console.log("[Action] Deletion cancelled."); }
            }
            // --- Other button handlers ---

        }); // End of button click handler

        console.log('Global event listeners ready.');

    } catch (error) {
        console.error("FATAL: App initialization failed:", error);
        $('#initial-loading').remove();
        const errorMsg = typeof t === 'function' ? t('fatalErrorText', { message: error.message }) : `A critical problem occurred: ${error.message}`;
        $('#app-container').html(`<div class="container pt-5"><div class="alert alert-danger mt-4"><h4><i class="bi bi-exclamation-triangle-fill me-2"></i> Application Error</h4><p>${errorMsg}</p><hr><p class="mb-0 small">Check console (F12) & refresh.</p></div></div>`);
    }
}); // End of DOM Ready