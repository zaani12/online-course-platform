// js/store.js - Manages application data using localStorage and provides stats
import { getCurrentLanguage } from './i18n.js'; // Import for date formatting if needed

const USERS_KEY = 'coursePlatformUsers';
const COURSES_KEY = 'coursePlatformCourses';
const CURRENT_USER_KEY = 'coursePlatformCurrentUser';
const LAST_NOTIF_CHECK_KEY = 'learnSphereLastNotifCheck'; // For simulated notifications
const DATA_FILE_PATH = 'data.json'; // Path to the default data file

// --- LocalStorage Helpers ---
function getData(key) {
    try {
        const data = localStorage.getItem(key);
        if (data && data !== 'undefined' && data !== 'null') {
            return JSON.parse(data);
        }
        return null; // Return null if no valid data found
    } catch (e) {
        console.error(`[Store] Error parsing localStorage item "${key}":`, e);
        console.warn(`[Store] Removing potentially corrupted item for key "${key}".`);
        localStorage.removeItem(key); // Attempt to remove corrupted data
        return null; // Return null on parsing error
    }
}

function setData(key, value) {
    try {
        if (value === undefined) {
             console.warn(`[Store] Attempted to set undefined value for key "${key}". Skipping.`);
             return;
        }
        // Ensure we don't store null or undefined explicitly, store empty array/object instead if needed
        if (value === null && (key === USERS_KEY || key === COURSES_KEY)) {
            localStorage.setItem(key, JSON.stringify([]));
        } else {
            localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
             console.error(`[Store] QuotaExceededError: Failed to set item for key "${key}". LocalStorage might be full.`);
        } else {
            console.error(`[Store] Error setting localStorage item "${key}":`, e);
        }
    }
}

// --- Store Initialization ---
async function initializeStore() {
    console.log('[Store] Initializing...');
    let users = null, courses = null;
    let usersValid = false, coursesValid = false;
    let initializationSuccess = true;

    try { users = getData(USERS_KEY); usersValid = Array.isArray(users); } catch (e) { console.error("[Store] Error reading users from localStorage during init", e); }
    try { courses = getData(COURSES_KEY); coursesValid = Array.isArray(courses); } catch (e) { console.error("[Store] Error reading courses from localStorage during init", e); }

    // Load defaults if data is missing or invalid
    if (!usersValid || !coursesValid) {
        console.log('[Store] localStorage data missing or invalid, loading defaults...');
        try {
            const response = await fetch(`${DATA_FILE_PATH}?v=${Date.now()}`);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            const defaultData = await response.json();
            console.log('[Store] Loaded default data from JSON.');

            if (!usersValid && defaultData.defaultUsers) {
                 const usersWithDefaults = defaultData.defaultUsers.map(user => ({
                     ...user, id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                     createdAt: user.createdAt && !isNaN(new Date(user.createdAt).getTime()) ? new Date(user.createdAt).toISOString() : new Date().toISOString()
                 }));
                 setData(USERS_KEY, usersWithDefaults); usersValid = true; console.log(`[Store] Initialized ${usersWithDefaults.length} Users.`);
            } else if (!usersValid) { setData(USERS_KEY, []); }

            if (!coursesValid && defaultData.defaultCourses) {
                const coursesWithDefaults = defaultData.defaultCourses.map(course => ({
                    ...course, id: course.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    enrolledStudentIds: Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds : [],
                    price: (typeof course.price === 'number' && !isNaN(course.price)) ? course.price : 0,
                    liveSessions: Array.isArray(course.liveSessions) ? course.liveSessions.map(session => ({
                        ...session, id: session.id || `ls_${course.id || 'new'}_${Date.now()}`,
                        scheduledAt: session.scheduledAt && !isNaN(new Date(session.scheduledAt).getTime()) ? new Date(session.scheduledAt).toISOString() : new Date().toISOString(),
                        dateTime: session.dateTime && !isNaN(new Date(session.dateTime).getTime()) ? new Date(session.dateTime).toISOString() : new Date().toISOString()
                    })) : [],
                    materials: Array.isArray(course.materials) ? course.materials.map(mat => ({ // Ensure materials have IDs/dates
                        ...mat, id: mat.id || `mat_${course.id || 'new'}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        addedAt: mat.addedAt && !isNaN(new Date(mat.addedAt).getTime()) ? new Date(mat.addedAt).toISOString() : new Date().toISOString()
                    })) : [], // <-- Initialize materials array
                    createdAt: course.createdAt && !isNaN(new Date(course.createdAt).getTime()) ? new Date(course.createdAt).toISOString() : new Date().toISOString()
                }));
                setData(COURSES_KEY, coursesWithDefaults); coursesValid = true; console.log(`[Store] Initialized ${coursesWithDefaults.length} Courses.`);
            } else if (!coursesValid) { setData(COURSES_KEY, []); }

        } catch (error) {
            console.error("[Store] MAJOR ERROR loading default data:", error);
            if (!Array.isArray(getData(USERS_KEY))) setData(USERS_KEY, []);
            if (!Array.isArray(getData(COURSES_KEY))) setData(COURSES_KEY, []);
            initializationSuccess = false;
        }
    } else {
        runDataMigration(); // Run migration on existing data
    }

    if (!localStorage.getItem(LAST_NOTIF_CHECK_KEY)) { localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date(0).toISOString()); }
    console.log(`[Store] Initialization complete. Success: ${initializationSuccess}. Users: ${getUsers().length}, Courses: ${getCourses().length}`);
    return initializationSuccess;
}

// Optional migration function for existing data
function runDataMigration() {
     let currentCourses = getCourses();
     let updated = false;
     currentCourses = currentCourses.map(c => {
         if (!c || typeof c !== 'object') return null;
         let courseUpdated = false;
         // Existing checks...
         if (!Array.isArray(c.liveSessions)) { c.liveSessions = []; courseUpdated = true; }
         if (!Array.isArray(c.enrolledStudentIds)) { c.enrolledStudentIds = []; courseUpdated = true; }
         if (typeof c.price !== 'number' || isNaN(c.price)) { c.price = 0; courseUpdated = true; }
         if (!c.createdAt || isNaN(new Date(c.createdAt).getTime())) { c.createdAt = new Date().toISOString(); courseUpdated = true; }
         // *** ADD MIGRATION FOR MATERIALS ***
         if (!Array.isArray(c.materials)) {
             c.materials = []; // Add materials array if missing
             courseUpdated = true;
             console.log(`[Store Migration] Added missing 'materials' array to course ${c.id}`);
         } else {
             // Ensure existing materials have needed fields
             c.materials = c.materials.map(mat => {
                 if (!mat || typeof mat !== 'object') return null;
                 let matUpdated = false;
                 if (!mat.id) { mat.id = `mat_${c.id}_mig_${Date.now()}_${Math.random().toString(16).slice(2)}`; matUpdated = true; }
                 if (!mat.type) { mat.type = 'link'; matUpdated = true; } // Default to link if type missing
                 if (!mat.addedAt || isNaN(new Date(mat.addedAt).getTime())) { mat.addedAt = c.createdAt || new Date().toISOString(); matUpdated = true; } // Default add date
                 if (matUpdated) courseUpdated = true;
                 return mat;
             }).filter(mat => mat !== null);
         }
         // *** END MATERIALS MIGRATION ***
         if (courseUpdated) updated = true;
         return c;
     }).filter(c => c !== null);

     if (updated) {
         setData(COURSES_KEY, currentCourses);
         console.log('[Store Migration] Finished updating existing data structures.');
     }
}

// --- User Management ---
function getUsers() {
    const users = getData(USERS_KEY);
    return Array.isArray(users) ? users : [];
}

function addUser(user) {
    // *** SECURITY WARNING ***
    console.warn("\n**************************************************\n" +
                 "[SECURITY] INSECURE: Storing plaintext password.\n" +
                 "This is for DEMONSTRATION ONLY. Never do this in production.\n" +
                 "Passwords should be hashed securely on the server.\n" +
                 "**************************************************\n");
    const users = getUsers();
    const newUser = {
        id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        username: user.username,
        password: user.password, // Plaintext!
        role: ['client', 'provider', 'admin'].includes(user.role) ? user.role : 'client',
        createdAt: user.createdAt || new Date().toISOString()
    };
    users.push(newUser);
    setData(USERS_KEY, users);
    console.log(`[Store] Added user: ${newUser.username} (ID: ${newUser.id})`);
    return newUser;
}

function findUserByUsername(usernameToFind) {
    if (!usernameToFind) return null;
    return getUsers().find(user => user?.username === usernameToFind) || null;
}

function findUserById(id) {
    if (!id) return null;
    return getUsers().find(user => user?.id === id) || null;
}

function setLoggedInUser(userId) {
    if (!userId) {
        console.warn("[Store] Attempted to set logged in user with null/undefined ID.");
        clearLoggedInUser(); return;
    }
    if (!findUserById(userId)) {
        console.error(`[Store] Attempted to set logged in user for non-existent ID: ${userId}. Clearing session.`);
        clearLoggedInUser(); return;
    }
    setData(CURRENT_USER_KEY, userId);
}

function getLoggedInUser() {
    const userId = getData(CURRENT_USER_KEY);
    if (!userId) return null;
    const user = findUserById(userId);
     if (!user) {
         console.warn(`[Store.getLoggedInUser] Logged in user ID ${userId} found in storage, but no matching user in store. Clearing invalid session.`);
         clearLoggedInUser(); return null;
     }
    return user;
}

// Inside store.js
function clearLoggedInUser() {
    console.log(`[Store] Attempting to remove key: ${CURRENT_USER_KEY}`); // Add log
    try {
        localStorage.removeItem(CURRENT_USER_KEY); // Remove the user ID from storage
        console.log('[Store] Logged in user key removed from storage.');
    } catch (error) {
        console.error("[Store] Error removing logged in user key:", error);
    }
}

// --- Course Management ---
function getCourses() {
    const courses = getData(COURSES_KEY);
    return Array.isArray(courses) ? courses : [];
}

function addCourse(courseData) {
    if (!courseData || !courseData.title || !courseData.providerId || typeof courseData.price === 'undefined') {
         console.error("[Store] Add course failed: Missing required data.", courseData); return null;
    }
    const courses = getCourses();
    const newCourse = {
        id: courseData.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: courseData.title,
        description: courseData.description || "",
        price: parseFloat(courseData.price) || 0,
        providerId: courseData.providerId,
        enrolledStudentIds: [],
        liveSessions: [],
        materials: [], // <-- Initialize new courses with empty materials
        createdAt: courseData.createdAt || new Date().toISOString()
    };
    courses.push(newCourse);
    setData(COURSES_KEY, courses);
    console.log(`[Store] Added course: "${newCourse.title}" (ID: ${newCourse.id})`);
    return newCourse;
}

function findCourseById(id) {
     if (!id) return null;
     return getCourses().find(course => course?.id === id) || null;
}

function updateCourse(updatedCourseData) {
    if (!updatedCourseData?.id) { console.warn("[Store] Update course failed: Invalid ID."); return false; }
    const courses = getCourses();
    const index = courses.findIndex(course => course?.id === updatedCourseData.id);
    if (index !== -1) {
        const originalCourse = courses[index];
        // Merge, ensuring arrays and immutable fields are handled
        courses[index] = {
            ...originalCourse,
            ...updatedCourseData,
            enrolledStudentIds: updatedCourseData.enrolledStudentIds ?? originalCourse.enrolledStudentIds ?? [],
            liveSessions: updatedCourseData.liveSessions ?? originalCourse.liveSessions ?? [],
            materials: updatedCourseData.materials ?? originalCourse.materials ?? [], // <-- Handle materials
            id: originalCourse.id, // Keep original ID
            providerId: originalCourse.providerId, // Keep original provider
            createdAt: originalCourse.createdAt // Keep original creation date
        };
        setData(COURSES_KEY, courses);
        return true;
   }
    console.warn(`[Store] Update failed: Course ID ${updatedCourseData.id} not found.`); return false;
}

function deleteCourse(id) {
     if (!id) { console.warn("[Store] Delete course failed: Invalid ID."); return false; }
    let courses = getCourses();
    const initialLength = courses.length;
    courses = courses.filter(course => !(course?.id === id));
    if (courses.length < initialLength) {
        setData(COURSES_KEY, courses); console.log(`[Store] Deleted course ID: ${id}`); return true;
    }
    console.warn(`[Store] Delete failed: Course ID ${id} not found.`); return false;
}

function getCoursesByProvider(providerId) {
     if (!providerId) return [];
     return getCourses().filter(course => course?.providerId === providerId);
}

function getCoursesEnrolledByStudent(studentId) {
     if (!studentId) return [];
     return getCourses().filter(course => course?.enrolledStudentIds?.includes(studentId));
}

function enrollStudentInCourse(courseId, studentId) {
    if (!courseId || !studentId) { console.warn("[Store] Enrollment failed: Missing ID."); return false; }
    const course = findCourseById(courseId);
    if (!course) { console.warn(`[Store] Enrollment failed: Course ${courseId} not found.`); return false; }
    if (!Array.isArray(course.enrolledStudentIds)) { course.enrolledStudentIds = []; }
    if (!course.enrolledStudentIds.includes(studentId)) {
        course.enrolledStudentIds.push(studentId);
        const success = updateCourse(course);
        if (success) { console.log(`[Store] Student ${studentId} enrolled in course ${courseId}.`); }
        else { console.error(`[Store] Failed to update course ${courseId} after enrolling student ${studentId}.`); const index = course.enrolledStudentIds.indexOf(studentId); if (index > -1) course.enrolledStudentIds.splice(index, 1); }
        return success;
    } else { return true; } // Already enrolled is success state
}

function getEnrolledStudentsDetails(courseId) {
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.enrolledStudentIds) || course.enrolledStudentIds.length === 0) { return []; }
    return course.enrolledStudentIds.map(studentId => findUserById(studentId)).filter(user => user !== null);
}

// --- Course Materials Management ---

function addCourseMaterial(courseId, materialData) {
    if (!courseId || !materialData || !materialData.title || !materialData.type || !materialData.url) {
        console.warn('[Store] Add course material failed: Missing required data.', { courseId, materialData });
        return false;
    }
    const course = findCourseById(courseId);
    if (!course) { console.warn(`[Store] Add course material failed: Course ${courseId} not found.`); return false; }
    if (!Array.isArray(course.materials)) { course.materials = []; }
    // Validate URL format if it's not a text snippet
    if (materialData.type !== 'text') {
        try { new URL(materialData.url); } catch (_) { console.warn(`[Store] Add material failed: Invalid URL "${materialData.url}".`); return false; }
    }

    const newMaterial = {
        id: `mat_${courseId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        type: materialData.type,
        title: materialData.title,
        url: materialData.url, // URL stored as provided (or '#' for text type)
        description: materialData.description || '',
        addedAt: new Date().toISOString()
    };
    course.materials.push(newMaterial);
    course.materials.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)); // Sort newest first
    const success = updateCourse(course);
    if (success) { console.log(`[Store] Added material '${newMaterial.title}' to course ${courseId}.`); }
    else { console.error(`[Store] Failed to update course ${courseId} after adding material.`); course.materials.pop(); }
    return success;
}

function getCourseMaterials(courseId) {
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.materials)) { return []; }
    return [...course.materials].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)); // Return sorted copy
}

function deleteCourseMaterial(courseId, materialId) {
     if (!courseId || !materialId) { console.warn("[Store] Delete material failed: Missing IDs."); return false; }
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.materials)) { console.warn(`[Store] Delete material failed: Course/materials not found.`); return false; }
    const initialLength = course.materials.length;
    course.materials = course.materials.filter(mat => mat?.id !== materialId);
    if (course.materials.length < initialLength) {
        const success = updateCourse(course);
        if (success) { console.log(`[Store] Deleted material ${materialId} from course ${courseId}.`); }
        else { console.error(`[Store] Failed to update course ${courseId} after deleting material ${materialId}.`); }
        return success;
    } else { console.warn(`[Store] Delete material failed: Material ${materialId} not found.`); return false; }
}

// --- Live Session Management ---
function addLiveSession(courseId, sessionData) {
    if (!courseId || !sessionData || !sessionData.title || !sessionData.dateTime || !sessionData.meetingLink) { console.warn('[Store] Add live session failed: Missing data.', sessionData); return false; }
    const course = findCourseById(courseId);
    if (!course) { console.warn(`[Store] Add live session failed: Course ${courseId} not found.`); return false; }
    if (!Array.isArray(course.liveSessions)) { course.liveSessions = []; }
    const sessionDate = new Date(sessionData.dateTime);
    if (isNaN(sessionDate.getTime())) { console.warn(`[Store] Add live session failed: Invalid dateTime "${sessionData.dateTime}".`); return false; }
    try { new URL(sessionData.meetingLink) } catch (_) { console.warn(`[Store] Add live session failed: Invalid meetingLink "${sessionData.meetingLink}".`); return false; }
    const newSession = { id: `ls_${courseId}_${Date.now()}_${Math.random().toString(16).slice(2)}`, title: sessionData.title, dateTime: sessionDate.toISOString(), meetingLink: sessionData.meetingLink, scheduledAt: new Date().toISOString() };
    course.liveSessions.push(newSession);
    course.liveSessions.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    const success = updateCourse(course);
    if (success) { console.log(`[Store] Added live session '${newSession.title}' to course ${courseId}.`); }
    else { console.error(`[Store] Failed to update course ${courseId} after adding live session.`); const index = course.liveSessions.findIndex(s => s.id === newSession.id); if(index > -1) course.liveSessions.splice(index,1); }
    return success;
}

function getLiveSessionsForCourse(courseId) {
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.liveSessions)) { return []; }
    return [...course.liveSessions].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
}

// --- Simulated Notification Management ---
function getLastNotificationCheckTime() { return localStorage.getItem(LAST_NOTIF_CHECK_KEY) || new Date(0).toISOString(); }
function updateLastNotificationCheckTime() { const now = new Date().toISOString(); localStorage.setItem(LAST_NOTIF_CHECK_KEY, now); console.log(`[Store] Updated last notification check time to: ${now}`); }

// --- Statistics for Admin Dashboard ---
function getUserCountsByRole() { const users = getUsers(); const counts = { admin: 0, provider: 0, client: 0, total: 0, unknown: 0 }; if (!Array.isArray(users)) { return counts; } counts.total = users.length; users.forEach(user => { if (user?.role && counts.hasOwnProperty(user.role)) { counts[user.role]++; } else { counts.unknown++; } }); return counts; }
function getTotalCourseCount() { return getCourses().length; }
function getCoursePriceStats() { const courses = getCourses(); const totalCourses = courses.length; const stats = { averagePrice: 0, freeCount: 0, paidCount: 0, percentFree: 0, totalCourses: totalCourses }; if (!Array.isArray(courses) || totalCourses === 0) { return stats; } let totalPriceSum = 0; let validPriceCount = 0; courses.forEach(course => { if (!course) return; const price = parseFloat(course.price); if (isNaN(price) || price < 0) { stats.freeCount++; } else { totalPriceSum += price; validPriceCount++; if (price === 0) { stats.freeCount++; } else { stats.paidCount++; } } }); stats.averagePrice = validPriceCount > 0 ? totalPriceSum / validPriceCount : 0; stats.percentFree = totalCourses > 0 ? (stats.freeCount / totalCourses) * 100 : 0; return stats; }
function getSimulatedTotalRevenue() { const courses = getCourses(); if (!Array.isArray(courses)) return 0; return courses.reduce((sum, course) => { if (!course) return sum; const price = parseFloat(course.price); if (isNaN(price) || price <= 0) return sum; const enrollmentCount = course.enrolledStudentIds?.length || 0; return sum + (price * enrollmentCount); }, 0); }
function getEnrollmentStats() { const courses = getCourses(); const totalCourses = courses.length; const stats = { totalEnrollments: 0, averageEnrollments: 0, coursesWithEnrollment: 0 }; if (!Array.isArray(courses) || totalCourses === 0) { return stats; } stats.totalEnrollments = courses.reduce((sum, course) => { if (!course) return sum; const count = course.enrolledStudentIds?.length || 0; if (count > 0) { stats.coursesWithEnrollment++; } return sum + count; }, 0); stats.averageEnrollments = totalCourses > 0 ? stats.totalEnrollments / totalCourses : 0; return stats; }
function getCoursesPerProviderData() { const courses = getCourses(); const providers = getUsers().filter(user => user?.role === 'provider'); const providerCounts = {}; let unknownCount = 0; providers.forEach(p => { if(p?.username) providerCounts[p.username] = 0; }); if (!Array.isArray(courses)) { return { labels: [], data: [] }; } courses.forEach(course => { if (!course || !course.providerId) { unknownCount++; return; } const provider = findUserById(course.providerId); if (provider?.username && providerCounts.hasOwnProperty(provider.username)) { providerCounts[provider.username]++; } else { unknownCount++; } }); if (unknownCount > 0) { providerCounts['Unknown/Deleted'] = unknownCount; } const filteredLabels = Object.keys(providerCounts).filter(label => providerCounts[label] > 0 || (label === 'Unknown/Deleted' && providerCounts[label] > 0)); const filteredData = filteredLabels.map(label => providerCounts[label]); return { labels: filteredLabels, data: filteredData }; }
function getTopEnrolledCourses(limit = 5) { const courses = getCourses(); if (!Array.isArray(courses)) return { labels: [], data: [] }; const coursesWithEnrollment = courses .filter(c => c?.id && c.title) .map(c => ({ title: c.title, enrollmentCount: c.enrolledStudentIds?.length || 0 })) .filter(c => c.enrollmentCount > 0) .sort((a, b) => b.enrollmentCount - a.enrollmentCount); const top = coursesWithEnrollment.slice(0, limit); return { labels: top.map(c => c.title), data: top.map(c => c.enrollmentCount) }; }

// --- Export store functions ---
export {
    initializeStore, // <-- Corrected: Ensure only one export
    // Users
    getUsers, addUser, findUserByUsername, findUserById,
    setLoggedInUser, getLoggedInUser, clearLoggedInUser,
    // Courses
    getCourses, addCourse, findCourseById, updateCourse, deleteCourse,
    getCoursesByProvider, getCoursesEnrolledByStudent, enrollStudentInCourse,
    getEnrolledStudentsDetails,
    // Course Materials
    addCourseMaterial, getCourseMaterials, deleteCourseMaterial,
    // Live Sessions
    addLiveSession, getLiveSessionsForCourse,
    // Notifications (Simulated)
    getLastNotificationCheckTime, updateLastNotificationCheckTime,
    // Statistics
    getUserCountsByRole, getTotalCourseCount, getCoursePriceStats,
    getSimulatedTotalRevenue, getEnrollmentStats, getCoursesPerProviderData,
    getTopEnrolledCourses
};