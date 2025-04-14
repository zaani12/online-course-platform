// js/router.js - Handles SPA routing and access control
import * as views from './views.js';
import * as auth from './auth.js';
import { t } from './i18n.js'; // Import translation function

const routes = {
    '#home': views.renderHomePage,
    '#login': views.renderLoginPage,
    '#register': views.renderRegisterPage,
    '#browse-courses': views.renderBrowseCoursesPage,
    '#dashboard': views.renderDashboardPage,
    '#my-courses': views.renderMyCoursesPage,
    '#create-course': views.renderCreateCoursePage,
    '#admin-dashboard': views.renderAdminDashboard,
    '#admin-users': views.renderAdminUsersPage,
    '#admin-courses': views.renderAdminCoursesPage,
    '#course-detail': views.renderCourseDetailPage, // Target for logic check
};

const protectedRoutes = [
    '#dashboard', '#my-courses', '#create-course',
    '#admin-dashboard', '#admin-users', '#admin-courses',
    // '#course-detail', // Let guests view details, actions controlled in view
];
const providerOnlyRoutes = ['#create-course'];
const adminOnlyRoutes = ['#admin-dashboard', '#admin-users', '#admin-courses'];

// Helper to hide alerts across views during navigation
function hideAllAlerts() {
    // Target specific form alerts and general action alerts
    $('#login-form-alert, #register-form-alert, #create-course-form-alert, #schedule-session-form-alert, #add-material-form-alert, #enroll-alert, #course-action-alert, .alert.show')
        .each(function() {
            const $alert = $(this);
            const instance = bootstrap?.Alert?.getOrCreateInstance(this);
            if ($alert.hasClass('show') && instance) { instance.close(); }
            else { $alert.addClass('d-none').removeClass('show fade'); }
    });
}

// The main router function
export function router() {
    views.renderNavbar(); // Update navbar on every route change

    const hash = window.location.hash || '#home';
    const path = hash.split('/')[0];
    const param = hash.split('/')[1] || null;
    console.log(`[Router] Navigating - Hash: ${hash}, Path: ${path}, Param: ${param}`);

    const isLoggedIn = auth.isLoggedIn();
    const userRole = auth.getCurrentUserRole();

    // --- Access Control Logic ---
    if (protectedRoutes.includes(path) && !isLoggedIn) {
        console.log(`[Router] Access Denied: Route "${path}" requires login. Redirecting to #login.`);
        hideAllAlerts(); window.location.hash = '#login'; return;
    }
    if (adminOnlyRoutes.includes(path) && userRole !== 'admin') {
        console.log(`[Router] Access Denied: Route "${path}" requires Admin role. Redirecting.`);
        hideAllAlerts(); views.renderTemporaryMessage('alertTempAdminRequired', 'danger'); setTimeout(() => { if (window.location.hash === hash) window.location.hash = isLoggedIn ? '#dashboard' : '#login'; }, 2000); return;
    }
    if (providerOnlyRoutes.includes(path) && userRole !== 'provider') {
        console.log(`[Router] Access Denied: Route "${path}" requires Provider role. Redirecting.`);
        hideAllAlerts(); views.renderTemporaryMessage('alertTempProviderRequired', 'warning'); setTimeout(() => { if (window.location.hash === hash) window.location.hash = '#dashboard'; }, 2000); return;
    }
     if (path === '#my-courses' && userRole === 'admin') { // Redirect admin from generic 'my-courses'
         console.log(`[Router] Admin accessing #my-courses. Redirecting to #admin-courses.`);
         hideAllAlerts(); window.location.hash = '#admin-courses'; return;
     }

    // --- Access Granted or Public Route ---
    hideAllAlerts();
    const isAdminRoute = adminOnlyRoutes.includes(path);
    views.toggleAdminSidebar(isAdminRoute);

    const viewFunction = routes[path];
    if (viewFunction) {
        if (path === '#course-detail') {
            if (!param) { console.warn('[Router] Course Detail missing ID.'); window.location.hash = '#browse-courses'; return; }
            viewFunction(); // View handles param extraction
        } else {
            viewFunction(); // Call standard view function
        }
    } else {
        console.log(`[Router] No route match for path: "${path}". Rendering 404.`);
        views.renderNotFoundPage();
    }

    window.scrollTo(0, 0);
    // console.log(`[Router] --- Navigation Handled for ${path} ---`);
}

// Initialize the router on load and listen for hash changes
export function initializeRouter() {
    $(window).off('hashchange.router').on('hashchange.router', router);
    return router;
}

// Export the router function directly for use in main.js for navigation triggers
export { router as navigate };