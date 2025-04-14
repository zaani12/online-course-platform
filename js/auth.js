// js/auth.js - Handles user authentication and session
import * as store from './store.js';

// --- Internal state for logged-in user ---
let loggedInUserObject = null;
// --- Initialize internal state from store on load ---
function initializeAuthUserState() {
    loggedInUserObject = store.getLoggedInUser();
}

const ADMIN_REGISTRATION_CODE = "1234"; // Keep hardcoded for demo

export function register(username, password, role, adminCode = null) {
    // *** SECURITY WARNING ***
    console.warn("\n**************************************************\n" +
                 "[SECURITY] INSECURE: Registering with plaintext password.\n" +
                 "This is for DEMONSTRATION ONLY. Never store plaintext passwords.\n" +
                 "**************************************************\n");

    if (!username || !password || !role) { return { success: false, messageKey: 'registerErrorRequired' }; }
    if (username.length < 3) { return { success: false, messageKey: 'registerErrorUsernameLength' }; }
    if (password.length < 6) { return { success: false, messageKey: 'registerErrorPasswordLength' }; }
    if (!['client', 'provider', 'admin'].includes(role)) { return { success: false, messageKey: 'registerErrorInvalidRole' };}
    if (store.findUserByUsername(username)) { return { success: false, messageKey: 'registerErrorUsernameTaken' }; }
    if (role === 'admin') {
        if (!adminCode) { return { success: false, messageKey: 'registerErrorAdminCodeRequired' }; }
        if (adminCode !== ADMIN_REGISTRATION_CODE) { return { success: false, messageKey: 'registerErrorInvalidAdminCode' }; }
    }
    const newUser = store.addUser({ username, password, role }); // Store call includes warning
    if (!newUser) { // Handle potential failure in addUser
         console.error("[Auth] Failed to add user via store.");
         return { success: false, messageKey: 'registerErrorGeneric' }; // Use a generic error
    }
    console.log(`[Auth] User registered successfully: ${username}, Role: ${role}`);
    return { success: true, messageKey: 'registerSuccessMessage' };
}

export function login(username, password) {
    console.log(`[Auth] --- LOGIN ATTEMPT --- User='${username}'`);
    // *** SECURITY WARNING ***
    console.warn("\n**************************************************\n" +
                 "[SECURITY] INSECURE: Logging in with plaintext password check.\n" +
                 "This is for DEMONSTRATION ONLY.\n" +
                 "**************************************************\n");

    const user = store.findUserByUsername(username);

    if (!user) {
        console.error(`[Auth] Login Failed: User '${username}' not found.`);
        return { success: false, messageKey: 'loginErrorInvalid' };
    }

    if (user.password !== password) {
        console.error(`[Auth] Login Failed: Password mismatch for '${username}'.`);
        return { success: false, messageKey: 'loginErrorInvalid' };
    }

    try {
        store.setLoggedInUser(user.id); // Store only the ID
        loggedInUserObject = user; // Update internal state
    } catch (err) {
         console.error(`[Auth] CRITICAL ERROR during setLoggedInUser for ID '${user.id}':`, err);
    }

    console.log(`[Auth] Login Success: User ${user.username} (Role: ${user.role}, ID: ${user.id}) logged in.`);
    return { success: true, user };
}

// Inside auth.js
export function logout() {
    console.log('[auth.logout] Executing logout...'); // Add log
    try {
        store.clearLoggedInUser(); // Clear from localStorage via store
        loggedInUserObject = null; // Clear internal variable
        console.log('[Auth] User logged out (internal state cleared).');
    } catch(error) {
        console.error("[auth.logout] Error during logout:", error);
    }
}

export function getCurrentUser() {
    if (!loggedInUserObject) {
        loggedInUserObject = store.getLoggedInUser();
    }
    return loggedInUserObject;
}

export function isLoggedIn() {
    return !!getCurrentUser();
}

export function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

export { initializeAuthUserState };