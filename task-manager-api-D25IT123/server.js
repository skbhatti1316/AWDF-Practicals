const express = require("express");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Sample Data
let tasks = [
  {
    id: 1,
    title: "Complete AWDF Practical",
    completed: false,
  },
  {
    id: 2,
    title: "Study Express.js",
    completed: true,
  },
];

// Home Route
app.get("/", (req, res) => {
  res.send("Task Manager API is Running...");
});

// ======================
// GET All Tasks
// ======================
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// ======================
// POST New Task
// ======================
app.post("/tasks", (req, res) => {
  const newTask = {
    id: tasks.length + 1,
    title: req.body.title,
    completed: false,
  };

  tasks.push(newTask);

  res.status(201).json({
    message: "Task Added Successfully",
    task: newTask,
  });
});

// ======================
// PUT Update Task
// ======================
app.put("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({
      message: "Task Not Found",
    });
  }

  task.title = req.body.title || task.title;
  task.completed =
    req.body.completed !== undefined
      ? req.body.completed
      : task.completed;

  res.json({
    message: "Task Updated Successfully",
    task,
  });
});

// ======================
// DELETE Task
// ======================
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id);

  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Task Not Found",
    });
  }

  const deletedTask = tasks.splice(index, 1);

  res.json({
    message: "Task Deleted Successfully",
    task: deletedTask[0],
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});