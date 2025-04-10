// --- START OF FILE js/views.js ---
// js/views.js - Handles rendering different views/pages and UI updates
import * as store from './store.js';
import * as auth from './auth.js';
import { t, getCurrentLanguage, SUPPORTED_LANGS } from './i18n.js'; // Import i18n

// --- Cache jQuery Selectors ---
const $contentWrapper = $('#content-wrapper');
const $navLinks = $('#nav-links');
const $adminSidebar = $('#admin-sidebar');
const $mainViewArea = $('#main-view-area');
const $initialLoading = $('#initial-loading');

// --- Chart Management ---
let activeCharts = {};

// Destroys a specific chart instance if it exists
function destroyChart(chartId) {
    if (activeCharts[chartId]) {
        console.log(`[Chart] Destroying existing chart: ${chartId}`);
        try {
            activeCharts[chartId].destroy();
        } catch (e) {
            console.error(`[Chart] Error destroying chart ${chartId}:`, e);
        } finally {
            delete activeCharts[chartId]; // Remove reference even if destroy failed
        }
    }
}

// Destroys all currently active charts
function destroyAllCharts() {
     console.log("[Chart] Destroying all active charts.");
     Object.keys(activeCharts).forEach(destroyChart); // Iterate and destroy each
}

// --- Course Icon Helper ---
function getCourseIcon(title = '') {
    const lowerTitle = (title || '').toLowerCase(); // Ensure title is a string and handle potential null/undefined
    if (lowerTitle.includes('web') || lowerTitle.includes('html') || lowerTitle.includes('css') || lowerTitle.includes('javascript') || lowerTitle.includes('react') || lowerTitle.includes('node')) return 'bi-code-slash';
    if (lowerTitle.includes('python') || lowerTitle.includes('data') || lowerTitle.includes('analysis') || lowerTitle.includes('machine learning') || lowerTitle.includes('scraping')) return 'bi-bar-chart-line-fill';
    if (lowerTitle.includes('design') || lowerTitle.includes('ui/ux') || lowerTitle.includes('graphic')) return 'bi-palette-fill';
    if (lowerTitle.includes('photo') || lowerTitle.includes('camera') || lowerTitle.includes('paint') || lowerTitle.includes('watercolor') || lowerTitle.includes('creative') || lowerTitle.includes('writing')) return 'bi-camera-fill';
    if (lowerTitle.includes('speak') || lowerTitle.includes('present') || lowerTitle.includes('masterclass')) return 'bi-mic-fill';
    if (lowerTitle.includes('meditation') || lowerTitle.includes('mindful') || lowerTitle.includes('yoga') || lowerTitle.includes('well-being') || lowerTitle.includes('stress')) return 'bi-peace-fill';
    if (lowerTitle.includes('excel') || lowerTitle.includes('spreadsheet')) return 'bi-file-earmark-excel-fill';
    if (lowerTitle.includes('structure') || lowerTitle.includes('algorithm')) return 'bi-diagram-3-fill';
    return 'bi-book-half'; // Default
}

// --- Date Formatting Helper ---
function formatDateTime(isoString) {
    if (!isoString) return t('notAvailable', { default: 'N/A'}); // Use translation key
    try {
        const date = new Date(isoString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            console.warn("Invalid date string received for formatting:", isoString);
            return t('invalidDate', { default: 'Invalid Date'}); // Use translation key
        }
        const lang = getCurrentLanguage(); // Get current language for locale formatting
        // Define formatting options
        const options = {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true // Example: Sep 15, 2024, 3:05 PM
        };
        // Use Intl.DateTimeFormat for locale-aware formatting
        return new Intl.DateTimeFormat(lang, options).format(date);
    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return t('invalidDate', { default: 'Invalid Date'}); // Use translation key on error
    }
}

// --- Navbar Rendering ---
export function renderNavbar() {
    const currentUser = auth.getCurrentUser();
    let navHtml = '';
    const currentHash = window.location.hash || '#home';
    const currentBasePath = currentHash.split('/')[0]; // Get base path like #dashboard
    const currentLang = getCurrentLanguage();

    // Home Link (Always Visible)
    navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#home' ? 'active' : ''}" href="#home"><i class="bi bi-house-door-fill"></i> ${t('navHome')}</a></li>`;

    // Conditional Links Based on Login Status & Role
    if (currentUser) {
        // Logged In User Links
        const userRoleKey = `role${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}`; // e.g., roleClient

        // Dashboard link (adjust based on role if needed, but generic #dashboard usually works)
        navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#dashboard' || currentBasePath === '#admin-dashboard' ? 'active' : ''}" href="#dashboard"><i class="bi bi-speedometer2"></i> ${t('navDashboard')}</a></li>`;

        // Role-specific links
        if (currentUser.role === 'client') {
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li>`;
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#my-courses' ? 'active' : ''}" href="#my-courses"><i class="bi bi-bookmark-check-fill"></i> ${t('navMyCourses')}</a></li>`;
        } else if (currentUser.role === 'provider') {
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li>`;
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#my-courses' ? 'active' : ''}" href="#my-courses"><i class="bi bi-journal-richtext"></i> ${t('navMyCourses')}</a></li>`;
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#create-course' ? 'active' : ''}" href="#create-course"><i class="bi bi-plus-circle-fill"></i> ${t('navCreateCourse')}</a></li>`;
        } else if (currentUser.role === 'admin') {
            // Admin Panel link highlights for any #admin-* route
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath.startsWith('#admin-') ? 'active' : ''}" href="#admin-dashboard"><i class="bi bi-shield-lock-fill"></i> ${t('navAdminPanel')}</a></li>`;
        }

        // User Dropdown Menu (Pushed Right by ms-lg-auto)
        navHtml += `
            <li class="nav-item dropdown ms-lg-auto">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarUserDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="bi bi-person-circle fs-5 me-1"></i> ${currentUser.username}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarUserDropdown">
                    <li><span class="dropdown-item-text"><small class="text-muted">${t('userRole')}: ${t(userRoleKey)}</small></span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button id="logout-button" class="dropdown-item" type="button"><i class="bi bi-box-arrow-right"></i> ${t('navLogout')}</button></li>
                </ul>
            </li>`;

    } else {
        // Logged Out User Links
        navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li>`;
        // Login/Register pushed right
        navHtml += `<li class="nav-item ms-lg-auto"><a class="nav-link ${currentBasePath === '#login' ? 'active' : ''}" href="#login"><i class="bi bi-box-arrow-in-right"></i> ${t('navLogin')}</a></li>`;
        navHtml += `<li class="nav-item ms-lg-2"><a class="nav-link btn btn-accent btn-sm text-white px-3 ${currentBasePath === '#register' ? 'active' : ''}" href="#register"><i class="bi bi-person-plus-fill"></i> ${t('navRegister')}</a></li>`;
    }

    // Language Switcher Dropdown
    const langOptions = SUPPORTED_LANGS.map(lang => {
        const langKey = `lang${lang.charAt(0).toUpperCase() + lang.slice(1)}`; // e.g., langEnglish
        return `
        <li>
            <button class="dropdown-item d-flex align-items-center ${currentLang === lang ? 'active' : ''}" type="button" data-lang="${lang}">
                 ${t(langKey)} <!-- Translate language name -->
                 ${currentLang === lang ? '<i class="bi bi-check ms-auto"></i>' : ''}
            </button>
        </li>`;
    }).join('');

    // Place language switcher after user dropdown or login/register buttons
    navHtml += `
        <li class="nav-item dropdown ms-2" id="language-switcher">
            <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                 <i class="bi bi-translate me-1"></i> ${currentLang.toUpperCase()}
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="languageDropdown">
                ${langOptions}
            </ul>
        </li>
     `;

    $navLinks.html(navHtml); // Update the navbar links area
    // Note: Logout handler is now attached globally in main.js using delegation
}


// Logout Handler (Now handled globally in main.js, this function is not needed here)
// function handleLogout() { auth.logout(); window.location.hash = '#login'; }

// Admin Sidebar Management
export function toggleAdminSidebar(show) {
    const currentHash = window.location.hash || '#home';
    const currentBasePath = currentHash.split('/')[0];

    if (show) {
         // Check if user is actually admin before showing
        if (auth.getCurrentUserRole() !== 'admin') {
            console.warn("[View] Attempted to show admin sidebar for non-admin user.");
            return; // Don't show if not admin
        }
        // Generate sidebar content dynamically with translated text
        const sidebarHtml = `
            <div class="position-sticky pt-3 sidebar-sticky">
                <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-1 mb-2 text-muted text-uppercase">
                    <span>${t('navAdminPanel')}</span>
                </h6>
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link ${currentBasePath === '#admin-dashboard' ? 'active' : ''}" href="#admin-dashboard">
                            <i class="bi bi-grid-1x2-fill"></i> ${t('navDashboard')}
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${currentBasePath === '#admin-users' ? 'active' : ''}" href="#admin-users">
                            <i class="bi bi-people-fill"></i> ${t('adminUsersTitle')}
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${currentBasePath === '#admin-courses' ? 'active' : ''}" href="#admin-courses">
                            <i class="bi bi-journal-bookmark-fill"></i> ${t('adminCoursesTitle')}
                        </a>
                    </li>
                </ul>
            </div>`;
        $adminSidebar.html(sidebarHtml).removeClass('d-none collapse').addClass('d-md-block');
        // Adjust main content area columns for sidebar presence
        $mainViewArea.removeClass('col-md-12 col-lg-12').addClass('col-md-9 ms-sm-auto col-lg-10');
        $contentWrapper.addClass('admin-active'); // Add class to parent for potential styling hooks
    } else {
        // Hide sidebar and reset main content area columns
        $adminSidebar.html('').removeClass('d-md-block').addClass('d-none collapse');
        $mainViewArea.removeClass('col-md-9 ms-sm-auto col-lg-10').addClass('col-md-12 col-lg-12');
        $contentWrapper.removeClass('admin-active');
        // Destroy any charts when hiding sidebar (as they are admin-specific)
        destroyAllCharts();
    }
}

// --- Main Content Rendering Logic ---
function render(html, isAdminSpecific = false) {
    // Remove initial loading spinner if it exists
    $initialLoading.remove();

    let $targetContainer;
    const contentHtml = String(html); // Ensure html is a string

    // Determine the correct container based on whether it's admin-specific content
    if (isAdminSpecific) {
        // Render into the dedicated admin main view area
        $targetContainer = $mainViewArea;
        // Clear other non-admin content areas if necessary (optional)
        // $contentWrapper.children().not('#admin-sidebar').not($targetContainer).empty();
        console.log("[Render] Rendering admin-specific content into #main-view-area");
    } else {
        // Render into the main content wrapper for non-admin pages
        $targetContainer = $contentWrapper;
        // Clear the admin-specific area when rendering non-admin content
        $mainViewArea.empty();
         console.log("[Render] Rendering general content into #content-wrapper");
    }

    // Ensure the target container exists
    if (!$targetContainer || !$targetContainer.length) {
        console.error(`[Render] CRITICAL ERROR: Render target container not found (isAdminSpecific: ${isAdminSpecific}).`);
        // Display a fatal error message in the body
        $('body').prepend(`<div class="alert alert-danger m-3"><strong>Fatal Error:</strong> Application render target missing. UI cannot be updated.</div>`);
        return;
    }

    // Apply the HTML content and add fade-in animation class
    $targetContainer.html(contentHtml).addClass('fade-in');

    // Remove the fade-in class after the animation duration to allow future animations
    setTimeout(() => $targetContainer.removeClass('fade-in'), 550); // Match animation duration

    // Re-apply translations to static elements with data-translate attributes *after* render
    $('[data-translate]').each(function() {
        const key = $(this).data('translate');
        $(this).text(t(key));
    });
    $('[data-translate-placeholder]').each(function() {
        const key = $(this).data('translate-placeholder');
        $(this).attr('placeholder', t(key));
    });
     $('[data-translate-title]').each(function() {
        const key = $(this).data('translate-title');
        $(this).attr('title', t(key));
    });

     // Explicitly update page title if needed (optional)
     // const pageTitleKey = $targetContainer.find('[data-page-title-key]').data('page-title-key');
     // if (pageTitleKey) {
     //    document.title = t(pageTitleKey) + " | " + t('appName');
     // }
}


// --- Temporary Message Renderer ---
export function renderTemporaryMessage(messageOrKey, type = 'info', variables = {}) {
     const message = t(messageOrKey, variables); // Translate the message key
     // Create a Bootstrap alert structure
     const alertHtml = `
        <div class="container py-5">
            <div class="alert alert-${type} text-center shadow-sm" role="alert">
                ${message}
            </div>
        </div>`;
     // Render this message in the main content area
     render(alertHtml, false);
     // Ensure admin sidebar is hidden when showing temporary messages
     toggleAdminSidebar(false);
}

// --- Role-Based Dashboard Dispatcher ---
export function renderDashboardPage() {
    const userRole = auth.getCurrentUserRole();
    console.log(`[View] Rendering dashboard for role: ${userRole}`);
    // Redirect or render based on role
    if (userRole === 'admin') {
        // window.location.hash = '#admin-dashboard'; // Direct hash change
        renderAdminDashboard(); // Render directly
    } else if (userRole === 'provider') {
        renderProviderDashboardView();
    } else if (userRole === 'client') {
        renderClientDashboardView();
    } else {
        // If no role (or unexpected role), redirect to login
        console.warn("[View] No valid role for dashboard or user not logged in. Redirecting to login.");
        window.location.hash = '#login'; // Use hash change for redirection
    }
}

// --- Specific View Rendering Functions ---

// Provider Dashboard
function renderProviderDashboardView() {
    const currentUser = auth.getCurrentUser();
    // Ensure user is a provider
    if (!currentUser || currentUser.role !== 'provider') {
        console.warn("[View] Attempted to render provider dashboard for non-provider.");
        window.location.hash = '#login'; // Redirect if not provider
        return;
    }
    // Fetch provider-specific data
    const providerCourses = store.getCoursesByProvider(currentUser.id);
    const totalEnrollments = providerCourses.reduce((sum, c) => sum + (Array.isArray(c?.enrolledStudentIds) ? c.enrolledStudentIds.length : 0), 0);

    // Generate HTML content using template literals and translation function `t()`
    const contentHtml = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-1 pb-2 mb-3 border-bottom">
            <h1 class="h2">${t('dashboardProviderTitle')}</h1>
            <a href="#create-course" class="btn btn-sm btn-success">
                <i class="bi bi-plus-lg me-1"></i>${t('dashboardProviderCreateButton')}
            </a>
        </div>
        <p class="lead text-muted mb-4">${t('dashboardProviderWelcome', { username: currentUser.username })}</p>
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="card text-center h-100 shadow-sm border-start border-5 border-info">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center py-4">
                        <div class="display-4 text-info mb-3"><i class="bi bi-journal-bookmark-fill"></i></div>
                        <h5 class="card-title mb-2">${t('dashboardProviderCoursesCardTitle')}</h5>
                        <p class="card-text display-3 fw-bold mb-3">${providerCourses.length}</p>
                        <a href="#my-courses" class="btn btn-outline-info mt-auto">
                            <i class="bi bi-pencil-square me-1"></i> ${t('dashboardProviderManageCoursesButton')}
                        </a>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card text-center h-100 shadow-sm border-start border-5 border-success">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center py-4">
                        <div class="display-4 text-success mb-3"><i class="bi bi-people-fill"></i></div>
                        <h5 class="card-title mb-2">${t('dashboardProviderEnrollmentsCardTitle')}</h5>
                        <p class="card-text display-3 fw-bold mb-3">${totalEnrollments}</p>
                        <a href="#my-courses" class="btn btn-outline-success mt-auto">
                            <i class="bi bi-eye me-1"></i> ${t('dashboardProviderViewDetailsButton')}
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
    // Render the generated HTML into the main content area
    render(contentHtml, false); // false indicates it's not admin-specific content
}

// Client Dashboard
function renderClientDashboardView() {
    const currentUser = auth.getCurrentUser();
    // Ensure user is a client
    if (!currentUser || currentUser.role !== 'client') {
        console.warn("[View] Attempted to render client dashboard for non-client.");
        window.location.hash = '#login'; // Redirect if not client
        return;
    }

    // --- Notification Logic ---
    const enrolledCourses = store.getCoursesEnrolledByStudent(currentUser.id);
    const lastCheckTimeStr = store.getLastNotificationCheckTime();
    const lastCheckTime = new Date(lastCheckTimeStr);
    let notificationsHtml = '';
    let hasNewNotifications = false;
    console.log(`[Notifications] Last check time: ${lastCheckTimeStr}`);

    enrolledCourses.forEach(course => {
        if (!course || !Array.isArray(course.liveSessions)) return; // Skip if course or sessions invalid

        course.liveSessions.forEach(session => {
            // Check if session exists, has a scheduledAt time, and it's after the last check time
            if (session && session.scheduledAt) {
                 const scheduledAtDate = new Date(session.scheduledAt);
                 if (!isNaN(scheduledAtDate.getTime()) && scheduledAtDate > lastCheckTime) {
                     hasNewNotifications = true;
                     const formattedDateTime = formatDateTime(session.dateTime); // Format session time
                     const courseTitle = course.title || t('untitledCourse', {default: 'Untitled Course'});
                     const sessionTitle = session.title || t('untitledSession', {default: 'Untitled Session'});

                     // Generate notification item HTML
                     notificationsHtml += `
                         <li class="list-group-item list-group-item-action list-group-item-warning d-flex justify-content-between align-items-center animate-new-notification">
                             <span class="me-2">
                                 <i class="bi bi-calendar-event-fill me-2"></i>
                                 ${t('dashboardClientNewSessionNotification', { courseTitle: courseTitle, sessionTitle: sessionTitle, dateTime: formattedDateTime })}
                             </span>
                             <a href="#course-detail/${course.id}" class="btn btn-sm btn-outline-primary ms-auto flex-shrink-0" title="${t('myCoursesDetailsButton')}">
                                <i class="bi bi-box-arrow-up-right"></i>
                             </a>
                         </li>`;
                 }
            } else {
                 console.warn(`[Notifications] Session in course ${course.id} is missing data or scheduledAt:`, session);
            }
        });
    });

     // Update the last notification check time *after* processing all courses
     // Do this regardless of whether new notifications were found, to mark this check time.
     store.updateLastNotificationCheckTime();
     console.log(`[Notifications] Found new notifications: ${hasNewNotifications}`);


    // --- Dashboard Content HTML ---
    const contentHtml = `
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-1 pb-2 mb-3 border-bottom">
            <h1 class="h2">${t('dashboardClientTitle')}</h1>
            ${hasNewNotifications ? `<span class="badge bg-danger rounded-pill ms-2 animate-new-badge">${t('new', {default: 'New'})}</span>` : ''}
        </div>
        <p class="lead text-muted mb-4">${t('dashboardClientWelcome', { username: currentUser.username })}</p>

        <!-- Notifications Section -->
        ${hasNewNotifications ? `
            <div class="card shadow-sm mb-4 border-start border-5 border-warning">
                <div class="card-header bg-warning-subtle text-dark fw-semibold">
                    <i class="bi bi-bell-fill me-1"></i> ${t('dashboardClientNotificationsTitle')}
                </div>
                <ul class="list-group list-group-flush">${notificationsHtml}</ul>
            </div>
        ` : `
           <div class="alert alert-light border text-center mb-4">
             ${t('dashboardClientNoNotifications')}
           </div>
        `}


        <!-- Stats Cards Section -->
        <div class="row g-4">
            <div class="col-lg-6">
                <div class="card text-center h-100 shadow-sm border-start border-5 border-primary">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center py-4">
                        <div class="display-4 text-primary mb-3"><i class="bi bi-check-circle-fill"></i></div>
                        <h5 class="card-title mb-2">${t('dashboardClientEnrolledCardTitle')}</h5>
                        <p class="card-text display-3 fw-bold mb-3">${enrolledCourses.length}</p>
                        <a href="#my-courses" class="btn btn-outline-primary mt-auto">
                            <i class="bi bi-book me-1"></i> ${t('dashboardClientViewMyCoursesButton')}
                        </a>
                    </div>
                </div>
            </div>
            <div class="col-lg-6">
                <div class="card text-center h-100 shadow-sm border-start border-5 border-accent">
                    <div class="card-body d-flex flex-column justify-content-center align-items-center py-4">
                        <div class="display-4 text-accent mb-3"><i class="bi bi-compass-fill"></i></div>
                        <h5 class="card-title mb-2">${t('dashboardClientExploreCardTitle')}</h5>
                        <p class="card-text text-muted mb-3">${t('dashboardClientExploreCardText')}</p>
                        <a href="#browse-courses" class="btn btn-accent text-white mt-auto">
                            <i class="bi bi-search me-1"></i> ${t('dashboardClientBrowseCoursesButton')}
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
    // Render the generated HTML
    render(contentHtml, false);
}


// Admin Dashboard
export function renderAdminDashboard() {
    console.log("[View] Rendering Admin Dashboard");
    destroyAllCharts(); // Ensure previous charts are cleared

    let userCounts, courseCount, totalRevenue, coursesPerProvider, enrollmentStats, priceStats, topCoursesData;
    let statsLoaded = true;

    try {
        console.log("[View] Fetching admin statistics...");
        userCounts = store.getUserCountsByRole();
        courseCount = store.getTotalCourseCount();
        totalRevenue = store.getSimulatedTotalRevenue();
        coursesPerProvider = store.getCoursesPerProviderData();
        enrollmentStats = store.getEnrollmentStats();
        priceStats = store.getCoursePriceStats();
        topCoursesData = store.getTopEnrolledCourses(5); // Get top 5

        // Basic validation of fetched data
        if (!userCounts || !priceStats || !enrollmentStats || !coursesPerProvider || !topCoursesData) {
            throw new Error("One or more statistics datasets failed to load or returned invalid data.");
        }
        console.log("[View] Admin statistics fetched successfully:", { userCounts, courseCount, totalRevenue, coursesPerProvider, enrollmentStats, priceStats, topCoursesData });

    } catch (error) {
        console.error("[View] Error fetching admin stats:", error);
        statsLoaded = false;
        // Render an error message within the admin view area
        render(`<div class="alert alert-danger m-4" role="alert">
                    <h4><i class="bi bi-exclamation-triangle-fill"></i> ${t('errorLoadingData')}</h4>
                    <p>${error.message}</p>
                    <small>Check console for details.</small>
                </div>`, true); // true indicates admin-specific render target
        return; // Stop rendering if stats failed
    }

    // Proceed with rendering if stats loaded
    const contentHtml = `
    <div class="fade-in">
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 class="h2"><i class="bi bi-grid-1x2-fill me-2"></i>${t('dashboardAdminTitle')}</h1>
        </div>

        <!-- Stat Cards Row -->
        <div class="row g-3 mb-4">
            <div class="col-xl-3 col-md-6">
                <div class="stat-card stat-card-users shadow-sm">
                    <div class="stat-icon"><i class="bi bi-people-fill"></i></div>
                    <h5>${t('dashboardAdminCardUsersTitle')}</h5>
                    <div class="stat-value">${userCounts.total}</div>
                    <small>${t('dashboardAdminCardUsersSubtitle', { client: userCounts.client, provider: userCounts.provider, admin: userCounts.admin })}</small>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                <div class="stat-card stat-card-courses shadow-sm">
                    <div class="stat-icon"><i class="bi bi-journal-bookmark-fill"></i></div>
                    <h5>${t('dashboardAdminCardCoursesTitle')}</h5>
                    <div class="stat-value">${courseCount}</div>
                    <small>${t('dashboardAdminCardCoursesSubtitle', { free: priceStats.freeCount, paid: priceStats.paidCount, percentFree: priceStats.percentFree.toFixed(1) })}</small>
                </div>
            </div>
            <div class="col-xl-3 col-md-6">
                 <div class="stat-card stat-card-revenue shadow-sm">
                     <div class="stat-icon"><i class="bi bi-cash-coin"></i></div>
                     <h5>${t('dashboardAdminCardRevenueTitle')}</h5>
                     <div class="stat-value">$${(typeof totalRevenue === 'number' ? totalRevenue.toFixed(2) : 'N/A')}</div>
                     <small>${t('dashboardAdminCardRevenueSubtitle')}</small>
                 </div>
             </div>
             <div class="col-xl-3 col-md-6">
                 <div class="stat-card shadow-sm" style="background: linear-gradient(135deg, #0dcaf0, #5bc0de);">
                     <div class="stat-icon"><i class="bi bi-person-check-fill"></i></div>
                     <h5>${t('dashboardAdminCardEnrollmentsTitle')}</h5>
                     <div class="stat-value">${enrollmentStats.totalEnrollments}</div>
                     <small>${t('dashboardAdminCardEnrollmentsSubtitle', { avg: enrollmentStats.averageEnrollments.toFixed(1) })}</small>
                 </div>
             </div>
        </div>

        <!-- Charts Row -->
        <div class="row g-4">
             <div class="col-lg-4">
                 <div class="card shadow-sm mb-4 h-100">
                     <div class="card-header"><i class="bi bi-graph-up me-2"></i>${t('dashboardAdminQuickStatsTitle')}</div>
                     <div class="card-body">
                         <ul class="list-group list-group-flush">
                             <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">
                                 ${t('dashboardAdminStatAvgPrice')}
                                 <span class="badge bg-success-subtle text-success-emphasis rounded-pill fs-6">$${priceStats.averagePrice.toFixed(2)}</span>
                             </li>
                             <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">
                                 ${t('dashboardAdminStatPercentFree')}
                                 <span class="badge bg-primary-subtle text-primary-emphasis rounded-pill fs-6">${priceStats.percentFree.toFixed(1)}%</span>
                             </li>
                             <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">
                                 ${t('dashboardAdminStatAvgEnroll')}
                                 <span class="badge bg-info-subtle text-info-emphasis rounded-pill fs-6">${enrollmentStats.averageEnrollments.toFixed(1)}</span>
                             </li>
                             <li class="list-group-item d-flex justify-content-between align-items-center px-0 border-0">
                                 ${t('dashboardAdminStatProviders')}
                                 <span class="badge bg-secondary-subtle text-secondary-emphasis rounded-pill fs-6">${userCounts.provider}</span>
                             </li>
                         </ul>
                     </div>
                 </div>
             </div>
            <div class="col-lg-4">
                <div class="card shadow-sm mb-4 h-100">
                    <div class="card-header">${t('dashboardAdminChartUserRoleTitle')}</div>
                    <div class="card-body d-flex justify-content-center align-items-center">
                        <div class="chart-container" style="height: 260px; max-width: 320px;">
                            <canvas id="userRoleChart"></canvas> <!-- Canvas for Chart.js -->
                         </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="card shadow-sm mb-4 h-100">
                    <div class="card-header">${t('dashboardAdminChartTopCoursesTitle', { count: topCoursesData.labels.length })}</div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 260px;">
                            <canvas id="topCoursesChart"></canvas> <!-- Canvas for Chart.js -->
                         </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Full Width Chart Row -->
        <div class="row g-4 mt-1">
             <div class="col-lg-12">
                 <div class="card shadow-sm">
                     <div class="card-header">${t('dashboardAdminChartCoursesPerProviderTitle')}</div>
                     <div class="card-body">
                         <div class="chart-container" style="height: 50vh; min-height: 350px; max-height: 600px;">
                            <canvas id="coursesPerProviderChart"></canvas> <!-- Canvas for Chart.js -->
                         </div>
                     </div>
                 </div>
             </div>
         </div>
    </div>`;

    render(contentHtml, true); // Render into admin area

    // Initialize charts AFTER the DOM is updated
    // Use requestAnimationFrame and setTimeout for robustness
    requestAnimationFrame(() => {
        setTimeout(() => {
            // Check if we are still on the admin dashboard page before initializing
            if (window.location.hash === '#admin-dashboard') {
                initializeAdminCharts(userCounts, coursesPerProvider, topCoursesData);
            } else {
                 console.log("[View] Hash changed before charts could initialize. Skipping chart init.");
            }
        }, 50); // Small delay to ensure DOM is fully ready
    });
}

// Helper function to render "No Data" message on a canvas
function renderNoData(canvasId, message) {
    const canvas = document.getElementById(canvasId);
    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        // Clear previous content
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Style and draw text
        ctx.save(); // Save context state
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6c757d'; // Bootstrap text-muted color
        ctx.font = '16px "Poppins", sans-serif'; // Match body font
        // Adjust position based on canvas size (may need refinement)
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        ctx.restore(); // Restore context state
        console.log(`[Chart] Rendered '${message}' on canvas #${canvasId}`);
    } else {
        console.warn(`[Chart] Canvas element #${canvasId} not found for rendering no data message.`);
    }
}


// Chart Initialization Function (Admin Dashboard)
function initializeAdminCharts(userCounts, coursesPerProvider, topCourses) {
    console.log("[Charts] Initializing Admin Dashboard charts...");

    // Check if Chart.js library is loaded
    if (typeof Chart === 'undefined') {
        console.error("[Charts] FATAL: Chart.js library is not loaded! Cannot initialize charts.");
        // Optionally display an error message in the chart containers
        renderNoData('userRoleChart', 'Chart library failed to load.');
        renderNoData('topCoursesChart', 'Chart library failed to load.');
        renderNoData('coursesPerProviderChart', 'Chart library failed to load.');
        return;
    }

    const noDataText = t('dashboardAdminNoData') || 'No data available';

    // --- User Role Doughnut Chart ---
    const userRoleCtx = document.getElementById('userRoleChart');
    destroyChart('userRoleChart'); // Destroy previous instance if exists
    if (userRoleCtx && userCounts && userCounts.total > 0) {
        try {
            activeCharts['userRoleChart'] = new Chart(userRoleCtx, {
                type: 'doughnut',
                data: {
                    labels: [t('roleClient'), t('roleProvider'), t('roleAdmin')],
                    datasets: [{
                        label: t('userRole'), // Translated label
                        data: [userCounts.client || 0, userCounts.provider || 0, userCounts.admin || 0], // Ensure data exists
                        backgroundColor: [
                            'rgba(var(--bs-primary-rgb), 0.7)',
                            'rgba(var(--app-secondary-rgb), 0.7)', // Use custom secondary
                            'rgba(108, 117, 125, 0.7)' // Bootstrap gray
                        ],
                        borderColor: '#fff',
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { padding: 15, usePointStyle: true }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.label}: ${ctx.parsed}` // Simple label format
                            }
                        }
                    },
                    cutout: '60%' // Make it a doughnut
                }
            });
             console.log("[Chart] User Role Chart initialized.");
        } catch (e) {
            console.error("[Charts] Error initializing User Role Chart:", e);
            renderNoData('userRoleChart', 'Error loading chart data.');
        }
    } else if (userRoleCtx) {
        renderNoData('userRoleChart', noDataText); // Render no data message if context exists but no data
    }

    // --- Top Enrolled Courses Bar Chart ---
    const topCoursesCtx = document.getElementById('topCoursesChart');
     destroyChart('topCoursesChart'); // Destroy previous instance
    if (topCoursesCtx && topCourses && topCourses.labels && topCourses.labels.length > 0) {
         try {
            activeCharts['topCoursesChart'] = new Chart(topCoursesCtx, {
                type: 'bar',
                data: {
                    // Truncate long labels for better display
                    labels: topCourses.labels.map(l => (l.length > 25 ? l.substring(0, 22) + '...' : l)),
                    datasets: [{
                        label: t('dashboardAdminCardEnrollmentsTitle'), // Translated label
                        data: topCourses.data,
                        backgroundColor: 'rgba(var(--bs-info-rgb), 0.6)',
                        borderColor: 'rgba(var(--bs-info-rgb), 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false // Ensure border radius applies nicely
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }, // Integer ticks for enrollments
                        x: { ticks: { display: true, autoSkip: true, maxRotation: 0 } } // Auto skip labels if too many
                    },
                    plugins: {
                        legend: { display: false }, // Hide legend for single dataset bar chart
                        tooltip: {
                            callbacks: {
                                // Show full title in tooltip if truncated
                                title: (tooltipItems) => topCourses.labels[tooltipItems[0].dataIndex],
                                label: ctx => ` ${t('dashboardAdminCardEnrollmentsTitle')}: ${ctx.parsed.y}`
                            }
                        }
                    }
                }
            });
            console.log("[Chart] Top Courses Chart initialized.");
        } catch (e) {
            console.error("[Charts] Error initializing Top Courses Chart:", e);
             renderNoData('topCoursesChart', 'Error loading chart data.');
        }
    } else if (topCoursesCtx) {
        renderNoData('topCoursesChart', noDataText);
    }

    // --- Courses Per Provider Horizontal Bar Chart ---
    const cppCtx = document.getElementById('coursesPerProviderChart');
    destroyChart('coursesPerProviderChart'); // Destroy previous instance
    if (cppCtx && coursesPerProvider && coursesPerProvider.labels && coursesPerProvider.labels.length > 0) {
        try {
            activeCharts['coursesPerProviderChart'] = new Chart(cppCtx, {
                type: 'bar', // Use bar type
                data: {
                    labels: coursesPerProvider.labels,
                    datasets: [{
                        label: `# ${t('dashboardAdminCardCoursesTitle')}`, // Translated label
                        data: coursesPerProvider.data,
                        backgroundColor: 'rgba(var(--app-secondary-rgb), 0.6)', // Use custom secondary color
                        borderColor: 'rgba(var(--app-secondary-rgb), 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    indexAxis: 'y', // Make it a horizontal bar chart
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true, ticks: { precision: 0 } }, // Integer ticks for course count
                        y: { ticks: { autoSkip: false, padding: 5 } } // Don't auto-skip provider names usually
                    },
                    plugins: {
                        legend: { display: false }, // Hide legend
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${t('dashboardAdminCardCoursesTitle')}: ${ctx.parsed.x}` // Use x-axis value for horizontal bar
                            }
                        }
                    }
                }
            });
             console.log("[Chart] Courses Per Provider Chart initialized.");
        } catch (e) {
            console.error("[Charts] Error initializing Courses Per Provider Chart:", e);
            renderNoData('coursesPerProviderChart', 'Error loading chart data.');
        }
    } else if (cppCtx) {
        renderNoData('coursesPerProviderChart', noDataText);
    }

    console.log("[Charts] --- Admin Chart Initialization Complete ---");
}


// Admin User Management Page
export function renderAdminUsersPage() {
    const users = store.getUsers(); // Fetch users from store

    // Map user data to table rows
    const userRowsHtml = users.map(user => {
        if (!user) return ''; // Skip if user data is somehow null/undefined

        // Determine badge class based on role
        let roleBadgeClass = 'bg-secondary'; // Default
        let roleTextClass = ''; // Default text color class
        const roleKey = `role${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}`; // Translation key
        switch(user.role) {
            case 'admin':    roleBadgeClass = 'bg-danger'; break;
            case 'provider': roleBadgeClass = 'bg-info'; roleTextClass = 'text-dark'; break; // Dark text on light info bg
            case 'client':   roleBadgeClass = 'bg-primary'; break;
            default:         roleBadgeClass = 'bg-warning'; roleTextClass = 'text-dark'; break; // Unknown role
        }

        const joinedDate = user.createdAt ? formatDateTime(user.createdAt) : t('notAvailable', {default: 'N/A'}); // Format join date

        // Generate table row HTML
        return `
            <tr>
                <td class="text-muted small"><code class="user-id">${user.id || 'N/A'}</code></td>
                <td><i class="bi bi-person-fill text-muted opacity-75"></i> ${user.username || t('notAvailable', {default: 'N/A'})}</td>
                <td>
                    <span class="badge rounded-pill ${roleBadgeClass} ${roleTextClass} text-capitalize px-3 py-1 fs-7">
                        ${t(roleKey, { default: user.role || 'Unknown' })}
                    </span>
                </td>
                <td>${joinedDate}</td>
                <td>
                    <!-- Action buttons (currently disabled) -->
                    <button class="btn btn-sm btn-outline-secondary disabled me-1" title="${t('featureNotAvailable', {default: 'Feature not available'})}">
                        <i class="bi bi-pencil-square"></i> <span class="d-none d-md-inline">${t('courseDetailEditButton')}</span>
                    </button>
                    <button class="btn btn-sm btn-outline-danger disabled" title="${t('featureNotAvailable', {default: 'Feature not available'})}">
                        <i class="bi bi-trash"></i> <span class="d-none d-md-inline">${t('courseDetailDeleteButton')}</span>
                    </button>
                </td>
            </tr>`;
    }).join(''); // Join the array of rows into a single string

    // Construct the full page HTML
    const contentHtml = `
    <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 class="h2"><i class="bi bi-people-fill me-2"></i>${t('adminUsersTitle')}</h1>
            <button class="btn btn-sm btn-primary disabled" title="${t('featureNotAvailable', {default: 'Feature not available'})}">
                <i class="bi bi-plus-circle me-1"></i> ${t('adminUsersAddButton')}
            </button>
        </div>

        <div class="card shadow-sm">
            <div class="card-header">
                <span>${t('adminUsersListTitle')}</span>
                <span class="badge bg-light text-dark rounded-pill ms-auto">${t('adminUsersTotal', { count: users.length })}</span>
            </div>
            <div class="table-responsive">
                <table class="table table-hover table-striped table-vcenter mb-0"> <!-- Removed table-borderless for clarity -->
                    <thead class="table-light">
                        <tr>
                            <th class="ps-3">${t('adminUsersHeaderId')}</th>
                            <th>${t('adminUsersHeaderUsername')}</th>
                            <th>${t('adminUsersHeaderRole')}</th>
                            <th>${t('adminUsersHeaderJoined')}</th>
                            <th>${t('adminUsersHeaderActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.length > 0 ? userRowsHtml : `<tr><td colspan="5" class="text-center text-muted p-4">${t('adminUsersNoUsers')}</td></tr>`}
                    </tbody>
                </table>
            </div>
            ${users.length > 20 ? `<div class="card-footer text-muted small text-center">(${t('paginationNotAvailable', {default: 'Pagination N/A'})})</div>` : ''}
        </div>
    </div>`;

    render(contentHtml, true); // Render as admin-specific content
}

// Admin Course Management Page
export function renderAdminCoursesPage() {
    const courses = store.getCourses(); // Fetch courses from store

    // Map course data to table rows
    const courseRowsHtml = courses.map(course => {
        if (!course) return ''; // Skip if course data is null/undefined

        const provider = store.findUserById(course.providerId); // Find provider details
        const enrollmentCount = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0; // Safely get count
        const price = parseFloat(course.price);
        const priceFormatted = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : `$${price.toFixed(2)}`;
        const priceClass = (isNaN(price) || price <= 0) ? 'text-primary fw-semibold' : 'text-success fw-bold';
        const createdDate = course.createdAt ? formatDateTime(course.createdAt) : t('notAvailable', {default: 'N/A'}); // Format creation date

        // Generate table row HTML
        return `
            <tr>
                <td class="text-muted small"><code class="course-id">${course.id || 'N/A'}</code></td>
                <td>${course.title || t('untitledCourse', {default: 'Untitled Course'})}</td>
                <td>
                    ${provider ? provider.username : `<span class="text-muted fst-italic">${t('unknownProvider', {default: 'Unknown'})}</span>`}
                    ${provider ? `<code class="ms-1 small provider-id">(${provider.id})</code>` : ''}
                </td>
                <td class="text-end fw-bold ${priceClass}">${priceFormatted}</td>
                <td class="text-center">${enrollmentCount}</td>
                <td>${createdDate}</td>
                <td>
                    <!-- Action Buttons -->
                    <a href="#course-detail/${course.id}" class="btn btn-sm btn-outline-primary me-1" title="${t('myCoursesDetailsButton')}">
                        <i class="bi bi-eye"></i> <span class="d-none d-lg-inline">${t('viewAction', {default: 'View'})}</span>
                    </a>
                    <button class="btn btn-sm btn-outline-secondary disabled me-1" title="${t('featureNotAvailable', {default: 'Feature not available'})}">
                        <i class="bi bi-pencil-square"></i> <span class="d-none d-lg-inline">${t('courseDetailEditButton')}</span>
                    </button>
                     <!-- Admin Delete Button - uses the same class as provider delete -->
                     <button class="btn btn-sm btn-outline-danger delete-course-button" data-course-id="${course.id}" title="${t('courseDetailDeleteButton')}">
                         <i class="bi bi-trash"></i> <span class="d-none d-lg-inline">${t('courseDetailDeleteButton')}</span>
                     </button>
                </td>
            </tr>`;
    }).join(''); // Join the array of rows

    // Construct the full page HTML
    const contentHtml = `
    <div class="fade-in">
        <div class="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
            <h1 class="h2"><i class="bi bi-journal-bookmark-fill me-2"></i>${t('adminCoursesTitle')}</h1>
            <button class="btn btn-sm btn-success disabled" title="${t('featureNotAvailable', {default: 'Feature not available'})}">
                <i class="bi bi-plus-circle me-1"></i> ${t('adminCoursesAddButton')}
            </button>
        </div>

        <div class="card shadow-sm">
             <div class="card-header">
                 <span>${t('adminCoursesListTitle')}</span>
                 <span class="badge bg-light text-dark rounded-pill ms-auto">${t('adminCoursesTotal', { count: courses.length })}</span>
             </div>
            <div class="table-responsive">
                <table class="table table-hover table-striped table-vcenter mb-0"> <!-- Removed table-borderless -->
                    <thead class="table-light">
                        <tr>
                            <th class="ps-3">${t('adminCoursesHeaderId')}</th>
                            <th>${t('adminCoursesHeaderTitle')}</th>
                            <th>${t('adminCoursesHeaderProvider')}</th>
                            <th class="text-end">${t('adminCoursesHeaderPrice')}</th>
                            <th class="text-center">${t('adminCoursesHeaderEnrollments')}</th>
                            <th>${t('adminCoursesHeaderCreated')}</th>
                            <th>${t('adminCoursesHeaderActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${courses.length > 0 ? courseRowsHtml : `<tr><td colspan="7" class="text-center text-muted p-4">${t('adminCoursesNoCourses')}</td></tr>`}
                    </tbody>
                </table>
            </div>
             ${courses.length > 20 ? `<div class="card-footer text-muted small text-center">(${t('paginationNotAvailable', {default: 'Pagination N/A'})})</div>` : ''}
        </div>
    </div>`;

    render(contentHtml, true); // Render as admin-specific content
}


// --- General Pages ---

// Home Page
export function renderHomePage() {
    const currentUser = auth.getCurrentUser();
    let welcomeHtml = '', ctaHtml = '';

    if (currentUser) {
        // Logged-in user view
        welcomeHtml = `
            <h1 class="display-5 fw-bold">${t('welcomeBack')} ${currentUser.username}!</h1>
            <p class="lead text-muted">${t('homePromptLoggedIn')}</p>`; // Removed default, rely on translation
        // Role-specific CTAs
        if (currentUser.role === 'client') {
            ctaHtml = `
                <a href="#browse-courses" class="btn btn-primary btn-lg me-sm-2 mb-2 mb-sm-0">
                    <i class="bi bi-compass me-1"></i> ${t('navBrowseCourses')}
                </a>
                <a href="#my-courses" class="btn btn-outline-secondary btn-lg">
                    <i class="bi bi-bookmark-check me-1"></i> ${t('navMyCourses')}
                </a>`;
        } else if (currentUser.role === 'provider') {
            ctaHtml = `
                <a href="#create-course" class="btn btn-success btn-lg me-sm-2 mb-2 mb-sm-0">
                    <i class="bi bi-plus-circle me-1"></i> ${t('navCreateCourse')}
                </a>
                <a href="#my-courses" class="btn btn-outline-secondary btn-lg">
                    <i class="bi bi-journal-richtext me-1"></i> ${t('dashboardProviderManageCoursesButton')}
                </a>`;
        } else if (currentUser.role === 'admin') {
            ctaHtml = `
                <a href="#admin-dashboard" class="btn btn-secondary btn-lg">
                    <i class="bi bi-shield-lock me-1"></i> ${t('navAdminPanel')}
                </a>`;
        }
    } else {
        // Logged-out user view
        welcomeHtml = `
            <h1 class="display-4 fw-bold">${t('homeTitleLoggedOut')}</h1>
            <p class="lead text-muted col-lg-8 mx-auto">${t('homeSubtitleLoggedOut')}</p>`;
        ctaHtml = `
            <a href="#browse-courses" class="btn btn-primary btn-lg me-sm-2 mb-2 mb-sm-0">
                <i class="bi bi-search me-1"></i> ${t('navBrowseCourses')}
            </a>
            <a href="#register" class="btn btn-accent btn-lg text-white">
                <i class="bi bi-person-plus-fill me-1"></i> ${t('navRegister')}
            </a>`;
    }

    // Assemble the final HTML
    const contentHtml = `
        <div class="container py-5">
             <div class="text-center px-4 py-5 mb-4 bg-white rounded-3 shadow-lg fade-in border-top border-5 border-primary">
                 ${welcomeHtml}
                 <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mt-4 pt-2">
                     ${ctaHtml}
                 </div>
             </div>
         </div>`;

    render(contentHtml, false); // Render as general content
}

// Login Page
export function renderLoginPage() {
     // Redirect if already logged in
     if (auth.isLoggedIn()) {
        console.log("[View] User already logged in, redirecting to dashboard.");
        window.location.hash = '#dashboard';
        return;
     }
     // Use template literals and translation keys
     const contentHtml = `
        <div class="container pt-5 pb-4">
            <div class="row justify-content-center fade-in">
                <div class="col-md-7 col-lg-5 col-xl-4">
                    <div class="card shadow-lg border-0 rounded-3 mt-4">
                        <div class="card-body p-4 p-lg-5">
                            <div class="text-center mb-4">
                                <a href="#home"><i class="bi bi-mortarboard-fill display-3 text-primary"></i></a>
                                <h2 class="card-title mt-3 fw-bold">${t('welcomeBack')}</h2>
                                <p class="text-muted">${t('loginPrompt')}</p>
                            </div>
                            <form id="login-form" novalidate>
                                <!-- Alert placeholder -->
                                <div id="login-alert" class="alert d-none mb-3" role="alert"></div>
                                <!-- Username -->
                                <div class="form-floating mb-3">
                                    <input type="text" class="form-control" id="login-username" name="username" placeholder="${t('loginUsernameLabel')}" required autocomplete="username">
                                    <label for="login-username">${t('loginUsernameLabel')}</label>
                                </div>
                                <!-- Password -->
                                <div class="form-floating mb-4">
                                    <input type="password" class="form-control" id="login-password" name="password" placeholder="${t('loginPasswordLabel')}" required autocomplete="current-password">
                                    <label for="login-password">${t('loginPasswordLabel')}</label>
                                </div>
                                <!-- Submit Button -->
                                <div class="d-grid mb-3">
                                    <button type="submit" class="btn btn-primary btn-lg">
                                        <i class="bi bi-box-arrow-in-right"></i> ${t('loginButton')}
                                    </button>
                                </div>
                            </form>
                            <p class="mt-4 text-center text-muted small mb-0">
                                ${t('loginNoAccount')} <a href="#register" class="fw-medium link-primary">${t('loginSignUpLink')}</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    render(contentHtml, false); // Render as general content
}

// Registration Page
export function renderRegisterPage() {
     // Redirect if already logged in
      if (auth.isLoggedIn()) {
         console.log("[View] User already logged in, redirecting to dashboard.");
         window.location.hash = '#dashboard';
         return;
      }
    // Use template literals and translation keys
    const contentHtml = `
        <div class="container pt-5 pb-4">
            <div class="row justify-content-center fade-in">
                <div class="col-md-9 col-lg-7 col-xl-6">
                    <div class="card shadow-lg border-0 rounded-3 mt-4">
                        <div class="card-body p-4 p-lg-5">
                            <div class="text-center mb-4">
                                <a href="#home"><i class="bi bi-person-plus-fill display-3 text-accent"></i></a>
                                <h2 class="card-title mt-3 fw-bold">${t('registerTitle')}</h2>
                                <p class="text-muted">${t('registerPrompt')}</p>
                            </div>
                            <form id="register-form" novalidate>
                                <!-- Alert placeholder -->
                                <div id="register-alert" class="alert d-none mb-3" role="alert"></div>
                                <!-- Username -->
                                <div class="form-floating mb-3">
                                    <input type="text" class="form-control" id="register-username" placeholder="${t('registerUsernameLabel')}" required minlength="3">
                                    <label for="register-username">${t('registerUsernameLabel')}</label>
                                    <div class="form-text small px-2 text-muted">${t('registerUsernameHint')}</div>
                                </div>
                                <!-- Password Fields Row -->
                                <div class="row g-2 mb-3">
                                    <div class="col-md-6">
                                        <div class="form-floating">
                                            <input type="password" class="form-control" id="register-password" placeholder="${t('registerPasswordLabel')}" required minlength="6">
                                            <label for="register-password">${t('registerPasswordLabel')}</label>
                                        </div>
                                        <div class="form-text small px-2 text-muted">${t('registerPasswordHint')}</div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-floating">
                                            <input type="password" class="form-control" id="register-confirm-password" placeholder="${t('registerConfirmPasswordLabel')}" required minlength="6">
                                            <label for="register-confirm-password">${t('registerConfirmPasswordLabel')}</label>
                                        </div>
                                    </div>
                                </div>
                                <!-- Role Select -->
                                <div class="form-floating mb-3">
                                    <select class="form-select" id="register-role" required>
                                        <option value="" selected disabled>${t('registerRoleSelectDefault')}</option>
                                        <option value="client">${t('roleClient')}</option>
                                        <option value="provider">${t('roleProvider')}</option>
                                        <option value="admin">${t('registerRoleAdminOption')}</option>
                                    </select>
                                    <label for="register-role">${t('registerRoleLabel')}</label>
                                </div>
                                <!-- Admin Code Field (Initially Hidden) -->
                                <div class="form-floating mb-4" id="admin-code-group" style="display: none;">
                                    <input type="password" class="form-control" id="register-admin-code" placeholder="${t('registerAdminCodeLabel')}">
                                    <label for="register-admin-code">${t('registerAdminCodeLabel')}</label>
                                </div>
                                <!-- Submit Button -->
                                <div class="d-grid">
                                    <button type="submit" class="btn btn-accent btn-lg text-white">
                                        <i class="bi bi-check-circle-fill"></i> ${t('registerButton')}
                                    </button>
                                </div>
                            </form>
                            <p class="mt-4 text-center text-muted small mb-0">
                                ${t('registerHaveAccount')} <a href="#login" class="fw-medium link-primary">${t('registerLoginLink')}</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    render(contentHtml, false); // Render as general content
    // Set up the dynamic visibility of the admin code field after rendering
    setupDynamicFormFields();
}

// Helper for Register Page - Show/Hide Admin Code Field
function setupDynamicFormFields() {
    const roleSelect = document.getElementById('register-role');
    const adminCodeGroup = document.getElementById('admin-code-group');
    const adminCodeInput = document.getElementById('register-admin-code');

    if (!roleSelect || !adminCodeGroup || !adminCodeInput) {
        console.warn("[View] Registration form dynamic fields not found. Admin code toggle might not work.");
        return;
    }

    const toggleAdminField = () => {
        if (roleSelect.value === 'admin') {
            adminCodeGroup.style.display = 'block'; // Show the field
            adminCodeInput.required = true; // Make it required
        } else {
            adminCodeGroup.style.display = 'none'; // Hide the field
            adminCodeInput.required = false; // Make it not required
            adminCodeInput.value = ''; // Clear the value if role changes
        }
    };

    // Initial check in case the form is pre-filled or reloaded
    toggleAdminField();
    // Add event listener for changes
    roleSelect.addEventListener('change', toggleAdminField);
}

// Create Course Page
export function renderCreateCoursePage() {
    const currentUser = auth.getCurrentUser();
    // Protect the route: only providers can access
    if (!currentUser || currentUser.role !== 'provider') {
        console.warn("[View] Non-provider attempted to access create course page.");
        renderTemporaryMessage('alertTempProviderRequired', 'warning'); // Show warning
        setTimeout(() => { window.location.hash = '#dashboard'; }, 2500); // Redirect after delay
        return;
    }
    // Use template literals and translation keys
    const contentHtml = `
        <div class="container pt-5 pb-4">
            <div class="row justify-content-center fade-in">
                <div class="col-md-10 col-lg-8">
                    <div class="card shadow-sm border-0 rounded-3 mt-4">
                        <div class="card-header bg-success-subtle text-success-emphasis border-0 pt-4 pb-3">
                            <h2 class="card-title text-center mb-0 fw-bold">
                                <i class="bi bi-plus-circle-fill me-2"></i>${t('createCourseTitle')}
                            </h2>
                        </div>
                        <div class="card-body p-4 p-lg-5">
                            <form id="create-course-form" novalidate>
                                <!-- Alert placeholder -->
                                <div id="course-alert" class="alert d-none mb-4" role="alert"></div>
                                <!-- Course Title -->
                                <div class="form-floating mb-3">
                                    <input type="text" class="form-control" id="course-title" placeholder="${t('createCourseTitleLabel')}" required>
                                    <label for="course-title">${t('createCourseTitleLabel')}</label>
                                </div>
                                <!-- Course Description -->
                                <div class="form-floating mb-3">
                                    <textarea class="form-control" id="course-description" placeholder="${t('createCourseDescLabel')}" style="height: 150px" required></textarea>
                                    <label for="course-description">${t('createCourseDescLabel')}</label>
                                    <div class="form-text px-2 text-muted">${t('createCourseDescHint')}</div>
                                </div>
                                <!-- Course Price -->
                                <div class="form-floating mb-4">
                                    <input type="number" class="form-control" id="course-price" step="0.01" min="0" required placeholder="${t('createCoursePriceLabel')}">
                                    <label for="course-price">${t('createCoursePriceLabel')}</label>
                                     <!-- Use innerHTML for hint that includes <strong> -->
                                    <div class="form-text px-2 text-muted" dangerouslySetInnerHTML={{ __html: t('createCoursePriceHint') }}></div>
                                </div>
                                <!-- Action Buttons -->
                                <div class="d-grid gap-2 d-sm-flex justify-content-sm-end">
                                    <a href="#my-courses" class="btn btn-outline-secondary px-4">${t('createCourseCancelButton')}</a>
                                    <button type="submit" class="btn btn-success btn-lg px-4">
                                        <i class="bi bi-cloud-arrow-up-fill"></i> ${t('createCourseCreateButton')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    render(contentHtml, false); // Render as general content

     // The dangerouslySetInnerHTML part above is React syntax. For plain JS/jQuery:
     $('#create-course-price').siblings('.form-text').html(t('createCoursePriceHint'));

}

// Browse Courses Page
export function renderBrowseCoursesPage() {
     const allCourses = store.getCourses();
     const currentUser = auth.getCurrentUser();
     let coursesHtml = '';

     // Check if courses data is valid
     if (Array.isArray(allCourses) && allCourses.length > 0) {
         coursesHtml = allCourses.map(course => {
             // Skip if course data is invalid or missing ID
             if (!course?.id || !course.title) return '';

             const provider = store.findUserById(course.providerId);
             const isEnrolled = currentUser?.role === 'client' && Array.isArray(course.enrolledStudentIds) && course.enrolledStudentIds.includes(currentUser.id);
             const canEnroll = currentUser?.role === 'client' && !isEnrolled;
             const isGuest = !currentUser;

             const price = parseFloat(course.price);
             const priceText = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : `$${price.toFixed(2)}`;
             const priceClass = (isNaN(price) || price <= 0) ? 'free text-primary fw-semibold' : 'text-success fw-bold';

             const courseIcon = getCourseIcon(course.title);
             const shortDesc = course.description ? (course.description.length > 100 ? course.description.substring(0, 97) + '...' : course.description) : t('browseCoursesNoDesc');

             // Determine action button based on user status
             let actionBtn = '';
             if (canEnroll) {
                 actionBtn = `<button class="btn btn-primary btn-sm enroll-button w-100" data-course-id="${course.id}"><i class="bi bi-plus-circle me-1"></i>${t('browseCoursesEnrollButton')}</button>`;
             } else if (isEnrolled) {
                 actionBtn = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`;
             } else if (isGuest) {
                 actionBtn = `<a href="#login" class="btn btn-outline-secondary btn-sm w-100"><i class="bi bi-box-arrow-in-right me-1"></i>${t('browseCoursesLoginButton')}</a>`;
             } else {
                 // Handle other roles (provider, admin) - maybe show nothing or a specific message
                 actionBtn = `<span class="badge bg-light text-dark p-2 w-100">${t('browseCoursesProviderAdminView', {default: 'Provider/Admin View'})}</span>`;
             }

             // Return card HTML
             return `
                <div class="col-sm-6 col-lg-4 col-xl-3 mb-4 d-flex align-items-stretch">
                    <div class="card course-card h-100 shadow-sm w-100 border-0">
                        <div class="card-img-placeholder" title="${course.title || ''}">
                            <i class="bi ${courseIcon}"></i>
                        </div>
                        <div class="card-body d-flex flex-column p-3">
                            <h5 class="card-title mb-1 fw-medium">${course.title}</h5>
                            <h6 class="card-subtitle mb-2 text-muted small">
                                ${t('browseCoursesBy', { provider: provider?.username || t('unknownProvider', {default: 'Unknown'}) })}
                            </h6>
                            <p class="card-text description-preview flex-grow-1 small text-secondary">${shortDesc}</p>
                            <div class="mt-auto pt-2">
                                <p class="price mb-3 fs-5 ${priceClass}">${priceText}</p>
                                <div class="d-flex justify-content-between gap-2">
                                    <a href="#course-detail/${course.id}" class="btn btn-outline-primary btn-sm px-3 flex-shrink-0">${t('browseCoursesDetailsButton')}</a>
                                    <div class="enroll-section flex-grow-1">${actionBtn}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
         }).join('');
     } else {
         // Message when no courses are available
         coursesHtml = `
            <div class="col-12">
                <div class="alert alert-info text-center mt-4 shadow-sm">
                    <i class="bi bi-info-circle me-2"></i> ${t('browseCoursesNoCourses')}
                </div>
            </div>`;
     }

     // Full page content
     const contentHtml = `
        <div class="container pt-4 pb-4">
             <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                 <h2 class="display-5 fw-light mb-0"><i class="bi bi-compass me-2 text-primary"></i>${t('browseCoursesTitle')}</h2>
                 <!-- Add search/filter controls here later if needed -->
             </div>
             <!-- Global alert area for enrollment actions on this page -->
             <div id="enroll-alert" class="alert d-none my-3 mx-0" role="alert"></div>
             <div class="row fade-in">${coursesHtml}</div>
         </div>`;
     render(contentHtml, false); // Render as general content
}

// My Courses Page
export function renderMyCoursesPage() {
    const currentUser = auth.getCurrentUser();
    // Redirect if not logged in
    if (!currentUser) {
        window.location.hash = '#login';
        return;
    }

    let pageTitle = '', pageIcon = '', courses = [], emptyMsg = '', cardGenerator;

    // Configure based on user role
    if (currentUser.role === 'provider') {
        pageTitle = t('myCoursesProviderTitle');
        pageIcon = 'bi-journal-richtext'; // Icon for providers
        courses = store.getCoursesByProvider(currentUser.id);
        emptyMsg = `
            <div class="col-12">
                <div class="alert alert-light text-center border shadow-sm mt-4 p-4">
                    <h4 class="alert-heading">${t('myCoursesProviderNoCoursesTitle')}</h4>
                    <p>${t('myCoursesProviderNoCoursesText')}</p>
                    <hr>
                    <a href="#create-course" class="btn btn-success">
                        <i class="bi bi-plus-circle me-1"></i>${t('myCoursesProviderNoCoursesButton')}
                    </a>
                </div>
            </div>`;
        // Card generator function for provider's courses
        cardGenerator = (course) => {
            if (!course) return '';
            const enrollmentCount = course.enrolledStudentIds?.length || 0;
            const price = parseFloat(course.price);
            const priceText = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : `$${price.toFixed(2)}`;
            const priceClass = (isNaN(price) || price <= 0) ? 'text-primary fw-semibold' : 'text-success fw-bold';
            const icon = getCourseIcon(course.title);
            const studentsKey = enrollmentCount === 1 ? 'myCoursesEnrolledStudents' : 'myCoursesEnrolledStudentsPlural';
            return `
                <div class="col-sm-6 col-lg-4 col-xl-3 mb-4 d-flex align-items-stretch">
                    <div class="card course-card h-100 shadow-sm w-100 border-0">
                        <div class="card-img-placeholder" title="${course.title || ''}"><i class="bi ${icon}"></i></div>
                        <div class="card-body d-flex flex-column p-3">
                            <h5 class="card-title fw-medium">${course.title}</h5>
                            <p class="price mt-2 mb-1 fs-5 ${priceClass}">${priceText}</p>
                            <p class="mb-3 small text-muted flex-grow-1">
                                <i class="bi bi-people me-1"></i>${t(studentsKey, { count: enrollmentCount })}
                            </p>
                            <div class="mt-auto d-flex justify-content-between pt-2 border-top">
                                <a href="#course-detail/${course.id}" class="btn btn-outline-primary btn-sm px-3" title="${t('myCoursesDetailsButton')}">
                                    <i class="bi bi-search"></i> ${t('myCoursesDetailsButton')}
                                </a>
                                <button class="btn btn-outline-danger btn-sm delete-course-button" data-course-id="${course.id}" title="${t('myCoursesDeleteButton')}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        };
    } else { // Assume client role (or default view)
        pageTitle = t('myCoursesClientTitle');
        pageIcon = 'bi-bookmark-check-fill'; // Icon for clients
        courses = store.getCoursesEnrolledByStudent(currentUser.id);
        emptyMsg = `
            <div class="col-12">
                <div class="alert alert-light text-center border shadow-sm mt-4 p-4">
                    <h4 class="alert-heading">${t('myCoursesClientNoCoursesTitle')}</h4>
                    <p>${t('myCoursesClientNoCoursesText')}</p>
                    <hr>
                    <a href="#browse-courses" class="btn btn-primary">
                        <i class="bi bi-search me-1"></i>${t('myCoursesClientNoCoursesButton')}
                    </a>
                </div>
            </div>`;
        // Card generator function for client's enrolled courses
        cardGenerator = (course) => {
            if (!course) return '';
            const provider = store.findUserById(course.providerId);
            const price = parseFloat(course.price);
            // Show 'Purchased' or 'Free' based on the price
            const priceText = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : t('myCoursesPricePurchased', { price: price.toFixed(2) });
            const priceClass = (isNaN(price) || price <= 0) ? 'text-primary fw-semibold' : 'text-success fw-semibold';
            const icon = getCourseIcon(course.title);
            const shortDesc = course.description ? (course.description.length > 90 ? course.description.substring(0, 87) + '...' : course.description) : t('browseCoursesNoDesc');
            return `
                <div class="col-sm-6 col-lg-4 col-xl-3 mb-4 d-flex align-items-stretch">
                    <div class="card course-card h-100 shadow-sm w-100 border-0">
                         <div class="card-img-placeholder" title="${course.title || ''}"><i class="bi ${icon}"></i></div>
                         <div class="card-body d-flex flex-column p-3">
                             <h5 class="card-title fw-medium">${course.title}</h5>
                             <h6 class="card-subtitle mb-2 text-muted small">
                                 ${t('browseCoursesBy', { provider: provider?.username || t('unknownProvider', {default: 'Unknown'}) })}
                             </h6>
                             <p class="card-text description-preview flex-grow-1 small text-secondary">${shortDesc}</p>
                             <p class="price mt-auto mb-3 fs-6 ${priceClass}">${priceText}</p>
                             <div class="mt-auto d-grid">
                                 <a href="#course-detail/${course.id}" class="btn btn-accent btn-sm text-white">
                                     <i class="bi bi-play-circle-fill"></i> ${t('myCoursesGoToCourseButton')}
                                 </a>
                             </div>
                         </div>
                     </div>
                 </div>`;
        };
    }

    // Generate the grid of course cards or the empty message
    const gridHtml = courses.length > 0 ? courses.map(cardGenerator).join('') : emptyMsg;

    // Assemble the final page HTML
    const contentHtml = `
         <div class="container pt-4 pb-4">
             <!-- Alert area for actions like deletion -->
             <div id="course-action-alert" class="alert d-none my-3" role="alert"></div>
             <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
                 <h2 class="display-5 fw-light mb-0"><i class="bi ${pageIcon} me-2 text-primary"></i> ${pageTitle}</h2>
                 ${currentUser.role === 'provider' ? `
                    <a href="#create-course" class="btn btn-sm btn-success">
                        <i class="bi bi-plus-lg me-1"></i>${t('myCoursesProviderCreateButton')}
                    </a>` : ''}
             </div>
             <div class="row fade-in">${gridHtml}</div>
         </div>`;
    render(contentHtml, false); // Render as general content
}

// Course Detail Page
export function renderCourseDetailPage() {
    const hashParts = window.location.hash.split('/');
    const courseId = hashParts[1];

    // Validate course ID presence
    if (!courseId) {
        console.error("[View] Course Detail: No Course ID found in hash.");
        renderTemporaryMessage('alertTempInvalidUrl', 'danger');
        setTimeout(() => window.location.hash = '#browse-courses', 2500);
        return;
    }
    console.log(`[View] Rendering Course Detail for ID: ${courseId}`);

    const course = store.findCourseById(courseId);
    const currentUser = auth.getCurrentUser();

    // Handle course not found
    if (!course) {
        console.warn(`[View] Course Detail: Course with ID ${courseId} not found.`);
        renderTemporaryMessage('alertTempNotFound', 'warning');
        setTimeout(() => window.location.hash = '#browse-courses', 2500);
        return;
    }

    // --- Prepare Data ---
    const provider = store.findUserById(course.providerId);
    const isEnrolled = currentUser?.role === 'client' && Array.isArray(course.enrolledStudentIds) && course.enrolledStudentIds.includes(currentUser.id);
    const canEnroll = currentUser?.role === 'client' && !isEnrolled;
    const isProvider = currentUser?.role === 'provider' && currentUser.id === course.providerId;
    const isGuest = !currentUser;
    const isAdmin = currentUser?.role === 'admin';

    const price = parseFloat(course.price);
    const priceText = (isNaN(price) || price <= 0) ? t('courseDetailPriceFree') : `$${price.toFixed(2)}`;
    const priceClass = (isNaN(price) || price <= 0) ? 'free text-primary fw-bold' : 'text-success fw-bolder';

    const courseIcon = getCourseIcon(course.title);
    // Safely handle description, replace newlines with <br>
    const descriptionHtml = course.description ? String(course.description).replace(/\n/g, '<br>') : `<p class="text-muted fst-italic">${t('browseCoursesNoDesc')}</p>`;

    // --- Build Page Sections ---
    let actionAreaHtml = '', enrolledListHtml = '', footerActionsHtml = '', sessionHtml = '';

    // 1. Enrollment/Action Area
    if (canEnroll) {
        actionAreaHtml = `<button class="btn btn-primary btn-lg enroll-button w-100 py-3" data-course-id="${course.id}"><i class="bi bi-plus-circle-fill"></i> ${t('courseDetailEnrollButton', { price: price > 0 ? ` for ${priceText}` : '' })}</button>`;
    } else if (isEnrolled) {
        actionAreaHtml = `<div class="alert alert-success d-flex align-items-center mb-0 py-3"><i class="bi bi-check-circle-fill fs-4 me-3"></i><div class="fs-5 fw-medium">${t('courseDetailEnrolledBadge')}</div></div>`;
    } else if (isProvider) {
        actionAreaHtml = `<div class="alert alert-info d-flex align-items-center mb-0 py-3"><i class="bi bi-person-workspace fs-4 me-3"></i><div>${t('courseDetailProviderBadge')}</div></div>`;
    } else if (isGuest) {
        actionAreaHtml = `<a href="#login" class="btn btn-secondary btn-lg w-100 py-3"><i class="bi bi-box-arrow-in-right"></i> ${t('courseDetailLoginButton')}</a>`;
    } else if (isAdmin) {
        actionAreaHtml = `<div class="alert alert-secondary d-flex align-items-center mb-0 py-3"><i class="bi bi-shield-lock-fill fs-4 me-3"></i><div>${t('courseDetailAdminBadge')}</div></div>`;
    }

    // 2. Enrolled Students List (Provider View)
    if (isProvider) {
        const students = store.getEnrolledStudentsDetails(courseId);
        enrolledListHtml = `<hr class="my-4"><h4 class="mt-4 mb-3 fw-medium"><i class="bi bi-people-fill me-2 text-muted"></i>${t('courseDetailEnrolledStudentsTitle')}</h4>`;
        if (students.length > 0) {
            enrolledListHtml += `<ul class="list-group list-group-flush simple-list mb-3 shadow-sm rounded overflow-hidden border">`; // Added border and overflow
            enrolledListHtml += students.map(s => `<li class="list-group-item px-3 py-2 bg-light border-bottom"><i class="bi bi-person-check-fill text-success me-2"></i> ${s.username} <code class="ms-2 text-muted small">(ID: ${s.id})</code></li>`).join('');
            enrolledListHtml += `</ul><p class="text-muted small mt-2"><i class="bi bi-info-circle me-1"></i>${t('courseDetailEnrolledStudentsTotal', { count: students.length })}</p>`;
        } else {
            enrolledListHtml += `<p class="text-muted fst-italic">${t('courseDetailNoEnrolledStudents')}</p>`;
        }
    }

    // 3. Live Sessions Section (Provider or Enrolled Client View)
    if (isProvider || isEnrolled) {
        const sessions = store.getLiveSessionsForCourse(courseId); // Already sorted by date
        sessionHtml = `<hr class="my-4"><div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                         <h4 class="fw-medium mb-0"><i class="bi bi-camera-video-fill me-2 text-muted"></i>${t('courseDetailSessionTitle')}</h4>`;
        // Add "Schedule" button only for the provider
        if (isProvider) {
            sessionHtml += `<button type="button" class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#scheduleSessionModal" data-course-id="${course.id}" data-course-title="${course.title || ''}">
                              <i class="bi bi-plus-lg me-1"></i>${t('courseDetailScheduleSessionButton')}
                           </button>`;
        }
        sessionHtml += `</div>`; // End of header div

        if (sessions.length > 0) {
            sessionHtml += `<ul class="list-group list-group-flush mb-3 simple-list border rounded overflow-hidden shadow-sm">`;
            sessions.forEach(session => {
                const formattedDate = formatDateTime(session.dateTime); // Format date/time
                // Basic validation for meeting link
                let meetingLink = '#';
                try {
                    if (session.meetingLink && new URL(session.meetingLink)) {
                        meetingLink = session.meetingLink;
                    } else {
                         console.warn(`Invalid meeting link for session ${session.id}: ${session.meetingLink}`);
                         meetingLink = '#invalid-link'; // Or disable button
                    }
                } catch (_) {
                     console.warn(`Invalid meeting link format for session ${session.id}: ${session.meetingLink}`);
                     meetingLink = '#invalid-link'; // Or disable button
                }

                sessionHtml += `
                    <li class="list-group-item session-list-item px-3 py-2">
                        <div class="session-info flex-grow-1 me-3">
                            <span class="session-title fw-medium d-block">${session.title || t('untitledSession', {default: 'Untitled Session'})}</span>
                            <span class="session-time small text-muted">${formattedDate}</span>
                        </div>
                         ${meetingLink !== '#invalid-link' ? `
                             <a href="${meetingLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary session-link flex-shrink-0">
                                 <i class="bi bi-box-arrow-up-right me-1"></i>${t('courseDetailJoinSessionButton')}
                             </a>
                         ` : `
                             <button class="btn btn-sm btn-secondary session-link flex-shrink-0 disabled" title="${t('invalidMeetingLink', {default: 'Invalid Link'})}">
                                <i class="bi bi-x-circle"></i> ${t('invalidLinkShort', {default: 'Invalid'})}
                             </button>
                         `}
                    </li>`;
            });
            sessionHtml += `</ul>`;
        } else {
            sessionHtml += `<p class="text-muted fst-italic">${t('courseDetailNoSessions')}</p>`;
        }
    }


    // 4. Footer Actions (Edit/Delete)
    if (isProvider) {
         // Edit button (disabled for now) + Delete button
        footerActionsHtml = `
            <div class="btn-group">
                <button class="btn btn-outline-secondary disabled" title="${t('featureNotAvailable', {default: 'Feature not available'})}">
                    <i class="bi bi-pencil-square"></i> ${t('courseDetailEditButton')}
                </button>
                <button class="btn btn-outline-danger delete-course-button" data-course-id="${course.id}">
                    <i class="bi bi-trash"></i> ${t('courseDetailDeleteButton')}
                </button>
            </div>`;
    } else if (isAdmin) {
        // Admin delete button
        footerActionsHtml = `
             <button class="btn btn-outline-danger delete-course-button" data-course-id="${course.id}" title="${t('courseDetailAdminDeleteButton')}">
                 <i class="bi bi-trash-fill"></i> ${t('courseDetailAdminDeleteButton')}
             </button>`;
    }

    // --- Assemble Full Page HTML ---
    const contentHtml = `
    <div class="container pt-4 pb-4">
        <div class="row justify-content-center fade-in">
            <div class="col-lg-10 col-xl-9">
                <div class="card shadow-lg border-0 mb-4 overflow-hidden course-detail rounded-3">
                    <!-- Course Image/Icon Placeholder -->
                    <div class="card-img-placeholder bg-light" style="height:250px; font-size:7rem; display:flex; align-items:center; justify-content:center; color: rgba(var(--bs-primary-rgb), 0.2);">
                        <i class="bi ${courseIcon}" title="${course.title || ''}"></i>
                    </div>

                    <div class="card-body p-4 p-md-5">
                        <!-- Breadcrumbs -->
                        <nav aria-label="breadcrumb" class="mb-4">
                            <ol class="breadcrumb small bg-light bg-opacity-75 p-2 rounded-pill px-3">
                                <li class="breadcrumb-item"><a href="#browse-courses">${t('navBrowseCourses')}</a></li>
                                <li class="breadcrumb-item active" aria-current="page">${course.title || t('untitledCourse', {default: 'Untitled Course'})}</li>
                            </ol>
                        </nav>

                        <!-- Course Header -->
                        <h1 class="card-title display-5 mb-2 fw-bold">${course.title || t('untitledCourse', {default: 'Untitled Course'})}</h1>
                        <h5 class="card-subtitle mb-4 text-muted fw-normal">
                             ${t('courseDetailBy', { provider: provider?.username || t('unknownProvider', {default: 'Unknown'}) })}
                        </h5>

                        <!-- Price -->
                        <p class="price display-4 my-4 ${priceClass}">${priceText}</p>

                         <!-- Alerts for enrollment/actions -->
                         <div id="enroll-alert" class="alert d-none my-3" role="alert"></div>
                         <div id="course-action-alert" class="alert d-none my-3" role="alert"></div>

                         <!-- Enrollment Action Area -->
                         <div class="enroll-action-area mb-4 pb-2">
                             ${actionAreaHtml}
                         </div>

                         <!-- About Section -->
                         <hr class="my-4">
                         <h4 class="mb-3 fw-medium"><i class="bi bi-info-circle-fill me-2 text-muted"></i>${t('courseDetailAboutTitle')}</h4>
                         <div class="description lead fs-6 mb-4">
                             ${descriptionHtml}
                         </div>

                         <!-- Enrolled Students Section (if provider) -->
                         ${enrolledListHtml}

                         <!-- Live Sessions Section (if provider or enrolled) -->
                         ${sessionHtml}

                         <!-- Footer Actions -->
                         <hr class="my-4">
                         <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4">
                             <a href="#browse-courses" class="btn btn-outline-secondary">
                                 <i class="bi bi-arrow-left"></i> ${t('courseDetailBackButton')}
                             </a>
                             ${footerActionsHtml}
                         </div>
                     </div> <!-- End card-body -->
                 </div> <!-- End card -->
             </div> <!-- End col -->
         </div> <!-- End row -->
     </div> <!-- End container -->
     `;
    render(contentHtml, false); // Render as general content

     // --- Event Listener for Modal Trigger ---
     // Re-attach listener specifically after rendering this page
     const scheduleModalTrigger = document.querySelector('[data-bs-target="#scheduleSessionModal"]');
     if (scheduleModalTrigger) {
         scheduleModalTrigger.addEventListener('click', event => {
             const button = event.currentTarget;
             const courseId = button.getAttribute('data-course-id');
             const courseTitle = button.getAttribute('data-course-title');
             const modalTitleEl = document.getElementById('scheduleSessionModalLabel');
             // We are using form's data attribute now, so no hidden input needed
             // const courseIdInput = document.getElementById('schedule-course-id');
             const form = document.getElementById('schedule-session-form');

             // Set modal title using translated string
             if (modalTitleEl) modalTitleEl.textContent = t('scheduleSessionModalTitle', { courseTitle: courseTitle });
             // if (courseIdInput) courseIdInput.value = courseId; // No longer needed
             // Store courseId on the form itself for easier access in the submit handler (main.js)
             if (form) $(form).data('course-id', courseId);

             // Clear form and alert when modal is shown (or re-shown)
             $(form)[0].reset();
             $('#session-alert').addClass('d-none').removeClass('show fade');
         });
     }

     // Add listener to clear form when modal is hidden (already in main.js, but good to have here too for clarity)
     // Ensure this doesn't attach multiple listeners if renderCourseDetailPage is called repeatedly without page reload.
     const scheduleModal = document.getElementById('scheduleSessionModal');
     if (scheduleModal && !scheduleModal.dataset.listenerAttached) { // Check if listener already attached
        scheduleModal.addEventListener('hidden.bs.modal', () => {
            const form = document.getElementById('schedule-session-form');
             if(form) {
                 form.reset();
                 // Also hide any alert inside the modal
                 $('#session-alert').addClass('d-none').removeClass('show fade alert-success alert-danger alert-warning');
             }
        });
         scheduleModal.dataset.listenerAttached = 'true'; // Mark as attached
     }
}


// Not Found Page (404)
export function renderNotFoundPage() {
     const contentHtml = `
        <div class="container py-5">
            <div class="text-center py-5 fade-in">
                <i class="bi bi-compass-fill display-1 text-primary opacity-50"></i>
                <h1 class="display-4 mt-4 fw-bold">${t('notFoundTitle')}</h1>
                <p class="lead text-muted mt-3 mb-4 col-md-8 mx-auto">${t('notFoundText')}</p>
                <a href="#home" class="btn btn-primary mt-4 px-4 py-2">
                    <i class="bi bi-house-door"></i> ${t('notFoundButton')}
                </a>
            </div>
        </div>`;
    render(contentHtml, false); // Render as general content
    toggleAdminSidebar(false); // Ensure admin sidebar is hidden on 404
}