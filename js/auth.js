// js/auth.js - Handles user authentication and session
import * as store from './store.js';

// --- Internal state for logged-in user ---
let loggedInUserObject = null;
// --- Initialize internal state from store on load ---
// We do this *after* ensuring the store itself is initialized in main.js
function initializeAuthUserState() {
    loggedInUserObject = store.getLoggedInUser();
    console.log(`[Auth Init] Initial user state loaded from store: ${loggedInUserObject ? loggedInUserObject.id : 'null'}`);
}

// We'll call initializeAuthUserState from main.js after store init.


const DEFAULT_USERS_FALLBACK = [
    { "id": "admin001", "username": "platform_admin", "password": "adminpassword", "role": "admin" },
    { "id": "provider001", "username": "teacher_jane", "password": "password123", "role": "provider" },
    { "id": "provider002", "username": "prof_davis", "password": "password123", "role": "provider" },
    { "id": "client001", "username": "student_bob", "password": "password123", "role": "client" },
];

const ADMIN_REGISTRATION_CODE = "1234";

export function register(username, password, role, adminCode = null) {
    console.log(`[Auth] Attempting registration for: ${username}, Role: ${role}`);
    console.log(`[Auth] [SECURITY] Attempting registration with plaintext password storage. This is insecure and for demonstration only.`);

    if (!username || !password || !role) { return { success: false, messageKey: 'registerErrorRequired' }; }
    if (username.length < 3) { return { success: false, messageKey: 'registerErrorUsernameLength' }; }
    if (password.length < 6) { return { success: false, messageKey: 'registerErrorPasswordLength' }; }
    if (!['client', 'provider', 'admin'].includes(role)) { return { success: false, messageKey: 'Invalid role selected.' };}
    if (store.findUserByUsername(username)) { console.warn(`[Auth] Registration failed: Username '${username}' already exists.`); return { success: false, messageKey: 'This username is already taken.' }; }
    if (role === 'admin') {
        if (!adminCode) { console.warn(`[Auth] Admin registration attempt for '${username}' missing admin code.`); return { success: false, messageKey: 'registerErrorAdminCodeRequired' }; }
        if (adminCode !== ADMIN_REGISTRATION_CODE) { console.warn(`[Auth] Failed admin registration attempt for '${username}' with incorrect code: ${adminCode}`); return { success: false, messageKey: 'Invalid Admin Registration Code.' }; }
        console.log('[Auth] Admin registration code verified.');
    }
    const newUser = { username, password, role };
    store.addUser(newUser); // This handles logging internally now
    console.log(`[Auth] User registered successfully: ${username}, Role: ${role}`);
    return { success: true, messageKey: 'registerSuccessMessage' };
}

export function login(username, password) {
    console.log(`[Auth] --- LOGIN ATTEMPT --- User='${username}'`);
    console.log(`[Auth] [SECURITY] Performing login with plaintext password check. This is insecure and for demonstration only.`);

    let user = null;
    let foundIn = 'nowhere';
    try {
        console.log(`[Auth] Attempting to find user '${username}' in store...`);
        user = store.findUserByUsername(username);
        if (user) {
            foundIn = 'store';
        } else {
            console.warn(`[Auth] User '${username}' not found in store. Checking fallback...`);
            user = DEFAULT_USERS_FALLBACK.find(u => u.username === username);
            if (user) {
                foundIn = 'fallback';
            }
        }
    } catch (err) {
        console.error(`[Auth] CRITICAL ERROR during user lookup for '${username}':`, err);
        return { success: false, messageKey: 'loginErrorInvalid' };
    }

    if (!user) {
        console.error(`[Auth] Login Failed: User '${username}' not found in store or fallback.`);
        return { success: false, messageKey: 'loginErrorInvalid' };
    }
    console.log(`[Auth] User '${username}' FOUND in ${foundIn}.`); // Simplified log

    try {
        console.log(`[Auth] Checking password for user '${username}'...`);
        if (!user || typeof user.password === 'undefined') {
             console.error(`[Auth] Login Failed: User object or password property is missing for '${username}'.`);
             return { success: false, messageKey: 'loginErrorInvalid' };
        }
        if (user.password !== password) {
            console.error(`[Auth] Login Failed: Password mismatch for '${username}'.`); // REMOVE password details from log later
            return { success: false, messageKey: 'loginErrorInvalid' };
        }
        console.log(`[Auth] Password VERIFIED for user '${username}'.`);
    } catch (err) {
         console.error(`[Auth] CRITICAL ERROR during password check for '${username}':`, err);
         return { success: false, messageKey: 'loginErrorInvalid' };
    }

    try {
        console.log(`[Auth] Attempting to set logged in user ID in store: ${user.id}`);
        store.setLoggedInUser(user.id); // Store the ID in localStorage via store
        console.log(`[Auth] Successfully set logged in user ID in store.`);
        loggedInUserObject = user; // **Set internal state immediately**
        console.log(`[Auth] Internal user object set.`);
    } catch (err) {
         console.error(`[Auth] CRITICAL ERROR during setLoggedInUser for ID '${user.id}':`, err);
         // Still return success if password was ok but saving session failed? Yes for now.
    }

    console.log(`[Auth] Login Success: User ${user.username} (Role: ${user.role}, ID: ${user.id}) logged in.`);
    return { success: true, user };
}

export function logout() {
    store.clearLoggedInUser(); // Clear from localStorage via store
    loggedInUserObject = null; // Clear internal variable
    console.log('[Auth] User logged out (internal state cleared).');
}

export function getCurrentUser() {
    // Prioritize internal variable, then check store if null (e.g., page load)
    if (!loggedInUserObject) {
        // console.log("[Auth.getCurrentUser] Internal state null, checking store...");
        loggedInUserObject = store.getLoggedInUser(); // Re-hydrate from store
    } else {
         // console.log("[Auth.getCurrentUser] Returning from internal state.");
    }
    return loggedInUserObject;
}

export function isLoggedIn() {
    // Check the result of getCurrentUser (which checks internal first, then store)
    const currentUser = getCurrentUser();
    // console.log(`[Auth.isLoggedIn] Status: ${!!currentUser}`);
    return !!currentUser;
}

export function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

// Export the initialization function to be called from main.js
export { initializeAuthUserState };