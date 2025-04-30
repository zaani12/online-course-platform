// js/router.js - Handles SPA routing, access control, and view rendering calls

import * as views from './views/index.js'; // Ensure this points to the main views export
import * as auth from './auth.js';
import { t } from './i18n.js';

// --- Route Definitions ---
const routes = {
    '#home': views.renderHomePage,
    '#login': views.renderLoginPage,
    '#register': views.renderRegisterPage,
    '#browse-courses': views.renderBrowseCoursesPage,
    '#dashboard': views.renderDashboardPage, // Role-based dispatcher
    '#my-courses': views.renderMyCoursesPage,
    '#create-course': views.renderCreateCoursePage,
    // Admin Routes
    '#admin-dashboard': views.renderAdminDashboard, // Explicit route
    '#admin-users': views.renderAdminUsersPage,
    '#admin-courses': views.renderAdminCoursesPage,
    // Detail/Dynamic Routes
    '#course-detail': views.renderCourseDetailPage,
    // Messaging Routes
    '#messages': views.renderMessagesPage,
    '#conversation': views.renderConversationPage,
    '#support-chat': views.renderConversationPage, // Support uses the same view
};

// --- Access Control Definitions ---
const protectedRoutes = [ '#dashboard', '#my-courses', '#create-course', '#admin-dashboard', '#admin-users', '#admin-courses', '#messages', '#conversation', '#support-chat' ];
const providerOnlyRoutes = [ '#create-course' ];
const adminOnlyRoutes = [ '#admin-dashboard', '#admin-users', '#admin-courses' ];

// --- Helper Functions ---
function hideAllAlerts() {
    // Simple implementation: Hide common alert areas
    // More robust would involve specific selectors passed or a global registry
    $('#global-alert-area .alert').alert('close'); // Close global alerts if any
    $('#login-form-alert, #register-form-alert, #create-course-form-alert, #schedule-session-form-alert, #add-material-form-alert').addClass('d-none').removeClass('show fade');
    $('#enroll-alert, #course-action-alert, #course-action-alert-pending').addClass('d-none').removeClass('show fade');
    // Add other specific alert IDs if needed
}


// --- Main Router Function ---
export function router() {
    console.log("--- Router execution START ---");
    try {
        views.renderNavbar(); // 1. Update Navbar
        console.log("[Router] Navbar rendered.");
    } catch (e) {
        console.error("Router Error during renderNavbar:", e);
        // If navbar fails, maybe stop or show a critical error
        $('#app-container').html('<p class="text-danger p-5">Critical UI Error: Navbar failed to render. Check console.</p>');
        return;
    }

    const hash = window.location.hash || '#home';
    const path = hash.split('/')[0];
    const param = hash.split('/')[1] || null;
    console.log(`[Router] Requested - Hash: ${hash}, Path: ${path}, Param: ${param}`); // Log requested path

    let isLoggedIn = false;
    let userRole = null;
    try {
        isLoggedIn = auth.isLoggedIn();
        userRole = auth.getCurrentUserRole();
        console.log(`[Router] Auth State - LoggedIn: ${isLoggedIn}, Role: ${userRole || 'Guest'}`); // Log auth state
    } catch(authError) {
        console.error("[Router] Error getting auth state:", authError);
        views.renderTemporaryMessage('fatalErrorText', 'danger', { message: 'Auth check failed' });
        return; // Stop if auth check fails
    }

    // --- Access Control Logic ---
    if (protectedRoutes.includes(path) && !isLoggedIn) {
        console.log("[Router] Redirecting to login: Protected route, not logged in.");
        window.location.hash = '#login';
        return;
    }
    if (adminOnlyRoutes.includes(path) && userRole !== 'admin') {
        console.log("[Router] Redirecting to dashboard: Admin route, user is not admin.");
        window.location.hash = '#dashboard'; // Or #home or a dedicated "access denied" page
        return;
    }
    if (providerOnlyRoutes.includes(path) && userRole !== 'provider') {
        console.log("[Router] Redirecting to dashboard: Provider route, user is not provider.");
        window.location.hash = '#dashboard';
        return;
    }
     // Redirect admin away from client/provider "My Courses"
     if (path === '#my-courses' && userRole === 'admin') {
        console.log("[Router] Redirecting admin from #my-courses to admin dashboard.");
        window.location.hash = '#admin-dashboard';
        return;
    }
    console.log(`[Router] Access control passed for path: ${path}`); // Log access pass


    // --- Access Granted or Public Route ---
    try {
        hideAllAlerts();
        console.log("[Router] Alerts hidden.");
        const isAdminRoute = adminOnlyRoutes.includes(path);
        views.toggleAdminSidebar(isAdminRoute); // Show/hide sidebar based on route definition
        console.log(`[Router] Toggled Admin Sidebar visibility: ${isAdminRoute}`); // Log sidebar toggle
    } catch (uiError) {
        console.error("[Router] Error hiding alerts or toggling UI:", uiError);
        // Don't necessarily stop, but log the error
    }

    // --- Find and Execute the Rendering Logic ---
    const viewFunction = routes[path];
    console.log(`[Router] Route lookup for "${path}". View function found: ${viewFunction ? viewFunction.name : 'Not Found'}`); // Log function lookup

    if (viewFunction) {
        try {
            // Parameter checks before calling view
            if (path === '#course-detail' && !param) { console.warn('[Router] Course Detail missing ID. Redirecting.'); window.location.hash = '#browse-courses'; return; }
            if (path === '#conversation' && !param && path !== '#support-chat') { console.warn('[Router] Conversation missing target ID. Redirecting.'); window.location.hash = '#messages'; return; } // Allow #support-chat without param

            console.log(`[Router] >>> Calling view function: ${viewFunction.name}`); // Log before call
            viewFunction(); // Execute the matched function
            console.log(`[Router] <<< View function ${viewFunction.name} execution finished (or is async).`);

        } catch (viewError) {
            console.error(`[Router] CRITICAL ERROR during execution of view function "${viewFunction.name}" for path "${path}":`, viewError);
            // Attempt to render a generic error message using the view utility
             try { views.renderTemporaryMessage('errorRenderingView', 'danger'); }
             catch (fallbackError) { console.error("[Router] Fallback error rendering failed:", fallbackError); $('#app-container').html('<p class="text-danger p-5">A critical error occurred rendering the view. Please check the console.</p>'); }
        }
    } else {
        // No specific function found for the path
        console.log(`[Router] No route match found for path: "${path}". Rendering 404 page.`);
        views.renderNotFoundPage();
    }

    // Scroll to top (best effort, might run before async render finishes)
    window.scrollTo(0, 0);
    console.log("--- Router execution END ---");
}

// --- Router Initialization ---
export function initializeRouter() {
    // Ensure previous listeners are removed before adding a new one
    $(window).off('hashchange.router').on('hashchange.router', router);
    console.log('[Router] Hash change listener initialized.');
    return router; // Return the router function itself
}
export { router as navigate }; // Export the router function for direct navigation calls