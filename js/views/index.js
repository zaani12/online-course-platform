// js/views/index.js - Main export for all view functions

// Export common functions needed by other modules
export { renderNavbar, toggleAdminSidebar, renderTemporaryMessage } from './common.js';

// Export page rendering functions
export { renderHomePage } from './home.js';
export { renderLoginPage, renderRegisterPage, setupDynamicFormFields } from './authViews.js'; // setupDynamic needed by main.js
export { renderBrowseCoursesPage, renderCreateCoursePage, renderMyCoursesPage, renderCourseDetailPage } from './courseViews.js';
export { renderAdminDashboard, renderAdminUsersPage, renderAdminCoursesPage } from './adminViews.js'; // Export Admin views
export { renderMessagesPage, renderConversationPage } from './messageViews.js'; // <<< ENSURE THIS IS CORRECT
export { renderNotFoundPage } from './notFound.js';

// --- Dashboard Dispatcher ---
import * as auth from '../auth.js';
// Import specific dashboard views needed for dispatching
import { renderAdminDashboard } from './adminViews.js'; // <<< ENSURE THIS IS CORRECT
import { renderProviderDashboardView, renderClientDashboardView } from './dashboardViews.js';
import { renderTemporaryMessage } from './common.js'; // Import for error handling

// Export the dashboard dispatcher function
export function renderDashboardPage() {
    try {
        const userRole = auth.getCurrentUserRole();
        console.log(`[View Index] Dispatching dashboard for Role: ${userRole || 'None'}`);
        if (userRole === 'admin') {
            console.log("[View Index] Calling renderAdminDashboard...");
            renderAdminDashboard(); // <<< CALL ADMIN VIEW DIRECTLY
        } else if (userRole === 'provider') {
            console.log("[View Index] Calling renderProviderDashboardView...");
            renderProviderDashboardView();
        } else if (userRole === 'client') {
            console.log("[View Index] Calling renderClientDashboardView...");
            renderClientDashboardView();
        } else {
            console.warn("[View Index] No valid role for dashboard. Redirecting to login.");
            window.location.hash = '#login';
        }
    } catch (e) {
        console.error("Error in dashboard dispatcher (renderDashboardPage):", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}