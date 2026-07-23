const GITHUB_REPO = "MisakaMikato0/my-blog";
const GITHUB_BRANCH = "master";

export interface GithubFile {
  path: string;
  sha: string;
  content: string;
}

export interface RepoContent {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  size: number;
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
}

export async function listPosts(token: string): Promise<RepoContent[]> {
  // List all markdown files recursively
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.tree.filter(
    (item: any) =>
      item.type === "blob" &&
      item.path.startsWith("src/content/posts/") &&
      item.path.endsWith(".md")
  );
}

export async function getFile(token: string, path: string): Promise<GithubFile> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: headers(token) }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return {
    path: data.path,
    sha: data.sha,
    content: atob(data.content.replace(/\n/g, "")),
  };
}

export async function saveFile(
  token: string,
  path: string,
  content: string,
  sha?: string
): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `admin: update ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: GITHUB_BRANCH,
        sha,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `API error: ${res.status}`);
  }
}

export async function deleteFile(token: string, path: string, sha: string): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: "DELETE",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `admin: delete ${path}`,
        branch: GITHUB_BRANCH,
        sha,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `API error: ${res.status}`);
  }
}
