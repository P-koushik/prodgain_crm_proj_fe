"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/authmiddleware";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col h-full">
            <TopBar />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
