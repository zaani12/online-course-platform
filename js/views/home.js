// js/views/home.js
import * as auth from '../auth.js';
import { t } from '../i18n.js';
import { render, toggleAdminSidebar, renderTemporaryMessage } from './common.js';

export function renderHomePage() {
    try {
        toggleAdminSidebar(false); // Ensure admin sidebar is hidden
        const currentUser = auth.getCurrentUser();
        let welcomeHtml = '', ctaHtml = '';

        if (currentUser) {
            welcomeHtml = `<h1 class="display-5 fw-bold">${t('welcomeBack')} ${currentUser.username}!</h1><p class="lead text-muted">${t('homePromptLoggedIn')}</p>`;
            if (currentUser.role === 'client') { ctaHtml = `<a href="#browse-courses" class="btn btn-primary btn-lg me-sm-2 mb-2 mb-sm-0"><i class="bi bi-compass me-1"></i> ${t('navBrowseCourses')}</a><a href="#my-courses" class="btn btn-outline-secondary btn-lg"><i class="bi bi-bookmark-check me-1"></i> ${t('navMyCourses')}</a>`; }
            else if (currentUser.role === 'provider') { ctaHtml = `<a href="#create-course" class="btn btn-success btn-lg me-sm-2 mb-2 mb-sm-0"><i class="bi bi-plus-circle me-1"></i> ${t('navCreateCourse')}</a><a href="#my-courses" class="btn btn-outline-secondary btn-lg"><i class="bi bi-journal-richtext me-1"></i> ${t('dashboardProviderManageCoursesButton')}</a>`; }
            else if (currentUser.role === 'admin') { ctaHtml = `<a href="#admin-dashboard" class="btn btn-secondary btn-lg"><i class="bi bi-shield-lock me-1"></i> ${t('navAdminPanel')}</a>`; }
        } else {
            welcomeHtml = `<h1 class="display-4 fw-bold">${t('homeTitleLoggedOut')}</h1><p class="lead text-muted col-lg-8 mx-auto">${t('homeSubtitleLoggedOut')}</p>`;
            ctaHtml = `<a href="#browse-courses" class="btn btn-primary btn-lg me-sm-2 mb-2 mb-sm-0"><i class="bi bi-search me-1"></i> ${t('navBrowseCourses')}</a><a href="#register" class="btn btn-accent btn-lg text-white"><i class="bi bi-person-plus-fill me-1"></i> ${t('navRegister')}</a>`;
        }
        const contentHtml = `
            <div data-page-title-key="navHome"></div>
            <div class="text-center px-4 py-5 mb-4 bg-white rounded-3 shadow-lg fade-in border-top border-5 border-primary">
                ${welcomeHtml}
                <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mt-4 pt-2">
                    ${ctaHtml}
                </div>
            </div>`;
        render(contentHtml, false, true); // false=notAdmin, true=addContainer
    } catch(e) {
        console.error("Error rendering home page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}