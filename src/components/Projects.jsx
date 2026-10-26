import { useCallback, useEffect, useState } from "react";
import Loading from "./Loading";
import ErrorMessage from "./ErrorMessage";

const API_URL = "http://localhost:3000";

function Projects() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");

  const authorizedFetch = useCallback(
    async (url, options = {}) => {
      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Request failed.");
      }

      return data;
    },
    [token]
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await authorizedFetch("/tasks");
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setEditingId(null);
  };

  const addTask = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await authorizedFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          completed: false,
          priority,
        }),
      });

      resetForm();
      await fetchTasks();
    } catch (err) {
      setError(err.message || "Unable to add task.");
    }
  };

  const startEdit = (task) => {
    setEditingId(task._id);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "medium");
  };

  const updateTask = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await authorizedFetch(`/tasks/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          completed: false,
          priority,
        }),
      });

      resetForm();
      await fetchTasks();
    } catch (err) {
      setError(err.message || "Unable to update task.");
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setError("");

    try {
      await authorizedFetch(`/tasks/${id}`, {
        method: "DELETE",
      });

      await fetchTasks();
    } catch (err) {
      setError(err.message || "Unable to delete task.");
    }
  };

  const cancelEdit = () => {
    resetForm();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <section style={{ maxWidth: "850px", margin: "30px auto", padding: "20px" }}>
      <h1>My Tasks</h1>

      {error && <ErrorMessage message={error} />}

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
            boxSizing: "border-box",
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
            boxSizing: "border-box",
            padding: "10px",
            marginBottom: "10px",
          }}
        />

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ padding: "10px", marginBottom: "10px" }}
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
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            Cancel
          </button>
        )}
      </form>

      <h2>Your Task List</h2>

      {tasks.length === 0 ? (
        <p>No tasks available. Add your first task above.</p>
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

            <p>{task.description || "No description available."}</p>

            <p>
              <strong>Status:</strong>{" "}
              {task.completed ? "Completed" : "Pending"}
            </p>

            <p>
              <strong>Priority:</strong> {task.priority}
            </p>

            <p>
              <strong>Created:</strong>{" "}
              {task.createdAt
                ? new Date(task.createdAt).toLocaleString()
                : "Not available"}
            </p>

            <button
              type="button"
              onClick={() => startEdit(task)}
              style={{ padding: "8px 15px", cursor: "pointer" }}
            >
              Edit
            </button>

            <button
              type="button"
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
