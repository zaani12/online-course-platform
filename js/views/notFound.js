// js/views/notFound.js
import { t } from '../i18n.js';
import { render, toggleAdminSidebar } from './common.js';

export function renderNotFoundPage() {
    try {
        toggleAdminSidebar(false);
        const contentHtml = `
            <div data-page-title-key="notFoundTitle"></div>
            <div class="text-center py-5 fade-in">
                <i class="bi bi-compass-fill display-1 text-primary opacity-50"></i>
                <h1 class="display-4 mt-4 fw-bold">${t('notFoundTitle')}</h1>
                <p class="lead text-muted mt-3 mb-4 col-md-8 mx-auto">${t('notFoundText')}</p>
                <a href="#home" class="btn btn-primary mt-4 px-4 py-2"><i class="bi bi-house-door"></i> ${t('notFoundButton')}</a>
            </div>`;
        render(contentHtml, false, true);
    } catch(e) {
        console.error("Error rendering 404 page:", e);
        // Simple fallback if render fails catastrophically
        $('body').prepend(`<div class="alert alert-danger m-3">Error displaying 404 page. Check console.</div>`);
    }
}