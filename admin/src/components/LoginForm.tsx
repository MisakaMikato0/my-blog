import { useState } from "react";

interface Props {
  onLogin: (token: string) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onLogin(input.trim());
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f3f4f6" }}>
      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "2rem", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", width: 400 }}>
        <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>博客后台管理</h2>
        <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
          请输入 GitHub Personal Access Token（需 contents + workflow 写入权限）
        </p>
        <input
          type="password"
          placeholder="github_pat_..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "100%", padding: "0.6rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem", marginBottom: "1rem" }}
        />
        <button type="submit" disabled={!input.trim()} style={{
          width: "100%", padding: "0.6rem", borderRadius: 6, border: "none",
          background: input.trim() ? "#3b82f6" : "#9ca3af", color: "#fff",
          fontSize: "0.875rem", cursor: input.trim() ? "pointer" : "not-allowed",
        }}>
          登录
        </button>
      </form>
    </div>
  );
}
