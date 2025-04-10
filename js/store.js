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
        if (data && data !== 'undefined') {
            return JSON.parse(data);
        }
        return null;
    } catch (e) {
        console.error(`Error parsing localStorage item "${key}":`, e);
        localStorage.removeItem(key);
        return null;
    }
}

function setData(key, value) {
    try {
        if (value === undefined) {
             console.warn(`Attempted to set undefined value for key "${key}". Skipping.`);
             return;
        }
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error setting localStorage item "${key}":`, e);
    }
}

// --- Store Initialization ---
async function initializeStore() {
    console.log('[Store] Initializing...');
    let usersExist = !!getData(USERS_KEY);
    let coursesExist = !!getData(COURSES_KEY);
    let initializationSuccess = true;

    if (!usersExist || !coursesExist) {
        console.log('[Store] localStorage data missing or incomplete, loading from', DATA_FILE_PATH);
        try {
            const response = await fetch(`${DATA_FILE_PATH}?v=${Date.now()}`); // Cache buster
            if (!response.ok) {
                throw new Error(`Failed to fetch ${DATA_FILE_PATH}: ${response.status} ${response.statusText}`);
            }
            const defaultData = await response.json();
            console.log('[Store] Loaded default data from JSON.');

            if (!usersExist && defaultData.defaultUsers) {
                 const usersWithDefaults = defaultData.defaultUsers.map(user => ({
                    ...user,
                    id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    createdAt: user.createdAt || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
                 }));
                setData(USERS_KEY, usersWithDefaults);
                console.log('[Store] Initialized Users from defaults.');
                usersExist = true;
            }

            if (!coursesExist && defaultData.defaultCourses) {
                const coursesWithDefaults = defaultData.defaultCourses.map(course => ({
                    ...course,
                    id: course.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    enrolledStudentIds: course.enrolledStudentIds || [],
                    liveSessions: course.liveSessions || [], // Ensure liveSessions array exists
                    createdAt: course.createdAt || new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
                }));
                setData(COURSES_KEY, coursesWithDefaults);
                console.log('[Store] Initialized Courses from defaults.');
                coursesExist = true;
            }

        } catch (error) {
            console.error("[Store] ERROR loading or parsing default data JSON:", error);
            initializationSuccess = false;
        }
    } else {
        console.log('[Store] Users and Courses data found in localStorage.');
        // Migration check: Ensure existing courses have liveSessions array
        let courses = getCourses();
        let updated = false;
        courses = courses.map(c => {
            if (c && !Array.isArray(c.liveSessions)) {
                c.liveSessions = [];
                updated = true;
            }
            return c;
        });
        if (updated) {
            setData(COURSES_KEY, courses);
            console.log('[Store] Updated existing courses to include liveSessions array.');
        }
    }

    if (!usersExist) setData(USERS_KEY, []);
    if (!coursesExist) setData(COURSES_KEY, []);
    // Initialize notification check time if it doesn't exist
    if (!localStorage.getItem(LAST_NOTIF_CHECK_KEY)) {
        localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date(0).toISOString());
    }


    console.log(`[Store] Initialization complete. Users: ${!!getData(USERS_KEY)}, Courses: ${!!getData(COURSES_KEY)}`);
    return initializationSuccess;
}

// --- User Management ---
function getUsers() {
    const users = getData(USERS_KEY) || [];
    return Array.isArray(users) ? users : [];
}

function addUser(user) {
    const users = getUsers();
    user.id = user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    user.createdAt = user.createdAt || new Date().toISOString();
    users.push(user);
    setData(USERS_KEY, users);
    console.log(`[Store] Added user: ${user.username} (ID: ${user.id})`);
    return user;
}

function findUserByUsername(usernameToFind) {
    const usersArray = getUsers();
    if (!Array.isArray(usersArray)) {
        console.error("[Store] CRITICAL ERROR: Users data retrieved is NOT an array!", usersArray);
        return null;
    }
    return usersArray.find(user => user?.username === usernameToFind) || null;
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
    setData(CURRENT_USER_KEY, userId);
    console.log(`[Store] Logged in user ID set to: ${userId}`);
}

function getLoggedInUser() {
    const userId = getData(CURRENT_USER_KEY);
    if (!userId) return null;
    const user = findUserById(userId);
     if (!user) {
         console.warn(`[Store] Logged in user ID ${userId} found, but no matching user. Clearing invalid session.`);
         clearLoggedInUser();
         return null;
     }
    return user;
}

function clearLoggedInUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    console.log('[Store] Logged in user cleared.');
}

// --- Course Management ---
function getCourses() {
    const courses = getData(COURSES_KEY) || [];
    return Array.isArray(courses) ? courses : [];
}

function addCourse(courseData) {
    const courses = getCourses();
    courseData.id = courseData.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    courseData.enrolledStudentIds = courseData.enrolledStudentIds || [];
    courseData.liveSessions = courseData.liveSessions || []; // Initialize sessions
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
        // Ensure liveSessions array is preserved if not explicitly updated
        const existingSessions = courses[index].liveSessions || [];
        courses[index] = {
            ...courses[index],
            ...updatedCourseData,
            liveSessions: updatedCourseData.liveSessions || existingSessions, // Preserve sessions
            id: courses[index].id // Ensure ID is immutable
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
            // Basic rollback attempt (might fail if store is inconsistent)
            const index = course.enrolledStudentIds.indexOf(studentId);
            if (index > -1) course.enrolledStudentIds.splice(index, 1);
        }
        return success;
    } else {
        console.warn(`[Store] Enrollment skipped: Student ${studentId} already enrolled in ${courseId}.`);
        return false; // Indicate failure (already enrolled)
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

/**
 * Adds a live session to a specific course.
 * @param {string} courseId - The ID of the course.
 * @param {object} sessionData - Object with { title, dateTime, meetingLink }.
 * @returns {boolean} - True if successful, false otherwise.
 */
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

    if (!Array.isArray(course.liveSessions)) {
        course.liveSessions = []; // Ensure array exists
    }

    const newSession = {
        id: `ls_${courseId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: sessionData.title,
        dateTime: sessionData.dateTime, // Expecting ISO string or parsable Date string
        meetingLink: sessionData.meetingLink,
        scheduledAt: new Date().toISOString() // Record when it was scheduled
    };

    course.liveSessions.push(newSession);
    // Sort sessions by date (optional, but good for display)
    course.liveSessions.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    const success = updateCourse(course);
    if (success) {
        console.log(`[Store] Added live session '${newSession.title}' to course ${courseId}.`);
    } else {
        console.error(`[Store] Failed to update course ${courseId} after adding live session.`);
         // Basic rollback attempt
         const index = course.liveSessions.findIndex(s => s.id === newSession.id);
         if(index > -1) course.liveSessions.splice(index,1);
    }
    return success;
}

/**
 * Retrieves all live sessions for a given course, sorted by date.
 * @param {string} courseId - The ID of the course.
 * @returns {Array} - An array of session objects, or empty array.
 */
function getLiveSessionsForCourse(courseId) {
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.liveSessions)) {
        return [];
    }
    // Return a sorted copy
    return [...course.liveSessions].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
}

// --- Simulated Notification Management ---

/**
 * Gets the timestamp of the last notification check.
 * @returns {string} - ISO date string.
 */
function getLastNotificationCheckTime() {
    return localStorage.getItem(LAST_NOTIF_CHECK_KEY) || new Date(0).toISOString();
}

/**
 * Updates the timestamp of the last notification check to now.
 */
function updateLastNotificationCheckTime() {
    localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date().toISOString());
    console.log('[Store] Updated last notification check time.');
}

// --- Statistics for Admin Dashboard ---

function getUserCountsByRole() {
    const users = getUsers();
    const counts = { admin: 0, provider: 0, client: 0, total: users.length };
    users.forEach(user => {
        if (user && counts.hasOwnProperty(user.role)) {
            counts[user.role]++;
        } else if (user) {
             console.warn(`[Store] User ${user.id || '?'} has invalid role: ${user.role}`);
        }
    });
    return counts;
}

function getTotalCourseCount() {
    return getCourses().length;
}

function getCoursePriceStats() {
    const courses = getCourses();
    const totalCourses = courses.length;
    if (totalCourses === 0) return { averagePrice: 0, freeCount: 0, paidCount: 0, percentFree: 0 };

    let totalPriceSum = 0, freeCount = 0, paidCount = 0;
    courses.forEach(course => {
        if (!course) return;
        const price = parseFloat(course.price);
        if (isNaN(price) || price < 0) {
            freeCount++;
        } else {
             totalPriceSum += price;
             price === 0 ? freeCount++ : paidCount++;
        }
    });
    const averagePrice = totalCourses > 0 ? totalPriceSum / totalCourses : 0;
    const percentFree = totalCourses > 0 ? (freeCount / totalCourses) * 100 : 0;
    return { averagePrice, freeCount, paidCount, percentFree };
}

function getSimulatedTotalRevenue() {
    return getCourses().reduce((sum, course) => {
         if (!course) return sum;
         const price = parseFloat(course.price);
         if (isNaN(price) || price <= 0) return sum;
         const count = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0;
         return sum + (price * count);
    }, 0);
}

function getEnrollmentStats() {
    const courses = getCourses();
    const totalCourses = courses.length;
    if (totalCourses === 0) return { totalEnrollments: 0, averageEnrollments: 0 };

    const totalEnrollments = courses.reduce((sum, course) =>
        sum + (course && Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0), 0);
    const averageEnrollments = totalCourses > 0 ? totalEnrollments / totalCourses : 0;
    return { totalEnrollments, averageEnrollments };
}

function getCoursesPerProviderData() {
    const courses = getCourses();
    const providers = getUsers().filter(user => user?.role === 'provider');
    const providerCounts = {};
    providers.forEach(p => { if(p?.username) providerCounts[p.username] = 0; }); // Init known providers
    let unknownCount = 0;

    courses.forEach(course => {
        if (!course) return;
        const provider = findUserById(course.providerId);
        if (provider?.username && providerCounts.hasOwnProperty(provider.username)) {
            providerCounts[provider.username]++;
        } else {
            unknownCount++;
        }
    });
    if (unknownCount > 0) providerCounts['Unknown/Deleted'] = unknownCount;

    return { labels: Object.keys(providerCounts), data: Object.values(providerCounts) };
}

function getTopEnrolledCourses(limit = 5) {
    const coursesWithEnrollment = getCourses()
        .filter(c => c?.id && c.title)
        .map(c => ({
            ...c,
            enrollmentCount: Array.isArray(c.enrolledStudentIds) ? c.enrolledStudentIds.length : 0
        }))
        .sort((a, b) => b.enrollmentCount - a.enrollmentCount);
    const top = coursesWithEnrollment.slice(0, limit);
    return { labels: top.map(c => c.title), data: top.map(c => c.enrollmentCount) };
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
