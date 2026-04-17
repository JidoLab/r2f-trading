const GITHUB_API = "https://api.github.com";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
}

function getRepo() {
  return process.env.GITHUB_REPO || "JidoLab/r2f-trading";
}

export async function commitFile(
  path: string,
  content: string,
  message: string,
  binary = false,
  maxRetries = 4
): Promise<void> {
  const repo = getRepo();
  const headers = getHeaders();
  const encodedContent = binary ? content : Buffer.from(content).toString("base64");

  // Retry loop handles GitHub 409/422 SHA conflicts from concurrent writes
  // (e.g., when multiple cron jobs or manual triggers write to GitHub at the same time)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Fetch fresh SHA each attempt
    let sha: string | undefined;
    try {
      const existing = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${path}`,
        { headers }
      );
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }
    } catch {
      // File doesn't exist, that's fine
    }

    const body: Record<string, string> = { message, content: encodedContent };
    if (sha) body.sha = sha;

    const res = await fetch(
      `${GITHUB_API}/repos/${repo}/contents/${path}`,
      { method: "PUT", headers, body: JSON.stringify(body) }
    );

    if (res.ok) return;

    const errText = await res.text();
    const isRetryable = res.status === 409 || res.status === 422;
    if (isRetryable && attempt < maxRetries - 1) {
      const waitMs = 300 * Math.pow(2, attempt) + Math.floor(Math.random() * 300);
      console.log(`[github] ${path}: ${res.status} conflict, retry ${attempt + 1}/${maxRetries} in ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    throw new Error(`GitHub commit failed: ${res.status} ${errText}`);
  }
}

export async function deleteFile(
  path: string,
  message: string
): Promise<void> {
  const repo = getRepo();
  const headers = getHeaders();

  // Get SHA
  const existing = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}`,
    { headers }
  );
  if (!existing.ok) return; // File doesn't exist

  const data = await existing.json();

  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}`,
    {
      method: "DELETE",
      headers,
      body: JSON.stringify({ message, sha: data.sha }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub delete failed: ${res.status} ${err}`);
  }
}

export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
  const repo = getRepo();
  const headers = getHeaders();

  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${dirPath}`,
    { headers }
  );
  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const ext = extension || "";
  return data
    .filter((f: { name: string }) => ext ? f.name.endsWith(ext) : true)
    .map((f: { path: string }) => f.path);
}

export async function readFile(path: string): Promise<string> {
  const repo = getRepo();
  const headers = getHeaders();

  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}`,
    { headers }
  );
  if (!res.ok) throw new Error(`File not found: ${path}`);

  const data = await res.json();
  return Buffer.from(data.content, "base64").toString("utf-8");
}
