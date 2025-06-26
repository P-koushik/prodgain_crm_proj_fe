import "./global.css"
import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Provider from "./provider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
          <AuthProvider>
            <Provider>
              {children}
            </Provider>
          </AuthProvider>
      </body>
    </html>
  );
}
