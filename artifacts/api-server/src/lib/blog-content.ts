import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { marked } from "marked";
import { logger } from "./logger.js";

// Bundled by esbuild into a single dist/index.mjs, so __dirname here always
// resolves to artifacts/api-server/dist regardless of this file's src location.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "..", "content", "blog");

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: Date;
  pillar: string;
  coverImage?: string;
  html: string;
  readingTimeMinutes: number;
}

function parsePost(filename: string): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, filename);
  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";
  const pillar = typeof data.pillar === "string" ? data.pillar.trim() : "";
  const dateStr = typeof data.date === "string" ? data.date : String(data.date ?? "");
  const date = new Date(dateStr);
  const coverImage = typeof data.coverImage === "string" && data.coverImage.trim() ? data.coverImage.trim() : undefined;

  if (!title || !description || !slug || !pillar || Number.isNaN(date.getTime())) {
    throw new Error(`Missing/invalid required frontmatter (title/description/slug/pillar/date) in ${filename}`);
  }

  const html = marked.parse(content) as string;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

  return { slug, title, description, date, pillar, coverImage, html, readingTimeMinutes };
}

let cache: BlogPost[] | null = null;

export function getAllPosts(): BlogPost[] {
  if (cache && process.env.NODE_ENV === "production") return cache;

  if (!existsSync(CONTENT_DIR)) {
    cache = [];
    return cache;
  }

  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".md"));
  const posts: BlogPost[] = [];
  for (const file of files) {
    try {
      const post = parsePost(file);
      if (post) posts.push(post);
    } catch (err) {
      logger.warn({ file, err }, "Skipping invalid blog post");
    }
  }

  posts.sort((a, b) => b.date.getTime() - a.date.getTime());
  cache = posts;
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return getAllPosts()
    .filter((p) => p.slug !== post.slug && p.pillar === post.pillar)
    .slice(0, limit);
}
