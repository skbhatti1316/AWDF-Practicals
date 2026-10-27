# AWDF Full-Stack Integration: React + Node.js + Express + MongoDB

**Course:** Advanced Web Development Frameworks (ITUE301)  
**Developer:** Siddharth Kalpeshkumar Bhatti  
**Roll No:** D25IT123  
**Institution:** Faculty of Technology and Engineering (CSPIT / DEPSTAR), CHARUSAT  

---

## 🚀 Overview

This repository represents the unified, complete full-stack web application meeting all requirements across **Practicals 2, 3, 4, 5, 6, and 7**.

The application connects a modern **React 19 SPA** (running on `http://localhost:5173`) to a **Node.js / Express 5 REST API** (running on `http://localhost:5000`) backed by a live **MongoDB Atlas** database via **Mongoose 9**.

---

## 🏛️ System Architecture

```text
React Frontend (localhost:5173)
  │
  ├─ fetch / central api.js
  ▼
Express Backend (localhost:5000)
  ├── 1. CORS Middleware
  ├── 2. Express JSON Body Parser
  ├── 3. Global Request Logging Middleware
  ├── 4. Content-Type Header Validation (POST/PUT)
  ├── 5. Route-Specific Task ID Format Validation
  ├── 6. REST API Endpoints (/tasks, /tasks/:id, /login, /register)
  ├── 7. 404 Undefined Route Handler (Structured JSON)
  └── 8. Centralized Global Error Handler (4 arguments)
  │
  ├─ Mongoose ODM
  ▼
MongoDB Database (tasks & users collections)
```

---

## 📋 Comprehensive Practical Implementations

### Practical 2: State Management and Routing in React
- **React Router v7**: Multi-page client-side SPA routing (`Home`, `Tasks`, `GitHub Repos`, `Contact`, `Login`).
- **Navigation with `<Link>`**: Clean client-side page transitions without full browser reloads.
- **State Management (`useState`)**:
  - Controlled form inputs with real-time state synchronization.
  - **Live Character Counter** below message input (Practical 2 Supplementary 3).
  - **UI Visibility Toggle**: Quick reference guide drawer toggled with state.
  - **Dark / Light Mode**: Dynamic theme toggle applying CSS class to the root `<html>` element with `localStorage` persistence (Practical 2 Supplementary 2).
- **Custom 404 Route**: Dedicated `<NotFound />` component rendered for any undefined URL (Practical 2 Supplementary 1).

### Practical 3: API Integration and Data Rendering in React
- **Asynchronous Data Fetching**: Fetches repository data from GitHub REST API on mount using `useEffect`.
- **Loading State**: Animated `<Loading />` spinner component displayed while network request is in flight.
- **Error State & Recovery**: `<ErrorMessage />` component rendered on failure with an interactive **"↻ Retry Request"** button (Practical 3 Supplementary 1).
- **Real-Time Search Filter**: Live input filtering repositories by name and description (Practical 3 Supplementary 2).
- **Star Counter Badges**: Displays stargazers count ⭐ alongside repository names (Practical 3 Supplementary 3).
- **Faculty Demo Tool**: Built-in "⚡ Simulate Network Error" button to demonstrate error state handling without network tampering.

### Practical 4: Building a RESTful API with Node.js and Express
- **REST Endpoints**: Complete CRUD for task resources (`GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`).
- **Request Logging Middleware**: Logs timestamp, HTTP method, and requested URL for every incoming request.
- **Content-Type Validation**: Rejects `POST` and `PUT` requests missing `Content-Type: application/json` header (Practical 4 Supplementary 1).
- **Route-Specific Task ID Validation**: Validates 24-character hexadecimal MongoDB ObjectId format before hitting controllers (Practical 4 Supplementary 2).
- **Structured 404 Handler**: Returns structured JSON `{ error: "NotFound", message: ... }` for undefined API endpoints (Practical 4 Supplementary 3).
- **Centralized Global Error Handler**: Defined as the final middleware with 4 arguments `(err, req, res, next)`.

### Practical 5: MongoDB Integration and Schema Design with Mongoose
- **Mongoose Task Schema**:
  - `title` (String, required: true, trimmed)
  - `description` (String, default: "")
  - `completed` (Boolean, default: false)
  - `priority` (Enum: `['low', 'medium', 'high']`, default: `'medium'`) (Practical 5 Supplementary 1)
  - `createdAt` (Date, default: Date.now)
- **Pre-Save Hook**: Automatically trims whitespace from the title field before document saving (Practical 5 Supplementary 2).
- **GET /tasks/:id Endpoint**: Returns single task document or returns structured 404 JSON response if ID does not exist (Practical 5 Supplementary 3).
- **Structured Validation Errors**: Formatted error response `{ error: "ValidationError", details: [...] }` instead of raw Mongoose error objects.
- **Configuration**: `.env` with `.env.example` provided.

### Practical 6: Full-Stack Integration React + Node + MongoDB
- **CORS Configured**: Express backend configured with `cors()` middleware.
- **Central `api.js`**: Reusable API service module configured with `BASE_URL = 'http://localhost:5000'`.
- **Full End-to-End Flow**: Create, Read, Update, and Delete operations fully synchronized with MongoDB Atlas.
- **Optimistic UI Updates**: New tasks appear in the list instantly before server confirmation; completion status toggles immediately with automatic rollback on error (Practical 6 Supplementary 1).
- **Confirmation Dialog Modal**: Accessible modal popup before deleting any task (Practical 6 Supplementary 2).
- **Toast Notifications**: Dynamic toast banner appearing on success, failure, or info for every operation (Practical 6 Supplementary 3).

### Practical 7: JWT Authentication & User Management
- Secure user registration (`POST /register`) with password hashing via `bcryptjs`.
- User authentication (`POST /login`) issuing signed JSON Web Tokens (`jwt`).
- 1-Click Demo Login option for quick evaluator testing.

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Start the Express Backend
Open a terminal and run:
```bash
cd task-manager-api-D25IT123
npm install
npm start
```
The backend will launch at **`http://localhost:5000`** and automatically connect to MongoDB Atlas.

### 2. Start the React Frontend
In a **separate terminal**, run:
```bash
npm install
npm run dev
```
The React development server will start at **`http://localhost:5173`**.

---

## 📡 REST API Endpoints Summary

| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API status and server health check | Public |
| `GET` | `/tasks` | Retrieve all tasks (sorted newest first) | Optional JWT |
| `GET` | `/tasks/:id` | Retrieve single task by MongoDB ID | Optional JWT |
| `POST` | `/tasks` | Create a new task (validates required title & priority) | Optional JWT |
| `PUT` | `/tasks/:id` | Update an existing task | Optional JWT |
| `DELETE` | `/tasks/:id` | Delete a task by MongoDB ID | Optional JWT |
| `POST` | `/register` | Register a new user | Public |
| `POST` | `/login` | Authenticate user and receive JWT token | Public |
| `GET` | `/me` | Get authenticated user profile | Required JWT |

---

## 🎨 Design System Highlights
- Modern typography pairing **Outfit** and **Plus Jakarta Sans** via Google Fonts.
- Dark & Light theme tokens with glassmorphism sticky navbar.
- Accessible keyboard support for modals (`Esc` to dismiss).
- Fluid animations for toasts, modals, and card interactions.


## Practical 9: In-Memory Caching and Query Optimization

### Aim
To implement in-memory caching and optimize API response time using NodeCache.

### Implementation
- Installed the `node-cache` package.
- Created a shared cache module in `utils/cache.js`.
- Configured a default cache expiration time (TTL) of 60 seconds.
- Implemented caching for the GET `/tasks` endpoint using the key `all_tasks`.
- Added cache invalidation after successful POST, PUT, and DELETE operations.
- Verified cache hits and misses using Thunder Client.

### Testing
The API returned `200 OK` when retrieving tasks.

- **Cache MISS:** Tasks are fetched from MongoDB and stored in the cache.
- **Cache HIT:** Tasks are returned from in-memory storage.
- **Cache invalidation:** The cached task list is cleared after a successful task modification.

### Response-Time Comparison
Record the actual response times observed in Thunder Client.

| Test | Request 1 | Request 2 | Request 3 | Average |
|---|---:|---:|---:|---:|
| Without caching | ___ ms | ___ ms | ___ ms | ___ ms |
| With caching | ___ ms | ___ ms | ___ ms | ___ ms |

### Conclusion
In-memory caching was implemented successfully using NodeCache. Cache hits return previously stored task data without querying MongoDB again, while cache invalidation keeps the cached task list updated after successful task modifications. The 60-second TTL allows cached entries to expire automatically.