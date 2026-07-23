import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import PostList from "./components/PostList";
import PostEditor from "./components/PostEditor";

type Page = "list" | "edit" | "new";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("gh_token") || "");
  const [page, setPage] = useState<Page>("list");
  const [editPath, setEditPath] = useState("");

  useEffect(() => {
    if (token) localStorage.setItem("gh_token", token);
    else localStorage.removeItem("gh_token");
  }, [token]);

  const handleLogout = () => {
    setToken("");
    setPage("list");
  };

  if (!token) return <LoginForm onLogin={setToken} />;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>📝 博客后台</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {page !== "list" && (
            <button onClick={() => setPage("list")} style={btnStyle}>← 返回列表</button>
          )}
          <button onClick={handleLogout} style={{ ...btnStyle, background: "#6b7280" }}>退出</button>
        </div>
      </header>

      <main>
        {page === "list" && (
          <PostList
            token={token}
            onEdit={(path) => { setEditPath(path); setPage("edit"); }}
            onNew={() => setPage("new")}
          />
        )}
        {(page === "edit" || page === "new") && (
          <PostEditor
            token={token}
            editPath={page === "edit" ? editPath : undefined}
            onDone={() => setPage("list")}
          />
        )}
      </main>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "0.4rem 1rem",
  borderRadius: 6,
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  fontSize: "0.875rem",
  cursor: "pointer",
};
