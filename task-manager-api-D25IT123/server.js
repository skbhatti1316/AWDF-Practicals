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

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// ==========================================
// 3. API ROUTES
// ==========================================

// Base health check
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

// GET /tasks - Retrieve all tasks with caching
app.get("/tasks", optionalAuth, async (req, res, next) => {
  try {
    const cachedTasks = cache.get("all_tasks");

    if (cachedTasks !== undefined) {
      console.log("Cache HIT: Returning tasks from memory");
      return res.status(200).json(cachedTasks);
    }

    console.log("Cache MISS: Fetching tasks from MongoDB");

    const tasks = await Task.find().sort({ createdAt: -1 });

    cache.set("all_tasks", tasks);

    return res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

// GET /tasks/:id - Retrieve a single task
app.get("/tasks/:id", validateTaskId, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        error: "Not Found",
        message: `Task not found with ID: ${req.params.id}`,
      });
    }

    return res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// POST /tasks - Create a new task
app.post("/tasks", optionalAuth, async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Task 'title' is required and cannot be empty.",
      });
    }

    const newTask = new Task({
      title: title.trim(),
      description: description ? description.trim() : "",
      completed: typeof completed === "boolean" ? completed : false,
      priority: ["low", "medium", "high"].includes(priority)
        ? priority
        : "medium",
    });

    const savedTask = await newTask.save();

    // Invalidate cache after successful creation
    cache.del("all_tasks");

    return res.status(201).json({
      message: "Task Added Successfully",
      task: savedTask,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /tasks/:id - Update an existing task
app.put("/tasks/:id", validateTaskId, optionalAuth, async (req, res, next) => {
  try {
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

    if (req.body.completed !== undefined) {
      updateData.completed = Boolean(req.body.completed);
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

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        error: "Not Found",
        message: `Task with ID '${req.params.id}' was not found.`,
      });
    }

    // Invalidate cache after successful update
    cache.del("all_tasks");

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
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        error: "Not Found",
        message: `Task with ID '${req.params.id}' was not found.`,
      });
    }

    // Invalidate cache after successful deletion
    cache.del("all_tasks");

    return res.status(200).json({
      message: "Task Deleted Successfully",
      task: deletedTask,
    });
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API base URL: http://localhost:${PORT}`);
});