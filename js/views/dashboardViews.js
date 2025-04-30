// js/views/dashboardViews.js - Renders role-specific dashboards
import * as store from '../store.js';
import * as auth from '../auth.js';
import { t, getCurrentLanguage } from '../i18n.js';
// Import necessary common functions
import { render, toggleAdminSidebar, renderTemporaryMessage, formatDateTime, renderNavbar } from './common.js';


// --- Client Dashboard ---
export function renderClientDashboardView() {
    try {
        toggleAdminSidebar(false);
        const currentUser = auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'client') { console.warn("[View] Redirecting non-client from client dashboard."); window.location.hash = '#login'; return; }

        const enrolledCourses = store.getCoursesEnrolledByStudent(currentUser.id);

        // --- VERY Basic Reminder Simulation ---
        let reminderHtml = '';
        const paidCoursesEnrolled = enrolledCourses.filter(c => {
             return c && (parseFloat(c.price) || 0) > 0;
        });

        if (paidCoursesEnrolled.length > 0) {
            reminderHtml = `
            <div class="card shadow-sm mb-4 border-start border-5 border-warning">
                 <div class="card-header bg-warning-subtle text-dark fw-semibold">
                     <i class="bi bi-bell-fill me-1"></i> ${t('paymentReminderTitleDemo', {}, 'Reminders (Demo)')}
                 </div>
                 <ul class="list-group list-group-flush">
                    <li class="list-group-item list-group-item-warning small">
                         ${t('paymentReminderTextDemo', {}, 'Remember to check your payment status for paid courses.')}
                    </li>
                 </ul>
            </div>`;
        }
         // --- End Basic Reminder Simulation ---

        // --- Notification Logic for Live Sessions (Keep as before) ---
        const lastCheckTimeStr = store.getLastNotificationCheckTime();
        const lastCheckTime = new Date(lastCheckTimeStr);
        let notificationsHtml = '';
        let hasNewNotifications = false;
        enrolledCourses.forEach(course => { if (!course || !Array.isArray(course.liveSessions)) return; course.liveSessions.forEach(session => { if (session && session.scheduledAt) { const scheduledAtDate = new Date(session.scheduledAt); if (!isNaN(scheduledAtDate.getTime()) && scheduledAtDate > lastCheckTime) { hasNewNotifications = true; const formattedDateTime = formatDateTime(session.dateTime); const courseTitle = course.title || t('untitledCourse'); const sessionTitle = session.title || t('untitledSession'); notificationsHtml += `<li class="list-group-item list-group-item-action list-group-item-info d-flex justify-content-between align-items-center animate-new-notification"> <span class="me-2"><i class="bi bi-calendar-event-fill me-2"></i>${t('dashboardClientNewSessionNotification', { courseTitle: courseTitle, sessionTitle: sessionTitle, dateTime: formattedDateTime })}</span> <a href="#course-detail/${course.id}" class="btn btn-sm btn-outline-primary ms-auto flex-shrink-0" title="${t('myCoursesDetailsButton')}"><i class="bi bi-box-arrow-up-right"></i></a> </li>`; } } }); });
        store.updateLastNotificationCheckTime();
        const sessionNotificationSection = hasNewNotifications ? `<div class="card shadow-sm mb-4 border-start border-5 border-info"><div class="card-header bg-info-subtle text-dark fw-semibold"><i class="bi bi-camera-video-fill me-1"></i> ${t('dashboardClientNotificationsTitle')}</div><ul class="list-group list-group-flush">${notificationsHtml}</ul></div>` : `<div class="alert alert-light border text-center mb-4"><i class="bi bi-info-circle me-1"></i> ${t('dashboardClientNoNotifications')}</div>`;
        // --- End Notification Logic ---


        const contentHtml = `
            <div data-page-title-key="dashboardClientTitle"></div>
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-1 pb-2 mb-3 border-bottom"> <h1 class="h2">${t('dashboardClientTitle')}</h1> ${hasNewNotifications ? `<span class="badge bg-danger rounded-pill ms-2 animate-new-badge">${t('new')}</span>` : ''} </div>
            <p class="lead text-muted mb-4">${t('dashboardClientWelcome', { username: currentUser.username })}</p>

            ${reminderHtml}
            ${sessionNotificationSection}

        
            <div class="row g-4"> <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-primary"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-primary mb-3"><i class="bi bi-check-circle-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardClientEnrolledCardTitle')}</h5> <p class="card-text display-3 fw-bold mb-3">${enrolledCourses.length}</p> <a href="#my-courses" class="btn btn-outline-primary mt-auto"><i class="bi bi-book me-1"></i> ${t('dashboardClientViewMyCoursesButton')}</a> </div> </div> </div> <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-accent"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-accent mb-3"><i class="bi bi-compass-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardClientExploreCardTitle')}</h5> <p class="card-text text-muted mb-3">${t('dashboardClientExploreCardText')}</p> <a href="#browse-courses" class="btn btn-accent text-white mt-auto"><i class="bi bi-search me-1"></i> ${t('dashboardClientBrowseCoursesButton')}</a> </div> </div> </div> </div>`;
        render(contentHtml, false, true);
    } catch(e) { console.error("Error rendering client dashboard:", e); renderTemporaryMessage('errorRenderingView', 'danger');}
}

// Keep renderProviderDashboardView as it was
export function renderProviderDashboardView() { try { toggleAdminSidebar(false); const currentUser = auth.getCurrentUser(); if (!currentUser || currentUser.role !== 'provider') { console.warn("[View] Redirecting non-provider from provider dashboard."); window.location.hash = '#login'; return; } const providerCourses = store.getCoursesByProvider(currentUser.id, ['pending', 'approved', 'rejected']); const approvedCourses = providerCourses.filter(c => c.status === 'approved'); const totalEnrollments = approvedCourses.reduce((sum, c) => sum + (c?.enrolledStudentIds?.length || 0), 0); const contentHtml = `<div data-page-title-key="dashboardProviderTitle"></div> <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-1 pb-2 mb-3 border-bottom"> <h1 class="h2">${t('dashboardProviderTitle')}</h1> <a href="#create-course" class="btn btn-sm btn-success"><i class="bi bi-plus-lg me-1"></i>${t('dashboardProviderCreateButton')}</a> </div> <p class="lead text-muted mb-4">${t('dashboardProviderWelcome', { username: currentUser.username })}</p> <div class="row g-4"> <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-info"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-info mb-3"><i class="bi bi-journal-bookmark-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardProviderCoursesCardTitle')}</h5> <p class="card-text display-3 fw-bold mb-3">${providerCourses.length}</p> <small class="text-muted mb-3">(${t('allCourseStatuses', {}, 'Incl. Pending/Rejected')})</small> <a href="#my-courses" class="btn btn-outline-info mt-auto"><i class="bi bi-pencil-square me-1"></i> ${t('dashboardProviderManageCoursesButton')}</a> </div> </div> </div> <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-success"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-success mb-3"><i class="bi bi-people-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardProviderEnrollmentsCardTitle')}</h5> <p class="card-text display-3 fw-bold mb-3">${totalEnrollments}</p> <small class="text-muted mb-3">(${t('approvedCoursesOnly', {}, 'Approved courses only')})</small> <a href="#my-courses" class="btn btn-outline-success mt-auto"><i class="bi bi-eye me-1"></i> ${t('dashboardProviderViewDetailsButton')}</a> </div> </div> </div> </div>`; render(contentHtml, false, true); } catch(e) { console.error("Error rendering provider dashboard:", e); renderTemporaryMessage('errorRenderingView', 'danger');} }