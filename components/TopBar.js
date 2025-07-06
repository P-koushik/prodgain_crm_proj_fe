"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";

const PAGES = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Contacts", path: "/contacts" },
  { name: "Tags", path: "/tags" },
  { name: "Activities", path: "/activities" },
  { name: "Chat", path: "/chat" },
  { name: "Profile", path: "/profile" },
];

const TopBar = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ pages: [], data: {} });
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const inputRef = useRef();

  useEffect(() => {
    const handler = setTimeout(() => {
      async function fetchResults() {
        const currentUser = auth.currentUser;
        const token = await getIdToken(currentUser);
        if (query.trim() === "") {
          setResults({ pages: [], data: {} });
          setShowDropdown(false);
          return;
        }

        // Search pages
        const filteredPages = PAGES.filter((page) =>
          page.name.toLowerCase().includes(query.toLowerCase())
        );

        // Search data via API
        try {
          const res = await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL
            }/api/search?q=${encodeURIComponent(query)}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const data = await res.json();
          setResults({ pages: filteredPages, data });
          setShowDropdown(true);
        } catch (error) {
          setResults({ pages: filteredPages, data: {} });
          setShowDropdown(true);
        }
      }
      fetchResults();
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  // Hide dropdown on click outside
  useEffect(() => {
    function handleClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative" ref={inputRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search contacts, activities..."
              className="pl-10 bg-slate-50 border-slate-200 focus:bg-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setShowDropdown(true)}
            />
            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "110%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 4,
                  zIndex: 100,
                  maxHeight: 300,
                  overflowY: "auto",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {/* Pages */}
                {results.pages.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontWeight: "bold",
                        padding: "4px 8px",
                      }}
                    >
                      Pages
                    </div>
                    {results.pages.map((page) => (
                      <div
                        key={page.path}
                        style={{
                          padding: "6px 12px",
                          cursor: "pointer",
                        }}
                        onClick={() => router.push(page.path)}
                      >
                        {page.name}
                      </div>
                    ))}
                    <hr />
                  </div>
                )}
                {/* Data */}
                {Object.entries(results.data).map(([type, items]) =>
                  items.length > 0 ? (
                    <div key={type}>
                      <div
                        style={{
                          fontWeight: "bold",
                          padding: "4px 8px",
                        }}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </div>
                      {items.map((item) => (
                        <div
                          key={item.id || item._id}
                          style={{
                            padding: "6px 12px",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            // Example: navigate to contact/tag/activity detail page
                            if (type === "contacts")
                              router.push(`/contacts/${item.id || item._id}`);
                            else if (type === "tags") router.push(`/tags`);
                            else if (type === "activities")
                              router.push(`/activities`);
                          }}
                        >
                          {item.name || item.title || item.email}
                        </div>
                      ))}
                      <hr />
                    </div>
                  ) : null
                )}
                {/* No results */}
                {results.pages.length === 0 &&
                  Object.values(results.data).every(
                    (arr) => arr.length === 0
                  ) && (
                    <div style={{ padding: "8px", color: "#888" }}>
                      No results found.
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
