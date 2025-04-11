// js/auth.js - Handles user authentication and session
import * as store from './store.js';

// IMPORTANT: This is for demonstration. Real apps MUST NOT store passwords like this.
// This fallback is primarily useful if localStorage gets cleared during development.
const DEFAULT_USERS_FALLBACK = [
    { "id": "admin001", "username": "platform_admin", "password": "adminpassword", "role": "admin" },
    { "id": "provider001", "username": "teacher_jane", "password": "password123", "role": "provider" },
    { "id": "provider002", "username": "prof_davis", "password": "password123", "role": "provider" },
    { "id": "client001", "username": "student_bob", "password": "password123", "role": "client" },
    // Add more fallback users if needed, mirroring data.json
];

const ADMIN_REGISTRATION_CODE = "1234"; // Hardcoded admin code for demo purposes

/**
 * Registers a new user.
 * Performs validation and adds the user to the store.
 * @param {string} username - The desired username.
 * @param {string} password - The desired password.
 * @param {string} role - The selected role ('client', 'provider', 'admin').
 * @param {string|null} adminCode - The admin code, required if role is 'admin'.
 * @returns {{success: boolean, messageKey: string}} - Result object with translation key.
 */
export function register(username, password, role, adminCode = null) {
    console.log(`[Auth] Attempting registration for: ${username}, Role: ${role}`);

    // **SECURITY WARNING:** Storing plaintext passwords like this is INSECURE.
    // In a real application, hash the password on the SERVER before storing.
    // Do NOT store plaintext passwords in localStorage or anywhere client-side.
    console.warn("[SECURITY] Attempting registration with plaintext password storage. This is insecure and for demonstration only.");

    // --- Validation --- (Some validation already happens in main.js handler)
    if (!username || !password || !role) {
        return { success: false, messageKey: 'registerErrorRequired' };
    }
    if (username.length < 3) {
         return { success: false, messageKey: 'registerErrorUsernameLength' };
    }
    if (password.length < 6) {
         return { success: false, messageKey: 'registerErrorPasswordLength' };
    }
    if (!['client', 'provider', 'admin'].includes(role)) {
        // Use a general error message or create a specific translation key if needed
        return { success: false, messageKey: 'registerErrorInvalidRole' };
    }

    // --- Check Username Existence ---
    if (store.findUserByUsername(username)) {
        console.warn(`[Auth] Registration failed: Username '${username}' already exists.`);
        return { success: false, messageKey: 'registerErrorUsernameTaken' };
    }

    // --- Admin Role Specific Checks ---
    if (role === 'admin') {
        if (!adminCode) {
            console.warn(`[Auth] Admin registration attempt for '${username}' missing admin code.`);
            return { success: false, messageKey: 'registerErrorAdminCodeRequired' };
        }
        if (adminCode !== ADMIN_REGISTRATION_CODE) {
            console.warn(`[Auth] Failed admin registration attempt for '${username}' with incorrect code: ${adminCode}`);
            return { success: false, messageKey: 'registerErrorInvalidAdminCode' };
        }
        console.log('[Auth] Admin registration code verified.');
    }

    // --- Add User to Store ---
    const newUser = { username, password, role }; // Let store.js assign ID and createdAt
    store.addUser(newUser);

    console.log(`[Auth] User registered successfully: ${username}, Role: ${role}`);
    return { success: true, messageKey: 'registerSuccessMessage' };
}

/**
 * Logs in a user.
 * Verifies username and password against the store (and fallback).
 * Sets the logged-in user session in the store.
 * @param {string} username - The username entered by the user.
 * @param {string} password - The password entered by the user.
 * @returns {{success: boolean, messageKey?: string, user?: object}} - Result object.
 */
export function login(username, password) {
    console.log(`[Auth] --- LOGIN ATTEMPT --- User='${username}'`);

    // **SECURITY WARNING:** Plaintext password check. INSECURE. Demo only.
    console.warn("[SECURITY] Performing login with plaintext password check. This is insecure and for demonstration only.");

    let user = store.findUserByUsername(username);

    // Check fallback only if user not found in primary store
    if (!user) {
        console.warn(`[Auth] User '${username}' not found in store. Checking fallback...`);
        user = DEFAULT_USERS_FALLBACK.find(u => u.username === username);
        if (user) {
             console.log(`[Auth] User '${username}' FOUND in fallback. Note: Fallback data may not include recent changes.`);
             // Optional: Add user from fallback to primary store if they log in successfully?
             // store.addUser(user); // Consider implications of overwriting if username exists now
        }
    }

    if (!user) {
        console.error(`[Auth] Login Failed: User '${username}' not found in store or fallback.`);
        return { success: false, messageKey: 'loginErrorInvalid' };
    } else {
        console.log(`[Auth] User '${username}' FOUND in store or fallback.`);
    }

    // --- Verify Password ---
    // **SECURITY WARNING:** Plaintext comparison.
    if (!user.password || user.password !== password) {
        console.error(`[Auth] Login Failed: Password mismatch for '${username}'.`);
        return { success: false, messageKey: 'loginErrorInvalid' };
    }

    // --- Login Success ---
    store.setLoggedInUser(user.id);
    console.log(`[Auth] Login Success: User ${user.username} (Role: ${user.role}, ID: ${user.id}) logged in.`);
    return { success: true, user };
}

/**
 * Logs out the current user by clearing the session from the store.
 */
export function logout() {
    store.clearLoggedInUser();
    console.log('[Auth] User logged out.');
}

/**
 * Gets the currently logged-in user object from the store.
 * @returns {object|null} - The user object or null if not logged in or session is invalid.
 */
export function getCurrentUser() {
    return store.getLoggedInUser();
}

/**
 * Checks if a user is currently logged in based on session data in the store.
 * @returns {boolean} - True if a user is logged in, false otherwise.
 */
export function isLoggedIn() {
    return !!store.getLoggedInUser(); // Check if getLoggedInUser returns a truthy value
}

/**
 * Gets the role of the currently logged-in user.
 * @returns {string|null} - The user's role ('admin', 'provider', 'client') or null if not logged in.
 */
export function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}