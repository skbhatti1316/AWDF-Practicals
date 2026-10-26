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

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });

// Home Route
app.get("/", (req, res) => {
  res.send("Task Manager API is Running...");
});

// ======================
// Registration Validation
// ======================
const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

// ======================
// POST Register User
// ======================
app.post("/register", registerValidation, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
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
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    return res.status(500).json({
      message: "Registration failed",
    });
  }
});

// ======================
// POST Login User
// ======================
app.post(
  "/login",
  [
    body("email").trim().isEmail().withMessage("Enter a valid email"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid email or password",
        });
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing from .env");

        return res.status(500).json({
          message: "Authentication configuration error",
        });
      }

      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.json({
        message: "Login Successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error.message);

      return res.status(500).json({
        message: "Login failed",
      });
    }
  }
);

// ======================
// Authentication Middleware
// ======================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Authentication configuration error",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(403).json({
        message: "Invalid or expired token",
      });
    }

    req.user = decoded;
    next();
  });
};

// ======================
// GET All Tasks
// Protected: requires JWT
// ======================
app.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.find();

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
});

// ======================
// POST New Task
// Protected: requires JWT
// ======================
app.post("/tasks", authenticateToken, async (req, res) => {
  try {
    const newTask = new Task({
      title: req.body.title,
      description: req.body.description,
      completed: req.body.completed,
      priority: req.body.priority,
    });

    const savedTask = await newTask.save();

    res.status(201).json({
      message: "Task Added Successfully",
      task: savedTask,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to add task",
      error: error.message,
    });
  }
});

// ======================
// PUT Update Task
// Protected: requires JWT
// ======================
app.put("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        completed: req.body.completed,
        priority: req.body.priority,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task Not Found",
      });
    }

    res.json({
      message: "Task Updated Successfully",
      task: updatedTask,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update task",
      error: error.message,
    });
  }
});

// ======================
// DELETE Task
// Protected: requires JWT
// ======================
app.delete("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task Not Found",
      });
    }

    res.json({
      message: "Task Deleted Successfully",
      task: deletedTask,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to delete task",
      error: error.message,
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});