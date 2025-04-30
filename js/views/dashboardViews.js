// js/views/dashboardViews.js - Renders role-specific dashboards
import * as store from '../store.js';
import * as auth from '../auth.js';
import { t, getCurrentLanguage } from '../i18n.js';
// Import necessary common functions, including chart destroyers
import { render, toggleAdminSidebar, renderTemporaryMessage, formatDateTime, destroyChart, destroyAllCharts } from './common.js';

// --- Admin Dashboard Specific Helpers (Keep with Admin Dashboard Logic) ---

// Helper to render "No Data" message on a canvas
function renderNoData(canvasId, messageKey) {
    try {
        const canvas = document.getElementById(canvasId);
        if (canvas?.getContext) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6c757d'; ctx.font = '16px "Poppins", sans-serif';
            const message = t(messageKey, {}, 'No data available');
            ctx.fillText(message, canvas.width / 2, canvas.height / 2);
            ctx.restore();
        } else {
             console.warn(`[Chart] Canvas element #${canvasId} not found for renderNoData.`);
        }
    } catch (e) { console.error(`[Chart] Error in renderNoData for canvas #${canvasId}:`, e); }
}

// Chart Initialization Function (Admin Dashboard)
function initializeAdminCharts(userCounts, coursesPerProvider, topCourses) {
     console.log("[Charts] Attempting to initialize Admin Dashboard charts...");
    try {
        if (typeof Chart === 'undefined') {
            console.error("[Charts] FATAL: Chart.js library is not loaded!");
            ['userRoleChart', 'topCoursesChart', 'coursesPerProviderChart'].forEach(id => renderNoData(id, 'errorLoadingData'));
            return;
        }
        const noDataKey = 'dashboardAdminNoData';

        // Defensively check data structure
        const validUserCounts = userCounts && typeof userCounts === 'object';
        const validCppData = coursesPerProvider && Array.isArray(coursesPerProvider.labels) && Array.isArray(coursesPerProvider.data);
        const validTopCourses = topCourses && Array.isArray(topCourses.labels) && Array.isArray(topCourses.data);

        const userRoleCtx = document.getElementById('userRoleChart')?.getContext('2d');
        const topCoursesCtx = document.getElementById('topCoursesChart')?.getContext('2d');
        const cppCtx = document.getElementById('coursesPerProviderChart')?.getContext('2d');

        // User Role Chart
        destroyChart('userRoleChart');
        if (userRoleCtx && validUserCounts && userCounts.total > 0 && (userCounts.client + userCounts.provider + userCounts.admin > 0)) {
            try {
                 // Use a local variable for the chart instance inside this function's scope
                 const userRoleChart = new Chart(userRoleCtx, { type: 'doughnut', data: { labels: [t('roleClient'), t('roleProvider'), t('roleAdmin')], datasets: [{ label: t('userRole'), data: [userCounts.client || 0, userCounts.provider || 0, userCounts.admin || 0], backgroundColor: ['rgba(var(--bs-primary-rgb), 0.7)', 'rgba(var(--app-secondary-rgb), 0.7)', 'rgba(108, 117, 125, 0.7)'], borderColor: '#fff', borderWidth: 2, hoverOffset: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } } }, cutout: '60%' } });
                 // We don't need to store it globally if it's only used here,
                 // but if you had interactions, you might store `activeCharts['userRoleChart'] = userRoleChart;`
                 console.log("[Charts] User Role Chart initialized.");
            } catch (e) { console.error("[Charts] Error initializing User Role Chart INSTANCE:", e); renderNoData('userRoleChart', 'errorLoadingData'); }
        } else if (userRoleCtx) { renderNoData('userRoleChart', !validUserCounts ? 'errorLoadingData' : noDataKey); }

        // Top Courses Chart
        destroyChart('topCoursesChart');
        if (topCoursesCtx && validTopCourses && topCourses.labels.length > 0) {
             try {
                const topCoursesChart = new Chart(topCoursesCtx, { type: 'bar', data: { labels: topCourses.labels.map(l => (l.length > 25 ? l.substring(0, 22) + '...' : l)), datasets: [{ label: t('dashboardAdminCardEnrollmentsTitle'), data: topCourses.data, backgroundColor: 'rgba(var(--bs-info-rgb), 0.6)', borderColor: 'rgba(var(--bs-info-rgb), 1)', borderWidth: 1, borderRadius: 4, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { display: true, autoSkip: true, maxRotation: 0 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: (ti) => ti[0] && topCourses.labels[ti[0].dataIndex], label: ctx => ` ${t('dashboardAdminCardEnrollmentsTitle')}: ${ctx.parsed.y}` } } } } });
                console.log("[Charts] Top Courses Chart initialized.");
            } catch (e) { console.error("[Charts] Error initializing Top Courses Chart INSTANCE:", e); renderNoData('topCoursesChart', 'errorLoadingData'); }
        } else if (topCoursesCtx) { renderNoData('topCoursesChart', !validTopCourses ? 'errorLoadingData' : noDataKey); }

        // Courses Per Provider Chart
        destroyChart('coursesPerProviderChart');
        if (cppCtx && validCppData && coursesPerProvider.labels.length > 0) {
            try {
                const cppChart = new Chart(cppCtx, { type: 'bar', data: { labels: coursesPerProvider.labels, datasets: [{ label: `# ${t('dashboardAdminCardCoursesTitle')}`, data: coursesPerProvider.data, backgroundColor: 'rgba(var(--app-secondary-rgb), 0.6)', borderColor: 'rgba(var(--app-secondary-rgb), 1)', borderWidth: 1, borderRadius: 4, borderSkipped: false }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { autoSkip: false, padding: 5 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${t('dashboardAdminCardCoursesTitle')}: ${ctx.parsed.x}` } } } } });
                 console.log("[Charts] Courses Per Provider Chart initialized.");
            } catch (e) { console.error("[Charts] Error initializing Courses Per Provider Chart INSTANCE:", e); renderNoData('coursesPerProviderChart', 'errorLoadingData'); }
        } else if (cppCtx) { renderNoData('coursesPerProviderChart', !validCppData ? 'errorLoadingData' : noDataKey); }
    } catch (chartInitError) { console.error("[Charts] General error during chart initialization:", chartInitError); }
}

// --- Admin Dashboard - Render Function ---
// ***** THIS IS THE MAIN FUNCTION FOR #admin-dashboard *****
export function renderAdminDashboard() {
    console.log("[renderAdminDashboard] Function START");
    try {
        toggleAdminSidebar(true); // Ensure admin sidebar IS shown
        destroyAllCharts(); // Use common function
        console.log("[renderAdminDashboard] Charts destroyed.");
        let userCounts, courseCountData, totalRevenue, coursesPerProvider, enrollmentStats, priceStats, topCoursesData, pendingCourses, approvedCourses;

        console.log("[renderAdminDashboard] Fetching data from store...");
        try {
            userCounts = store.getUserCountsByRole() || { admin: 0, provider: 0, client: 0, total: 0, unknown: 0 };
            courseCountData = store.getCourses() || [];
            pendingCourses = courseCountData.filter(c => c?.status === 'pending');
            approvedCourses = courseCountData.filter(c => c?.status === 'approved');

            // Calculate stats based on APPROVED courses
            totalRevenue = approvedCourses.reduce((sum, c) => sum + ((parseFloat(c?.price) || 0) * (c?.enrolledStudentIds?.length || 0)), 0);
            const totalApprovedEnrollments = approvedCourses.reduce((sum, c) => sum + (c?.enrolledStudentIds?.length || 0), 0);
            enrollmentStats = { totalEnrollments: totalApprovedEnrollments, averageEnrollments: approvedCourses.length > 0 ? (totalApprovedEnrollments / approvedCourses.length) : 0 };
            const paidApprovedCourses = approvedCourses.filter(c=> c && parseFloat(c.price) > 0);
            let totalPaidPriceSum = paidApprovedCourses.reduce((sum, c) => sum + (parseFloat(c.price) || 0), 0);
            priceStats = { averagePrice: paidApprovedCourses.length > 0 ? totalPaidPriceSum / paidApprovedCourses.length : 0, freeCount: approvedCourses.filter(c => !c?.price || parseFloat(c.price) <= 0).length, paidCount: paidApprovedCourses.length, percentFree: approvedCourses.length > 0 ? (approvedCourses.filter(c => !c?.price || parseFloat(c.price) <= 0).length / approvedCourses.length) * 100 : 0, totalApproved: approvedCourses.length };
            topCoursesData = store.getTopEnrolledCourses(5) || {labels:[], data:[]};
            coursesPerProvider = store.getCoursesPerProviderData() || {labels:[], data:[]};
            console.log("[renderAdminDashboard] Data fetched/calculated successfully.");

            if (!userCounts || !priceStats || !enrollmentStats || !coursesPerProvider || !topCoursesData || !courseCountData || !pendingCourses) { throw new Error("One or more required datasets are null or undefined after fetching/processing."); }

        } catch (fetchError) { console.error("[renderAdminDashboard] CRITICAL ERROR fetching or processing data:", fetchError); render(`<div class="alert alert-danger m-4" role="alert"><h4><i class="bi bi-exclamation-triangle-fill"></i> ${t('errorLoadingData')}</h4><p>${fetchError.message}</p></div>`, true, false); return; }

        // --- Build Pending Courses Table HTML ---
        let pendingCoursesHtml = '';
        try { if (pendingCourses.length > 0) { pendingCoursesHtml = pendingCourses.map(course => { if (!course) return ''; const provider = store.findUserById(course.providerId); const createdDate = formatDateTime(course.createdAt); const title = course.title || t('untitledCourse'); const providerName = provider ? provider.username : t('unknownProvider'); return `<tr><td><a href="#course-detail/${course.id}" title="${t('viewAction')}">${title}</a></td><td>${providerName}</td><td>${createdDate}</td><td class="text-end"><button class="btn btn-sm btn-success approve-course-button me-1" data-course-id="${course.id}" title="${t('adminApproveAction', {}, 'Approve')}"><i class="bi bi-check-lg"></i> <span class="d-none d-md-inline">${t('adminApproveAction', {}, 'Approve')}</span></button><button class="btn btn-sm btn-danger reject-course-button" data-course-id="${course.id}" title="${t('adminRejectAction', {}, 'Reject')}"><i class="bi bi-x-lg"></i> <span class="d-none d-md-inline">${t('adminRejectAction', {}, 'Reject')}</span></button></td></tr>`; }).join(''); } else { pendingCoursesHtml = `<tr><td colspan="4" class="text-center text-muted p-3">${t('adminNoPendingCourses', {}, 'No courses awaiting approval.')}</td></tr>`; } } catch (htmlError) { console.error("[renderAdminDashboard] Error building pending courses HTML:", htmlError); pendingCoursesHtml = `<tr><td colspan="4" class="text-center text-danger p-3">Error loading pending courses list.</td></tr>`; }
        const pendingCoursesTable = `<div class="card shadow-sm mb-4"><div class="card-header bg-warning-subtle d-flex justify-content-between align-items-center"><h5 class="mb-0"><i class="bi bi-hourglass-split me-2"></i>${t('adminPendingCoursesTitle', {}, 'Pending Course Approvals')}</h5><span class="badge bg-warning text-dark rounded-pill">${pendingCourses.length}</span></div><div id="course-action-alert-pending" class="alert d-none m-0 rounded-0 border-0 border-bottom" role="alert"></div><div class="table-responsive"><table class="table table-striped table-hover mb-0"><thead><tr><th>${t('adminCoursesHeaderTitle', {}, 'Title')}</th><th>${t('adminCoursesHeaderProvider', {}, 'Teacher')}</th><th>${t('adminCoursesHeaderCreated', {}, 'Submitted')}</th><th class="text-end">${t('adminCoursesHeaderActions', {}, 'Actions')}</th></tr></thead><tbody>${pendingCoursesHtml}</tbody></table></div></div>`;

        // --- Build Stats Cards HTML ---
        const statsHtml = `
            <h4 class="mb-3 text-muted fw-light">${t('adminApprovedStatsTitle', {}, 'Approved Course Statistics')}</h4>
            <div class="row g-3 mb-4">
                 <div class="col-xl-3 col-md-6"><div class="stat-card stat-card-users shadow-sm"> <div class="stat-icon"><i class="bi bi-people-fill"></i></div> <h5>${t('dashboardAdminCardUsersTitle')}</h5> <div class="stat-value">${userCounts.total ?? 0}</div> <small>${t('dashboardAdminCardUsersSubtitle', { client: userCounts.client ?? 0, provider: userCounts.provider ?? 0, admin: userCounts.admin ?? 0 })}</small> </div></div>
                 <div class="col-xl-3 col-md-6"><div class="stat-card stat-card-courses shadow-sm"> <div class="stat-icon"><i class="bi bi-journal-bookmark-fill"></i></div> <h5>${t('dashboardAdminCardApprovedCoursesTitle', {}, 'Approved Courses')}</h5> <div class="stat-value">${priceStats.totalApproved}</div> <small>${t('dashboardAdminCardCoursesSubtitle', { free: priceStats.freeCount ?? 0, paid: priceStats.paidCount ?? 0, percentFree: (priceStats.percentFree ?? 0).toFixed(1) })}</small> </div></div>
                 <div class="col-xl-3 col-md-6"><div class="stat-card stat-card-revenue shadow-sm"> <div class="stat-icon"><i class="bi bi-cash-coin"></i></div> <h5>${t('dashboardAdminCardRevenueTitle')}</h5> <div class="stat-value">${(totalRevenue ?? 0).toFixed(0)} ${t('currencySymbol', {}, 'MAD')}</div> <small>${t('dashboardAdminCardRevenueSubtitle')}</small> </div></div>
                 <div class="col-xl-3 col-md-6"><div class="stat-card shadow-sm" style="background: linear-gradient(135deg, #0dcaf0, #5bc0de);"> <div class="stat-icon"><i class="bi bi-person-check-fill"></i></div> <h5>${t('dashboardAdminCardEnrollmentsTitle')}</h5> <div class="stat-value">${enrollmentStats.totalEnrollments ?? 0}</div> <small>${t('dashboardAdminCardEnrollmentsSubtitle', { avg: (enrollmentStats.averageEnrollments ?? 0).toFixed(1) })}</small> </div></div>
            </div>`;

        // --- Build Charts HTML ---
        const chartsHtml = `
            <div class="row g-4">
                 <div class="col-lg-4"> <div class="card shadow-sm mb-4 h-100"> <div class="card-header"><i class="bi bi-graph-up me-2"></i>${t('dashboardAdminQuickStatsTitle')}</div> <div class="card-body"> <ul class="list-group list-group-flush"> <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">${t('dashboardAdminStatAvgPrice')}<span class="badge bg-success-subtle text-success-emphasis rounded-pill fs-6">${(priceStats.averagePrice ?? 0).toFixed(0)} ${t('currencySymbol', {}, 'MAD')}</span></li> <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">${t('dashboardAdminStatPercentFree')}<span class="badge bg-primary-subtle text-primary-emphasis rounded-pill fs-6">${(priceStats.percentFree ?? 0).toFixed(1)}%</span></li> <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">${t('dashboardAdminStatAvgEnroll')}<span class="badge bg-info-subtle text-info-emphasis rounded-pill fs-6">${(enrollmentStats.averageEnrollments ?? 0).toFixed(1)}</span></li> <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">${t('dashboardAdminStatProviders')}<span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill fs-6">${userCounts.provider ?? 0}</span></li> </ul> </div> </div> </div>
                 <div class="col-lg-4"><div class="card shadow-sm mb-4 h-100"><div class="card-header">${t('dashboardAdminChartUserRoleTitle')}</div><div class="card-body d-flex justify-content-center align-items-center"><div class="chart-container" style="height: 260px; max-width: 320px;"><canvas id="userRoleChart"></canvas></div></div></div></div>
                 <div class="col-lg-4"><div class="card shadow-sm mb-4 h-100"><div class="card-header">${t('dashboardAdminChartTopCoursesTitle', { count: topCoursesData.labels?.length ?? 0 })}</div><div class="card-body"><div class="chart-container" style="height: 260px;"><canvas id="topCoursesChart"></canvas></div></div></div></div>
            </div>
            <div class="row g-4 mt-1"> <div class="col-lg-12"><div class="card shadow-sm"><div class="card-header">${t('dashboardAdminChartCoursesPerProviderTitle')}</div><div class="card-body"><div class="chart-container" style="height: 50vh; min-height: 350px; max-height: 600px;"><canvas id="coursesPerProviderChart"></canvas></div></div></div></div> </div>
            `;

        // Assemble final HTML
        const contentHtml = `
        <div data-page-title-key="dashboardAdminTitle"></div>
        <div class="fade-in">
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom"> <h1 class="h2"><i class="bi bi-grid-1x2-fill me-2"></i>${t('dashboardAdminTitle')}</h1> </div>
            ${pendingCoursesTable}
            ${statsHtml}
            ${chartsHtml}
        </div>`;

        console.log("[renderAdminDashboard] Calling render()...");
        render(contentHtml, true, false); // Render into admin area, no extra container
        console.log("[renderAdminDashboard] render() called.");

        console.log("[renderAdminDashboard] Scheduling chart initialization...");
        requestAnimationFrame(() => { setTimeout(() => { if (window.location.hash === '#admin-dashboard') { console.log("[renderAdminDashboard] Initializing charts now."); initializeAdminCharts(userCounts, coursesPerProvider, topCoursesData); } else { console.log("[renderAdminDashboard] Hash changed before charts could initialize."); } }, 50); });

    } catch (error) { console.error("[renderAdminDashboard] UNEXPECTED ERROR in function:", error); render(`<div class="alert alert-danger m-4" role="alert"><h4><i class="bi bi-exclamation-triangle-fill"></i> Unexpected Dashboard Error</h4><p>${error.message}</p><small>Check console.</small></div>`, true, false); }
    console.log("[renderAdminDashboard] Function END");
}


// --- Provider Dashboard ---
export function renderProviderDashboardView() {
    try {
        toggleAdminSidebar(false);
        const currentUser = auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'provider') { console.warn("[View] Redirecting non-provider from provider dashboard."); window.location.hash = '#login'; return; }
        const providerCourses = store.getCoursesByProvider(currentUser.id, ['pending', 'approved', 'rejected']);
        const approvedCourses = providerCourses.filter(c => c.status === 'approved');
        const totalEnrollments = approvedCourses.reduce((sum, c) => sum + (c?.enrolledStudentIds?.length || 0), 0);
        const contentHtml = `
            <div data-page-title-key="dashboardProviderTitle"></div>
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-1 pb-2 mb-3 border-bottom"> <h1 class="h2">${t('dashboardProviderTitle')}</h1> <a href="#create-course" class="btn btn-sm btn-success"><i class="bi bi-plus-lg me-1"></i>${t('dashboardProviderCreateButton')}</a> </div>
            <p class="lead text-muted mb-4">${t('dashboardProviderWelcome', { username: currentUser.username })}</p>
            <div class="row g-4">
                <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-info"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-info mb-3"><i class="bi bi-journal-bookmark-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardProviderCoursesCardTitle')}</h5> <p class="card-text display-3 fw-bold mb-3">${providerCourses.length}</p> <small class="text-muted mb-3">(${t('allCourseStatuses', {}, 'Incl. Pending/Rejected')})</small> <a href="#my-courses" class="btn btn-outline-info mt-auto"><i class="bi bi-pencil-square me-1"></i> ${t('dashboardProviderManageCoursesButton')}</a> </div> </div> </div>
                <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-success"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-success mb-3"><i class="bi bi-people-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardProviderEnrollmentsCardTitle')}</h5> <p class="card-text display-3 fw-bold mb-3">${totalEnrollments}</p> <small class="text-muted mb-3">(${t('approvedCoursesOnly', {}, 'Approved courses only')})</small> <a href="#my-courses" class="btn btn-outline-success mt-auto"><i class="bi bi-eye me-1"></i> ${t('dashboardProviderViewDetailsButton')}</a> </div> </div> </div>
            </div>`;
        render(contentHtml, false, true);
    } catch(e) { console.error("Error rendering provider dashboard:", e); renderTemporaryMessage('errorRenderingView', 'danger');}
}

// --- Client Dashboard ---
export function renderClientDashboardView() {
    try {
        toggleAdminSidebar(false);
        const currentUser = auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'client') { console.warn("[View] Redirecting non-client from client dashboard."); window.location.hash = '#login'; return; }
        const enrolledCourses = store.getCoursesEnrolledByStudent(currentUser.id);
        const lastCheckTimeStr = store.getLastNotificationCheckTime(); const lastCheckTime = new Date(lastCheckTimeStr); let notificationsHtml = ''; let newNotifications = [];
        enrolledCourses.forEach(course => { if (!course || !Array.isArray(course.liveSessions)) return; course.liveSessions.forEach(session => { if (session && session.scheduledAt) { const scheduledAtDate = new Date(session.scheduledAt); if (!isNaN(scheduledAtDate.getTime()) && scheduledAtDate > lastCheckTime) { newNotifications.push({ courseId: course.id, courseTitle: course.title || t('untitledCourse'), sessionTitle: session.title || t('untitledSession'), sessionDateTime: session.dateTime }); } } }); });
        newNotifications.sort((a, b) => new Date(a.sessionDateTime) - new Date(b.sessionDateTime)); const hasNewNotifications = newNotifications.length > 0;
        notificationsHtml = newNotifications.map(notif => { const formattedDateTime = formatDateTime(notif.sessionDateTime); return `<li class="list-group-item list-group-item-action list-group-item-warning d-flex justify-content-between align-items-center animate-new-notification"><span class="me-2"><i class="bi bi-calendar-event-fill me-2"></i>${t('dashboardClientNewSessionNotification', { courseTitle: notif.courseTitle, sessionTitle: notif.sessionTitle, dateTime: formattedDateTime })}</span><a href="#course-detail/${notif.courseId}" class="btn btn-sm btn-outline-primary ms-auto flex-shrink-0" title="${t('myCoursesDetailsButton')}"><i class="bi bi-box-arrow-up-right"></i></a></li>`; }).join('');
        store.updateLastNotificationCheckTime();
        const contentHtml = `
            <div data-page-title-key="dashboardClientTitle"></div>
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-1 pb-2 mb-3 border-bottom"> <h1 class="h2">${t('dashboardClientTitle')}</h1> ${hasNewNotifications ? `<span class="badge bg-danger rounded-pill ms-2 animate-new-badge">${t('new')}</span>` : ''} </div>
            <p class="lead text-muted mb-4">${t('dashboardClientWelcome', { username: currentUser.username })}</p>
            ${hasNewNotifications ? `<div class="card shadow-sm mb-4 border-start border-5 border-warning"><div class="card-header bg-warning-subtle text-dark fw-semibold"><i class="bi bi-bell-fill me-1"></i> ${t('dashboardClientNotificationsTitle')}</div><ul class="list-group list-group-flush">${notificationsHtml}</ul></div>` : `<div class="alert alert-light border text-center mb-4"><i class="bi bi-info-circle me-1"></i> ${t('dashboardClientNoNotifications')}</div>`}
            <div class="row g-4">
                <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-primary"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-primary mb-3"><i class="bi bi-check-circle-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardClientEnrolledCardTitle')}</h5> <p class="card-text display-3 fw-bold mb-3">${enrolledCourses.length}</p> <a href="#my-courses" class="btn btn-outline-primary mt-auto"><i class="bi bi-book me-1"></i> ${t('dashboardClientViewMyCoursesButton')}</a> </div> </div> </div>
                <div class="col-lg-6"> <div class="card text-center h-100 shadow-sm border-start border-5 border-accent"> <div class="card-body d-flex flex-column justify-content-center align-items-center py-4"> <div class="display-4 text-accent mb-3"><i class="bi bi-compass-fill"></i></div> <h5 class="card-title mb-2">${t('dashboardClientExploreCardTitle')}</h5> <p class="card-text text-muted mb-3">${t('dashboardClientExploreCardText')}</p> <a href="#browse-courses" class="btn btn-accent text-white mt-auto"><i class="bi bi-search me-1"></i> ${t('dashboardClientBrowseCoursesButton')}</a> </div> </div> </div>
            </div>`;
        render(contentHtml, false, true);
    } catch(e) { console.error("Error rendering client dashboard:", e); renderTemporaryMessage('errorRenderingView', 'danger');}
}