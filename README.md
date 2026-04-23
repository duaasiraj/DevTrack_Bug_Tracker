# DevTrack — Full Annotated File Structure

```
bug-tracker/
│
├── .gitignore                  ← tells Git which files to NEVER commit
│                                  (node_modules, .env, build folders, etc.)
│
├── README.md                   ← project overview, how to run locally
│                                  (write this last, but create the file now)
│
│
├── server/                     ← everything backend lives here
│   │
│   ├── .env                    ← YOUR SECRET CONFIG — never commit this
│   │                              contains: DATABASE_URL, JWT_SECRET, PORT
│   │
│   ├── .env.example            ← DO commit this — shows teammates what
│   │                              variables are needed, with fake values
│   │                              e.g. DATABASE_URL=postgresql://user:pass@host/db
│   │
│   ├── package.json            ← lists all npm packages your backend needs
│   │                              and defines scripts like "npm run dev"
│   │
│   ├── index.js                ← ENTRY POINT — the file Node runs first
│   │                              sets up Express, registers all middleware,
│   │                              mounts all route files, starts the server
│   │
│   ├── db.js                   ← creates the PostgreSQL connection pool
│   │                              imports pg, reads DATABASE_URL from .env,
│   │                              exports a `query()` function every controller uses
│   │
│   │
│   ├── middleware/             ← functions that run BETWEEN receiving a request
│   │   │                          and reaching the controller
│   │   │                          Express calls them with (req, res, next)
│   │   │
│   │   ├── authMiddleware.js   ← checks that a valid JWT is attached to the request
│   │   │                          reads the Authorization header, verifies the token,
│   │   │                          attaches decoded user info to req.user,
│   │   │                          rejects with 401 if missing or invalid
│   │   │
│   │   └── roleMiddleware.js   ← checks req.user.role against an allowed list
│   │                              e.g. roleMiddleware(['admin', 'pm'])
│   │                              rejects with 403 if the user's role isn't allowed
│   │
│   │
│   ├── controllers/            ← the actual LOGIC for each route
│   │   │                          each function receives (req, res),
│   │   │                          talks to the database, and sends back JSON
│   │   │
│   │   ├── authController.js   ← register() and login() and logout() and getMe()
│   │   │                          register: hashes password with bcrypt, inserts user
│   │   │                          login: checks password, returns signed JWT
│   │   │
│   │   ├── userController.js   ← getUser(), updateUser(), getAllUsers() (admin only)
│   │   │                          admin: list/delete users
│   │   │                          any user: view/edit their own profile
│   │   │
│   │   ├── projectController.js ← createProject(), getProjects(), getProjectById(),
│   │   │                           updateProject(), deleteProject()
│   │   │                           also: addMember(), removeMember(), getMembers()
│   │   │
│   │   ├── issueController.js  ← createIssue(), getIssues(), getIssueById(),
│   │   │                          updateIssue(), deleteIssue(), assignIssue()
│   │   │                          getIssues() supports filtering by status/priority/etc.
│   │   │
│   │   ├── commentController.js ← createComment(), getCommentsByIssue(),
│   │   │                           deleteComment()
│   │   │
│   │   └── notificationController.js ← getNotifications() for the logged-in user,
│   │                                    markAsRead(), markAllAsRead()
│   │                                    (creating notifications happens internally,
│   │                                    not via a user-facing POST request)
│   │
│   │
│   ├── routes/                 ← maps URL paths to controller functions
│   │   │                          each file is a mini Express Router
│   │   │                          this is where you attach middleware to specific routes
│   │   │
│   │   ├── authRoutes.js       ← POST /api/auth/register
│   │   │                          POST /api/auth/login
│   │   │                          (no auth middleware — these are public)
│   │   │
│   │   ├── userRoutes.js       ← GET    /api/users          (admin only)
│   │   │                          GET    /api/users/:id
│   │   │                          PATCH  /api/users/:id
│   │   │                          DELETE /api/users/:id      (admin only)
│   │   │
│   │   ├── projectRoutes.js    ← GET    /api/projects
│   │   │                          POST   /api/projects        (admin/pm)
│   │   │                          GET    /api/projects/:id
│   │   │                          PATCH  /api/projects/:id    (admin/pm)
│   │   │                          DELETE /api/projects/:id    (admin only)
│   │   │                          POST   /api/projects/:id/members
│   │   │                          DELETE /api/projects/:id/members/:userId
│   │   │
│   │   ├── issueRoutes.js      ← GET    /api/issues                (with ?status=&priority= filters)
│   │   │                          POST   /api/issues
│   │   │                          GET    /api/issues/:id
│   │   │                          PATCH  /api/issues/:id
│   │   │                          DELETE /api/issues/:id
│   │   │
│   │   ├── commentRoutes.js    ← GET    /api/issues/:issueId/comments
│   │   │                          POST   /api/issues/:issueId/comments
│   │   │                          DELETE /api/comments/:id
│   │   │
│   │   └── notificationRoutes.js ← GET   /api/notifications
│   │                                PATCH /api/notifications/:id/read
│   │                                PATCH /api/notifications/read-all
│   │
│   │
│   ├── validators/             ← input validation rules (using express-validator)
│   │   │                          called as middleware BEFORE the controller runs
│   │   │                          returns 400 with error details if input is bad
│   │   │
│   │   ├── authValidator.js    ← checks register/login body:
│   │   │                          email is valid format, password min length, etc.
│   │   │
│   │   └── issueValidator.js   ← checks issue creation body:
│   │                              title is not empty, priority is a valid enum value, etc.
│   │
│   │
│   └── utils/                  ← small helper functions used across the server
│       │
│       ├── errorHandler.js     ← a single Express error-handling middleware
│       │                          registered LAST in index.js
│       │                          catches any error thrown in controllers and
│       │                          sends a consistent JSON error response
│       │
│       └── notificationHelper.js ← a function like createNotification(userId, issueId, message)
│                                    called internally by issueController and commentController
│                                    so you don't repeat the INSERT query everywhere
│
│
└── client/                     ← everything frontend lives here (your teammate's territory)
    │
    ├── index.html              ← the single HTML file the browser loads
    │                              React mounts into the <div id="root"> inside it
    │
    ├── package.json            ← frontend dependencies (React, axios, Tailwind, etc.)
    │
    ├── vite.config.js          ← Vite bundler config
    │                              IMPORTANT: set up the proxy here so /api calls
    │                              in development go to localhost:5000 automatically
    │
    ├── .env                    ← frontend env vars (different from server's .env)
    │                              Vite only exposes vars prefixed with VITE_
    │                              e.g. VITE_API_URL=http://localhost:5000
    │
    └── src/
        │
        ├── main.jsx            ← entry point — mounts <App /> into index.html's root div
        │
        ├── App.jsx             ← sets up React Router, defines all page routes,
        │                          wraps everything in AuthContext provider
        │
        ├── api/
        │   └── axios.js        ← creates a pre-configured axios instance
        │                          sets baseURL to the backend
        │                          interceptor auto-attaches JWT to every request
        │                          interceptor handles 401 responses (redirect to login)
        │
        ├── context/
        │   └── AuthContext.jsx ← stores the logged-in user and JWT globally
        │                          provides login(), logout() functions
        │                          any component can read the current user from here
        │
        ├── hooks/              ← custom React hooks (reusable stateful logic)
        │   ├── useAuth.js      ← shortcut to read from AuthContext
        │   └── useIssues.js    ← handles fetching/filtering issues, loading state, etc.
        │
        ├── constants/          ← shared static values — define once, import everywhere
        │   ├── roles.js        ← export const ROLES = { ADMIN: 'admin', PM: 'pm', ... }
        │   └── statusOptions.js ← export const STATUSES = ['open', 'in_progress', ...]
        │
        ├── components/         ← small reusable UI pieces (not full pages)
        │   │                      each one does one thing and accepts props
        │   │
        │   ├── Navbar.jsx      ← top navigation bar, shows current user, logout button
        │   ├── Sidebar.jsx     ← project list / navigation links
        │   ├── IssueCard.jsx   ← a single issue displayed as a card (used in lists)
        │   ├── CommentBox.jsx  ← displays + submits comments on an issue
        │   └── NotificationBell.jsx ← icon in navbar, shows unread count, dropdown list
        │
        ├── pages/              ← one file per screen/view in the app
        │   │                      each page composes components together
        │   │                      pages talk to the API; components just receive props
        │   │
        │   ├── Login.jsx       ← login form → calls POST /api/auth/login
        │   ├── Register.jsx    ← register form (admin-only flow in your system)
        │   ├── Dashboard.jsx   ← landing page after login — role-specific view
        │   ├── ProjectView.jsx ← shows one project's issues, members, etc.
        │   ├── IssueView.jsx   ← shows one issue's full detail + comments
        │   └── AdminPanel.jsx  ← user management, visible to admin role only
        │
        └── utils/
            └── helpers.js      ← small pure functions: date formatting,
                                   truncating long text, mapping status to a color, etc.
```
