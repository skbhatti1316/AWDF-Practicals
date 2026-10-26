// Central API Module for Frontend-Backend Integration (Practical 6 Step 2)
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Helper to get default headers with JWT token if user is authenticated
 */
const getHeaders = (includeContentType = true) => {
  const headers = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/**
 * Handle API JSON response or throw structured error
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP error! Status: ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data.details || data.errors;
    throw error;
  }
  return data;
}

// ==========================================
// TASK MANAGEMENT API ENDPOINTS (Practical 4, 5, 6)
// ==========================================

/**
 * Fetch all tasks from MongoDB backend (GET /tasks)
 */
export const getTasks = async () => {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
};

/**
 * Fetch single task by ID with 404 handling (GET /tasks/:id - Practical 5 Supplementary)
 */
export const getTaskById = async (id) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'GET',
    headers: getHeaders(false),
  });
  return handleResponse(res);
};

/**
 * Create a new task in MongoDB (POST /tasks)
 */
export const createTask = async (taskData) => {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(taskData),
  });
  return handleResponse(res);
};

/**
 * Update an existing task (PUT /tasks/:id)
 */
export const updateTask = async (id, taskData) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify(taskData),
  });
  return handleResponse(res);
};

/**
 * Delete a task by ID (DELETE /tasks/:id)
 */
export const deleteTask = async (id) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(false),
  });
  return handleResponse(res);
};

// ==========================================
// AUTHENTICATION API ENDPOINTS (Practical 7)
// ==========================================

export const loginUser = async (credentials) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return handleResponse(res);
};

export const registerUser = async (userData) => {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(res);
};

// ==========================================
// GITHUB REST API ENDPOINT (Practical 3)
// ==========================================

export const fetchGithubRepos = async (username = 'skbhatti1316', shouldSimulateError = false) => {
  if (shouldSimulateError) {
    // Deliberate error demonstration for testing error state
    throw new Error('Simulated network error: Failed to connect to remote repository server.');
  }

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`GitHub user "${username}" was not found.`);
    }
    if (res.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again shortly.');
    }
    throw new Error(`GitHub API request failed with status: ${res.status}`);
  }
  return res.json();
};
