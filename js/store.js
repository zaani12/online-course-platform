// js/store.js - Manages application data using localStorage and provides stats
// Lazy load auth module to potentially break circular dependencies if any
let authModule = null;
import('./auth.js').then(module => { authModule = module; }).catch(err => console.error("Failed to load auth module in store:", err));
// js/store.js - Manages application data using localStorage and provides stats
import { getCurrentLanguage, t } from './i18n.js'; // <<< ADD 't' HERE
// Lazy load auth module to potentially break circular dependencies if any
import('./auth.js').then(module => { authModule = module; }).catch(err => console.error("Failed to load auth module in store:", err));

// ... rest of the file remains the same ...

// --- Statistics for Admin Dashboard (Added Robustness) ---
// ... other stat functions ...



// ... rest of the stat functions and the export block ...
const USERS_KEY = 'classHomeUsers';         // Updated key prefix
const COURSES_KEY = 'classHomeCourses';       // Updated key prefix
const CURRENT_USER_KEY = 'classHomeCurrentUser'; // Updated key prefix
const MESSAGES_KEY = 'classHomeMessages';      // Updated key prefix
const LAST_NOTIF_CHECK_KEY = 'classHomeLastNotifCheck'; // Updated key prefix
const DATA_FILE_PATH = 'data.json'; // Path to the default data file

// --- LocalStorage Helpers ---
function getData(key) {
    console.log(`[Store.getData] Attempting to get key: ${key}`);
    try {
        const d = localStorage.getItem(key);
         console.log(`[Store.getData] Raw value for ${key}:`, d ? d.substring(0, 100)+'...' : d); // Log raw value
        // Ensure data is not null, undefined, or the string "undefined"/"null" before parsing
        if (d && d !== 'undefined' && d !== 'null') {
            const parsed = JSON.parse(d);
            console.log(`[Store.getData] Parsed value type for ${key}: ${typeof parsed}, IsArray: ${Array.isArray(parsed)}`);
            return parsed;
        }
         console.log(`[Store.getData] No valid data found or received null/undefined string for key "${key}".`);
        return null; // Return null if no valid data
    } catch (e) {
        console.error(`[Store] Error parsing LS item "${key}":`, e);
        console.warn(`[Store] Removing potentially corrupted item for key "${key}".`);
        localStorage.removeItem(key);
        return null;
    }
}

function setData(key, value) {
     console.log(`[Store.setData] Setting key: ${key}`);
     try {
         if (value === undefined) {
             console.warn(`[Store] Attempted to set undefined for key "${key}". Skipping.`);
             return;
         }
         const stringifiedValue = JSON.stringify(value);
         console.log(`[Store.setData] Stringified value (preview): ${stringifiedValue.substring(0,100)}...`);
         localStorage.setItem(key, stringifiedValue);
         console.log(`[Store.setData] Successfully set key: ${key}`);
     } catch (e) {
        // Handle potential storage quota exceeded errors
        if (e.name === 'QuotaExceededError') {
             console.error(`[Store] QuotaExceededError: Failed to set item for key "${key}". LocalStorage might be full.`);
             // Optionally: alert the user or implement more sophisticated cache eviction
        } else {
            console.error(`[Store] Error setting LS item "${key}":`, e);
        }
     }
 }

// --- Store Initialization ---
async function initializeStore() {
    console.log('[Store] Initializing Store...');
    let usersData = getData(USERS_KEY);
    let coursesData = getData(COURSES_KEY);
    let messagesData = getData(MESSAGES_KEY);

    let usersValid = Array.isArray(usersData); console.log(`[Store Init] Users valid array? ${usersValid}`);
    let coursesValid = Array.isArray(coursesData); console.log(`[Store Init] Courses valid array? ${coursesValid}`);
    let messagesValid = Array.isArray(messagesData); console.log(`[Store Init] Messages valid array? ${messagesValid}`);
    let initializationSuccess = true;

    // Load defaults ONLY if essential data is missing/invalid
    if (!usersValid || !coursesValid) {
        console.warn('[Store Init] Core data missing or invalid in localStorage. Attempting to load from defaults...');
        try {
            const response = await fetch(`${DATA_FILE_PATH}?v=${Date.now()}`); // Cache buster
            if (!response.ok) throw new Error(`Default data fetch failed: ${response.statusText}`);
            const defaultData = await response.json();
            console.log('[Store Init] Loaded default data from JSON.');

            if (!usersValid && defaultData.defaultUsers && Array.isArray(defaultData.defaultUsers)) {
                 const usersWithDefaults = defaultData.defaultUsers.map(user => ({
                    ...user,
                    id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    createdAt: user.createdAt && !isNaN(new Date(user.createdAt).getTime())
                                ? new Date(user.createdAt).toISOString()
                                : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
                 }));
                setData(USERS_KEY, usersWithDefaults);
                usersValid = true; console.log(`[Store Init] Default Users SET.`);
            } else if (!usersValid) {
                console.log('[Store Init] No default users found or users array is empty, initializing empty user array.');
                setData(USERS_KEY, []); // Initialize empty if no defaults
                usersValid = true;
            }


            if (!coursesValid && defaultData.defaultCourses && Array.isArray(defaultData.defaultCourses)) {
                const coursesWithDefaults = defaultData.defaultCourses.map(course => ({
                    ...course,
                    id: course.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    status: ['pending', 'approved', 'rejected'].includes(course.status) ? course.status : 'approved', // Default to approved if missing/invalid
                    materials: Array.isArray(course.materials)? course.materials.map(mat => ({ // Ensure material IDs
                         ...mat,
                         id: mat.id || `mat_${course.id || 'new'}_${Date.now()}_${Math.random().toString(16).slice(2)}`
                    })) : [],
                    liveSessions: Array.isArray(course.liveSessions) ? course.liveSessions.map(session => ({ // Ensure session IDs and dates
                        ...session,
                        id: session.id || `ls_${course.id || 'new'}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                        scheduledAt: session.scheduledAt && !isNaN(new Date(session.scheduledAt).getTime())
                                        ? new Date(session.scheduledAt).toISOString()
                                        : new Date().toISOString() // Default to now if missing/invalid
                    })) : [],
                    enrolledStudentIds: Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds : [],
                    createdAt: course.createdAt && !isNaN(new Date(course.createdAt).getTime())
                                ? new Date(course.createdAt).toISOString()
                                : new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
                }));
                setData(COURSES_KEY, coursesWithDefaults);
                coursesValid = true; console.log(`[Store Init] Default Courses SET.`);
            } else if (!coursesValid) {
                 console.log('[Store Init] No default courses found or courses array is empty, initializing empty course array.');
                 setData(COURSES_KEY, []); // Initialize empty if no defaults
                 coursesValid = true;
            }

        } catch (error) {
             console.error("[Store Init] MAJOR ERROR loading/setting default data:", error);
             initializationSuccess = false;
             // Force empty arrays if defaults fail, ONLY IF they weren't valid before
             if (!usersValid) setData(USERS_KEY, []);
             if (!coursesValid) setData(COURSES_KEY, []);
        }
    } else {
        console.log("[Store Init] Existing data found. Running migration...");
        runDataMigration();
    }

    // Ensure messages array exists even if users/courses were valid from LS
    if (!messagesValid) {
        setData(MESSAGES_KEY, []);
        console.log('[Store Init] Initialized empty messages array.');
    }
    // Ensure notification time exists
    if (!localStorage.getItem(LAST_NOTIF_CHECK_KEY)) {
        localStorage.setItem(LAST_NOTIF_CHECK_KEY, new Date(0).toISOString()); // Set to epoch
    }

    console.log(`[Store] Initialization complete. Success: ${initializationSuccess}. Final User Count: ${getUsers().length}, Course Count: ${getCourses().length}, Message Count: ${getMessages().length}`);
    return initializationSuccess;
}

// Data Migration (Focus on status and ensure arrays exist)
function runDataMigration() {
    console.log("[Store Migration] Running migration check...");
    let currentCourses = getData(COURSES_KEY) || [];
    let coursesUpdated = false;
    let currentUsers = getData(USERS_KEY) || [];
    let usersUpdated = false;

    // --- Course Migration ---
    currentCourses = currentCourses.map(c => {
        if (!c || typeof c !== 'object') return null; // Skip invalid entries
        let courseNeedsUpdate = false;
        // Ensure essential arrays exist
        if (!Array.isArray(c.liveSessions)) { c.liveSessions = []; courseNeedsUpdate = true; }
        if (!Array.isArray(c.enrolledStudentIds)) { c.enrolledStudentIds = []; courseNeedsUpdate = true; }
        if (!Array.isArray(c.materials)) { c.materials = []; courseNeedsUpdate = true; }
        // Ensure status exists and is valid
        if (!c.status || !['pending', 'approved', 'rejected'].includes(c.status)) { c.status = 'approved'; courseNeedsUpdate = true; } // Default existing courses to approved if status missing
         // Ensure price is a number
         if (typeof c.price !== 'number' || isNaN(c.price)) { c.price = 0; courseNeedsUpdate = true; }
         // Ensure createdAt exists
         if (!c.createdAt || isNaN(new Date(c.createdAt).getTime())) { c.createdAt = new Date().toISOString(); courseNeedsUpdate = true; }

        // Ensure materials have IDs
        if (Array.isArray(c.materials)) {
            c.materials = c.materials.map(mat => {
                if (mat && !mat.id) {
                     mat.id = `mat_${c.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
                     courseNeedsUpdate = true;
                }
                return mat;
            });
        }

        // Ensure live sessions have IDs and scheduledAt
        if (Array.isArray(c.liveSessions)) {
             c.liveSessions = c.liveSessions.map(session => {
                 let sessionUpdated = false;
                 if (session && !session.id) {
                     session.id = `ls_${c.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
                     sessionUpdated = true;
                 }
                 if (session && (!session.scheduledAt || isNaN(new Date(session.scheduledAt).getTime()))) {
                     session.scheduledAt = new Date().toISOString(); // Default to now
                     sessionUpdated = true;
                 }
                 if(sessionUpdated) courseNeedsUpdate = true;
                 return session;
             });
        }

        if(courseNeedsUpdate) coursesUpdated = true;
        return c;
    }).filter(c => c !== null); // Remove any null entries

    if (coursesUpdated) { setData(COURSES_KEY, currentCourses); console.log('[Store Migration] Finished updating course structures.'); }
    else { console.log("[Store Migration] No course structure updates needed.");}

    // --- User Migration ---
    currentUsers = currentUsers.map(u => {
        if (!u || typeof u !== 'object') return null;
        let userNeedsUpdate = false;
        // Ensure createdAt exists
        if (!u.createdAt || isNaN(new Date(u.createdAt).getTime())) { u.createdAt = new Date().toISOString(); userNeedsUpdate = true; }
        // Ensure role is valid
        if (!u.role || !['client', 'provider', 'admin'].includes(u.role)) { u.role = 'client'; userNeedsUpdate = true; } // Default invalid roles to client

        if(userNeedsUpdate) usersUpdated = true;
        return u;
    }).filter(u => u !== null);

    if (usersUpdated) { setData(USERS_KEY, currentUsers); console.log('[Store Migration] Finished updating user structures.'); }
    else { console.log("[Store Migration] No user structure updates needed.");}
}

// --- User Management ---
function getUsers() {
    const users = getData(USERS_KEY);
    return Array.isArray(users) ? users : []; // Always return array
}

function addUser(user) {
    // **SECURITY WARNING:** Storing plaintext passwords like this is INSECURE.
    console.warn("\n**************************************************\n" +
                 "[SECURITY] INSECURE: Storing plaintext password in addUser.\n" +
                 "This is for DEMONSTRATION ONLY. Never store plaintext passwords.\n" +
                 "**************************************************\n");
    const users = getUsers();
    const newUser = {
        ...user,
        id: user.id || `u_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAt: user.createdAt || new Date().toISOString(),
        role: ['client', 'provider', 'admin'].includes(user.role) ? user.role : 'client' // Ensure valid role
    };
    users.push(newUser);
    setData(USERS_KEY, users);
    console.log(`[Store] Added user: ${newUser.username} (Role: ${newUser.role}, ID: ${newUser.id})`);
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

function getAdminUserIds() {
    return getUsers().filter(u => u?.role === 'admin').map(u => u.id);
}

function setLoggedInUser(userId) {
    if (!userId) { clearLoggedInUser(); return; }
     // Verify the user actually exists before setting the session
     if (!findUserById(userId)) {
         console.error(`[Store] Attempted to set logged in user for non-existent ID: ${userId}. Clearing session.`);
         clearLoggedInUser();
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
         console.warn(`[Store] Logged in user ID ${userId} found, but no matching user in store. Clearing invalid session.`);
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
function getCourses(filterStatus = null) {
    // console.log(`[Store.getCourses] Called with filterStatus: ${filterStatus}`); // Debug log
    let courses = getData(COURSES_KEY) || [];
    courses = Array.isArray(courses) ? courses : []; // Defensive check

    if (filterStatus && ['pending', 'approved', 'rejected'].includes(filterStatus)) {
        const filtered = courses.filter(c => c?.status === filterStatus);
        // console.log(`[Store.getCourses] Returning ${filtered.length} courses filtered by status "${filterStatus}"`); // Debug log
        return filtered;
    } else if (filterStatus === 'all') {
        // console.log(`[Store.getCourses] Returning ${courses.length} courses (filter: all).`); // Debug log
        return courses; // Return all courses regardless of status
    } else {
         // Default behavior: Return only 'approved' courses if no valid filter specified
         const approved = courses.filter(c => c?.status === 'approved');
        // console.log(`[Store.getCourses] Returning ${approved.length} courses (default filter: approved).`); // Debug log
         return approved;
    }
}

function addCourse(courseData) {
    if (!courseData || !courseData.title || !courseData.providerId || typeof courseData.price === 'undefined') {
         console.error("[Store] Add course failed: Missing required data (title, providerId, price).", courseData);
         return null;
    }
    const courses = getCourses('all'); // Get all courses to add to the full list
    const newCourse = {
        title: courseData.title.trim(),
        description: courseData.description.trim() || "",
        price: parseFloat(courseData.price) || 0,
        providerId: courseData.providerId,
        id: courseData.id || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        enrolledStudentIds: [],
        liveSessions: [],
        materials: [],
        status: 'pending', // *** NEW COURSES START AS PENDING ***
        createdAt: courseData.createdAt || new Date().toISOString()
    };
    courses.push(newCourse);
    setData(COURSES_KEY, courses);
    console.log(`[Store] Added course: "${newCourse.title}" (ID: ${newCourse.id}, Status: ${newCourse.status}) by Provider ${newCourse.providerId}`);
    return newCourse;
}


function findCourseById(id) {
     if (!id) return null;
     // Search within ALL courses regardless of status
     return getCourses('all').find(course => course?.id === id) || null;
}

function updateCourse(updatedCourseData) {
    if (!updatedCourseData?.id) {
        console.warn("[Store] Update course failed: Invalid or missing course ID.");
        return false;
    }
    const courses = getCourses('all'); // Get all courses to find the one to update
    const index = courses.findIndex(course => course?.id === updatedCourseData.id);

    if (index !== -1) {
         const originalCourse = courses[index];
         // Merge carefully, preserving essential fields
         courses[index] = {
            ...originalCourse,
            ...updatedCourseData,
            // Ensure these aren't accidentally overwritten by incomplete data
            id: originalCourse.id,
            providerId: originalCourse.providerId,
            createdAt: originalCourse.createdAt,
            status: updatedCourseData.status || originalCourse.status, // Keep original status if not provided
            enrolledStudentIds: updatedCourseData.enrolledStudentIds ?? originalCourse.enrolledStudentIds ?? [],
            liveSessions: updatedCourseData.liveSessions ?? originalCourse.liveSessions ?? [],
            materials: updatedCourseData.materials ?? originalCourse.materials ?? []
        };
        setData(COURSES_KEY, courses);
        console.log(`[Store] Updated course ID: ${updatedCourseData.id}`);
        return true;
    }
    console.warn(`[Store] Update failed: Course ID ${updatedCourseData.id} not found.`);
    return false;
}

function updateCourseStatus(courseId, newStatus) {
    if (!courseId || !['pending', 'approved', 'rejected'].includes(newStatus)) {
        console.warn(`[Store] updateCourseStatus failed: Invalid ID (${courseId}) or status (${newStatus}).`);
        return false;
    }
    const course = findCourseById(courseId); // Find regardless of current status
    if (!course) {
         console.warn(`[Store] updateCourseStatus failed: Course ${courseId} not found.`);
         return false;
    }
    course.status = newStatus;
    const success = updateCourse(course); // Use updateCourse to save
    if(success) {
        console.log(`[Store] Updated status for course ${courseId} to ${newStatus}.`);
    } else {
        console.error(`[Store] Failed to save status update for course ${courseId}.`);
    }
    return success;
}


function deleteCourse(id) {
     if (!id) {
        console.warn("[Store] Delete course failed: Invalid ID provided.");
        return false;
     }
    let courses = getCourses('all'); // Operate on the full list
    const initialLength = courses.length;
    courses = courses.filter(course => !(course?.id === id)); // Filter out the course

    if (courses.length < initialLength) {
        setData(COURSES_KEY, courses);
        console.log(`[Store] Deleted course ID: ${id}`);
        return true;
    }
    console.warn(`[Store] Delete failed: Course ID ${id} not found or already deleted.`);
    return false;
}


function getCoursesByProvider(providerId, includeStatuses = ['pending', 'approved']) {
     if (!providerId) return [];
     const statusesToInclude = Array.isArray(includeStatuses) ? includeStatuses : ['pending', 'approved'];
     // Filter from ALL courses
     return getCourses('all').filter(course =>
        course?.providerId === providerId && statusesToInclude.includes(course?.status)
     );
}

function getCoursesEnrolledByStudent(studentId) {
     if (!studentId) return [];
     // An enrolled student should only see APPROVED courses they are in
     return getCourses('approved').filter(course =>
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

    // *** IMPORTANT: Check if the course is approved before enrolling ***
    if (course.status !== 'approved') {
        console.warn(`[Store] Enrollment failed: Course ${courseId} is not approved (Status: ${course.status}).`);
        return false;
    }

    // Ensure enrolledStudentIds is an array
    if (!Array.isArray(course.enrolledStudentIds)) { course.enrolledStudentIds = []; }

    if (!course.enrolledStudentIds.includes(studentId)) {
        course.enrolledStudentIds.push(studentId);
        const success = updateCourse(course);
        if (success) { console.log(`[Store] Student ${studentId} enrolled in course ${courseId}.`); }
        else { console.error(`[Store] Failed to update course ${courseId} after enrollment attempt.`); /* Rollback? */ }
        return success;
    } else {
        console.log(`[Store] Enrollment skipped: Student ${studentId} already enrolled in ${courseId}.`);
        return true; // Indicate success as the desired state is met
    }
}

function getEnrolledStudentsDetails(courseId) {
    const course = findCourseById(courseId);
    if (!course || !Array.isArray(course.enrolledStudentIds) || course.enrolledStudentIds.length === 0) {
        return [];
    }
    return course.enrolledStudentIds
        .map(studentId => findUserById(studentId))
        .filter(user => user !== null); // Filter out nulls if user deleted
}

// --- Course Materials Management ---
function addCourseMaterial(courseId, materialData) {
    if (!courseId || !materialData || !materialData.title || !materialData.type) {
         console.warn('[Store] Add material failed: Missing courseId or required material data (title, type).', materialData);
         return false;
    }
    const course = findCourseById(courseId);
    if (!course) { console.warn(`[Store] Add material failed: Course ${courseId} not found.`); return false; }
    if (!Array.isArray(course.materials)) { course.materials = []; }

    const newMaterial = {
        ...materialData, // includes title, type, url, description
        id: `mat_${courseId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        addedAt: new Date().toISOString()
    };
    course.materials.push(newMaterial);
    const success = updateCourse(course);
    if (success) { console.log(`[Store] Added material '${newMaterial.title}' to course ${courseId}.`); }
    else { console.error(`[Store] Failed to update course ${courseId} after adding material.`); /* Rollback? */ }
    return success;
}

function getCourseMaterials(courseId) {
    const course = findCourseById(courseId);
    // Return materials sorted by add date, newest first (optional)
    return (course && Array.isArray(course.materials))
        ? [...course.materials].sort((a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0))
        : [];
}

function deleteCourseMaterial(courseId, materialId) {
     if (!courseId || !materialId) { console.warn("[Store] Delete material failed: Missing IDs."); return false; }
     const course = findCourseById(courseId);
     if (!course || !Array.isArray(course.materials)) { console.warn(`[Store] Delete material failed: Course ${courseId} or materials array not found.`); return false; }
     const initialLength = course.materials.length;
     course.materials = course.materials.filter(mat => mat?.id !== materialId);
     if (course.materials.length < initialLength) {
        const success = updateCourse(course);
        if (success) { console.log(`[Store] Deleted material ${materialId} from course ${courseId}.`); }
        else { console.error(`[Store] Failed to update course ${courseId} after deleting material.`); }
        return success;
     }
     console.warn(`[Store] Delete material failed: Material ${materialId} not found in course ${courseId}.`);
     return false;
}

// --- Live Session Management ---
function addLiveSession(courseId, sessionData) {
    if (!courseId || !sessionData || !sessionData.title || !sessionData.dateTime || !sessionData.meetingLink) {
        console.warn('[Store] Add live session failed: Missing data.', sessionData); return false;
    }
    const course = findCourseById(courseId);
    if (!course) { console.warn(`[Store] Add live session failed: Course ${courseId} not found.`); return false; }
    if (!Array.isArray(course.liveSessions)) { course.liveSessions = []; }
    const sessionDate = new Date(sessionData.dateTime);
    if (isNaN(sessionDate.getTime())) { console.warn(`[Store] Add live session failed: Invalid dateTime.`); return false; }

    const newSession = {
        id: `ls_${courseId}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: sessionData.title.trim(),
        dateTime: sessionDate.toISOString(),
        meetingLink: sessionData.meetingLink.trim(),
        scheduledAt: new Date().toISOString() // Record scheduling time
    };
    course.liveSessions.push(newSession);
    course.liveSessions.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)); // Sort upcoming first
    const success = updateCourse(course);
    if (success) { console.log(`[Store] Added live session '${newSession.title}' to course ${courseId}.`); }
    else { console.error(`[Store] Failed to update course ${courseId} after adding session.`); /* Rollback? */ }
    return success;
}

function getLiveSessionsForCourse(courseId) {
    const course = findCourseById(courseId);
    return (course && Array.isArray(course.liveSessions))
        ? [...course.liveSessions].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
        : [];
}

// --- Simulated Notification Management ---
function getLastNotificationCheckTime() {
    return localStorage.getItem(LAST_NOTIF_CHECK_KEY) || new Date(0).toISOString();
}

function updateLastNotificationCheckTime() {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_NOTIF_CHECK_KEY, now);
    // console.log(`[Store] Updated last notification check time to: ${now}`); // Optional debug
}

// --- Messaging System (Simulated) ---
function getMessages() {
    const messages = getData(MESSAGES_KEY);
    return Array.isArray(messages) ? messages : [];
}

function sendMessage(senderId, recipientId, content) {
     if (!senderId || !recipientId || !content || !content.trim()) {
         console.warn("[Store] Send message failed: Missing sender, recipient, or content.");
         return null;
     }
     const messages = getMessages();
     const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        senderId: senderId,
        recipientId: recipientId,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        read: false // New messages are unread
     };
     messages.push(newMessage);
     setData(MESSAGES_KEY, messages);
     console.log(`[Store] Message sent from ${senderId} to ${recipientId}`);
     return newMessage;
}

// Get messages between two specific non-admin users
function getMessagesForConversation(userId1, userId2) {
    const adminIds = getAdminUserIds();
    if (!userId1 || !userId2 || adminIds.includes(userId1) || adminIds.includes(userId2)) return []; // Not for admin chats
    const messages = getMessages();
    return messages
        .filter(msg =>
            (msg.senderId === userId1 && msg.recipientId === userId2) ||
            (msg.senderId === userId2 && msg.recipientId === userId1)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Oldest first
}

// Get messages involving a specific user and ANY admin (support chat)
function getSupportMessages(userId) {
    if (!userId) return [];
    const adminIds = getAdminUserIds();
    if (adminIds.includes(userId)) { // If the user *is* an admin
        // Show all messages where *either* sender or receiver is *any* admin
        return getMessages()
            .filter(msg => adminIds.includes(msg.senderId) || adminIds.includes(msg.recipientId))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else { // If the user is NOT an admin
        // Show messages between this user and *any* admin
        return getMessages()
            .filter(msg =>
                (msg.senderId === userId && adminIds.includes(msg.recipientId)) ||
                (adminIds.includes(msg.senderId) && msg.recipientId === userId)
            )
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
}

function markMessagesAsRead(readerId, partnerId) {
    if (!readerId || !partnerId) return;
    const adminIds = getAdminUserIds();
    if (adminIds.includes(readerId) || adminIds.includes(partnerId)) return; // Use support version for admin
    let messages = getMessages(); let updated = false;
    messages = messages.map(msg => {
        if (msg.recipientId === readerId && msg.senderId === partnerId && !msg.read) {
            msg.read = true; updated = true;
        }
        return msg;
    });
    if (updated) setData(MESSAGES_KEY, messages);
}

function markSupportMessagesAsRead(readerId) {
    if (!readerId) return;
    let messages = getMessages(); let updated = false;
    const adminIds = getAdminUserIds();
    messages = messages.map(msg => {
         // Mark as read if the reader is the recipient AND (sender is admin OR recipient is admin - covering both directions)
         if (msg.recipientId === readerId && !msg.read && (adminIds.includes(msg.senderId) || adminIds.includes(msg.recipientId))) {
            msg.read = true; updated = true;
        }
        return msg;
    });
    if (updated) setData(MESSAGES_KEY, messages);
}


function getUnreadMessageCount(userId) {
    if (!userId) return 0;
    return getMessages().filter(msg => msg.recipientId === userId && !msg.read).length;
}


// --- Statistics for Admin Dashboard (Added Robustness) ---
function getUserCountsByRole() {
    const users = getUsers();
    const counts = { admin: 0, provider: 0, client: 0, total: 0, unknown: 0 };
    if (!Array.isArray(users)) { return counts; }
    counts.total = users.length;
    users.forEach(user => { if (user?.role && counts.hasOwnProperty(user.role)) { counts[user.role]++; } else { counts.unknown++; } });
    return counts;
}

function getTotalCourseCount() {
    // Count ALL courses regardless of status for this specific stat
    return getCourses('all').length;
}

function getCoursePriceStats() {
    const courses = getCourses('approved'); // Base stats only on approved courses
    const totalApprovedCourses = courses.length;
    const defaultStats = { averagePrice: 0, freeCount: 0, paidCount: 0, percentFree: 0, totalApproved: 0 };
    if (!Array.isArray(courses) || totalApprovedCourses === 0) { return defaultStats; }

    defaultStats.totalApproved = totalApprovedCourses;
    let totalPriceSum = 0;
    let validPriceCount = 0;

    courses.forEach(course => {
        if (!course) return;
        const price = parseFloat(course.price);
        if (isNaN(price) || price < 0) { defaultStats.freeCount++; }
        else {
            totalPriceSum += price; validPriceCount++;
            if (price === 0) { defaultStats.freeCount++; } else { defaultStats.paidCount++; }
        }
    });
    defaultStats.averagePrice = validPriceCount > 0 ? totalPriceSum / validPriceCount : 0;
    defaultStats.percentFree = totalApprovedCourses > 0 ? (defaultStats.freeCount / totalApprovedCourses) * 100 : 0;
    return defaultStats;
}

function getSimulatedTotalRevenue() {
    const courses = getCourses('approved'); // Base revenue only on approved courses
    if (!Array.isArray(courses)) return 0;
    return courses.reduce((sum, course) => {
         if (!course) return sum;
         const price = parseFloat(course.price);
         if (isNaN(price) || price <= 0) return sum;
         const enrollmentCount = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0;
         return sum + (price * enrollmentCount);
    }, 0);
}

function getEnrollmentStats() {
    const courses = getCourses('approved'); // Base enrollment stats only on approved courses
    const totalApprovedCourses = courses.length;
    const defaultStats = { totalEnrollments: 0, averageEnrollments: 0, coursesWithEnrollment: 0 };
    if (!Array.isArray(courses) || totalApprovedCourses === 0) { return defaultStats; }

    defaultStats.totalEnrollments = courses.reduce((sum, course) => {
        if (!course) return sum;
        const count = Array.isArray(course.enrolledStudentIds) ? course.enrolledStudentIds.length : 0;
        if (count > 0) { defaultStats.coursesWithEnrollment++; }
        return sum + count;
    }, 0);
    defaultStats.averageEnrollments = totalApprovedCourses > 0 ? defaultStats.totalEnrollments / totalApprovedCourses : 0;
    return defaultStats;
}

function getCoursesPerProviderData() {
    // Count courses per provider based on APPROVED courses only
    const courses = getCourses('approved');
    const providers = getUsers().filter(user => user?.role === 'provider');
    const providerCounts = {};
    let unknownCount = 0;

    providers.forEach(p => { if(p?.username) providerCounts[p.username] = 0; });
    if (!Array.isArray(courses)) { return { labels: [], data: [] }; }

    courses.forEach(course => {
        if (!course || !course.providerId) { unknownCount++; return; }
        const provider = findUserById(course.providerId);
        if (provider?.username && providerCounts.hasOwnProperty(provider.username)) { providerCounts[provider.username]++; }
        else { unknownCount++; }
    });
    if (unknownCount > 0) { providerCounts[t('unknownProvider', {}, 'Unknown/Deleted')] = unknownCount; } // Use translation

    const filteredLabels = Object.keys(providerCounts).filter(label => providerCounts[label] > 0 || label === t('unknownProvider', {}, 'Unknown/Deleted'));
    const filteredData = filteredLabels.map(label => providerCounts[label]);
    return { labels: filteredLabels, data: filteredData };
}

function getTopEnrolledCourses(limit = 5) {
    // Get top courses based on APPROVED courses only
    const courses = getCourses('approved');
    if (!Array.isArray(courses)) return { labels: [], data: [] };

    const coursesWithEnrollment = courses
        .filter(c => c?.id && c.title)
        .map(c => ({ title: c.title, enrollmentCount: Array.isArray(c.enrolledStudentIds) ? c.enrolledStudentIds.length : 0 }))
        .filter(c => c.enrollmentCount > 0)
        .sort((a, b) => b.enrollmentCount - a.enrollmentCount);

    const top = coursesWithEnrollment.slice(0, limit);
    return { labels: top.map(c => c.title), data: top.map(c => c.enrollmentCount) };
}


// --- Export store functions ---
// ***** ENSURE ALL FUNCTIONS YOU NEED ARE LISTED HERE *****
export {
    initializeStore,
    // Users
    getUsers, addUser, findUserByUsername, findUserById, getAdminUserIds,
    setLoggedInUser, getLoggedInUser, clearLoggedInUser,
    // Courses
    getCourses, addCourse, findCourseById, updateCourse, deleteCourse, updateCourseStatus,
    getCoursesByProvider, getCoursesEnrolledByStudent, enrollStudentInCourse,
    getEnrolledStudentsDetails,
    // Course Materials
    addCourseMaterial, getCourseMaterials, deleteCourseMaterial,
    // Live Sessions
    addLiveSession, getLiveSessionsForCourse,
    // Notifications (Simulated)
    getLastNotificationCheckTime, updateLastNotificationCheckTime,
    // Messaging System (Simulated)
    getMessages, sendMessage, getMessagesForConversation, getSupportMessages, markMessagesAsRead, markSupportMessagesAsRead, getUnreadMessageCount,
    // Statistics
    getUserCountsByRole, getTotalCourseCount, getCoursePriceStats,
    getSimulatedTotalRevenue, getEnrollmentStats, getCoursesPerProviderData,
    getTopEnrolledCourses
};