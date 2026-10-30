console.log("DEBUG: listeners.js loaded");
const taskEvents = require("./events");

// Listen for task-created events
taskEvents.on("task-created", (task) => {
  console.log("✅ EVENT RECEIVED: task-created");
  const assignedUser = task.user
    ? task.user.toString()
    : "unassigned/public task";

  console.log(
    `[Notification] Started for task "${task.title}" at ${new Date().toISOString()}`
  );

  // Simulate a slow notification handler
  setTimeout(() => {
    try {
      console.log(
        `[Notification] Task "${task.title}" created; timestamp: ${new Date().toISOString()}; assigned user: ${assignedUser}`
      );

      console.log(
        `[Notification] Handler completed at ${new Date().toISOString()}`
      );
    } catch (error) {
      taskEvents.emit("task-notification-error", error, task);
    }
  }, 2000);
});

// Handle notification errors
taskEvents.on("task-notification-error", (error, task) => {
  console.error(
    `[Notification Error] Task "${task?.title || "unknown"}":`,
    error.message
  );
});

// Listen for task-deleted events
taskEvents.on("task-deleted", (task) => {
  console.log(
    `[Notification] Task "${task.title}" deleted at ${new Date().toISOString()}`
  );
});