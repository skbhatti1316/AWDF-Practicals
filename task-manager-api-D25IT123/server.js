const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const Task = require("./models/Task");
const User = require("./models/User");
const cache = require("./utils/cache");

const taskEvents = require("./events");
require("./listeners");

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. GLOBAL MIDDLEWARE PIPELINE
// ==========================================

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// Validate JSON content type for requests with a body
const requireJsonContentType = (req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentLength = req.headers["content-length"];

    if (contentLength && contentLength !== "0") {
      const contentType = req.headers["content-type"];

      if (!contentType || !contentType.toLowerCase().includes("application/json")) {
        return res.status(400).json({
          error: "Invalid Content-Type",
          message: "POST/PUT requests with a body must specify 'Content-Type: application/json'",
        });
      }
    }
  }

  next();
};

app.use(requireJsonContentType);

// Validate MongoDB ObjectId
const validateTaskId = (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: "Invalid Task ID",
      message: `The provided id '${id}' is not a valid 24-character hexadecimal ObjectId.`,
    });
  }

  next();
};

// Optional JWT authentication
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_jwt_secret";

    try {
      req.user = jwt.verify(token, secret);
    } catch {
      // Invalid token: continue as unauthenticated
    }
  }

  next();
};

// Strict JWT authentication
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Access denied. Please log in to continue.",
    });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET || "default_jwt_secret";

  jwt.verify(token, secret, (error, decoded) => {
    if (error) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid or expired authentication token.",
      });
    }

    req.user = decoded;
    next();
  });
};

// ==========================================
// 2. MONGODB CONNECTION
// ==========================================

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskmanager";

if (require.main === module) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
    });
}

// ==========================================
// 3. API ROUTES
// ==========================================

// Base health check
app.get("/test-event", (req, res) => {
  console.log("TEST EVENT ROUTE REACHED");
  res.send("Correct server is receiving requests");
});
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Task Manager RESTful API is running",
    endpoints: {
      tasks: "/tasks",
      singleTask: "/tasks/:id",
      login: "/login",
      register: "/register",
    },
    version: "1.0.0",
  });
});

// Cache Invalidation Helper (Practical 9 + Multi-user Isolation)
const invalidateTaskCache = (userId) => {
  cache.del("all_tasks");
  if (userId) {
    cache.del(`tasks_user_${userId}`);
  }
};

// GET /tasks - Retrieve all tasks with caching
app.get("/tasks", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user && req.user.userId ? req.user.userId : null;
    const cacheKey = userId ? `tasks_user_${userId}` : "all_tasks";
    const cachedTasks = cache.get(cacheKey);

    if (cachedTasks !== undefined) {
      console.log("Cache HIT: Returning tasks from memory");
      return res.status(200).json(cachedTasks);
    }

    console.log("Cache MISS: Fetching tasks from MongoDB");

    // Authenticated user sees their own tasks and unassigned public tasks
    // Unauthenticated caller sees unassigned public tasks
    const filter = userId
      ? { $or: [{ user: userId }, { user: null }] }
      : { $or: [{ user: null }, { user: { $exists: false } }] };

    const tasks = await Task.find(filter).sort({ createdAt: -1 });

    cache.set(cacheKey, tasks);

    return res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /tasks/:id - Retrieve a single task
app.get("/tasks/:id", validateTaskId, optionalAuth, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        error: "Not Found",
        message: `Task not found with ID: ${req.params.id}`,
      });
    }

    if (
      task.user &&
      req.user &&
      req.user.userId &&
      task.user.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to view this task.",
      });
    }

    return res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// POST /tasks - Create a new task
app.post("/tasks", optionalAuth, async (req, res, next) => {
  console.log("🔥 POST /tasks ROUTE ENTERED");
  try {
    const { title, description, completed, priority, status, dueDate } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Task 'title' is required and cannot be empty.",
      });
    }

    let isCompleted = typeof completed === "boolean" ? completed : false;
    let taskStatus = "pending";
    if (status && ["pending", "in_progress", "completed"].includes(status)) {
      taskStatus = status;
      if (status === "completed") isCompleted = true;
    } else if (isCompleted) {
      taskStatus = "completed";
    }

    let parsedDueDate = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (!isNaN(d.getTime())) {
        parsedDueDate = d;
      }
    }

    const newTask = new Task({
      title: title.trim(),
      description: description ? description.trim() : "",
      completed: isCompleted,
      status: taskStatus,
      priority: ["low", "medium", "high"].includes(priority)
        ? priority
        : "medium",
      dueDate: parsedDueDate,
      user: req.user && req.user.userId ? req.user.userId : null,
    });

    const savedTask = await newTask.save();

    // Invalidate cache after successful creation
    invalidateTaskCache(req.user?.userId);

console.log(`[API] Sending response at ${new Date().toISOString()}`);

console.log("[API] Emitting task-created event");

taskEvents.emit("task-created", savedTask);

console.log("[API] Event emission completed");

return res.status(201).json({
  message: "Task Added Successfully",
  task: savedTask
});
  } catch (error) {
    next(error);
  }
});

// PUT /tasks/:id - Update an existing task
app.put("/tasks/:id", validateTaskId, optionalAuth, async (req, res, next) => {
  try {
    const existingTask = await Task.findById(req.params.id);

    if (!existingTask) {
      return res.status(404).json({
        error: "Not Found",
        message: `Task with ID '${req.params.id}' was not found.`,
      });
    }

    if (
      existingTask.user &&
      req.user &&
      req.user.userId &&
      existingTask.user.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to modify this task.",
      });
    }

    const updateData = {};

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Task title must be a non-empty string.",
        });
      }

      updateData.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      updateData.description = req.body.description.trim();
    }

    if (req.body.status !== undefined) {
      if (!["pending", "in_progress", "completed"].includes(req.body.status)) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Status must be one of: 'pending', 'in_progress', 'completed'",
        });
      }
      updateData.status = req.body.status;
      updateData.completed = req.body.status === "completed";
    } else if (req.body.completed !== undefined) {
      const isComp = Boolean(req.body.completed);
      updateData.completed = isComp;
      updateData.status = isComp ? "completed" : "pending";
    }

    if (req.body.priority !== undefined) {
      if (!["low", "medium", "high"].includes(req.body.priority)) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Priority must be one of: 'low', 'medium', 'high'",
        });
      }

      updateData.priority = req.body.priority;
    }

    if (req.body.dueDate !== undefined) {
      if (req.body.dueDate === null || req.body.dueDate === "") {
        updateData.dueDate = null;
      } else {
        const d = new Date(req.body.dueDate);
        if (!isNaN(d.getTime())) {
          updateData.dueDate = d;
        }
      }
    }

    if (!existingTask.user && req.user && req.user.userId) {
      updateData.user = req.user.userId;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    // Invalidate cache after successful update
    invalidateTaskCache(existingTask.user?.toString() || req.user?.userId);

    return res.status(200).json({
      message: "Task Updated Successfully",
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /tasks/:id - Delete a task
app.delete("/tasks/:id", validateTaskId, optionalAuth, async (req, res, next) => {
  try {
    const existingTask = await Task.findById(req.params.id);

    if (!existingTask) {
      return res.status(404).json({
        error: "Not Found",
        message: `Task with ID '${req.params.id}' was not found.`,
      });
    }

    if (
      existingTask.user &&
      req.user &&
      req.user.userId &&
      existingTask.user.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to delete this task.",
      });
    }

    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    // Invalidate cache after successful deletion
    invalidateTaskCache(existingTask.user?.toString() || req.user?.userId);

res.status(200).json({
  message: "Task Deleted Successfully",
  task: deletedTask,
});

taskEvents.emit("task-deleted", deletedTask);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. AUTHENTICATION ROUTES
// ==========================================

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

app.post("/register", registerValidation, async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "ValidationError",
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: "Conflict",
        message: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User Registered Successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("Enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
      }

      const secret = process.env.JWT_SECRET || "default_jwt_secret";

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
        },
        secret,
        { expiresIn: "24h" }
      );

      return res.status(200).json({
        message: "Login Successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Protected user profile route
app.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

// Update user profile route (Profile & Settings)
app.put("/me", requireAuth, async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
    }

    if (name && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: "ValidationError",
          message: "Current password is required to change password",
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Current password does not match",
        });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({
          error: "ValidationError",
          message: "New password must be at least 8 characters long",
        });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. 404 ROUTE HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    error: "NotFound",
    message: `Cannot ${req.method} ${req.originalUrl}. Route not found.`,
  });
});

// ==========================================
// 6. GLOBAL ERROR HANDLING
// ==========================================

app.use((err, req, res, next) => {
  console.error(
    "Global Error Handler caught:",
    err.stack || err.message || err
  );

  if (err.name === "ValidationError") {
    const details = Object.keys(err.errors || {}).map((key) => ({
      field: key,
      message: err.errors[key].message,
    }));

    return res.status(400).json({
      error: "ValidationError",
      message: "Data validation failed",
      details,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "CastError",
      message: `Invalid format for field '${err.path}'`,
    });
  }

  const status = err.statusCode || err.status || 500;

  return res.status(status).json({
    error: err.name || "InternalServerError",
    message: err.message || "Something went wrong on the server",
  });
});

// ==========================================
// 7. START SERVER
// ==========================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API base URL: http://localhost:${PORT}`);
  });
}

module.exports = app;