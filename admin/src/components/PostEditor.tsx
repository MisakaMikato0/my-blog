import { useState, useEffect } from "react";
import MDEditor from "@uiw/react-md-editor";
import { getFile, saveFile } from "../api/github";
import { parseFrontmatter, buildFrontmatter, type Frontmatter } from "../utils/frontmatter";

interface Props {
  token: string;
  editPath?: string;
  onDone: () => void;
}

export default function PostEditor({ token, editPath, onDone }: Props) {
  const isNew = !editPath;
  const [fm, setFm] = useState<Frontmatter>({
    title: "",
    published: new Date().toISOString().slice(0, 10),
    description: "",
    tags: [],
    category: "",
    draft: false,
  });
  const [content, setContent] = useState("");
  const [fullContent, setFullContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!editPath) return;
    (async () => {
      try {
        const file = await getFile(token, editPath);
        const { frontmatter, content: md } = parseFrontmatter(file.content);
        setFm(frontmatter);
        setContent(md);
        setFullContent(file.content);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [editPath]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const result = buildFrontmatter(fm) + content;
      const path = editPath || `src/content/posts/${fm.category ? fm.category + "/" : ""}${fm.title.replace(/[\s\/]+/g, "-")}.md`;

      // For edit, get sha first
      let sha: string | undefined;
      if (editPath) {
        try {
          const f = await getFile(token, editPath);
          sha = f.sha;
        } catch {}
      }

      await saveFile(token, path, result, sha);
      alert("保存成功！");
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !fm.tags.includes(t)) {
      setFm({ ...fm, tags: [...fm.tags, t] });
      setTagInput("");
    }
  };

  if (loading) return <p>加载中...</p>;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: "0.875rem",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>{isNew ? "新建文章" : "编辑文章"}</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={onDone} style={{ padding: "0.4rem 1rem", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "0.4rem 1.5rem", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontSize: "0.875rem", cursor: "pointer" }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#ef4444", marginBottom: "0.5rem", fontSize: "0.875rem" }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label style={labelStyle}>标题</label>
          <input style={inputStyle} value={fm.title} onChange={(e) => setFm({ ...fm, title: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>分类</label>
          <select style={inputStyle} value={fm.category} onChange={(e) => setFm({ ...fm, category: e.target.value })}>
            <option value="">未分类</option>
            <option value="ai">AI</option>
            <option value="projects">Project</option>
            <option value="others">Others</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>日期</label>
          <input style={inputStyle} type="date" value={fm.published} onChange={(e) => setFm({ ...fm, published: e.target.value })} />
        </div>
        <div>
          <label style={labelStyle}>草稿</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem" }}>
            <input type="checkbox" checked={fm.draft} onChange={(e) => setFm({ ...fm, draft: e.target.checked })} />
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>勾选后文章不会发布</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={labelStyle}>描述</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={fm.description} onChange={(e) => setFm({ ...fm, description: e.target.value })} />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={labelStyle}>标签</label>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}>
          <input style={{ ...inputStyle, flex: 1 }} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="输入标签后按 Enter" />
          <button onClick={addTag} style={{ padding: "0.4rem 0.8rem", borderRadius: 6, border: "none", background: "#e5e7eb", fontSize: "0.875rem", cursor: "pointer" }}>+</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
          {fm.tags.map((t, i) => (
            <span key={i} style={{ padding: "2px 8px", borderRadius: 12, background: "#dbeafe", color: "#1d4ed8", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              {t}
              <button onClick={() => setFm({ ...fm, tags: fm.tags.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontSize: "0.8rem", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label style={labelStyle}>正文（Markdown）</label>
        <div data-color-mode="light" style={{ borderRadius: 8, overflow: "hidden" }}>
          <MDEditor value={content} onChange={(v) => setContent(v || "")} height={600} visibleDragbar={false} />
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem",
};
