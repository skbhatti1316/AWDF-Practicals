import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./components/Home";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Auth from "./components/Auth";

function App() {
  const [showHelp, setShowHelp] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <>
      <NavBar />

      <main>
        <button onClick={() => setShowHelp(!showHelp)}>
          {showHelp ? "Hide Help" : "Show Help"}
        </button>

        {showHelp && (
          <p>Use the navigation links to view each page.</p>
        )}

        {user && (
          <div style={{ padding: "10px 0" }}>
            <span>Welcome, {user.name}! </span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/projects"
            element={
              user ? (
                <Projects />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/projects" replace />
              ) : (
                <Auth onLogin={handleLogin} />
              )
            }
          />

          <Route path="/contact" element={<Contact />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;