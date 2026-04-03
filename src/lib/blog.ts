import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  seoTitle: string;
  date: string;
  excerpt: string;
  seoDescription: string;
  seoKeywords: string[];
  coverImage: string;
  tags: string[];
}

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export function getAllSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

function extractMetadata(slug: string): Omit<BlogPost, "slug"> {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  const content = fs.readFileSync(filePath, "utf-8");

  const metaMatch = content.match(
    /export\s+const\s+metadata\s*=\s*(\{[\s\S]*?\n\})/
  );
  if (!metaMatch) {
    return {
      title: slug, seoTitle: "", date: "", excerpt: "",
      seoDescription: "", seoKeywords: [], coverImage: "", tags: [],
    };
  }

  try {
    const meta = new Function(`return ${metaMatch[1]}`)();
    return {
      title: meta.title ?? slug,
      seoTitle: meta.seoTitle ?? meta.title ?? slug,
      date: meta.date ?? "",
      excerpt: meta.excerpt ?? "",
      seoDescription: meta.seoDescription ?? meta.excerpt ?? "",
      seoKeywords: meta.seoKeywords ?? [],
      coverImage: meta.coverImage ?? "",
      tags: meta.tags ?? [],
    };
  } catch {
    return {
      title: slug, seoTitle: "", date: "", excerpt: "",
      seoDescription: "", seoKeywords: [], coverImage: "", tags: [],
    };
  }
}

export function getPostBySlug(slug: string): BlogPost {
  return { slug, ...extractMetadata(slug) };
}

export function getAllPosts(): BlogPost[] {
  const slugs = getAllSlugs();
  const posts = slugs.map(getPostBySlug);
  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}
