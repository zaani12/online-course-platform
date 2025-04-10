// js/main.js
import { initializeRouter, router as navigate } from './router.js'; // Import router function itself
import * as auth from './auth.js';
import * as store from './store.js';
import * as views from './views.js';
import { initializeI18n, setLanguage, t, SUPPORTED_LANGS } from './i18n.js'; // Import i18n functions

// Wait for DOM ready using jQuery
$(async function() {
    console.log('DOM Ready, Initializing App...');
    const $body = $(document.body);

    try {
        // --- 0. Initialize i18n (Load default language translations) ---
        console.log('Initializing i18n...');
        const i18nReady = await initializeI18n();
        if (!i18nReady) {
             console.error("FATAL: Failed to load initial translations. Application might not display text correctly.");
             // Let it proceed, but text might be missing/show keys
        } else {
            console.log('i18n ready.');
        }

        // --- 1. Initialize Store (handles localStorage and default data) ---
        console.log('Initializing store...');
        const storeReady = await store.initializeStore();
        if (!storeReady) {
            console.warn("Store initialization partially failed (maybe failed to load defaults), proceeding with potentially empty data.");
        } else {
            console.log('Store ready.');
        }

        // --- 2. Initialize Router (sets up hashchange listener) ---
        console.log('Initializing router...');
        // Use the exported router function directly for navigation
        const route = initializeRouter();
        if (typeof route !== 'function') {
            throw new Error("Router initialization failed.");
        }
        console.log('Router ready.');

        // --- 3. Trigger Initial Route ---
        // The router function 'route' is the same as 'navigate' now
        navigate(); // Router now uses t() for any messages during redirects
        console.log('Initial route processed.');

        // --- 4. Attach Global Event Listeners using Delegation ---
        console.log('Attaching global event listeners...');

        // Helper Functions for UI Feedback (Alerts) - Use translation keys
        function showFormAlert(formId, alertSelector, messageOrKey, type = 'danger', variables = {}) {
            const message = t(messageOrKey, variables); // Translate the message/key
            const $alert = $(`#${formId} ${alertSelector}`);
            if (!$alert.length) {
                console.warn(`Form Alert selector "#${formId} ${alertSelector}" not found.`);
                return;
            }
            // Ensure it's visible before adding 'show' for transition
            $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info')
                  .addClass(`alert-${type}`)
                  .html(message); // Use .html() for links/markup in translations

             // Force reflow before adding 'show' class for transition effect
             void $alert[0].offsetWidth;
             $alert.addClass('show fade');

            if (type !== 'danger' && type !== 'warning') { // Also hide success/info alerts
                setTimeout(() => {
                    const alertInstance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                    if ($alert.hasClass('show')) { alertInstance?.close(); }
                }, 4000);
            }
        }

        function hideFormAlert(formId, alertSelector) {
            const $alert = $(`#${formId} ${alertSelector}`);
            if ($alert.length && $alert.hasClass('show')) {
                 const alertInstance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                 alertInstance?.close(); // Bootstrap handles removing 'show' and adding 'd-none' after fade
            } else if ($alert.length) {
                 // If not shown with 'show' class, just ensure it's hidden
                 $alert.addClass('d-none').removeClass('fade');
            }
        }

        function showActionAlert(alertSelector, messageOrKey, type = 'danger', variables = {}) {
             const message = t(messageOrKey, variables); // Translate
            const $alert = $(alertSelector);
            if (!$alert.length) {
                console.warn(`Action Alert selector "${alertSelector}" not found.`);
                return;
            }
            $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info')
                  .addClass(`alert-${type}`)
                  .html(message);

             void $alert[0].offsetWidth; // Reflow
             $alert.addClass('show fade');

            if (type !== 'danger' && type !== 'warning') {
                setTimeout(() => {
                     const alertInstance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                     if ($alert.hasClass('show')) { alertInstance?.close(); }
                }, 4000);
            }
        }

         function hideActionAlert(alertSelector) {
            const $alert = $(alertSelector);
            if ($alert.length && $alert.hasClass('show')) {
                 const alertInstance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                 alertInstance?.close();
            } else if ($alert.length) {
                 $alert.addClass('d-none').removeClass('fade');
            }
        }

        // --- Form Submission Handler ---
        $body.on('submit', 'form', function(event) {
            event.preventDefault();
            const form = this; const $form = $(form); const formId = $form.attr('id');
            console.log(`Handling submit for form: #${formId}`);
            // Hide any existing alert specific to this form before processing
            const alertSelector = `#${formId}-alert`; // Standardize alert IDs like 'login-form-alert'
            if ($(alertSelector).length) { // If a dedicated alert exists
                 hideFormAlert(formId, alertSelector.substring(1)); // Use the specific alert
            } else { // Fallback for older alert IDs if needed (or general purpose)
                 if (formId === 'login-form') hideFormAlert(formId, '#login-alert');
                 else if (formId === 'register-form') hideFormAlert(formId, '#register-alert');
                 else if (formId === 'create-course-form') hideFormAlert(formId, '#course-alert');
                 else if (formId === 'schedule-session-form') hideFormAlert(formId, '#session-alert');
            }


            if (formId === 'login-form') {
                const u = $form.find('#login-username').val().trim(); const p = $form.find('#login-password').val(); const a = '#login-alert';
                if (!u || !p) { showFormAlert(formId, a, 'loginErrorRequired', 'warning'); return; }
                const r = auth.login(u, p); if (r.success) { navigate('#dashboard'); } else { showFormAlert(formId, a, r.messageKey || 'loginErrorInvalid', 'danger'); }
            }
            else if (formId === 'register-form') {
                const u = $form.find('#register-username').val().trim(); const p = $form.find('#register-password').val(); const cp = $form.find('#register-confirm-password').val(); const role = $form.find('#register-role').val(); const ac = $form.find('#register-admin-code').val(); const a = '#register-alert';
                if (!u || !p || !cp || !role) { showFormAlert(formId, a, 'registerErrorRequired', 'warning'); return; }
                if (p !== cp) { showFormAlert(formId, a, 'registerErrorPasswordMatch', 'warning'); return; }
                if (u.length < 3) { showFormAlert(formId, a, 'registerErrorUsernameLength', 'warning'); return; }
                if (p.length < 6) { showFormAlert(formId, a, 'registerErrorPasswordLength', 'warning'); return; }
                if (role === 'admin' && !ac) { showFormAlert(formId, a, 'registerErrorAdminCodeRequired', 'warning'); return; }
                const r = auth.register(u, p, role, ac);
                if (r.success) { const msg = t(r.messageKey || 'registerSuccessMessage') + " " + t('registerSuccessLoginLink'); showFormAlert(formId, a, msg, 'success'); form.reset(); const rs = $('#register-role'); const ag = $('#admin-code-group'); if(rs) rs.val(""); if(ag) ag.hide(); }
                else { showFormAlert(formId, a, r.messageKey || 'Registration failed.', 'danger'); }
            }
            else if (formId === 'create-course-form') {
                const user = auth.getCurrentUser(); const a = '#course-alert';
                if (!user || user.role !== 'provider') { showFormAlert(formId, a, 'alertTempProviderRequired', 'danger'); return; }
                const title = $form.find('#course-title').val().trim(); const desc = $form.find('#course-description').val().trim(); const priceStr = $form.find('#course-price').val().trim();
                if (!title || !desc || priceStr === '') { showFormAlert(formId, a, 'createCourseErrorRequired', 'warning'); return; }
                const price = parseFloat(priceStr); if (isNaN(price) || price < 0) { showFormAlert(formId, a, 'createCourseErrorPrice', 'warning'); return; }
                store.addCourse({ title, description: desc, price, providerId: user.id }); showFormAlert(formId, a, 'createCourseSuccess', 'success'); form.reset(); setTimeout(() => { navigate('#my-courses'); }, 1500);
            }
            else if (formId === 'schedule-session-form') {
                 const a = '#session-alert'; const courseId = $form.data('course-id'); const user = auth.getCurrentUser();
                 if (!user || user.role !== 'provider') { showFormAlert(formId, a, 'alertTempProviderRequired', 'danger'); return; }
                 if (!courseId) { showFormAlert(formId, a, 'Error: Course ID missing.', 'danger'); return; } // Should not happen
                 const title = $form.find('#session-title').val().trim(); const dt = $form.find('#session-datetime').val(); const link = $form.find('#session-link').val().trim();
                 if (!title || !dt || !link) { showFormAlert(formId, a, 'scheduleSessionErrorRequired', 'warning'); return; }
                 try { new URL(link); } catch (_) { showFormAlert(formId, a, 'scheduleSessionErrorInvalidLink', 'warning'); return; }
                 try { if(isNaN(new Date(dt).getTime())) throw new Error("Invalid Date"); } catch(_) { showFormAlert(formId, a, 'scheduleSessionErrorInvalidDate', 'warning'); return; }
                 const success = store.addLiveSession(courseId, { title, dateTime: dt, meetingLink: link });
                 if (success) {
                     showFormAlert(formId, a, 'scheduleSessionSuccess', 'success'); form.reset();
                     setTimeout(() => {
                         const modalElement = document.getElementById('scheduleSessionModal');
                         const modalInstance = bootstrap.Modal.getInstance(modalElement);
                         modalInstance?.hide();
                         // Re-render the course detail page to show the new session
                         if (window.location.hash.startsWith('#course-detail')) {
                            console.log("Refreshing course detail page after scheduling...");
                            views.renderCourseDetailPage(); // Call the render function directly
                         }
                    }, 1500);
                 } else { showFormAlert(formId, a, 'Failed to schedule session.', 'danger'); }
            }
        });

        // Button Click Handler
        $body.on('click', 'button', async function(event) { // Make async for language change
            const $btn = $(this);
            const buttonId = $btn.attr('id'); // Get button ID if present

            // --- Language Switcher ---
             if ($btn.parent().attr('id') === 'language-switcher') {
                 const lang = $btn.data('lang');
                 if (lang && SUPPORTED_LANGS.includes(lang)) {
                     console.log(`[i18n] Language change requested: ${lang}`);
                     try {
                         const success = await setLanguage(lang); // Wait for language to load
                         if (success) {
                             console.log(`[i18n] Language ${lang} loaded. Re-navigating.`);
                             navigate(); // Re-run the router to update the view
                         } else {
                             console.error("Failed to load language resources for:", lang);
                             // Optional: Show an error message to the user
                             showActionAlert('#nav-links', 'Error loading language.', 'danger');
                         }
                     } catch (error) {
                         console.error("Error during language change:", error);
                     }
                 }
             }
             // --- Logout Button ---
             else if (buttonId === 'logout-button') {
                 auth.logout();
                 navigate('#login'); // Redirect to login page after logout
             }
             // --- Enroll Button ---
            else if ($btn.hasClass('enroll-button')) {
                const cid = $btn.data('course-id'); const user = auth.getCurrentUser();
                // Determine the correct alert area based on context
                const $courseDetail = $btn.closest('.course-detail');
                const alertSelector = $courseDetail.length ? '#course-action-alert' : '#enroll-alert';
                 // Hide any previous alert in the target area
                 hideActionAlert(alertSelector);

                if (!user) { showActionAlert(alertSelector, 'alertEnrollLogin', 'warning'); return; }
                if (user.role !== 'client') { showActionAlert(alertSelector, 'alertEnrollRole', 'warning', { role: user.role }); return; }
                if (cid) { const success = store.enrollStudentInCourse(cid, user.id); if (success) { showActionAlert(alertSelector, 'alertEnrollSuccess', 'success'); const area = $btn.closest('.enroll-section, .enroll-action-area'); const badge = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`; if (area.length) area.html(badge); else $btn.replaceWith(badge); } else { const c = store.findCourseById(cid); const enrolled = c?.enrolledStudentIds.includes(user.id); if(enrolled) showActionAlert(alertSelector, 'alertEnrollAlready', 'info'); else showActionAlert(alertSelector, 'alertEnrollFailed', 'danger'); }
                } else { showActionAlert(alertSelector, 'alertEnrollMissingId', 'danger'); }
            }
            // --- Delete Course Button ---
            else if ($btn.hasClass('delete-course-button')) {
                const cid = $btn.data('course-id'); const user = auth.getCurrentUser(); const a = '#course-action-alert'; hideActionAlert(a);
                const c = cid ? store.findCourseById(cid) : null;
                // Permission check: Must be logged in, be a provider, and own the course OR be an admin
                 let canDelete = false;
                 if (user && c) {
                     if (user.role === 'provider' && c.providerId === user.id) {
                         canDelete = true;
                     } else if (user.role === 'admin') {
                         console.log("[Auth] Admin deleting course:", cid);
                         canDelete = true; // Admins can delete any course
                     }
                 }

                if (!canDelete) { showActionAlert(a, 'alertDeleteNoPermission', 'danger'); return; }
                if (!cid) { showActionAlert(a, 'alertDeleteMissingId', 'danger'); return; }
                const title = c?.title || `ID ${cid}`;
                const confirmText = t('alertDeleteConfirmText', { title: title }); if (confirm(`${t('alertDeleteConfirmTitle')}\n\n${confirmText}`)) { console.log(`[Action] Deleting course: ${cid}`); const success = store.deleteCourse(cid); if (success) { showActionAlert(a, 'alertDeleteSuccess', 'success', { title: title }); const hashBase = window.location.hash.split('/')[0]; if (hashBase === '#my-courses') setTimeout(views.renderMyCoursesPage, 100); // Refresh current view if on 'My Courses'
                    else if (hashBase === '#admin-courses') setTimeout(views.renderAdminCoursesPage, 100); // Refresh admin courses view
                    else if (hashBase === '#course-detail') setTimeout(() => { navigate(user.role === 'admin' ? '#admin-courses' : '#my-courses'); }, 1200); // Redirect from detail page
                    else navigate(user.role === 'admin' ? '#admin-courses' : '#my-courses'); // Default redirect
                 } else { showActionAlert(a, 'alertDeleteFailed', 'danger'); } } else { console.log("[Action] Deletion cancelled."); /* showActionAlert(a, 'alertActionCancelled', 'info'); */ }
            }
            // --- Other button handlers can go here ---

        });

        console.log('Global event listeners ready.');

    } catch (error) {
        console.error("FATAL: App initialization failed:", error);
        $('#initial-loading').remove();
        // Attempt to use t() for the error message if i18n initialized partially
        const errorMsg = typeof t === 'function' ? t('fatalErrorText', { message: error.message }) : `A critical problem occurred: ${error.message}`;
        $('#app-container').html(`<div class="container pt-5"><div class="alert alert-danger mt-4"><h4><i class="bi bi-exclamation-triangle-fill me-2"></i> Application Error</h4><p>${errorMsg}</p><hr><p class="mb-0 small">Check console (F12) & refresh.</p></div></div>`);
    }
});