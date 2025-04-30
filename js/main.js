// js/main.js - Main application entry point and global event handling
import { initializeRouter, router as navigate } from './router.js';
import * as auth from './auth.js';
import * as store from './store.js';
import * as views from './views/index.js'; // Import from the index file
// Import getCurrentLanguage from i18n, not auth
import { initializeI18n, setLanguage, t, SUPPORTED_LANGS, getCurrentLanguage } from './i18n.js';

$(async function() {
    console.log('DOM Ready, Initializing App...');
    const $body = $(document.body);
    let initializationComplete = false; // Flag to track completion

    try {
        // --- 0. Initialize i18n ---
        console.log('main.js: Initializing i18n...');
        const i18nReady = await initializeI18n();
        if (!i18nReady) { console.error("main.js: FATAL - Failed to load initial translations."); }
        else { console.log('main.js: i18n ready.'); }

        // --- 1. Initialize Store ---
        console.log('main.js: Initializing store...');
        const storeReady = await store.initializeStore();
        if (!storeReady) { console.warn("main.js: Store initialization partially failed."); }
        else { console.log('main.js: Store ready.'); }

        // --- 2. Initialize Auth State (AFTER store is ready) ---
        console.log('main.js: Initializing auth state...');
        auth.initializeAuthUserState(); // Load logged-in user state from store
        console.log('main.js: Auth state initialized.');

        // --- 3. Initialize Router (AFTER Auth state is set) ---
        console.log('main.js: Initializing router...');
        initializeRouter(); // Initialize hashchange listener ONLY
        if (typeof navigate !== 'function') { throw new Error("Router function not available."); }
        console.log('main.js: Router ready.');

        initializationComplete = true; // Mark init as complete
        console.log("--- Initialization Sequence Complete ---");

        // --- 4. Trigger Initial Route ---
        console.log('main.js: Triggering initial navigate()...');
        // Call immediately - delays are usually not needed if initialization is correctly awaited/ordered
        navigate(); // Call the router function to render the initial view
        console.log('main.js: Initial navigate() called.');

        // --- 5. Attach Global Event Listeners ---
        console.log('main.js: Attaching global event listeners...');

        // --- Helper Functions for UI Feedback (Alerts) ---
        function showFormAlert(formId, messageOrKey, type = 'danger', variables = {}) {
            const alertSelector = `#${formId}-alert`; // Standardized ID
            const message = t(messageOrKey, variables, messageOrKey); // Use key as default text
            const $form = $(`#${formId}`);
            let $alert = $form.find(alertSelector);

            // If alert element doesn't exist within the form, try creating it
            if (!$alert.length) {
                console.warn(`Form Alert element "${alertSelector}" not found within "#${formId}". Creating dynamically.`);
                $form.prepend(`<div id="${formId}-alert" class="alert d-none mb-3" role="alert"></div>`);
                $alert = $form.find(alertSelector);
                 if (!$alert.length) { // Still not found? Log error and exit.
                     console.error(`Failed to create or find alert element: ${alertSelector}`);
                     return;
                 }
            }
            // Use Bootstrap's Alert component methods if available
             const alertInstance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
             // If already shown, close it first, then show new one after it's closed
             if ($alert.hasClass('show')) {
                 alertInstance?.close();
                 // Use .one() to ensure the callback runs only once after closing
                 $alert.one('closed.bs.alert', function () {
                     showAlertContent($alert, type, message);
                 });
                 return; // Don't proceed further until it's closed
             }
             // If not shown, just show the content
             showAlertContent($alert, type, message);
        }

        function showAlertContent($alert, type, message) {
             $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info')
                   .addClass(`alert-${type}`)
                   .html(message); // Use html() to allow links/markup in translations
             // Force reflow before adding 'show' for CSS transition
             void $alert[0].offsetWidth;
             $alert.addClass('show fade');
             // Auto-hide non-error/warning alerts
             if (type !== 'danger' && type !== 'warning') {
                 setTimeout(() => {
                     const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                     // Check if it's still visible before closing
                     if ($alert.hasClass('show')) {
                         instance?.close();
                     }
                 }, 4000);
             }
        }

        function hideFormAlert(formId) {
             const alertSelector = `#${formId}-alert`; // Standardized ID
             const $form = $(`#${formId}`);
             const $alert = $form.find(alertSelector);
             if ($alert.length && $alert.hasClass('show')) {
                 const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                 instance?.close();
             } else if ($alert.length) {
                 // If not shown with 'show' class, just ensure it's hidden
                 $alert.addClass('d-none').removeClass('fade');
             }
        }

        // Show alerts outside of forms (e.g., global area, action confirmations)
        function showActionAlert(alertSelector, messageOrKey, type = 'danger', variables = {}) {
             const message = t(messageOrKey, variables, messageOrKey);
             const $alert = $(alertSelector);
             if (!$alert.length) {
                 console.warn(`Action Alert selector "${alertSelector}" not found.`);
                 // Optionally create dynamically or target a default global area
                 // Example: $('#global-alert-area').append(...);
                 return;
             }
             const alertInstance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
             if ($alert.hasClass('show')) {
                  alertInstance?.close();
                  $alert.one('closed.bs.alert', function () { showActionAlertContent($alert, type, message); });
                  return;
             }
             showActionAlertContent($alert, type, message);
        }

         function showActionAlertContent($alert, type, message) {
             $alert.removeClass('d-none alert-danger alert-success alert-warning alert-info')
                   .addClass(`alert-${type}`)
                   .html(message);
             void $alert[0].offsetWidth; // Reflow
             $alert.addClass('show fade');
             if (type !== 'danger' && type !== 'warning') {
                 setTimeout(() => {
                      const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                      if ($alert.hasClass('show')) instance?.close();
                 }, 4000);
             }
        }

        function hideActionAlert(alertSelector) {
            const $alert = $(alertSelector);
            if ($alert.length && $alert.hasClass('show')) {
                 const instance = bootstrap?.Alert?.getOrCreateInstance($alert[0]);
                 instance?.close();
            } else if ($alert.length) {
                 $alert.addClass('d-none').removeClass('fade');
            }
        }

        // --- Form Submission Handler (Delegated) ---
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
            $form.data('isSubmitting', true); // Set submitting flag

            console.log(`Handling submit for form: #${formId}`);
            hideFormAlert(formId); // Hide previous alert for this form

            // --- Login Form ---
            if (formId === 'login-form') {
                const username = $form.find('#login-username').val().trim();
                const password = $form.find('#login-password').val();
                if (!username || !password) {
                    showFormAlert(formId, 'loginErrorRequired', 'warning');
                    $form.data('isSubmitting', false); // Reset flag
                    return;
                }
                const result = auth.login(username, password);
                if (result.success) {
                    navigate('#dashboard'); // Redirect on success
                    // Flag will be reset on page navigation/re-render
                } else {
                    showFormAlert(formId, result.messageKey || 'loginErrorInvalid', 'danger');
                    $form.data('isSubmitting', false); // Reset flag on failure
                }
            }
            // --- Registration Form ---
            else if (formId === 'register-form') {
                const username = $form.find('#register-username').val().trim();
                const password = $form.find('#register-password').val();
                const confirmPassword = $form.find('#register-confirm-password').val();
                const role = $form.find('#register-role').val();
                const adminCode = $form.find('#register-admin-code').val();

                 // Perform all validations first
                 if (!username || !password || !confirmPassword || !role) { showFormAlert(formId, 'registerErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                 if (password !== confirmPassword) { showFormAlert(formId, 'registerErrorPasswordMatch', 'warning'); $form.data('isSubmitting', false); return; }
                 if (username.length < 3) { showFormAlert(formId, 'registerErrorUsernameLength', 'warning'); $form.data('isSubmitting', false); return; }
                 if (password.length < 6) { showFormAlert(formId, 'registerErrorPasswordLength', 'warning'); $form.data('isSubmitting', false); return; }
                 if (role === 'admin' && !adminCode) { showFormAlert(formId, 'registerErrorAdminCodeRequired', 'warning'); $form.data('isSubmitting', false); return; }

                const result = auth.register(username, password, role, adminCode);
                if (result.success) {
                    const successMsg = t(result.messageKey || 'registerSuccessMessage');
                    const loginLink = t('registerSuccessLoginLink');
                    showFormAlert(formId, `${successMsg} ${loginLink}`, 'success'); // Use combined message directly
                    form.reset(); // Reset form fields
                    views.setupDynamicFormFields(); // Ensure admin code field visibility is reset
                    $form.data('isSubmitting', false); // Reset flag
                } else {
                    showFormAlert(formId, result.messageKey || 'registerErrorGeneric', 'danger');
                    $form.data('isSubmitting', false); // Reset flag
                }
            }
            // --- Create Course Form ---
            else if (formId === 'create-course-form') {
                const currentUser = auth.getCurrentUser();
                if (!currentUser || currentUser.role !== 'provider') {
                    showFormAlert(formId, 'alertTempProviderRequired', 'danger');
                    $form.data('isSubmitting', false); return;
                }
                const title = $form.find('#course-title').val().trim();
                const description = $form.find('#course-description').val().trim();
                const priceStr = $form.find('#course-price').val().trim();

                if (!title || !description || priceStr === '') { showFormAlert(formId, 'createCourseErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                const price = parseFloat(priceStr);
                if (isNaN(price) || price < 0) { showFormAlert(formId, 'createCourseErrorPrice', 'warning'); $form.data('isSubmitting', false); return; }

                const newCourse = store.addCourse({ title, description, price, providerId: currentUser.id }); // Status defaults to 'pending'

                if(newCourse) { // Check if course object was returned
                    showFormAlert(formId, 'createCourseSuccess', 'success');
                    form.reset();
                    setTimeout(() => {
                        navigate('#my-courses'); // Redirect after success
                        // Flag implicitly reset by navigation
                    }, 2000);
                } else {
                    showFormAlert(formId, 'createCourseErrorGeneric', 'danger');
                    $form.data('isSubmitting', false); // Reset flag
                }
            }
             // --- Schedule Live Session Form ---
             else if (formId === 'schedule-session-form') {
                 const courseId = $form.data('course-id'); // Retrieve course ID stored on the form
                 const currentUser = auth.getCurrentUser();

                 if (!currentUser || currentUser.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); $form.data('isSubmitting', false); return; }
                 if (!courseId) { showFormAlert(formId, 'scheduleSessionErrorMissingId', 'danger'); $form.data('isSubmitting', false); return; } // Should not happen if modal trigger works

                 const title = $form.find('#session-title').val().trim();
                 const dateTime = $form.find('#session-datetime').val();
                 const meetingLink = $form.find('#session-link').val().trim();

                 if (!title || !dateTime || !meetingLink) { showFormAlert(formId, 'scheduleSessionErrorRequired', 'warning'); $form.data('isSubmitting', false); return; }
                 try { new URL(meetingLink); } catch (_) { showFormAlert(formId, 'scheduleSessionErrorInvalidLink', 'warning'); $form.data('isSubmitting', false); return; }
                 try { if(isNaN(new Date(dateTime).getTime())) throw new Error("Invalid Date"); } catch(_) { showFormAlert(formId, 'scheduleSessionErrorInvalidDate', 'warning'); $form.data('isSubmitting', false); return; }

                 const success = store.addLiveSession(courseId, { title, dateTime, meetingLink });

                 if (success) {
                     showFormAlert(formId, 'scheduleSessionSuccess', 'success');
                     form.reset();
                     setTimeout(() => {
                         // Close the modal programmatically
                         const modalElement = document.getElementById('scheduleSessionModal');
                         const modalInstance = bootstrap.Modal.getInstance(modalElement);
                         modalInstance?.hide();
                         // Re-render the course detail page if still on it
                         if (window.location.hash.startsWith('#course-detail')) {
                            console.log("[Schedule Session Success] Refreshing course detail page...");
                            views.renderCourseDetailPage(); // Call the render function directly
                         }
                         $form.data('isSubmitting', false); // Reset flag after action
                     }, 1500);
                 } else {
                     showFormAlert(formId, 'scheduleSessionErrorFailed', 'danger');
                     $form.data('isSubmitting', false); // Reset flag
                 }
            }
             // --- Add Material Form ---
             else if (formId === 'add-material-form') {
                const courseId = $form.data('course-id');
                const currentUser = auth.getCurrentUser();

                if (!currentUser || currentUser.role !== 'provider') { showFormAlert(formId, 'alertTempProviderRequired', 'danger'); $form.data('isSubmitting', false); return; }
                if (!courseId) { showFormAlert(formId, 'addMaterialErrorMissingId', 'danger'); $form.data('isSubmitting', false); return; }

                const title = $form.find('#material-title').val().trim();
                const type = $form.find('#material-type').val();
                const url = $form.find('#material-url').val().trim();
                const description = $form.find('#material-description').val().trim();

                // Validations
                if (!title || !type) { showFormAlert(formId, 'addMaterialErrorRequiredCore', 'warning'); $form.data('isSubmitting', false); return; }
                if (type !== 'text' && !url) { showFormAlert(formId, 'addMaterialErrorRequiredUrl', 'warning'); $form.data('isSubmitting', false); return; }
                if (type !== 'text') { try { new URL(url); } catch (_) { showFormAlert(formId, 'addMaterialErrorInvalidUrl', 'warning'); $form.data('isSubmitting', false); return; } }
                if (type === 'text' && !description) { showFormAlert(formId, 'addMaterialErrorRequiredDescText', 'warning'); $form.data('isSubmitting', false); return; }

                const materialData = { title, type, url: (type === 'text' ? '#' : url), description };
                const success = store.addCourseMaterial(courseId, materialData);

                if (success) {
                    showFormAlert(formId, 'addMaterialSuccess', 'success');
                    form.reset();
                    $('#material-type-note').hide(); // Hide text note
                    setTimeout(() => {
                        const modalElement = document.getElementById('addMaterialModal');
                        bootstrap.Modal.getInstance(modalElement)?.hide();
                        if (window.location.hash.startsWith('#course-detail')) {
                             views.renderCourseDetailPage(); // Refresh detail page
                        }
                        $form.data('isSubmitting', false);
                    }, 1500);
                } else {
                    showFormAlert(formId, 'addMaterialErrorFailed', 'danger');
                    $form.data('isSubmitting', false);
                }
            }
            // --- Send Message Form (Handled within renderConversationPage) ---
             else if (formId === 'send-message-form') {
                 // Logic is now within renderConversationPage to easily access scoped variables
                 // It's crucial that the handler in renderConversationPage also resets the flag
                 // We add a fallback reset here just in case.
                 console.log("[Form Submit] Send message form detected, handled by view function.");
                 // $form.data('isSubmitting', false); // Resetting here might be too early if the view handler is async
             }
            // --- Fallback for unrecognized forms ---
            else {
                console.warn(`Submit handler triggered for unrecognized form ID: #${formId}`);
                $form.data('isSubmitting', false); // Reset flag for unknown forms
            }
        });


        // --- Button Click Handler (Delegated) ---
        $body.on('click', 'button', async function(event) { // Make handler async for language changes
            const $btn = $(this);
            const buttonId = $btn.attr('id');
            const btnClasses = $btn.attr('class') || '';

            // --- Language Switcher ---
            if ($btn.closest('#language-switcher').length > 0 && $btn.data('lang')) {
                 const lang = $btn.data('lang');
                 // *** CORRECTED: Call getCurrentLanguage() directly ***
                 if (lang && SUPPORTED_LANGS.includes(lang) && lang !== getCurrentLanguage()) {
                     $btn.prop('disabled', true).addClass('disabled');
                     console.log(`[i18n] Language change requested: ${lang}`);
                     $('#language-switcher button').prop('disabled', true).addClass('disabled');

                     try {
                         const success = await setLanguage(lang);
                         if (success) {
                             console.log(`[i18n] Language ${lang} loaded. Re-navigating.`);
                             navigate(); // Re-run the router
                         } else {
                             console.error("Failed to load language resources for:", lang);
                             showActionAlert('#global-alert-area', 'Error loading language resources.', 'danger');
                         }
                     } catch (error) {
                         console.error("Error during language change:", error);
                         showActionAlert('#global-alert-area', 'Error changing language.', 'danger');
                     } finally {
                          setTimeout(() => {
                               $('#language-switcher button').prop('disabled', false).removeClass('disabled');
                           }, 100);
                     }
                 } else {
                     console.log(`[i18n] Clicked on current language (${lang}) or invalid lang.`);
                 }
             }
             // --- Logout Button ---
             else if (buttonId === 'logout-button') {
                 console.log('[Click Handler] Logout button clicked.');
                 try {
                     auth.logout();
                     navigate('#login');
                 } catch (error) {
                     console.error("Error during logout process:", error);
                     showActionAlert('#global-alert-area', 'Logout failed. Please try again.', 'danger');
                 }
             }
             // --- Enroll Button ---
            else if (btnClasses.includes('enroll-button')) {
                // const $btn = $(this); // Already defined
                const cid = $btn.data('course-id');
                const user = auth.getCurrentUser();
                const course = store.findCourseById(cid);

                let primaryAlertSel = '#enroll-alert';
                if (window.location.hash.startsWith('#course-detail')) {
                    primaryAlertSel = '#course-action-alert';
                }
                 hideActionAlert(primaryAlertSel);

                // Basic checks
                if (!user) { showActionAlert(primaryAlertSel, 'alertEnrollLogin', 'warning'); return; }
                if (user.role !== 'client') { showActionAlert(primaryAlertSel, 'alertEnrollRole', 'warning', { role: user.role }); return; }
                if (!cid || !course) { showActionAlert(primaryAlertSel, 'alertEnrollMissingId', 'danger'); return; }
                 if (course.status !== 'approved') { showActionAlert(primaryAlertSel, 'alertEnrollNotApproved', 'warning'); return; }

                const price = parseFloat(course.price) || 0;

                // --- PAYMENT SIMULATION LOGIC ---
                if (price > 0) {
                    console.log(`[Enroll Click] Paid course ${cid}. Showing payment simulation modal.`);
                    $('#paymentModalCourseTitle').text(course.title || t('untitledCourse'));
                    $('#paymentModalCoursePrice').text(`${price.toFixed(0)} ${t('currencySymbol', {}, 'MAD')}`);
                    $('#paymentModalCourseId').val(cid);
                    $('#confirmSimulatedPaymentButton').data('originalButton', $btn); // Store original button ref

                    const paymentModalElement = document.getElementById('simulatePaymentModal');
                    if (paymentModalElement) {
                         const paymentModal = bootstrap.Modal.getOrCreateInstance(paymentModalElement);
                         paymentModal.show();
                    } else { console.error("Payment simulation modal element not found!"); showActionAlert(primaryAlertSel, 'errorGeneric', 'danger'); }

                } else { // Free course
                    console.log(`[Enroll Click] Free course ${cid}. Enrolling directly.`);
                    const success = store.enrollStudentInCourse(cid, user.id);
                    const badgeHtml = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
                    const actionAreaSelector = '.enroll-section, .enroll-action-area';
                    const $actionArea = $btn.closest(actionAreaSelector);

                    if (success) {
                        showActionAlert(primaryAlertSel, 'alertEnrollSuccess', 'success');
                        if ($actionArea.length) $actionArea.html(badgeHtml); else $btn.replaceWith(badgeHtml);
                    } else {
                         if (store.findCourseById(cid)?.enrolledStudentIds?.includes(user.id)) {
                             showActionAlert(primaryAlertSel, 'alertEnrollAlready', 'info');
                             if ($actionArea.length) $actionArea.html(badgeHtml); else $btn.replaceWith(badgeHtml);
                         } else {
                             showActionAlert(primaryAlertSel, 'alertEnrollFailed', 'danger');
                         }
                    }
                }
            } // --- End Enroll Button Logic ---

            // --- Simulated Payment Confirmation Button ---
            else if (buttonId === 'confirmSimulatedPaymentButton') {
                 console.log("[Payment Simulation] Confirm button clicked.");
                 const $confirmBtn = $(this);
                 const courseId = $('#paymentModalCourseId').val();
                 const user = auth.getCurrentUser();
                 const $originalEnrollButton = $confirmBtn.data('originalButton');

                 let primaryAlertSel = '#enroll-alert';
                 if (window.location.hash.startsWith('#course-detail')) { primaryAlertSel = '#course-action-alert'; }

                 if (!courseId || !user) {
                     console.error("[Payment Simulation] Missing course ID or user.");
                     showActionAlert(primaryAlertSel, 'alertEnrollFailed', 'danger');
                     bootstrap.Modal.getInstance(document.getElementById('simulatePaymentModal'))?.hide();
                     return;
                 }

                 console.log(`[Payment Simulation] Enrolling user ${user.id} in course ${courseId}...`);
                 const success = store.enrollStudentInCourse(courseId, user.id);

                 if (success) {
                     console.log("[Payment Simulation] Enrollment successful.");
                     showActionAlert(primaryAlertSel, 'alertEnrollSuccess', 'success');
                     const badgeHtml = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
                     const actionAreaSelector = '.enroll-section, .enroll-action-area';
                     if ($originalEnrollButton && $.contains(document.body, $originalEnrollButton[0])) {
                         const $actionArea = $originalEnrollButton.closest(actionAreaSelector);
                         if ($actionArea.length) { $actionArea.html(badgeHtml); console.log("[Payment Simulation] UI Updated (action area)."); }
                         else { $originalEnrollButton.replaceWith(badgeHtml); console.log("[Payment Simulation] UI Updated (button replaced)."); }
                     } else { console.warn("[Payment Simulation] Original enroll button or context lost."); /* Optional: Refresh view */ }
                 } else {
                      console.error("[Payment Simulation] Enrollment failed in store.");
                       if (store.findCourseById(courseId)?.enrolledStudentIds?.includes(user.id)){
                            showActionAlert(primaryAlertSel, 'alertEnrollAlready', 'info');
                            const badgeHtml = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
                            const actionAreaSelector = '.enroll-section, .enroll-action-area';
                            if ($originalEnrollButton && $.contains(document.body, $originalEnrollButton[0])) {
                                const $actionArea = $originalEnrollButton.closest(actionAreaSelector);
                                if ($actionArea.length) $actionArea.html(badgeHtml); else $originalEnrollButton.replaceWith(badgeHtml);
                            }
                       } else { showActionAlert(primaryAlertSel, 'alertEnrollFailed', 'danger'); }
                 }

                 const modalElement = document.getElementById('simulatePaymentModal');
                 if (modalElement) { bootstrap.Modal.getInstance(modalElement)?.hide(); }
                 $confirmBtn.removeData('originalButton'); // Clean up stored data
            } // --- End Simulated Payment Confirmation ---

            // --- Delete Course Button ---
            else if (btnClasses.includes('delete-course-button')) {
                const cid = $btn.data('course-id');
                const user = auth.getCurrentUser();
                const alertSelector = '#course-action-alert';
                hideActionAlert(alertSelector);

                if (!user) { return; }
                if (!cid) { showActionAlert(alertSelector, 'alertDeleteMissingId', 'danger'); return; }
                const c = store.findCourseById(cid);
                if (!c) { showActionAlert(alertSelector, 'alertDeleteFailed', 'warning'); return; }
                let canDelete = (user.role === 'provider' && c.providerId === user.id) || (user.role === 'admin');
                if (!canDelete) { showActionAlert(alertSelector, 'alertDeleteNoPermission', 'danger'); return; }

                const title = c.title || t('untitledCourse');
                const confirmTitle = t('alertDeleteConfirmTitle');
                const confirmText = t('alertDeleteConfirmText', { title: title });

                if (window.confirm(`${confirmTitle}\n\n${confirmText}`)) {
                    console.log(`[Action] User ${user.username} confirmed deletion of course: ${cid}`);
                    const success = store.deleteCourse(cid);
                    if (success) {
                        showActionAlert(alertSelector, 'alertDeleteSuccess', 'success', { title: title });
                        setTimeout(() => {
                             const currentHashBase = window.location.hash.split('/')[0];
                             const isAdmin = user.role === 'admin';
                             if (currentHashBase === '#my-courses') views.renderMyCoursesPage();
                             else if (currentHashBase === '#admin-courses') views.renderAdminCoursesPage();
                             else navigate(isAdmin ? '#admin-courses' : '#my-courses');
                         }, 1200);
                     } else { showActionAlert(alertSelector, 'alertDeleteFailed', 'danger'); }
                } else { console.log("[Action] Course deletion cancelled by user."); }
            }
            // --- Course Approval/Rejection Buttons (Admin) ---
            else if (btnClasses.includes('approve-course-button')) {
                 const courseId = $btn.data('course-id');
                 const userRole = auth.getCurrentUserRole();
                 if (userRole !== 'admin' || !courseId) return;
                 $btn.prop('disabled', true).siblings('button').prop('disabled', true);
                 const success = store.updateCourseStatus(courseId, 'approved');
                 const alertArea = '#course-action-alert-pending';
                 if (success) { showActionAlert(alertArea, 'alertCourseApproved', 'success'); views.renderAdminDashboard(); }
                 else { showActionAlert(alertArea, 'alertCourseStatusUpdateFailed', 'danger'); $btn.prop('disabled', false).siblings('button').prop('disabled', false); }
            }
            else if (btnClasses.includes('reject-course-button')) {
                 const courseId = $btn.data('course-id');
                 const userRole = auth.getCurrentUserRole();
                 if (userRole !== 'admin' || !courseId) return;
                 $btn.prop('disabled', true).siblings('button').prop('disabled', true);
                 const success = store.updateCourseStatus(courseId, 'rejected');
                 const alertArea = '#course-action-alert-pending';
                  if (success) { showActionAlert(alertArea, 'alertCourseRejected', 'success'); views.renderAdminDashboard(); }
                  else { showActionAlert(alertArea, 'alertCourseStatusUpdateFailed', 'danger'); $btn.prop('disabled', false).siblings('button').prop('disabled', false); }
            }
            // --- Other button handlers can go here ---

        }); // End of button click handler


        // --- Modal Trigger Setup ---
        // Add Material Modal
        $body.on('click', '[data-bs-target="#addMaterialModal"]', function() { const button = this; const courseId = button.getAttribute('data-course-id'); const courseTitle = button.getAttribute('data-course-title') || ''; const modalTitleEl = document.getElementById('addMaterialModalLabel'); const form = document.getElementById('add-material-form'); const typeSelect = document.getElementById('material-type'); const urlInput = document.getElementById('material-url'); const urlLabel = $('label[for="material-url"]'); const typeNote = $('#material-type-note'); if (modalTitleEl) { modalTitleEl.textContent = t('addMaterialModalTitle'); } if (form) { $(form).data('course-id', courseId); form.reset(); hideFormAlert('add-material-form'); } typeNote.hide(); urlInput.required = true; urlLabel.text(t('addMaterialUrlLabel')); $(typeSelect).off('change.materialType').on('change.materialType', function() { if (this.value === 'text') { typeNote.show(); urlInput.required = false; urlLabel.text(t('addMaterialUrlLabelOptional')); } else { typeNote.hide(); urlInput.required = true; urlLabel.text(t('addMaterialUrlLabel')); } }); });
        // Schedule Session Modal
        const scheduleModalElement = document.getElementById('scheduleSessionModal'); if (scheduleModalElement) { scheduleModalElement.addEventListener('show.bs.modal', function (event) { const button = event.relatedTarget; if (!button) return; const courseId = button.getAttribute('data-course-id'); const courseTitle = button.getAttribute('data-course-title') || t('untitledCourse'); const modalTitle = scheduleModalElement.querySelector('.modal-title'); const form = scheduleModalElement.querySelector('#schedule-session-form'); if (modalTitle) { modalTitle.textContent = t('scheduleSessionModalTitle', { courseTitle: courseTitle }); } if (form) { $(form).data('course-id', courseId); form.reset(); hideFormAlert('schedule-session-form'); } else { console.error("Could not find #schedule-session-form inside the modal."); } }); } else { console.warn("Schedule Session Modal element not found."); }


        // --- Generic Modal Close Listener (for cleanup) ---
        $('.modal').on('hidden.bs.modal', function () {
            const form = $(this).find('form')[0];
            if(form) {
                form.reset();
                hideFormAlert(form.id);
                if (form.id === 'register-form') { $('#admin-code-group').hide(); $('#register-admin-code').prop('required', false); }
                if (form.id === 'add-material-form') { $('#material-type-note').hide(); $('#material-url').prop('required', true); $('label[for="material-url"]').text(t('addMaterialUrlLabel')); $(form).removeData('course-id'); }
                 if (form.id === 'schedule-session-form') { $(form).removeData('course-id'); }
                $(form).removeData('isSubmitting');
            }
             // Cleanup for payment modal specifically
             if (this.id === 'simulatePaymentModal') {
                 $('#confirmSimulatedPaymentButton').removeData('originalButton'); // Remove stored button ref
                 $('#paymentModalCourseId').val(''); // Clear hidden input
             }
        });

        console.log('main.js: Global event listeners ready.');

    } catch (error) {
        console.error("main.js: FATAL - App initialization failed:", error);
        $('#initial-loading').remove();
        const errorMsg = initializationComplete
                         ? `A critical problem occurred after initialization: ${error.message}`
                         : `A critical problem occurred during initialization: ${error.message}`;
        const displayMsg = typeof t === 'function' ? t('fatalErrorText', { message: error.message }, errorMsg) : errorMsg;
        $('#app-container').html(`<div class="container pt-5"><div class="alert alert-danger mt-4"><h4><i class="bi bi-exclamation-triangle-fill me-2"></i> Application Error</h4><p>${displayMsg}</p></div></div>`);
    }
}); // End of DOM Ready