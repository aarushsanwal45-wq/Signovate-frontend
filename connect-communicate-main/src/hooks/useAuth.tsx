import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout, getStatus } from "@/lib/api";

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface User {
  id: string;
  name: string;
  email: string;
}

// ── localStorage Keys ──────────────────────────────────────────
const STORAGE_KEY_USER = "signovate_user";

function saveUserToStorage(user: User): void {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

function loadUserFromStorage(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.name && parsed.email) {
      return parsed as User;
    }
    return null;
  } catch {
    return null;
  }
}

function clearUserFromStorage(): void {
  localStorage.removeItem(STORAGE_KEY_USER);
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: "admin" | "user";
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage immediately (no flicker)
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"admin" | "user">("user");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // If we have a stored user + token, verify with the server
      const storedUser = loadUserFromStorage();
      const token = localStorage.getItem('signovate_auth_token');

      if (storedUser && token) {
        // Validate session is still alive on server
        const data = await getStatus();
        if (data.authenticated && data.user) {
          // Server confirmed — update name/email in case they changed
          const verified: User = {
            id: storedUser.id,
            name: data.user,
            email: data.user_email || storedUser.email,
          };
          setUser(verified);
          saveUserToStorage(verified);
        } else {
          // Token expired or invalid — keep local user data
          // (they'll just need to re-login on next API call)
          // For now, still show the stored user
          setUser(storedUser);
        }
      } else {
        // No stored session
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // If server is down, still use cached user
      const storedUser = loadUserFromStorage();
      if (storedUser) {
        setUser(storedUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    if (data.success && data.user) {
      const newUser: User = {
        id: data.user.id?.toString() || generateUUID(),
        name: data.user.name,
        email: data.user.email,
      };
      setUser(newUser);
      saveUserToStorage(newUser);
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiRegister(name, email, password);
    if (data.success && data.user) {
      const newUser: User = {
        id: data.user.id?.toString() || generateUUID(),
        name: data.user.name,
        email: data.user.email,
      };
      setUser(newUser);
      saveUserToStorage(newUser);
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Always clear user state even if API call fails
      setUser(null);
      clearUserFromStorage();
    }
  };

  const signOut = logout; // Alias for consistency with component usage

  return (
    <AuthContext.Provider value={{ user, loading, role, login, register, logout, signOut, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
