import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loadingUser, setLoadingUser] = useState(true);

useEffect(() => {
  const init = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoadingUser(false); return; }
    if (!user) {
      try {
        const data = await apiFetch("/api/users/profile", { method: "GET" });
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } catch (err) {
        console.warn("Profile fetch failed:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoadingUser(false);
  };
  init();
}, [user]);


  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData || null);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loadingUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
