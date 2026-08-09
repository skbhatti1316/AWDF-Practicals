require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Task = require("./models/Task");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

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
// GET All Tasks
// ======================
app.get("/tasks", async (req, res) => {
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
// ======================
app.post("/tasks", async (req, res) => {
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
// ======================
app.put("/tasks/:id", async (req, res) => {
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
// ======================
app.delete("/tasks/:id", async (req, res) => {
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