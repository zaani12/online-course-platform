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
        return null;
    } catch (e) {
        console.error(`[Store] Error parsing localStorage item "${key}":`, e);
        console.warn(`[Store] Removing potentially corrupted item for key "${key}".`);
        localStorage.removeItem(key);
        return null;
    }
}

function setData(key, value) {
    try {
        if (value === undefined) {
             console.warn(`[Store] Attempted to set undefined value for key "${key}". Skipping.`);
             return;
        }
        localStorage.setItem(key, JSON.stringify(value));
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
    let usersExist = false, coursesExist = false;
    let initializationSuccess = true;

    try { users = getData(USERS_KEY); usersExist = Array.isArray(users); } catch (e) { console.error("[Store] Error reading users from localStorage", e); }
    try { courses = getData(COURSES_KEY); coursesExist = Array.isArray(courses); } catch (e) { console.error("[Store] Error reading courses from localStorage", e); }

    console.log(`[Store] Initial localStorage state - Users valid array: ${usersExist}, Courses valid array: ${coursesExist}`);

    if (!usersExist || !coursesExist) {
        console.log('[Store] localStorage data missing or invalid, attempting to load from', DATA_FILE_PATH);
        try {
            const response = await fetch(`${DATA_FILE_PATH}?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${DATA_FILE_PATH}: ${response.status} ${response.statusText}`);
            }
            const defaultData = await response.json();
            console.log('[Store] Loaded default data from JSON:', defaultData);

            // Initialize users ONLY if they don't exist or are not an array
            if (!usersExist && defaultData.defaultUsers && Array.isArray(defaultData.defaultUsers)) {
                 const usersWithDefaults = defaultData.defaultUsers.map(user => ({
                    ...user,
                    id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    createdAt: user.createdAt && !isNaN(new Date(user.createdAt).getTime())
                                ? new Date(user.createdAt).toISOString()
                                : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
                 }));
                setData(USERS_KEY, usersWithDefaults);
                console.log(`[Store] Initialized ${usersWithDefaults.length} Users from defaults.`);
                usersExist = true;
            } else if (!usersExist) {
                console.warn('[Store] No default users found or default data invalid. Initializing empty user array.');
                setData(USERS_KEY, []);
                usersExist = true;
            }

            // Initialize courses ONLY if they don't exist or are not an array
            if (!coursesExist && defaultData.defaultCourses && Array.isArray(defaultData.defaultCourses)) {
                const coursesWithDefaults = defaultData.defaultCourses.map(course => ({
                    ...course,
                    id: course.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    enrolledStudentIds: Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds : [],
                    price: typeof course.price === 'number' && !isNaN(course.price) ? course.price : 0,
                    liveSessions: Array.isArray(course.liveSessions) ? course.liveSessions.map(session => ({
                        ...session,
                        id: session.id || `ls_${course.id || 'new'}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        scheduledAt: session.scheduledAt && !isNaN(new Date(session.scheduledAt).getTime()) ? new Date(session.scheduledAt).toISOString() : new Date().toISOString(),
                         dateTime: session.dateTime && !isNaN(new Date(session.dateTime).getTime()) ? new Date(session.dateTime).toISOString() : new Date().toISOString()
                    })) : [],
                    createdAt: course.createdAt && !isNaN(new Date(course.createdAt).getTime()) ? new Date(course.createdAt).toISOString() : new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
                }));
                setData(COURSES_KEY, coursesWithDefaults);
                console.log(`[Store] Initialized ${coursesWithDefaults.length} Courses from defaults.`);
                coursesExist = true;
            } else if (!coursesExist) {
                console.warn('[Store] No default courses found or default data invalid. Initializing empty course array.');
                 setData(COURSES_KEY, []);
                 coursesExist = true;
            }

        } catch (error) {
            console.error("[Store] MAJOR ERROR loading or parsing default data JSON:", error);
            // If defaults fail, forcefully ensure keys exist with empty arrays
            if (!Array.isArray(getData(USERS_KEY))) setData(USERS_KEY, []);
            if (!Array.isArray(getData(COURSES_KEY))) setData(COURSES_KEY, []);
            initializationSuccess = false;
            console.error("[Store] Initialization failed due to JSON loading error. Store might be empty.");
        }
    } else {
        console.log('[Store] Users and Courses data found in localStorage.');
        runDataMigration(); // Run migration on existing data
    }

    // Final check
    if (!Array.isArray(getData(USERS_KEY))) setData(USERS_KEY, []);
    if (!Array.isArray(getData(COURSES_KEY))) setData(COURSES_KEY, []);

    if (!localStorage.getItem(LAST_NOTIF_CHECK_KEY)) {
        localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date(0).toISOString());
    }

    console.log(`[Store] Initialization complete. Success: ${initializationSuccess}. Final Users Count: ${getUsers().length}, Final Courses Count: ${getCourses().length}`);
    return initializationSuccess;
}

// Optional migration function for existing data
function runDataMigration() {
     // console.log("[Store Migration] Checking existing data structure..."); // Optional: less verbose
     let currentCourses = getCourses();
     let updated = false;
     currentCourses = currentCourses.map(c => {
         if (!c) return null;
         let courseUpdated = false;
          if (!Array.isArray(c.liveSessions)) { c.liveSessions = []; courseUpdated = true; }
          if (!Array.isArray(c.enrolledStudentIds)) { c.enrolledStudentIds = []; courseUpdated = true; }
          if (typeof c.price !== 'number' || isNaN(c.price)) { c.price = 0; courseUpdated = true; }
          if (Array.isArray(c.liveSessions)) {
              c.liveSessions = c.liveSessions.map(session => {
                  if(!session) return null;
                  let sessionUpdated = false;
                  if (!session.id) { session.id = `ls_${c.id}_mig_${Date.now()}_${Math.random().toString(16).slice(2)}`; sessionUpdated = true; }
                  if (!session.scheduledAt || isNaN(new Date(session.scheduledAt).getTime())) { session.scheduledAt = new Date().toISOString(); sessionUpdated = true; }
                  if (!session.dateTime || isNaN(new Date(session.dateTime).getTime())) { session.dateTime = new Date().toISOString(); sessionUpdated = true; }
                  if(sessionUpdated) courseUpdated = true;
                  return session;
              }).filter(s => s !== null);
          }
          if(courseUpdated) updated = true;
         return c;
     }).filter(c => c !== null);

     if (updated) {
         setData(COURSES_KEY, currentCourses);
         console.log('[Store Migration] Updated existing courses structure.');
     }
}

// --- User Management ---
function getUsers() {
    const users = getData(USERS_KEY);
    return Array.isArray(users) ? users : [];
}
function addUser(user) {
    console.warn("[SECURITY] Storing plaintext password."); // Keep warning
    const users = getUsers();
    const newUser = { /* ... user creation logic ... */
        ...user, id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`, createdAt: user.createdAt || new Date().toISOString(), role: ['client', 'provider', 'admin'].includes(user.role) ? user.role : 'client'
    };
    users.push(newUser);
    setData(USERS_KEY, users);
    console.log(`[Store] Added user: ${newUser.username}`);
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
function setLoggedInUser(userId) { /* ... (keep as is) ... */ }
function getLoggedInUser() { /* ... (keep as is) ... */ }
function clearLoggedInUser() { /* ... (keep as is) ... */ }

// --- Course Management ---
function getCourses() {
    const courses = getData(COURSES_KEY);
    return Array.isArray(courses) ? courses : [];
}
function addCourse(courseData) { /* ... (keep as is) ... */ }
function findCourseById(id) { /* ... (keep as is) ... */ }
function updateCourse(updatedCourseData) { /* ... (keep as is) ... */ }
function deleteCourse(id) { /* ... (keep as is) ... */ }
function getCoursesByProvider(providerId) { /* ... (keep as is) ... */ }
function getCoursesEnrolledByStudent(studentId) { /* ... (keep as is) ... */ }
function enrollStudentInCourse(courseId, studentId) { /* ... (keep as is) ... */ }
function getEnrolledStudentsDetails(courseId) { /* ... (keep as is) ... */ }

// --- Live Session Management ---
function addLiveSession(courseId, sessionData) { /* ... (keep as is) ... */ }
function getLiveSessionsForCourse(courseId) { /* ... (keep as is) ... */ }

// --- Simulated Notification Management ---
function getLastNotificationCheckTime() { /* ... (keep as is) ... */ }
function updateLastNotificationCheckTime() { /* ... (keep as is) ... */ }

// --- Statistics for Admin Dashboard (Add logs inside) ---
function getUserCountsByRole() {
    const users = getUsers();
    const counts = { admin: 0, provider: 0, client: 0, total: 0, unknown: 0 };
    if (!Array.isArray(users)) { console.error("[Store Stats] User data is not an array!"); return counts; }
    counts.total = users.length;
    users.forEach(user => {
        if (user && user.role && counts.hasOwnProperty(user.role)) { counts[user.role]++; }
        else { counts.unknown++; }
    });
    console.log("[Store Stats] getUserCountsByRole result:", counts); // <<< Log Added
    return counts;
}
function getTotalCourseCount() {
    const count = getCourses().length;
    console.log("[Store Stats] getTotalCourseCount result:", count); // <<< Log Added
    return count;
}
function getCoursePriceStats() {
    const courses = getCourses(); const totalCourses = courses.length;
    const stats = { averagePrice: 0, freeCount: 0, paidCount: 0, percentFree: 0, totalCourses: totalCourses };
    if (!Array.isArray(courses) || totalCourses === 0) { return stats; }
    let totalPriceSum = 0; let validPriceCount = 0;
    courses.forEach(course => {
        if (!course) return; const price = parseFloat(course.price);
        if (isNaN(price) || price < 0) { stats.freeCount++; }
        else { totalPriceSum += price; validPriceCount++; if (price === 0) { stats.freeCount++; } else { stats.paidCount++; } }
    });
    stats.averagePrice = validPriceCount > 0 ? totalPriceSum / validPriceCount : 0;
    stats.percentFree = totalCourses > 0 ? (stats.freeCount / totalCourses) * 100 : 0;
    console.log("[Store Stats] getCoursePriceStats result:", stats); // <<< Log Added
    return stats;
}
function getSimulatedTotalRevenue() {
    const courses = getCourses(); if (!Array.isArray(courses)) return 0;
    const totalRevenue = courses.reduce((sum, course) => { if (!course) return sum; const price = parseFloat(course.price); if (isNaN(price) || price <= 0) return sum; const enrollmentCount = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0; return sum + (price * enrollmentCount); }, 0);
    console.log("[Store Stats] getSimulatedTotalRevenue result:", totalRevenue); // <<< Log Added
    return totalRevenue;
}
function getEnrollmentStats() {
    const courses = getCourses(); const totalCourses = courses.length;
    const stats = { totalEnrollments: 0, averageEnrollments: 0, coursesWithEnrollment: 0 };
    if (!Array.isArray(courses) || totalCourses === 0) { return stats; }
    stats.totalEnrollments = courses.reduce((sum, course) => { if (!course) return sum; const count = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0; if (count > 0) { stats.coursesWithEnrollment++; } return sum + count; }, 0);
    stats.averageEnrollments = totalCourses > 0 ? stats.totalEnrollments / totalCourses : 0;
    console.log("[Store Stats] getEnrollmentStats result:", stats); // <<< Log Added
    return stats;
}
function getCoursesPerProviderData() {
    const courses = getCourses(); const providers = getUsers().filter(user => user?.role === 'provider'); const providerCounts = {}; let unknownCount = 0;
    providers.forEach(p => { if(p?.username) providerCounts[p.username] = 0; });
    if (!Array.isArray(courses)) { return { labels: [], data: [] }; }
    courses.forEach(course => { if (!course || !course.providerId) { unknownCount++; return; } const provider = findUserById(course.providerId); if (provider?.username && providerCounts.hasOwnProperty(provider.username)) { providerCounts[provider.username]++; } else { unknownCount++; } });
    if (unknownCount > 0) { providerCounts['Unknown/Deleted'] = unknownCount; }
     const filteredLabels = Object.keys(providerCounts).filter(label => providerCounts[label] > 0 || (label === 'Unknown/Deleted' && providerCounts[label] > 0));
     const filteredData = filteredLabels.map(label => providerCounts[label]);
     console.log("[Store Stats] getCoursesPerProviderData result:", { labels: filteredLabels, data: filteredData }); // <<< Log Added
    return { labels: filteredLabels, data: filteredData };
}
function getTopEnrolledCourses(limit = 5) {
    const courses = getCourses(); if (!Array.isArray(courses)) return { labels: [], data: [] };
    const coursesWithEnrollment = courses.filter(c => c?.id && c.title).map(c => ({ title: c.title, enrollmentCount: Array.isArray(c.enrolledStudentIds) ? c.enrolledStudentIds.length : 0 })).filter(c => c.enrollmentCount > 0).sort((a, b) => b.enrollmentCount - a.enrollmentCount);
    const top = coursesWithEnrollment.slice(0, limit);
    const result = { labels: top.map(c => c.title), data: top.map(c => c.enrollmentCount) };
    console.log("[Store Stats] getTopEnrolledCourses result:", result); // <<< Log Added
    return result;
}

// --- Export store functions ---
export {
    initializeStore,
    // Users
    getUsers, addUser, findUserByUsername, findUserById,
    setLoggedInUser, getLoggedInUser, clearLoggedInUser,
    // Courses
    getCourses, addCourse, findCourseById, updateCourse, deleteCourse,
    getCoursesByProvider, getCoursesEnrolledByStudent, enrollStudentInCourse,
    getEnrolledStudentsDetails,
    // Live Sessions
    addLiveSession, getLiveSessionsForCourse,
    // Notifications (Simulated)
    getLastNotificationCheckTime, updateLastNotificationCheckTime,
    // Statistics
    getUserCountsByRole, getTotalCourseCount, getCoursePriceStats,
    getSimulatedTotalRevenue, getEnrollmentStats, getCoursesPerProviderData,
    getTopEnrolledCourses
    
};