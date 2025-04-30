// js/views/common.js - Common rendering utilities and helpers
import * as auth from '../auth.js';
import { t, getCurrentLanguage, SUPPORTED_LANGS } from '../i18n.js';
import * as store from '../store.js'; // Needed for unread count in navbar

// --- Cache jQuery Selectors ---
const $contentWrapper = $('#content-wrapper');
const $navLinks = $('#nav-links');
const $adminSidebar = $('#admin-sidebar');
const $mainViewArea = $('#main-view-area');
const $initialLoading = $('#initial-loading');

// Chart Management (Keep as before)
let activeCharts = {};
export function destroyChart(chartId) { if (activeCharts[chartId]) { try { activeCharts[chartId].destroy(); console.log(`[Chart] Destroyed chart: ${chartId}`);} catch (e) { console.error(`[Chart] Error destroying chart ${chartId}:`, e); } finally { delete activeCharts[chartId]; } } }
export function destroyAllCharts() { console.log("[Chart] Destroying all charts tracked in common.js:", Object.keys(activeCharts)); Object.keys(activeCharts).forEach(destroyChart); }

// Course Icon Helper (Keep as before)
export function getCourseIcon(title = '') { /* ... */
    const lowerTitle = (title || '').toLowerCase();
    if (lowerTitle.includes('web') || lowerTitle.includes('html') || lowerTitle.includes('css') || lowerTitle.includes('javascript') || lowerTitle.includes('react') || lowerTitle.includes('node')) return 'bi-code-slash';
    if (lowerTitle.includes('python') || lowerTitle.includes('data') || lowerTitle.includes('analysis') || lowerTitle.includes('machine learning') || lowerTitle.includes('scraping')) return 'bi-bar-chart-line-fill';
    if (lowerTitle.includes('design') || lowerTitle.includes('ui/ux') || lowerTitle.includes('graphic')) return 'bi-palette-fill';
    if (lowerTitle.includes('photo') || lowerTitle.includes('camera') || lowerTitle.includes('paint') || lowerTitle.includes('watercolor') || lowerTitle.includes('creative') || lowerTitle.includes('writing')) return 'bi-camera-fill';
    if (lowerTitle.includes('speak') || lowerTitle.includes('present') || lowerTitle.includes('masterclass')) return 'bi-mic-fill';
    if (lowerTitle.includes('meditation') || lowerTitle.includes('mindful') || lowerTitle.includes('yoga') || lowerTitle.includes('well-being') || lowerTitle.includes('stress')) return 'bi-peace-fill';
    if (lowerTitle.includes('excel') || lowerTitle.includes('spreadsheet')) return 'bi-file-earmark-excel-fill';
    if (lowerTitle.includes('structure') || lowerTitle.includes('algorithm')) return 'bi-diagram-3-fill';
    if (lowerTitle.includes('math') || lowerTitle.includes('physique') || lowerTitle.includes('chimie') || lowerTitle.includes('svt') || lowerTitle.includes('philosophie')) return 'bi-calculator-fill';
    if (lowerTitle.includes('français') || lowerTitle.includes('arabe') || lowerTitle.includes('anglais') || lowerTitle.includes('langue')) return 'bi-translate';
    if (lowerTitle.includes('histoire') || lowerTitle.includes('géographie') || lowerTitle.includes('islamique')) return 'bi-book-fill';
    return 'bi-book-half';
 }

// Date Formatting Helper (Keep as before)
export function formatDateTime(isoString) { /* ... */
    if (!isoString) return t('notAvailable', {}, 'N/A'); try { const date = new Date(isoString); if (isNaN(date.getTime())) { console.warn("Invalid date string for formatDateTime:", isoString); return t('invalidDate', {}, 'Invalid Date'); } const lang = getCurrentLanguage(); const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }; return new Intl.DateTimeFormat(lang, options).format(date); } catch (e) { console.error("Error formatting date:", isoString, e); return t('invalidDate', {}, 'Invalid Date'); }
}

// Navbar Rendering (Keep as before)
export function renderNavbar() { /* ... */
    try {
        const currentUser = auth.getCurrentUser(); let navHtml = ''; const currentHash = window.location.hash || '#home'; const currentBasePath = currentHash.split('/')[0]; const currentLang = getCurrentLanguage();
        navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#home' ? 'active' : ''}" href="#home"><i class="bi bi-house-door-fill"></i> ${t('navHome')}</a></li>`;
        if (currentUser) {
            const userRoleKey = `role${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}`;
            navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#dashboard' || currentBasePath.startsWith('#admin-') ? 'active' : ''}" href="#dashboard"><i class="bi bi-speedometer2"></i> ${t('navDashboard')}</a></li>`;
            if (currentUser.role === 'client') { navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li><li class="nav-item"><a class="nav-link ${currentBasePath === '#my-courses' ? 'active' : ''}" href="#my-courses"><i class="bi bi-bookmark-check-fill"></i> ${t('navMyCourses')}</a></li>`; }
            else if (currentUser.role === 'provider') { navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li><li class="nav-item"><a class="nav-link ${currentBasePath === '#my-courses' ? 'active' : ''}" href="#my-courses"><i class="bi bi-journal-richtext"></i> ${t('navMyCourses')}</a></li><li class="nav-item"><a class="nav-link ${currentBasePath === '#create-course' ? 'active' : ''}" href="#create-course"><i class="bi bi-plus-circle-fill"></i> ${t('navCreateCourse')}</a></li>`; }
            else if (currentUser.role === 'admin') { navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li>`; }
            const unreadCount = store.getUnreadMessageCount(currentUser.id);
            navHtml += `<li class="nav-item me-lg-2"><a class="nav-link position-relative ${currentBasePath === '#messages' || currentBasePath === '#conversation' || currentBasePath === '#support-chat' ? 'active' : ''}" href="#messages" title="${t('navMessages', {}, 'Messages')}"><i class="bi bi-chat-dots-fill fs-5"></i>${unreadCount > 0 ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">${unreadCount > 9 ? '9+' : unreadCount}<span class="visually-hidden">unread messages</span></span>` : ''}</a></li>`;
            navHtml += `<li class="nav-item dropdown ms-lg-auto"><a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarUserDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="bi bi-person-circle fs-5 me-1"></i> ${currentUser.username}</a><ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarUserDropdown"><li><span class="dropdown-item-text"><small class="text-muted">${t('userRole')}: ${t(userRoleKey)}</small></span></li><li><hr class="dropdown-divider"></li><li><button id="logout-button" class="dropdown-item" type="button"><i class="bi bi-box-arrow-right"></i> ${t('navLogout')}</button></li></ul></li>`;
        } else { navHtml += `<li class="nav-item"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li><li class="nav-item ms-lg-auto"><a class="nav-link ${currentBasePath === '#login' ? 'active' : ''}" href="#login"><i class="bi bi-box-arrow-in-right"></i> ${t('navLogin')}</a></li><li class="nav-item ms-lg-2"><a class="nav-link btn btn-accent btn-sm text-white px-3 ${currentBasePath === '#register' ? 'active' : ''}" href="#register"><i class="bi bi-person-plus-fill"></i> ${t('navRegister')}</a></li>`; }
        const langOptions = SUPPORTED_LANGS.map(lang => { const langKey = `lang${lang.toUpperCase()}`; let defaultLangName = lang.toUpperCase(); if (lang === 'en') defaultLangName = 'English'; else if (lang === 'fr') defaultLangName = 'French'; else if (lang === 'ar') defaultLangName = 'Arabic'; const translatedName = t(langKey, {}, defaultLangName); return `<li><button class="dropdown-item d-flex align-items-center ${getCurrentLanguage() === lang ? 'active' : ''}" type="button" data-lang="${lang}">${translatedName}${getCurrentLanguage() === lang ? '<i class="bi bi-check ms-auto"></i>' : ''}</button></li>`; }).join('');
        navHtml += `<li class="nav-item dropdown ms-2" id="language-switcher"><button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false"> <i class="bi bi-translate me-1"></i> ${getCurrentLanguage().toUpperCase()} </button><ul class="dropdown-menu dropdown-menu-end" aria-labelledby="languageDropdown">${langOptions}</ul></li>`;
        $navLinks.html(navHtml);
    } catch(e) { console.error("Error in renderNavbar:", e); }
}

// Admin Sidebar Management (Keep as before)
export function toggleAdminSidebar(show) { /* ... */
    try { const currentHash = window.location.hash || '#home'; const currentBasePath = currentHash.split('/')[0]; if (show) { if (auth.getCurrentUserRole() !== 'admin') { console.warn("[View] Attempted to show admin sidebar for non-admin user. Hiding."); $adminSidebar.html('').removeClass('d-md-block').addClass('d-none collapse'); $mainViewArea.removeClass('col-md-9 ms-sm-auto col-lg-10 px-md-4').addClass('col-md-12 col-lg-12'); $contentWrapper.removeClass('admin-active'); return; } const sidebarHtml = `<div class="position-sticky pt-3 sidebar-sticky" style="top: 60px; height: calc(100vh - 60px);"><h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-1 mb-2 text-muted text-uppercase"><span>${t('navAdminPanel')}</span></h6><ul class="nav flex-column"><li class="nav-item"><a class="nav-link ${currentBasePath === '#admin-dashboard' ? 'active' : ''}" href="#admin-dashboard"><i class="bi bi-grid-1x2-fill"></i> ${t('navDashboard')}</a></li><li class="nav-item"><a class="nav-link ${currentBasePath === '#admin-users' ? 'active' : ''}" href="#admin-users"><i class="bi bi-people-fill"></i> ${t('adminUsersTitle')}</a></li><li class="nav-item"><a class="nav-link ${currentBasePath === '#admin-courses' ? 'active' : ''}" href="#admin-courses"><i class="bi bi-journal-bookmark-fill"></i> ${t('adminCoursesTitle')}</a></li><li class="nav-item mt-2 border-top pt-2"><a class="nav-link ${currentBasePath === '#browse-courses' ? 'active' : ''}" href="#browse-courses"><i class="bi bi-search"></i> ${t('navBrowseCourses')}</a></li></ul></div>`; $adminSidebar.html(sidebarHtml).removeClass('d-none collapse').addClass('d-md-block'); $mainViewArea.removeClass('col-md-12 col-lg-12').addClass('col-md-9 ms-sm-auto col-lg-10 px-md-4'); $contentWrapper.addClass('admin-active'); } else { $adminSidebar.html('').removeClass('d-md-block').addClass('d-none collapse'); $mainViewArea.removeClass('col-md-9 ms-sm-auto col-lg-10 px-md-4').addClass('col-md-12 col-lg-12'); $contentWrapper.removeClass('admin-active'); destroyAllCharts(); } } catch (e) { console.error("Error in toggleAdminSidebar:", e); }
}

// Apply Translations Helper (Keep as before)
function applyTranslations() { /* ... */
    try { $('[data-translate]').each(function() { const k = $(this).data('translate'), d = $(this).text() || k; $(this).text(t(k, {}, d)); }); $('[data-translate-placeholder]').each(function() { const k = $(this).data('translate-placeholder'), d = $(this).attr('placeholder') || k; $(this).attr('placeholder', t(k, {}, d)); }); $('[data-translate-title]').each(function() { const k = $(this).data('translate-title'), d = $(this).attr('title') || k; $(this).attr('title', t(k, {}, d)); }); $('[data-translate-html]').each(function() { const k = $(this).data('translate-html'), d = $(this).html() || k; $(this).html(t(k, {}, d)); }); if ($('#price-hint-container').length) { $('#price-hint-container').html(t('createCoursePriceHint', {currencySymbol: t('currencySymbol', {}, 'MAD')})); } if ($('#material-type-note').length) { $('#material-type-note').html(t('materialTypeTextNote')); } } catch (e) { console.error("Error during applyTranslations:", e); }
}

// --- Main Content Rendering Logic ---
export function render(html, isAdminSpecific = false, addContainer = true) {
    console.log(`[Render] START: isAdmin=${isAdminSpecific}, addContainer=${addContainer}`);
    try {
        $initialLoading.remove();
        let $targetContainer;
        let finalHtml = String(html);

        if (isAdminSpecific) {
            $targetContainer = $mainViewArea;
            console.log("[Render] Targeting #main-view-area (Admin).");
             // Ensure #main-view-area exists
            if (!$mainViewArea || !$mainViewArea.length) { throw new Error("Admin render target #main-view-area not found in DOM."); }
            // We don't wrap admin content in a container usually
        } else {
            $targetContainer = $contentWrapper;
             console.log("[Render] Targeting #content-wrapper (Non-Admin).");
             // Ensure #content-wrapper exists
             if (!$contentWrapper || !$contentWrapper.length) { throw new Error("Main render target #content-wrapper not found in DOM."); }
            // Clear the admin area if it exists and we're rendering non-admin content
            if ($mainViewArea && $mainViewArea.length) {
                $mainViewArea.empty();
                console.log("[Render] Cleared #main-view-area.");
            } else {
                 console.warn("[Render] #main-view-area not found for clearing.");
             }
            // Wrap non-admin content in a container if requested
            if (addContainer) {
                let paddingClass = "py-4"; // Default padding
                 const currentPath = window.location.hash.split('/')[0] || '#home';
                 if (['#home'].includes(currentPath)) paddingClass = "py-5";
                 else if (['#login', '#register', '#create-course'].includes(currentPath)) paddingClass = "pt-5 pb-4";
                 else if (['#browse-courses', '#my-courses', '#course-detail', '#messages', '#conversation', '#support-chat'].includes(currentPath)) paddingClass = "pt-4 pb-4";
                 else if (['#dashboard'].includes(currentPath)) paddingClass = "pt-3 pb-4";

                finalHtml = `<div class="container ${paddingClass}">${finalHtml}</div>`;
                console.log(`[Render] Wrapped content in container with padding: ${paddingClass}`);
            }
        }

        console.log("[Render] Target container identified:", $targetContainer[0]);
        console.log("[Render] Applying HTML and starting fade-in...");
        // Log a snippet of the HTML to be rendered
        // console.log("[Render] HTML Snippet:", finalHtml.substring(0, 500) + (finalHtml.length > 500 ? "..." : ""));

        // Use .html() and then .fadeIn()
        $targetContainer.html(finalHtml); // Set HTML content first
        if ($targetContainer.is(':hidden')) { // Only fade in if it was hidden (or if it's the first render)
             console.log("[Render] Fading in content...");
             $targetContainer.fadeIn(300, () => {
                 console.log("[Render] Fade-in complete. Applying post-render actions...");
                 applyTranslationsAndTitle($targetContainer); // Call helper
             });
        } else {
            console.log("[Render] Content area already visible. Applying post-render actions immediately.");
            // Apply translations/title immediately if container was already visible
            applyTranslationsAndTitle($targetContainer);
        }

    } catch (e) {
        console.error("[Render] CRITICAL Error inside render() function:", e);
        $initialLoading.remove();
        // Display error directly in the body as a last resort
        $('body').prepend(`<div class="alert alert-danger m-3 position-fixed top-0 start-0" style="z-index: 9999;"><strong>Render Error:</strong> ${e.message}. Check console.</div>`);
    }
     console.log("[Render] Function END");
}

// Helper for post-render actions
function applyTranslationsAndTitle($container) {
     try {
        applyTranslations();
        // Update Page Title
        let pageTitle = '';
        const titleKey = $container.find('[data-page-title-key]').first().data('page-title-key');
        const pageTitleAttr = $container.children().first().data('page-title');

        if (titleKey) { pageTitle = t(titleKey, {}, ''); }
        else if (pageTitleAttr) { pageTitle = pageTitleAttr; }
        else { pageTitle = $container.find('h1:first, h2:first, h3:first').first().text().trim(); }

        const appName = t('appName', {}, 'LearnSphere');
        document.title = pageTitle ? `${pageTitle} | ${appName}` : appName;
        // console.log(`[Render] Post-render: Applied translations and set title to: ${document.title}`);
    } catch(e) {
        console.error("[Render] Error during post-render actions:", e);
    }
}


// --- Temporary Message Renderer ---
export function renderTemporaryMessage(messageOrKey, type = 'info', variables = {}) {
    console.log(`[renderTemporaryMessage] Called with key='${messageOrKey}', type='${type}'`);
    const message = t(messageOrKey, variables, `Error: ${messageOrKey}`); // Fallback added
    const alertHtml = `<div class="alert alert-${type} text-center shadow-sm my-4" role="alert">${message}</div>`;
    render(alertHtml, false, true); // Not admin specific, add container
    toggleAdminSidebar(false);
}