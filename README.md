# LearnSphere - Online Course Platform (v3 - Admin Panel & Pro Style)

This is an advanced front-end simulation of an online course platform featuring distinct user roles (Student, Provider, **Admin**), enhanced professional styling, and admin-specific data visualization using Chart.js. It uses `localStorage` for data persistence and loads seed data from `data.json`.

**Key Features:**

-   **User Roles:** 'Student' (Client), 'Provider' (Teacher), 'Admin'.
-   **Authentication:** Registration/Login using `localStorage` (Passwords in **plain text - INSECURE demo only**).
-   **Admin Panel:** Dedicated section for administrators (`platform_admin` / `adminpassword`).
    -   Dashboard with statistics (user counts, course counts, simulated revenue) visualized using **Chart.js**.
    -   View/Manage all users (management actions are placeholders).
    -   View/Manage all courses (management actions are placeholders).
-   **Provider Features:** Create courses, view created courses, view enrolled students, **delete created courses (with confirmation)**.
-   **Client Features:** Browse courses, view details, enroll, view enrolled courses.
-   **Professional Styling:** Modern theme using Poppins font, refined color palette, customized Bootstrap components, icons, and subtle animations.
-   **Routing:** Hash-based SPA routing with role-based access control for Admin and Provider sections.
-   **Data:** Persists in `localStorage`. Loads initial data from `data.json`.

## Project Structure