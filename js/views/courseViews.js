// js/views/courseViews.js
import * as store from '../store.js';
import * as auth from '../auth.js';
import { t } from '../i18n.js';
import { render, toggleAdminSidebar, renderTemporaryMessage, getCourseIcon, formatDateTime } from './common.js';

// --- Create Course Page ---
export function renderCreateCoursePage() {
    try {
        toggleAdminSidebar(false);
        const currentUser = auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'provider') {
            renderTemporaryMessage('alertTempProviderRequired', 'warning');
            setTimeout(() => { window.location.hash = '#dashboard'; }, 2500);
            return;
        }
        const contentHtml = `
            <div data-page-title-key="createCourseTitle"></div>
            <div class="row justify-content-center fade-in">
                <div class="col-md-10 col-lg-8">
                    <div class="card shadow-sm border-0 rounded-3 mt-4">
                        <div class="card-header bg-success-subtle text-success-emphasis border-0 pt-4 pb-3"> <h2 class="card-title text-center mb-0 fw-bold"> <i class="bi bi-plus-circle-fill me-2"></i>${t('createCourseTitle')} </h2> </div>
                        <div class="card-body p-4 p-lg-5">
                            <form id="create-course-form" novalidate>
                                <div id="create-course-form-alert" class="alert d-none mb-4" role="alert"></div> {/* ID Corrected */}
                                <div class="form-floating mb-3"> <input type="text" class="form-control" id="course-title" placeholder="${t('createCourseTitleLabel')}" required> <label for="course-title">${t('createCourseTitleLabel')}</label> </div>
                                <div class="form-floating mb-3"> <textarea class="form-control" id="course-description" placeholder="${t('createCourseDescLabel')}" style="height: 150px" required></textarea> <label for="course-description">${t('createCourseDescLabel')}</label> <div class="form-text px-2 text-muted">${t('createCourseDescHint')}</div> </div>
                                <div class="form-floating mb-4"> <input type="number" class="form-control" id="course-price" step="1" min="0" required placeholder="${t('createCoursePriceLabel')}"> <label for="course-price">${t('createCoursePriceLabel')}</label> <div class="form-text px-2 text-muted" data-translate-html="createCoursePriceHint">${t('createCoursePriceHint', {currencySymbol: t('currencySymbol', {}, 'MAD')})}</div> </div>
                                <div class="d-grid gap-2 d-sm-flex justify-content-sm-end"> <a href="#my-courses" class="btn btn-outline-secondary px-4">${t('createCourseCancelButton')}</a> <button type="submit" class="btn btn-success btn-lg px-4"> <i class="bi bi-cloud-arrow-up-fill"></i> ${t('createCourseCreateButton')} </button> </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
        render(contentHtml, false, true);
    } catch(e) {
        console.error("Error rendering create course page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}

// --- Browse Courses Page ---
export function renderBrowseCoursesPage() {
    try {
        toggleAdminSidebar(false);
        const allCourses = store.getCourses("approved"); // Only show approved courses
        const currentUser = auth.getCurrentUser();
        let coursesHtml = '';
        if (Array.isArray(allCourses) && allCourses.length > 0) {
            coursesHtml = allCourses.map(course => {
                if (!course?.id || !course.title) return '';
                const provider = store.findUserById(course.providerId);
                const isEnrolled = currentUser?.role === 'client' && course.enrolledStudentIds?.includes(currentUser.id);
                const canEnroll = currentUser?.role === 'client' && !isEnrolled;
                const isGuest = !currentUser;
                const price = parseFloat(course.price); const priceText = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : `${price.toFixed(0)} ${t('currencySymbol', {}, 'MAD')}`;
                const priceClass = (isNaN(price) || price <= 0) ? 'free text-primary fw-semibold' : 'text-success fw-bold';
                const courseIcon = getCourseIcon(course.title);
                const shortDesc = course.description ? (course.description.length > 100 ? course.description.substring(0, 97) + '...' : course.description) : t('browseCoursesNoDesc');
                let actionBtn = '';
                if (canEnroll) { actionBtn = `<button class="btn btn-primary btn-sm enroll-button w-100" data-course-id="${course.id}"><i class="bi bi-plus-circle me-1"></i>${t('browseCoursesEnrollButton')}</button>`; }
                else if (isEnrolled) { actionBtn = `<span class="badge bg-success-subtle border border-success-subtle text-success-emphasis p-2 w-100"><i class="bi bi-check-circle-fill me-1"></i>${t('browseCoursesEnrolledBadge')}</span>`; }
                else if (isGuest) { actionBtn = `<a href="#login" class="btn btn-outline-secondary btn-sm w-100"><i class="bi bi-box-arrow-in-right me-1"></i>${t('browseCoursesLoginButton')}</a>`; }
                else { actionBtn = `<span class="badge bg-light text-dark p-2 w-100">${t('browseCoursesProviderAdminView')}</span>`; }
                return `<div class="col-sm-6 col-lg-4 col-xl-3 mb-4 d-flex align-items-stretch"><div class="card course-card h-100 shadow-sm w-100 border-0"><div class="card-img-placeholder" title="${course.title || ''}"><i class="bi ${courseIcon}"></i></div><div class="card-body d-flex flex-column p-3"><h5 class="card-title mb-1 fw-medium">${course.title}</h5><h6 class="card-subtitle mb-2 text-muted small">${t('browseCoursesBy', { provider: provider?.username || t('unknownProvider') })}</h6><p class="card-text description-preview flex-grow-1 small text-secondary">${shortDesc}</p><div class="mt-auto pt-2"><p class="price mb-3 fs-5 ${priceClass}">${priceText}</p><div class="d-flex justify-content-between gap-2"><a href="#course-detail/${course.id}" class="btn btn-outline-primary btn-sm px-3 flex-shrink-0">${t('browseCoursesDetailsButton')}</a><div class="enroll-section flex-grow-1">${actionBtn}</div></div></div></div></div></div>`;
            }).join('');
        } else { coursesHtml = `<div class="col-12"><div class="alert alert-info text-center mt-4 shadow-sm"><i class="bi bi-info-circle me-2"></i> ${t('browseCoursesNoCourses')}</div></div>`; }
        const contentHtml = `<div data-page-title-key="browseCoursesTitle"></div><div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4"><h2 class="display-5 fw-light mb-0"><i class="bi bi-compass me-2 text-primary"></i>${t('browseCoursesTitle')}</h2></div><div id="enroll-alert" class="alert d-none my-3 mx-0" role="alert"></div><div class="row fade-in">${coursesHtml}</div>`;
        render(contentHtml, false, true);
    } catch(e) {
        console.error("Error rendering browse courses page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}

// --- My Courses Page ---
export function renderMyCoursesPage() {
    try {
        toggleAdminSidebar(false);
        const currentUser = auth.getCurrentUser();
        if (!currentUser) { window.location.hash = '#login'; return; }
        let pageTitleKey = '', pageIcon = '', courses = [], emptyMsg = '', cardGenerator;

        if (currentUser.role === 'provider') {
            pageTitleKey = 'myCoursesProviderTitle'; pageIcon = 'bi-journal-richtext';
            courses = store.getCoursesByProvider(currentUser.id, ['pending', 'approved', 'rejected']); // Show all provider statuses
            emptyMsg = `<div class="col-12"><div class="alert alert-light text-center border shadow-sm mt-4 p-4"><h4 class="alert-heading">${t('myCoursesProviderNoCoursesTitle')}</h4><p>${t('myCoursesProviderNoCoursesText')}</p><hr><a href="#create-course" class="btn btn-success"><i class="bi bi-plus-circle me-1"></i>${t('myCoursesProviderNoCoursesButton')}</a></div></div>`;
            cardGenerator = (course) => {
                if (!course) return '';
                const enrollmentCount = course.enrolledStudentIds?.length || 0;
                const price = parseFloat(course.price); const priceText = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : `${price.toFixed(0)} ${t('currencySymbol', {}, 'MAD')}`;
                const priceClass = (isNaN(price) || price <= 0) ? 'text-primary fw-semibold' : 'text-success fw-bold';
                const icon = getCourseIcon(course.title);
                const studentsKey = enrollmentCount === 1 ? 'myCoursesEnrolledStudents' : 'myCoursesEnrolledStudentsPlural';
                let statusIndicator = '';
                if (course.status === 'pending') { statusIndicator = `<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-2">${t('statusPending', {}, 'Pending')}</span>`; }
                else if (course.status === 'rejected') { statusIndicator = `<span class="badge bg-danger position-absolute top-0 end-0 m-2">${t('statusRejected', {}, 'Rejected')}</span>`; }
                return `<div class="col-sm-6 col-lg-4 col-xl-3 mb-4 d-flex align-items-stretch"><div class="card course-card h-100 shadow-sm w-100 border-0 position-relative">${statusIndicator}<div class="card-img-placeholder" title="${course.title || ''}"><i class="bi ${icon}"></i></div><div class="card-body d-flex flex-column p-3"><h5 class="card-title fw-medium">${course.title}</h5><p class="price mt-2 mb-1 fs-5 ${priceClass}">${priceText}</p><p class="mb-3 small text-muted flex-grow-1"><i class="bi bi-people me-1"></i>${t(studentsKey, { count: enrollmentCount })}</p><div class="mt-auto d-flex justify-content-between pt-2 border-top"><a href="#course-detail/${course.id}" class="btn btn-outline-primary btn-sm px-3" title="${t('myCoursesDetailsButton')}"><i class="bi bi-search"></i> ${t('myCoursesDetailsButton')}</a><button class="btn btn-outline-danger btn-sm delete-course-button" data-course-id="${course.id}" title="${t('myCoursesDeleteButton')}"><i class="bi bi-trash"></i></button></div></div></div></div>`;
            };
        } else { // Client
            pageTitleKey = 'myCoursesClientTitle'; pageIcon = 'bi-bookmark-check-fill';
            courses = store.getCoursesEnrolledByStudent(currentUser.id); // Only gets approved courses
            emptyMsg = `<div class="col-12"><div class="alert alert-light text-center border shadow-sm mt-4 p-4"><h4 class="alert-heading">${t('myCoursesClientNoCoursesTitle')}</h4><p>${t('myCoursesClientNoCoursesText')}</p><hr><a href="#browse-courses" class="btn btn-primary"><i class="bi bi-search me-1"></i>${t('myCoursesClientNoCoursesButton')}</a></div></div>`;
            cardGenerator = (course) => {
                if (!course) return '';
                const provider = store.findUserById(course.providerId);
                const price = parseFloat(course.price); const priceText = (isNaN(price) || price <= 0) ? t('browseCoursesPriceFree') : t('myCoursesPricePurchased', { price: `${price.toFixed(0)} ${t('currencySymbol', {}, 'MAD')}` });
                const priceClass = (isNaN(price) || price <= 0) ? 'text-primary fw-semibold' : 'text-success fw-semibold';
                const icon = getCourseIcon(course.title);
                const shortDesc = course.description ? (course.description.length > 90 ? course.description.substring(0, 87) + '...' : course.description) : t('browseCoursesNoDesc');
                return `<div class="col-sm-6 col-lg-4 col-xl-3 mb-4 d-flex align-items-stretch"><div class="card course-card h-100 shadow-sm w-100 border-0"><div class="card-img-placeholder" title="${course.title || ''}"><i class="bi ${icon}"></i></div><div class="card-body d-flex flex-column p-3"><h5 class="card-title fw-medium">${course.title}</h5><h6 class="card-subtitle mb-2 text-muted small">${t('browseCoursesBy', { provider: provider?.username || t('unknownProvider') })}</h6><p class="card-text description-preview flex-grow-1 small text-secondary">${shortDesc}</p><p class="price mt-auto mb-3 fs-6 ${priceClass}">${priceText}</p><div class="mt-auto d-grid"><a href="#course-detail/${course.id}" class="btn btn-accent btn-sm text-white"><i class="bi bi-play-circle-fill"></i> ${t('myCoursesGoToCourseButton')}</a></div></div></div></div>`;
            };
        }
        const pageTitle = t(pageTitleKey);
        const gridHtml = courses.length > 0 ? courses.map(cardGenerator).join('') : emptyMsg;
        const contentHtml = `<div data-page-title-key="${pageTitleKey}"></div><div id="course-action-alert" class="alert d-none my-3" role="alert"></div><div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4"><h2 class="display-5 fw-light mb-0"><i class="bi ${pageIcon} me-2 text-primary"></i> ${pageTitle}</h2>${currentUser.role === 'provider' ? `<a href="#create-course" class="btn btn-sm btn-success"><i class="bi bi-plus-lg me-1"></i>${t('myCoursesProviderCreateButton')}</a>` : ''}</div><div class="row fade-in">${gridHtml}</div>`;
        render(contentHtml, false, true);
    } catch(e) {
        console.error("Error rendering my courses page:", e);
        renderTemporaryMessage('errorRenderingView', 'danger');
    }
}

// --- Course Detail Page ---
export function renderCourseDetailPage() {
    try {
        toggleAdminSidebar(false);
        const hashParts = window.location.hash.split('/'); const courseId = hashParts[1];
        if (!courseId) { renderTemporaryMessage('alertTempInvalidUrl', 'danger'); setTimeout(() => window.location.hash = '#browse-courses', 2500); return; }
        const course = store.findCourseById(courseId); const currentUser = auth.getCurrentUser();
        if (!course) { renderTemporaryMessage('alertTempNotFound', 'warning'); setTimeout(() => window.location.hash = '#browse-courses', 2500); return; }

        const provider = store.findUserById(course.providerId);
        const isEnrolled = currentUser?.role === 'client' && course.enrolledStudentIds?.includes(currentUser.id);
        const isProvider = currentUser?.role === 'provider' && currentUser.id === course.providerId;
        const isAdmin = currentUser?.role === 'admin';

        // Access Control: Only provider, admin, or enrolled students can see non-approved courses
        if (course.status !== 'approved' && !(isProvider || isAdmin || isEnrolled)) {
            renderTemporaryMessage('alertTempCourseNotAvailable', 'warning');
            setTimeout(() => window.location.hash = (currentUser?.role === 'client' ? '#my-courses' : '#browse-courses'), 2000);
            return;
        }

        const price = parseFloat(course.price); const priceText = (isNaN(price) || price <= 0) ? t('courseDetailPriceFree') : `${price.toFixed(0)} ${t('currencySymbol', {}, 'MAD')}`; const priceClass = (isNaN(price) || price <= 0) ? 'free text-primary fw-bold' : 'text-success fw-bolder'; const courseIcon = getCourseIcon(course.title); const descriptionHtml = course.description ? String(course.description).replace(/\n/g, '<br>') : `<p class="text-muted fst-italic">${t('browseCoursesNoDesc')}</p>`; let actionAreaHtml = '', enrolledListHtml = '', footerActionsHtml = '', sessionHtml = '', materialsHtml = ''; const canEnroll = currentUser?.role === 'client' && !isEnrolled && course.status === 'approved'; const isGuest = !currentUser; let statusAlertHtml = '';

        if(course.status === 'pending' && (isProvider || isAdmin)){ statusAlertHtml = `<div class="alert alert-warning small p-2 mb-3">${t('statusPendingNotice', {}, 'Pending Review')}</div>`; }
        else if (course.status === 'rejected' && (isProvider || isAdmin)){ statusAlertHtml = `<div class="alert alert-danger small p-2 mb-3">${t('statusRejectedNotice', {}, 'Rejected')}</div>`; }

        if (canEnroll) { actionAreaHtml = `<button class="btn btn-primary btn-lg enroll-button w-100 py-3" data-course-id="${course.id}"><i class="bi bi-plus-circle-fill"></i> ${t('courseDetailEnrollButton', { price: price > 0 ? ` ${t('currencyFor', {}, 'for')} ${priceText}` : '' })}</button>`; }
        else if (isEnrolled) { actionAreaHtml = `<div class="alert alert-success d-flex align-items-center mb-0 py-3"><i class="bi bi-check-circle-fill fs-4 me-3"></i><div class="fs-5 fw-medium">${t('courseDetailEnrolledBadge')}</div></div>`; }
        else if (isProvider) { actionAreaHtml = `<div class="alert alert-info d-flex align-items-center mb-0 py-3"><i class="bi bi-person-workspace fs-4 me-3"></i><div>${t('courseDetailProviderBadge')}</div></div>`; }
        else if (isGuest && course.status === 'approved') { actionAreaHtml = `<a href="#login" class="btn btn-secondary btn-lg w-100 py-3"><i class="bi bi-box-arrow-in-right"></i> ${t('courseDetailLoginButton')}</a>`; }
        else if (isAdmin) { actionAreaHtml = `<div class="alert alert-secondary d-flex align-items-center mb-0 py-3"><i class="bi bi-shield-lock-fill fs-4 me-3"></i><div>${t('courseDetailAdminBadge')}</div></div>`; }
        else if (course.status !== 'approved'){ actionAreaHtml = `<div class="alert alert-secondary text-center small p-2">${t('courseNotAvailableForEnrollment', {}, 'Enrollment not available.')}</div>`; }

        if (isProvider) { const students = store.getEnrolledStudentsDetails(courseId); enrolledListHtml = `<hr class="my-4"><h4 class="mt-4 mb-3 fw-medium"><i class="bi bi-people-fill me-2 text-muted"></i>${t('courseDetailEnrolledStudentsTitle')}</h4>`; if (students.length > 0) { enrolledListHtml += `<ul class="list-group list-group-flush simple-list mb-3 shadow-sm rounded overflow-hidden border">${students.map(s => `<li class="list-group-item px-3 py-2 bg-light border-bottom"><i class="bi bi-person-check-fill text-success me-2"></i> ${s.username} <code class="ms-2 text-muted small">(ID: ${s.id})</code></li>`).join('')}</ul><p class="text-muted small mt-2"><i class="bi bi-info-circle me-1"></i>${t('courseDetailEnrolledStudentsTotal', { count: students.length })}</p>`; } else { enrolledListHtml += `<p class="text-muted fst-italic">${t('courseDetailNoEnrolledStudents')}</p>`; } }

        if (isProvider || isAdmin || isEnrolled) { const materials = store.getCourseMaterials(courseId); materialsHtml = `<hr class="my-4"><div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2"><h4 class="fw-medium mb-0"><i class="bi bi-folder-fill me-2 text-muted"></i>${t('courseMaterialsTitle')}</h4>`; if (isProvider) { const safeCourseTitle = (course.title || '').replace(/"/g, '"'); materialsHtml += `<button type="button" class="btn btn-sm btn-info" data-bs-toggle="modal" data-bs-target="#addMaterialModal" data-course-id="${course.id}" data-course-title="${safeCourseTitle}"><i class="bi bi-plus-lg me-1"></i>${t('courseAddMaterialButton')}</button>`; } materialsHtml += `</div>`; if (materials.length > 0) { materialsHtml += `<ul class="list-group list-group-flush mb-3 simple-list border rounded overflow-hidden shadow-sm">${materials.map(mat => { let iconClass = 'bi-link-45deg'; let linkTarget = '_blank'; let linkHref = mat.url || '#'; let displayContent = ''; const safeDescription = (mat.description || '').replace(/</g, "<").replace(/>/g, ">"); switch (mat.type) { case 'video': iconClass = 'bi-youtube text-danger'; displayContent = `<a href="${linkHref}" target="${linkTarget}" rel="noopener noreferrer" class="material-link text-danger">${mat.url}</a>`; break; case 'pdf': iconClass = 'bi-file-earmark-pdf-fill text-danger'; displayContent = `<a href="${linkHref}" target="${linkTarget}" rel="noopener noreferrer" class="material-link text-danger">${mat.url}</a>`; break; case 'link': iconClass = 'bi-link-45deg text-primary'; displayContent = `<a href="${linkHref}" target="${linkTarget}" rel="noopener noreferrer" class="material-link">${mat.url}</a>`; break; case 'text': iconClass = 'bi-file-text-fill text-secondary'; displayContent = `<div class="material-text-snippet p-2 bg-light border rounded small">${safeDescription || t('noContentProvided')}</div>`; linkHref = '#'; linkTarget = '_self'; break; default: iconClass = 'bi-question-circle-fill text-muted'; displayContent = `<em class="text-muted">${t('unknownMaterialType')}: ${mat.type}</em>`; linkHref = '#'; linkTarget = '_self'; break; } return `<li class="list-group-item material-list-item px-3 py-2"><div class="d-flex align-items-start"><i class="bi ${iconClass} fs-4 me-3 mt-1 flex-shrink-0"></i><div class="material-info flex-grow-1"><span class="material-title fw-medium d-block">${mat.title || t('untitledMaterial')}</span><div class="material-content small text-muted mt-1">${displayContent}</div>${mat.type !== 'text' && mat.description ? `<p class="material-desc small text-muted fst-italic mt-1 mb-0">${safeDescription}</p>` : ''}</div></div></li>`; }).join('')}</ul>`; } else { materialsHtml += `<p class="text-muted fst-italic">${t('courseNoMaterials')}</p>`; } }

        if (isProvider || isEnrolled) { const sessions = store.getLiveSessionsForCourse(courseId); sessionHtml = `<hr class="my-4"><div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2"><h4 class="fw-medium mb-0"><i class="bi bi-camera-video-fill me-2 text-muted"></i>${t('courseDetailSessionTitle')}</h4>`; if (isProvider) { const safeCourseTitle = (course.title || '').replace(/"/g, '"'); sessionHtml += `<button type="button" class="btn btn-sm btn-success" data-bs-toggle="modal" data-bs-target="#scheduleSessionModal" data-course-id="${course.id}" data-course-title="${safeCourseTitle}"><i class="bi bi-plus-lg me-1"></i>${t('courseDetailScheduleSessionButton')}</button>`; } sessionHtml += `</div>`; if (sessions.length > 0) { sessionHtml += `<ul class="list-group list-group-flush mb-3 simple-list border rounded overflow-hidden shadow-sm">${sessions.map(session => { const formattedDate = formatDateTime(session.dateTime); let meetingLink = '#'; let linkValid = false; try { if (session.meetingLink && new URL(session.meetingLink)) { meetingLink = session.meetingLink; linkValid = true; } } catch (_) {} return `<li class="list-group-item session-list-item px-3 py-2"><div class="session-info flex-grow-1 me-3"><span class="session-title fw-medium d-block">${session.title || t('untitledSession')}</span><span class="session-time small text-muted">${formattedDate}</span></div>${linkValid ? `<a href="${meetingLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary session-link flex-shrink-0"><i class="bi bi-box-arrow-up-right me-1"></i>${t('courseDetailJoinSessionButton')}</a>` : `<button class="btn btn-sm btn-secondary session-link flex-shrink-0 disabled" title="${t('invalidMeetingLink')}"><i class="bi bi-x-circle"></i> ${t('invalidLinkShort')}</button>`}</li>`; }).join('')}</ul>`; } else { sessionHtml += `<p class="text-muted fst-italic">${t('courseNoSessions')}</p>`; } }

        let baseFooterActions = '';
        if (isProvider) { baseFooterActions = `<div class="btn-group"><button class="btn btn-outline-secondary disabled" title="${t('featureNotAvailable')}"><i class="bi bi-pencil-square"></i> ${t('courseDetailEditButton')}</button><button class="btn btn-outline-danger delete-course-button" data-course-id="${course.id}"><i class="bi bi-trash"></i> ${t('courseDetailDeleteButton')}</button></div>`; }
        else if (isAdmin) { baseFooterActions = `<button class="btn btn-outline-danger delete-course-button" data-course-id="${course.id}" title="${t('courseDetailAdminDeleteButton')}"><i class="bi bi-trash-fill"></i> ${t('courseDetailAdminDeleteButton')}</button>`; }

        footerActionsHtml = baseFooterActions; // Start with base actions
        if (isEnrolled && provider && currentUser?.id !== provider.id) {
            // Add Contact Teacher button to the left of other actions if student is enrolled
            footerActionsHtml = `<a href="#conversation/${provider.id}" class="btn btn-outline-info me-auto"><i class="bi bi-chat-dots"></i> ${t('contactTeacherButton', {}, 'Contact Teacher')}</a>` + footerActionsHtml;
        }

        const contentHtml = `<div data-page-title="${course.title || t('untitledCourse')}"><div class="row justify-content-center fade-in"><div class="col-lg-10 col-xl-9"><div class="card shadow-lg border-0 mb-4 overflow-hidden course-detail rounded-3"><div class="card-img-placeholder bg-light" style="height:250px; font-size:7rem; display:flex; align-items:center; justify-content:center; color: rgba(var(--bs-primary-rgb), 0.2);"><i class="bi ${courseIcon}" title="${course.title || ''}"></i></div><div class="card-body p-4 p-md-5"><nav aria-label="breadcrumb" class="mb-4"><ol class="breadcrumb small bg-light bg-opacity-75 p-2 rounded-pill px-3"><li class="breadcrumb-item"><a href="#browse-courses">${t('navBrowseCourses')}</a></li><li class="breadcrumb-item active" aria-current="page">${course.title || t('untitledCourse')}</li></ol></nav>${statusAlertHtml}<h1 class="card-title display-5 mb-2 fw-bold">${course.title || t('untitledCourse')}</h1><h5 class="card-subtitle mb-4 text-muted fw-normal">${t('courseDetailBy', { provider: provider?.username || t('unknownProvider') })}</h5><p class="price display-4 my-4 ${priceClass}">${priceText}</p><div id="enroll-alert" class="alert d-none my-3" role="alert"></div><div id="course-action-alert" class="alert d-none my-3" role="alert"></div><div class="enroll-action-area mb-4 pb-2">${actionAreaHtml}</div><hr class="my-4"><h4 class="mb-3 fw-medium"><i class="bi bi-info-circle-fill me-2 text-muted"></i>${t('courseDetailAboutTitle')}</h4><div class="description lead fs-6 mb-4">${descriptionHtml}</div>${materialsHtml}${enrolledListHtml}${sessionHtml}<hr class="my-4"><div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4"><a href="#browse-courses" class="btn btn-outline-secondary"><i class="bi bi-arrow-left"></i> ${t('courseDetailBackButton')}</a>${footerActionsHtml}</div></div></div></div></div></div>`;
        render(contentHtml, false, true);
    } catch(e) { console.error("Error rendering course detail page:", e); renderTemporaryMessage('errorRenderingView', 'danger');} }

// --- Messaging Views ---
export function renderMessagesPage() { try { const currentUser = auth.getCurrentUser(); if (!currentUser) { window.location.hash = '#login'; return; } toggleAdminSidebar(false); const adminIds = store.getAdminUserIds(); const allMessages = store.getMessages(); let conversations = {}; allMessages.forEach(msg => { let partnerId = null; let isSupport = false; if (msg.senderId === currentUser.id) { if (adminIds.includes(msg.recipientId)) { partnerId = 'support_admin'; isSupport = true; } else { partnerId = msg.recipientId; } } else if (msg.recipientId === currentUser.id) { if (adminIds.includes(msg.senderId)) { partnerId = 'support_admin'; isSupport = true; } else { partnerId = msg.senderId; } } if (partnerId) { if (!conversations[partnerId] || new Date(msg.timestamp) > new Date(conversations[partnerId].timestamp)) { conversations[partnerId] = { ...msg, isSupport: isSupport }; } } }); let threadsHtml = Object.entries(conversations).sort(([, a], [, b]) => new Date(b.timestamp) - new Date(a.timestamp)).map(([partnerId, lastMsg]) => { let partnerName = t('supportTeam', {}, 'Support Team'); let conversationLink = '#support-chat'; let unreadCount = 0; if (!lastMsg.isSupport) { const partnerUser = store.findUserById(partnerId); partnerName = partnerUser ? partnerUser.username : t('unknownUser', {}, 'Unknown User'); conversationLink = `#conversation/${partnerId}`; unreadCount = store.getMessagesForConversation(currentUser.id, partnerId).filter(m => m.recipientId === currentUser.id && !m.read).length; } else { unreadCount = store.getSupportMessages(currentUser.id).filter(m => m.recipientId === currentUser.id && !m.read).length; } const formattedTime = formatDateTime(lastMsg.timestamp); const snippet = lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''); const isSender = lastMsg.senderId === currentUser.id; return `<a href="${conversationLink}" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${unreadCount > 0 ? 'list-group-item-primary' : ''}"><div><h6 class="mb-1">${partnerName}</h6><small class="text-muted">${isSender ? t('youPrefix', {}, 'You') + ': ' : ''}${snippet}</small></div><div class="text-end"><small class="text-muted d-block mb-1">${formattedTime}</small>${unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}</div></a>`; }).join(''); if (Object.keys(conversations).length === 0) { threadsHtml = `<li class="list-group-item text-center text-muted p-4">${t('noMessagesYet', {}, 'No messages yet.')}</li>`; } let supportButtonHtml = ''; if (currentUser.role === 'client') { supportButtonHtml = `<a href="#support-chat" class="btn btn-info mt-3"><i class="bi bi-headset"></i> ${t('contactSupportButton', {}, 'Contact Support')}</a>`; } const contentHtml = `<div data-page-title-key="navMessages"></div><h2 class="mb-4"><i class="bi bi-chat-dots-fill me-2"></i>${t('navMessages', {}, 'Messages')}</h2><div class="list-group shadow-sm">${threadsHtml}</div><div class="mt-4">${supportButtonHtml}</div>`; render(contentHtml, false, true); } catch(e) { console.error("Error rendering messages page:", e); renderTemporaryMessage('errorRenderingView', 'danger');} }
export function renderConversationPage() { try { const currentUser = auth.getCurrentUser(); if (!currentUser) { window.location.hash = '#login'; return; } toggleAdminSidebar(false); const hashParts = window.location.hash.split('/'); const partnerId = hashParts[0] === '#support-chat' ? 'support-chat' : hashParts[1]; let conversationMessages = []; let partnerName = ''; let isSupportChat = partnerId === 'support-chat'; let otherUserId = null; let recipientForSend = null; if (isSupportChat) { partnerName = t('supportTeam', {}, 'Support Team'); conversationMessages = store.getSupportMessages(currentUser.id); store.markSupportMessagesAsRead(currentUser.id); const adminIds = store.getAdminUserIds(); recipientForSend = adminIds.length > 0 ? adminIds[0] : null; if (!recipientForSend && currentUser.role !== 'admin') { console.error("Cannot send support message, no admin found"); } } else { otherUserId = partnerId; const partnerUser = store.findUserById(otherUserId); if (!partnerUser) { renderTemporaryMessage('alertTempUserNotFound', 'warning'); setTimeout(() => window.location.hash = '#messages', 1500); return; } partnerName = partnerUser.username; conversationMessages = store.getMessagesForConversation(currentUser.id, otherUserId); store.markMessagesAsRead(currentUser.id, otherUserId); recipientForSend = otherUserId; } renderNavbar(); let messagesHtml = conversationMessages.map(msg => { const isSender = msg.senderId === currentUser.id; const senderUser = isSender ? currentUser : (isSupportChat && store.getAdminUserIds().includes(msg.senderId) ? { username: t('supportTeam', {}, 'Support') } : store.findUserById(msg.senderId)); const senderName = isSender ? t('youPrefix', {}, 'You') : (senderUser ? senderUser.username : t('unknownUser')); const bubbleClass = isSender ? 'bg-primary text-white' : 'bg-light text-dark'; const time = new Date(msg.timestamp).toLocaleTimeString(getCurrentLanguage(), { hour: 'numeric', minute: '2-digit' }); return `<div class="d-flex ${isSender ? 'justify-content-end' : 'justify-content-start'} my-2"><div class="message-bubble d-inline-block" style="max-width: 75%;"><div class="${bubbleClass} p-2 px-3 rounded mb-1 shadow-sm">${msg.content.replace(/\n/g, '<br>')}</div><small class="text-muted d-block ${isSender ? 'text-end' : 'text-start'}" style="font-size: 0.75rem;">${!isSender ? senderName + ' - ' : ''}${time}</small></div></div>`; }).join(''); if (conversationMessages.length === 0) { messagesHtml = `<p class="text-center text-muted mt-4">${t('noMessagesInConversation', {}, 'Start the conversation!')}</p>`; } const contentHtml = `<div data-page-title="${t('chatWith', { name: partnerName })}"></div> <a href="#messages" class="btn btn-sm btn-outline-secondary mb-3"><i class="bi bi-arrow-left"></i> ${t('backToMessages', {}, 'Back to Inbox')}</a> <h3 class="mb-3 border-bottom pb-2">${t('chatWith', { name: partnerName })}</h3> <div id="message-list" class="mb-3 p-3 border rounded bg-white shadow-sm" style="height: 60vh; overflow-y: auto; display: flex; flex-direction: column-reverse;"> ${messagesHtml} </div> <form id="send-message-form"> <div id="send-message-form-alert" class="alert d-none mb-2" role="alert"></div> <div class="input-group"> <input type="text" id="message-input" class="form-control" placeholder="${t('typeMessagePlaceholder', {}, 'Type your message...')}" required autocomplete="off"> <button class="btn btn-primary" type="submit" id="send-message-button"> <i class="bi bi-send-fill"></i> <span class="d-none d-sm-inline">${t('sendMessageButton', {}, 'Send')}</span> </button> </div> </form>`; render(contentHtml, false, true); const messageList = document.getElementById('message-list'); if (messageList) { messageList.scrollTop = 0; /* Scroll to top because of column-reverse */ } // Form submission for sending message is handled in main.js via delegation now
} catch(e) { console.error("Error rendering conversation page:", e); renderTemporaryMessage('errorRenderingView', 'danger');} }

// Not Found Page (404)
export function renderNotFoundPage() { try { const contentHtml = `<div data-page-title-key="notFoundTitle"></div> <div class="text-center py-5 fade-in"><i class="bi bi-compass-fill display-1 text-primary opacity-50"></i><h1 class="display-4 mt-4 fw-bold">${t('notFoundTitle')}</h1><p class="lead text-muted mt-3 mb-4 col-md-8 mx-auto">${t('notFoundText')}</p><a href="#home" class="btn btn-primary mt-4 px-4 py-2"><i class="bi bi-house-door"></i> ${t('notFoundButton')}</a></div>`; render(contentHtml, false, true); toggleAdminSidebar(false); } catch(e) { console.error("Error rendering 404 page:", e); $('body').prepend(`<div class="alert alert-danger m-3">Error displaying 404 page. Check console.</div>`);} }