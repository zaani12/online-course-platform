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

        // --- START: Corrected Form Submission Handler ---

        // Form Submission Handler
        $body.on('submit', 'form', function(event) {
            event.preventDefault(); // <-- PREVENT BROWSER'S DEFAULT SUBMIT/REFRESH

            const form = this;
            const $form = $(form);
            const formId = $form.attr('id');
            console.log(`Handling submit for form: #${formId}`);

            // --- Login Form ---
            if (formId === 'login-form') {
                const username = $form.find('#login-username').val().trim();
                const password = $form.find('#login-password').val(); // Don't trim password
                const alertSel = '#login-alert';
                hideFormAlert(formId, alertSel); // Hide previous alerts

                if (!username || !password) {
                     showFormAlert(formId, alertSel, 'loginErrorRequired', 'warning'); // Use key
                     return;
                }

                const result = auth.login(username, password);
                if (result.success) {
                    // Login successful, navigate to dashboard
                    // Router will handle rendering navbar and dashboard view
                    window.location.hash = '#dashboard';
                } else {
                    // Use the messageKey from auth.js for translation
                    showFormAlert(formId, alertSel, result.messageKey || 'loginErrorInvalid', 'danger');
                }
            }
            // --- Registration Form ---
            else if (formId === 'register-form') {
                const username = $form.find('#register-username').val().trim();
                const password = $form.find('#register-password').val();
                const confirmPassword = $form.find('#register-confirm-password').val();
                const role = $form.find('#register-role').val();
                const adminCode = $form.find('#register-admin-code').val(); // Might be empty
                const alertSel = '#register-alert';
                hideFormAlert(formId, alertSel); // Hide previous alerts

                 // --- Client-Side Validation ---
                 if (!username || !password || !confirmPassword || !role) {
                     showFormAlert(formId, alertSel, 'registerErrorRequired', 'warning'); return;
                 }
                if (password !== confirmPassword) {
                    showFormAlert(formId, alertSel, 'registerErrorPasswordMatch', 'warning'); return;
                }
                if (username.length < 3) {
                     showFormAlert(formId, alertSel, 'registerErrorUsernameLength', 'warning'); return;
                }
                 if (password.length < 6) {
                     showFormAlert(formId, alertSel, 'registerErrorPasswordLength', 'warning'); return;
                }
                if (role === 'admin' && !adminCode) {
                     showFormAlert(formId, alertSel, 'registerErrorAdminCodeRequired', 'warning'); return;
                }
                 // --- End Validation ---

                // Attempt registration via auth module
                const result = auth.register(username, password, role, adminCode);
                if (result.success) {
                    // Combine success message with login link translation
                    const messageHtml = t(result.messageKey || 'registerSuccessMessage') + " " + t('registerSuccessLoginLink');
                    showFormAlert(formId, alertSel, messageHtml, 'success');
                    form.reset(); // Clear the form fields
                    // Reset dynamic fields (like hide admin code input) after successful registration
                    const roleSelect = document.getElementById('register-role');
                    const adminCodeGroup = document.getElementById('admin-code-group');
                    if(roleSelect) roleSelect.value = ""; // Reset select to default placeholder
                    if(adminCodeGroup) adminCodeGroup.style.display = 'none'; // Hide admin field again

                } else {
                    // Use messageKey from auth.js for translation
                    showFormAlert(formId, alertSel, result.messageKey || 'Registration failed.', 'danger');
                }
            }
            // --- Create Course Form ---
            else if (formId === 'create-course-form') {
                const currentUser = auth.getCurrentUser();
                const alertSel = '#course-alert';
                hideFormAlert(formId, alertSel); // Hide previous alerts

                if (!currentUser || currentUser.role !== 'provider') {
                    // This check is primarily done by router, but good failsafe
                    showFormAlert(formId, alertSel, 'alertTempProviderRequired', 'danger');
                    return;
                }

                const title = $form.find('#course-title').val().trim();
                const description = $form.find('#course-description').val().trim();
                const priceStr = $form.find('#course-price').val().trim();

                 // --- Client-Side Validation ---
                if (!title || !description || priceStr === '') {
                     showFormAlert(formId, alertSel, 'createCourseErrorRequired', 'warning');
                     return;
                }
                const price = parseFloat(priceStr);
                if (isNaN(price) || price < 0) {
                    showFormAlert(formId, alertSel, 'createCourseErrorPrice', 'warning');
                    return;
                }
                 // --- End Validation ---

                store.addCourse({ title, description, price, providerId: currentUser.id });
                showFormAlert(formId, alertSel, 'createCourseSuccess', 'success');
                form.reset();
                setTimeout(() => { window.location.hash = '#my-courses'; }, 1500);
            }
            // --- Schedule Live Session Form ---
            else if (formId === 'schedule-session-form') {
                 const alertSel = '#session-alert'; // Alert inside the modal/form area
                 hideFormAlert(formId, alertSel);
                 const courseId = $form.data('course-id'); // Get course ID from form data attribute
                 const currentUser = auth.getCurrentUser();

                 if (!currentUser || currentUser.role !== 'provider') {
                      showFormAlert(formId, alertSel, 'alertTempProviderRequired', 'danger'); return;
                 }
                  if (!courseId) {
                     showFormAlert(formId, alertSel, 'Error: Course ID missing.', 'danger'); return; // Should not happen
                 }

                 const title = $form.find('#session-title').val().trim();
                 const dateTime = $form.find('#session-datetime').val(); // Should be ISO format from datetime-local
                 const meetingLink = $form.find('#session-link').val().trim();

                  // Validation
                 if (!title || !dateTime || !meetingLink) {
                     showFormAlert(formId, alertSel, 'scheduleSessionErrorRequired', 'warning'); return;
                 }
                 try { // Validate URL
                     new URL(meetingLink);
                 } catch (_) {
                     showFormAlert(formId, alertSel, 'scheduleSessionErrorInvalidLink', 'warning'); return;
                 }
                 try { // Validate Date
                    if(isNaN(new Date(dateTime).getTime())) throw new Error("Invalid Date");
                 } catch(_) {
                    showFormAlert(formId, alertSel, 'scheduleSessionErrorInvalidDate', 'warning'); return;
                 }
                 // --- End Validation ---

                 const success = store.addLiveSession(courseId, { title, dateTime, meetingLink });

                 if (success) {
                     showFormAlert(formId, alertSel, 'scheduleSessionSuccess', 'success');
                     form.reset();
                     // Optionally close modal and refresh course detail view after delay
                     setTimeout(() => {
                         const modalElement = document.getElementById('scheduleSessionModal');
                         if (modalElement) {
                             const modalInstance = bootstrap.Modal.getInstance(modalElement);
                             modalInstance?.hide();
                         }
                         // Refresh the course detail page to show the new session
                         if (window.location.hash.startsWith('#course-detail')) {
                             views.renderCourseDetailPage(); // Re-render the detail page
                         }
                     }, 1500);
                 } else {
                     showFormAlert(formId, alertSel, 'Failed to schedule session. Please try again.', 'danger');
                 }
            }
            // Add handlers for other forms here if needed (e.g., Edit Course, Profile Update)
        });

        // --- END: Corrected Form Submission Handler ---

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