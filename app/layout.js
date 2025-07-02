import "./global.css"
import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Provider from "./provider";
import { Toaster } from "sonner";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
          <AuthProvider>
            <Provider>
              <Toaster richColors position="top-right" />
              {children}
            </Provider>
          </AuthProvider>
      </body>
    </html>
  );
}
