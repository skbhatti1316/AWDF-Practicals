const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "in_progress", "completed"],
        message: "{VALUE} is not a valid status. Must be pending, in_progress, or completed",
      },
      default: "pending",
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "{VALUE} is not a valid priority. Must be low, medium, or high",
      },
      default: "medium",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// Pre-save hook to automatically trim whitespace from the title field (Practical 5 Supplementary)
// and synchronize status and completed fields
taskSchema.pre("save", function () {
  if (this.title && typeof this.title === "string") {
    this.title = this.title.trim();
  }
  if (this.status === "completed") {
    this.completed = true;
  } else if (this.completed) {
    this.status = "completed";
  }
});

module.exports = mongoose.model("Task", taskSchema);