import { useEffect, useState } from "react";
import Loading from "./Loading";
import ErrorMessage from "./ErrorMessage";

function Projects() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const [editingId, setEditingId] = useState(null);

  // GET Tasks
  const fetchTasks = () => {
    fetch("http://localhost:3000/tasks")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }
        return response.json();
      })
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load tasks.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // POST Task
  const addTask = (e) => {
    e.preventDefault();

    fetch("http://localhost:3000/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        completed: false,
        priority,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to add task");
        }
        return response.json();
      })
      .then(() => {
        setTitle("");
        setDescription("");
        setPriority("medium");
        fetchTasks();
      })
      .catch(() => {
        setError("Unable to add task.");
      });
  };

  // Start Editing
  const startEdit = (task) => {
    setEditingId(task._id);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
  };

  // PUT Update Task
  const updateTask = (e) => {
    e.preventDefault();

    fetch(`http://localhost:3000/tasks/${editingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        completed: false,
        priority,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to update task");
        }
        return response.json();
      })
      .then(() => {
        setEditingId(null);
        setTitle("");
        setDescription("");
        setPriority("medium");
        fetchTasks();
      })
      .catch(() => {
        setError("Unable to update task.");
      });
  };
// DELETE Task
const deleteTask = (id) => {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this task?"
  );

  if (!confirmDelete) {
    return;
  }

  fetch(`http://localhost:3000/tasks/${id}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to delete task");
      }
      return response.json();
    })
    .then(() => {
      fetchTasks();
    })
    .catch(() => {
      setError("Unable to delete task.");
    });
};
  // Cancel Editing
  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setPriority("medium");
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <section>
      <h1>My Tasks</h1>

      {/* Task Form */}
      <form
        onSubmit={editingId ? updateTask : addTask}
        style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "20px",
          marginBottom: "25px",
          background: "#f8f9fa",
        }}
      >
        <h2>{editingId ? "Update Task" : "Add New Task"}</h2>

        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
          }}
        />

        <textarea
          placeholder="Task description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
          }}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <br />

        <button
          type="submit"
          style={{
            padding: "10px 20px",
            cursor: "pointer",
            marginRight: "10px",
          }}
        >
          {editingId ? "Update Task" : "Add Task"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </form>

      {/* Task List */}
      {tasks.length === 0 ? (
        <p>No tasks available.</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task._id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "15px",
              background: "#f8f9fa",
            }}
          >
            <h3>{task.title}</h3>

            <p>
              {task.description
                ? task.description
                : "No description available."}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {task.completed ? "Completed" : "Pending"}
            </p>

            <p>
              <strong>Priority:</strong> {task.priority}
            </p>

            <p>
              <strong>Created:</strong>{" "}
              {new Date(task.createdAt).toLocaleString()}
            </p>

            <button
              onClick={() => startEdit(task)}
              style={{
                padding: "8px 15px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
  onClick={() => deleteTask(task._id)}
  style={{
    padding: "8px 15px",
    cursor: "pointer",
    marginLeft: "10px",
  }}
>
  Delete
</button>
          </div>
        ))
      )}
    </section>
  );
}

export default Projects;