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
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "{VALUE} is not a valid priority. Must be low, medium, or high",
      },
      default: "medium",
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
taskSchema.pre("save", function () {
  if (this.title && typeof this.title === "string") {
    this.title = this.title.trim();
  }
});

module.exports = mongoose.model("Task", taskSchema);