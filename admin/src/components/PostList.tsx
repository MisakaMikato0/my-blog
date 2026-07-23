import { useState, useEffect } from "react";
import { listPosts, type RepoContent } from "../api/github";
import { parseFrontmatter } from "../utils/frontmatter";

interface Props {
  token: string;
  onEdit: (path: string) => void;
  onNew: () => void;
}

export default function PostList({ token, onEdit, onNew }: Props) {
  const [files, setFiles] = useState<RepoContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [filter, setFilter] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setFiles(await listPosts(token));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const handleDelete = async (path: string) => {
    if (!confirm(`确认删除 ${path}？`)) return;
    // Need sha to delete; we fetch the file first
    try {
      const mod = await import("../api/github");
      const file = await mod.getFile(token, path);
      await mod.deleteFile(token, path, file.sha);
      load();
    } catch (e: any) {
      alert("删除失败: " + e.message);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      // Trigger a workflow dispatch
      const res = await fetch(
        `https://api.github.com/repos/MisakaMikato0/my-blog/actions/workflows/deploy.yml/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: "master" }),
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      alert("部署已触发，约 1-2 分钟完成");
    } catch (e: any) {
      alert("触发部署失败: " + e.message);
    } finally {
      setDeploying(false);
    }
  };

  // Group by category
  const grouped: Record<string, RepoContent[]> = {};
  const filtered = filter
    ? files.filter((f) => f.path.includes(filter))
    : files;

  for (const f of filtered) {
    const parts = f.path.replace("src/content/posts/", "").split("/");
    const group = parts.length > 1 ? parts[0] : "未分类";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(f);
  }

  const categoryStyle = (name: string): React.CSSProperties => ({
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#fff",
    background: name === "ai" ? "#7c3aed" : name === "projects" ? "#0891b2" : "#6b7280",
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>文章列表（{files.length}）</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            placeholder="搜索..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem", width: 180 }}
          />
          <button onClick={onNew} style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "none", background: "#22c55e", color: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
            + 新建
          </button>
          <button onClick={handleDeploy} disabled={deploying} style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
            {deploying ? "部署中..." : "部署"}
          </button>
          <button onClick={load} style={{ padding: "0.4rem 0.8rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
            ↻
          </button>
        </div>
      </div>

      {loading && <p style={{ color: "#6b7280" }}>加载中...</p>}
      {error && <p style={{ color: "#ef4444" }}>错误: {error}</p>}

      {!loading && !error && Object.entries(grouped).map(([category, cats]) => (
        <div key={category} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span style={categoryStyle(category)}>{category}</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {cats.map((file) => {
              // Read frontmatter from content (we only have path, so just show path)
              const name = file.path.split("/").pop()?.replace(".md", "") || "";
              return (
                <div key={file.path} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "#f9fafb", borderRadius: 6, fontSize: "0.875rem" }}>
                  <span>{name}</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => onEdit(file.path)} style={{ padding: "0.25rem 0.6rem", borderRadius: 4, border: "1px solid #d1d5db", background: "#fff", fontSize: "0.75rem", cursor: "pointer" }}>编辑</button>
                    <button onClick={() => handleDelete(file.path)} style={{ padding: "0.25rem 0.6rem", borderRadius: 4, border: "1px solid #fca5a5", background: "#fff", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer" }}>删除</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
