"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  signInWithPopup,
  getIdToken,
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import dotenv from "dotenv";  
dotenv.config();

// Use env var or fallback
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter()

  // Sync user state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        try {
          const token = await getIdToken(firebaseUser);
          setTokenCookie(token);
          await syncUserToBackend(firebaseUser, token);
        } catch (error) {
          console.error("Error syncing user onAuthStateChanged:", error.message);
        }
      } else {
        removeTokenCookie();
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync user to backend
  const syncUserToBackend = async (firebaseUser, token) => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Optional: Send token if backend verifies it
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
        }),
      });
    } catch (err) {
      console.error("Backend sync failed:", err.message);
    }
  };

  const setTokenCookie = (token) => {
    Cookies.set("token", token, { path: "/dashboard", sameSite: "strict" });
  };

  const removeTokenCookie = () => {
    Cookies.remove("token", { path: "/" });
  };

  // Register
  const register = async (email, password, name) => {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCred.user, { name });
    const token = await getIdToken(userCred.user);
    setTokenCookie(token);
    await syncUserToBackend(userCred.user, token);
  };

  // Email/password login
  const login = async (email, password) => {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const token = await getIdToken(userCred.user);
    setTokenCookie(token);
    await syncUserToBackend(userCred.user, token);
  };

  // Google login
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log(user)
    if (user.email) {
      router.push("/dashboard")
    }
    const token = await getIdToken(user);
    setTokenCookie(token);
    await syncUserToBackend(user, token);
  };

  const logout = async () => {
    try {
      await signOut(auth);
      removeTokenCookie();
      router.push("/auth/login"); // or wherever your login page is
    } catch (error) {
      alert("Logout failed: " + error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};