import { useState } from "react";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/login" : "/register";

    const payload =
      mode === "login"
        ? { email, password }
        : { name, email, password };

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.errors?.[0]?.msg ||
            "Authentication failed."
        );
      }

      if (mode === "login") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        setMessage("Registration successful! Please log in.");
        setMode("login");
        setPassword("");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      style={{
        maxWidth: "430px",
        margin: "40px auto",
        padding: "28px",
        border: "1px solid #ddd",
        borderRadius: "14px",
        background: "#fff",
        boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ textAlign: "center" }}>
        {mode === "login" ? "Welcome Back" : "Create Account"}
      </h2>

      <p style={{ textAlign: "center", color: "#666" }}>
        {mode === "login"
          ? "Log in to manage your tasks."
          : "Register to get started."}
      </p>

      {message && (
        <p style={{ color: "green" }}>{message}</p>
      )}

      {error && (
        <p style={{ color: "red" }}>{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              marginBottom: "12px",
            }}
          />
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "12px",
          }}
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={mode === "register" ? 8 : 1}
          required
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            marginBottom: "16px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Register"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "20px" }}>
        {mode === "login"
          ? "Don't have an account?"
          : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMessage("");
            setError("");
          }}
          style={{
            border: "none",
            background: "none",
            color: "#2563eb",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "Register" : "Login"}
        </button>
      </p>
    </section>
  );
}

export default Auth;