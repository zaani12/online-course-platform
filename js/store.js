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
        // Ensure data is not null, undefined, or the literal string 'undefined'/'null'
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
             console.warn(`[Store] Attempted to set null for key "${key}". Storing empty array instead.`);
             localStorage.setItem(key, JSON.stringify([]));
        } else {
             localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
             console.error(`[Store] QuotaExceededError: Failed to set item for key "${key}". LocalStorage might be full.`);
             // Potentially notify user or implement cleanup strategy
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

    // Attempt to read and validate existing data
    try { users = getData(USERS_KEY); usersValid = Array.isArray(users); } catch (e) { console.error("[Store] Error reading users from localStorage during init", e); }
    try { courses = getData(COURSES_KEY); coursesValid = Array.isArray(courses); } catch (e) { console.error("[Store] Error reading courses from localStorage during init", e); }

    console.log(`[Store] Initial localStorage state - Users valid array: ${usersValid}, Courses valid array: ${coursesValid}`);

    // Load defaults if data is missing or invalid
    if (!usersValid || !coursesValid) {
        console.log('[Store] localStorage data missing or invalid, attempting to load from', DATA_FILE_PATH);
        try {
            const response = await fetch(`${DATA_FILE_PATH}?v=${Date.now()}`); // Cache buster
            if (!response.ok) {
                throw new Error(`Failed to fetch ${DATA_FILE_PATH}: ${response.status} ${response.statusText}`);
            }
            const defaultData = await response.json();
            console.log('[Store] Loaded default data from JSON:', defaultData);

            // Initialize users ONLY if they were invalid
            if (!usersValid) {
                if (defaultData.defaultUsers && Array.isArray(defaultData.defaultUsers)) {
                    const usersWithDefaults = defaultData.defaultUsers.map(user => ({
                       ...user,
                       id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                       createdAt: user.createdAt && !isNaN(new Date(user.createdAt).getTime())
                                   ? new Date(user.createdAt).toISOString()
                                   : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
                    }));
                   setData(USERS_KEY, usersWithDefaults);
                   console.log(`[Store] Initialized ${usersWithDefaults.length} Users from defaults.`);
               } else {
                   console.warn('[Store] No default users found or default data invalid. Initializing empty user array.');
                   setData(USERS_KEY, []);
               }
                usersValid = true; // Mark as valid now
            }

            // Initialize courses ONLY if they were invalid
            if (!coursesValid) {
                 if (defaultData.defaultCourses && Array.isArray(defaultData.defaultCourses)) {
                    const coursesWithDefaults = defaultData.defaultCourses.map(course => ({
                        ...course,
                        id: course.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        enrolledStudentIds: Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds : [],
                        price: (typeof course.price === 'number' && !isNaN(course.price)) ? course.price : 0,
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
                } else {
                    console.warn('[Store] No default courses found or default data invalid. Initializing empty course array.');
                     setData(COURSES_KEY, []);
                 }
                coursesValid = true; // Mark as valid now
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
        console.log('[Store] Users and Courses data found and valid in localStorage.');
        runDataMigration(); // Run migration only if data existed
    }

     // Ensure notification check time exists
    if (!localStorage.getItem(LAST_NOTIF_CHECK_KEY)) {
        localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date(0).toISOString());
    }

    console.log(`[Store] Initialization complete. Success: ${initializationSuccess}. Final Users Count: ${getUsers().length}, Final Courses Count: ${getCourses().length}`);
    return initializationSuccess;
}

// Optional migration function for existing data
function runDataMigration() {
     console.log("[Store Migration] Checking existing data structure...");
     let currentCourses = getCourses();
     let updated = false;
     currentCourses = currentCourses.map(c => {
         if (!c || typeof c !== 'object') return null; // Skip null/invalid entries

         let courseUpdated = false;
         // Ensure basic fields and arrays exist and have correct types
          if (!Array.isArray(c.liveSessions)) { c.liveSessions = []; courseUpdated = true; console.log(`[Store Migration] Added missing 'liveSessions' to course ${c.id}`); }
          if (!Array.isArray(c.enrolledStudentIds)) { c.enrolledStudentIds = []; courseUpdated = true; console.log(`[Store Migration] Added missing 'enrolledStudentIds' to course ${c.id}`);}
          if (typeof c.price !== 'number' || isNaN(c.price)) { c.price = 0; courseUpdated = true; console.log(`[Store Migration] Corrected 'price' for course ${c.id}`);}
          // Ensure sessions have necessary fields
          if (Array.isArray(c.liveSessions)) {
              c.liveSessions = c.liveSessions.map(session => {
                  if(!session || typeof session !== 'object') return null; // Skip invalid sessions within the array
                  let sessionUpdated = false;
                  if (!session.id) { session.id = `ls_${c.id || 'unknown'}_mig_${Date.now()}_${Math.random().toString(16).slice(2)}`; sessionUpdated = true; }
                  if (!session.scheduledAt || isNaN(new Date(session.scheduledAt).getTime())) { session.scheduledAt = new Date().toISOString(); sessionUpdated = true; }
                  if (!session.dateTime || isNaN(new Date(session.dateTime).getTime())) { session.dateTime = new Date().toISOString(); sessionUpdated = true; }
                  if(sessionUpdated) { courseUpdated = true; console.log(`[Store Migration] Updated session structure within course ${c.id}`); }
                  return session;
              }).filter(s => s !== null); // Remove null sessions
          }
          if(courseUpdated) updated = true;
         return c;
     }).filter(c => c !== null); // Remove null courses

     if (updated) {
         setData(COURSES_KEY, currentCourses);
         console.log('[Store Migration] Finished updating existing courses structure.');
     } else {
         console.log('[Store Migration] Existing data structure appears valid. No migration needed.');
     }
}

// --- User Management ---
function getUsers() {
    const users = getData(USERS_KEY);
    return Array.isArray(users) ? users : [];
}

function addUser(user) {
    console.warn("[SECURITY] Storing plaintext password."); // Security reminder
    const users = getUsers();
    const newUser = {
        id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        username: user.username,
        password: user.password, // Plaintext!
        role: ['client', 'provider', 'admin'].includes(user.role) ? user.role : 'client', // Default role safety
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
        return;
    }
    setData(CURRENT_USER_KEY, userId); // Store only the ID
    console.log(`[Store] Logged in user ID set to: ${userId}`);
}

function getLoggedInUser() {
    const userId = getData(CURRENT_USER_KEY);
    console.log(`[Store.getLoggedInUser] Checking key '${CURRENT_USER_KEY}'. Found ID: ${userId}`);
    if (!userId) return null;

    const user = findUserById(userId);
     if (!user) {
         // If ID exists in storage but no matching user found in the user list
         console.warn(`[Store.getLoggedInUser] Logged in user ID ${userId} found in storage, but findUserById FAILED. Clearing invalid session.`);
         clearLoggedInUser(); // Clean up the invalid session key
         return null; // Return null, indicating no valid logged-in user
     }
    console.log(`[Store.getLoggedInUser] Found full user object for ID ${userId}.`);
    return user; // Return the full user object
}

function clearLoggedInUser() {
    localStorage.removeItem(CURRENT_USER_KEY); // Remove the user ID from storage
    console.log('[Store] Logged in user cleared from storage.');
}


// --- Course Management ---
function getCourses() {
    const courses = getData(COURSES_KEY);
    return Array.isArray(courses) ? courses : [];
}

function addCourse(courseData) {
    const courses = getCourses();
    courseData.id = courseData.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    courseData.enrolledStudentIds = courseData.enrolledStudentIds || [];
    courseData.liveSessions = courseData.liveSessions || []; // Ensure initialized
    courseData.createdAt = courseData.createdAt || new Date().toISOString();
    courses.push(courseData);
    setData(COURSES_KEY, courses);
    console.log(`[Store] Added course: "${courseData.title}" (ID: ${courseData.id})`);
    return courseData;
}

function findCourseById(id) {
     if (!id) return null;
     return getCourses().find(course => course?.id === id) || null;
}

function updateCourse(updatedCourseData) {
    if (!updatedCourseData?.id) {
        console.warn("[Store] Update course failed: Invalid or missing data/ID.");
        return false;
    }
    const courses = getCourses();
    const index = courses.findIndex(course => course?.id === updatedCourseData.id);

    if (index !== -1) {
        const existingSessions = courses[index].liveSessions || [];
        courses[index] = {
            ...courses[index],
            ...updatedCourseData,
            liveSessions: updatedCourseData.liveSessions || existingSessions,
            id: courses[index].id // Ensure ID remains unchanged
        };
        setData(COURSES_KEY, courses);
        console.log(`[Store] Updated course ID: ${updatedCourseData.id}`);
        return true;
    }
    console.warn(`[Store] Update failed: Course ID ${updatedCourseData.id} not found.`);
    return false;
}

function deleteCourse(id) {
     if (!id) {
        console.warn("[Store] Delete course failed: Invalid ID.");
        return false;
     }
    let courses = getCourses();
    const initialLength = courses.length;
    courses = courses.filter(course => !(course?.id === id));

    if (courses.length < initialLength) {
        setData(COURSES_KEY, courses);
        console.log(`[Store] Deleted course ID: ${id}`);
        return true;
    }
    console.warn(`[Store] Delete failed: Course ID ${id} not found.`);
    return false;
}

function getCoursesByProvider(providerId) {
     if (!providerId) return [];
     return getCourses().filter(course => course?.providerId === providerId);
}

function getCoursesEnrolledByStudent(studentId) {
     if (!studentId) return [];
     return getCourses().filter(course =>
        course && Array.isArray(course.enrolledStudentIds) && course.enrolledStudentIds.includes(studentId)
    );
}

function enrollStudentInCourse(courseId, studentId) {
    if (!courseId || !studentId) {
         console.warn("[Store] Enrollment failed: Missing courseId or studentId.");
         return false;
    }
    const course = findCourseById(courseId);
    if (!course) {
        console.warn(`[Store] Enrollment failed: Course ${courseId} not found.`);
        return false;
    }
    if (!Array.isArray(course.enrolledStudentIds)) {
        course.enrolledStudentIds = [];
    }
    if (!course.enrolledStudentIds.includes(studentId)) {
        course.enrolledStudentIds.push(studentId);
        const success = updateCourse(course);
        if (success) {
             console.log(`[Store] Student ${studentId} enrolled in course ${courseId}.`);
        } else {
            console.error(`[Store] Failed to update course ${courseId} after adding student ${studentId}.`);
            const index = course.enrolledStudentIds.indexOf(studentId);
            if (index > -1) course.enrolledStudentIds.splice(index, 1);
        }
        return success;
    } else {
        console.warn(`[Store] Enrollment skipped: Student ${studentId} already enrolled in ${courseId}.`);
        return false;
    }
}

function getEnrolledStudentsDetails(courseId) {
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.enrolledStudentIds) || course.enrolledStudentIds.length === 0) {
        return [];
    }
    return course.enrolledStudentIds
        .map(studentId => findUserById(studentId))
        .filter(user => user !== null);
}

// --- Live Session Management ---
function addLiveSession(courseId, sessionData) {
    if (!courseId || !sessionData || !sessionData.title || !sessionData.dateTime || !sessionData.meetingLink) {
        console.warn('[Store] Add live session failed: Missing courseId or session data.');
        return false;
    }
    const course = findCourseById(courseId);
    if (!course) {
        console.warn(`[Store] Add live session failed: Course ${courseId} not found.`);
        return false;
    }
    if (!Array.isArray(course.liveSessions)) { course.liveSessions = []; }
    const newSession = { id: `ls_${courseId}_${Date.now()}_${Math.random().toString(16).slice(2)}`, ...sessionData, scheduledAt: new Date().toISOString() };
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
function updateLastNotificationCheckTime() { localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date().toISOString()); console.log('[Store] Updated last notification check time to:', localStorage.getItem(LAST_NOTIF_CHECK_KEY) ); }

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