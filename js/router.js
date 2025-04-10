
// js/router.js - Handles SPA routing and access control
import * as views from './views.js';
import * as auth from './auth.js';
import { t } from './i18n.js'; // Import translation function

// Define application routes and map them to view rendering functions
const routes = {
    '#home': views.renderHomePage,
    '#login': views.renderLoginPage,
    '#register': views.renderRegisterPage,
    '#browse-courses': views.renderBrowseCoursesPage,
    '#dashboard': views.renderDashboardPage, // Role-based dashboard dispatcher
    '#my-courses': views.renderMyCoursesPage, // Shows enrolled/created courses
    '#create-course': views.renderCreateCoursePage, // Provider only
    // Admin Routes (handled by specific view functions)
    '#admin-dashboard': views.renderAdminDashboard,
    '#admin-users': views.renderAdminUsersPage,
    '#admin-courses': views.renderAdminCoursesPage,
    // '#course-detail' : Handled separately below due to parameter
    // '#schedule-session': Handled by modal within course-detail view
};

// Define routes that require the user to be logged in
const protectedRoutes = [
    '#dashboard', '#my-courses', '#create-course',
    '#admin-dashboard', '#admin-users', '#admin-courses',
    // '#schedule-session' // Action itself is protected by provider role check
    // '#course-detail' // Detail page access is public. Actions within may require login.
];

// Define routes restricted to specific roles
const providerOnlyRoutes = ['#create-course']; // Scheduling is handled via button on detail page
const adminOnlyRoutes = ['#admin-dashboard', '#admin-users', '#admin-courses'];

// Helper to hide alerts across views during navigation
function hideAllAlerts() {
    $('#main-view-area .alert, #content-wrapper > .container .alert, #enroll-alert, #course-action-alert, #session-alert').each(function() {
        const $alert = $(this);
        const instance = bootstrap?.Alert?.getOrCreateInstance(this);
        if ($alert.hasClass('show') && instance) {
             instance.close();
        } else {
            $alert.addClass('d-none').removeClass('show fade');
        }
    });
}

// The main router function, called on initial load and hash change
// Exported to be callable externally (e.g., after language change)
export function router() {
    // 1. Update Navbar state reflecting current user, active link, and language
    views.renderNavbar();

    // 2. Parse the URL hash
    const hash = window.location.hash || '#home';
    const path = hash.split('/')[0];
    const param = hash.split('/')[1] || null;

    console.log(`[Router] Navigating - Hash: ${hash}, Path: ${path}, Param: ${param}`);

    // 3. Check Authentication & Authorization Status
    const isLoggedIn = auth.isLoggedIn();
    const userRole = auth.getCurrentUserRole();
    console.log(`[Router] Auth State - LoggedIn: ${isLoggedIn}, Role: ${userRole || 'Guest'}`);

    // --- Access Control Logic ---
    if (protectedRoutes.includes(path) && !isLoggedIn) {
        console.log(`[Router] Access Denied: Route "${path}" requires login. Redirecting to #login.`);
        hideAllAlerts();
        window.location.hash = '#login';
        return;
    }
    if (adminOnlyRoutes.includes(path) && userRole !== 'admin') {
        console.log(`[Router] Access Denied: Route "${path}" requires Admin role (User role: ${userRole}). Redirecting.`);
        hideAllAlerts();
        views.renderTemporaryMessage('alertTempAdminRequired', 'danger');
        setTimeout(() => { window.location.hash = isLoggedIn ? '#dashboard' : '#login'; }, 2000);
        return;
    }
    if (providerOnlyRoutes.includes(path) && userRole !== 'provider') {
        console.log(`[Router] Access Denied: Route "${path}" requires Provider role (User role: ${userRole}). Redirecting to dashboard.`);
        hideAllAlerts();
        views.renderTemporaryMessage('alertTempProviderRequired', 'warning');
        setTimeout(() => { window.location.hash = '#dashboard'; }, 2000);
        return;
    }

    // --- Access Granted ---
    hideAllAlerts();
    const isAdminRoute = adminOnlyRoutes.includes(path);
    views.toggleAdminSidebar(isAdminRoute);

    const viewFunction = routes[path];
    console.log(`[Router] Matched View Function: ${viewFunction ? viewFunction.name : 'Special Handling (Detail/404)'}`);

    // Execute the Rendering Logic
    if (path === '#course-detail') {
        if (param) {
            views.renderCourseDetailPage(); // View reads ID from hash
        } else {
            console.warn('[Router] Course Detail route accessed without ID. Redirecting.');
             window.location.hash = '#browse-courses';
        }
    } else if (viewFunction) {
        viewFunction();
    } else {
        console.log(`[Router] No route match found for path: "${path}". Rendering 404 page.`);
        views.renderNotFoundPage();
    }

    window.scrollTo(0, 0);
    console.log(`[Router] --- Navigation Handled for ${path} ---`);
}

// Initialize the router on load and listen for hash changes
export function initializeRouter() {
    $(window).on('hashchange', router);
    return router; // Return the function itself
}