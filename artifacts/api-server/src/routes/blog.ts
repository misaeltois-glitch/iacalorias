import { Router, type IRouter, type Request, type Response } from "express";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "../lib/blog-content.js";
import { escapeHtml } from "../lib/admin-ui.js";
import {
  SITE_URL,
  pageShell,
  renderBlogCard,
  renderCtaTrial,
  injectCtaIntoArticleHtml,
  articleJsonLd,
  notFoundPage,
  emptyBlogState,
  formatDate,
} from "../lib/blog-ui.js";

const router: IRouter = Router();

// ─── GET /blog ─────────────────────────────────────────────────────────────
router.get("/blog", (_req: Request, res: Response) => {
  const posts = getAllPosts();
  const body = posts.length === 0
    ? emptyBlogState()
    : `<h1>Blog</h1>
       <p>Conteúdo sobre nutrição, contagem de calorias e treino.</p>
       <div class="grid">${posts.map(renderBlogCard).join("")}</div>`;

  const html = pageShell({
    title: "Blog — IA Calorias",
    description: "Artigos sobre emagrecimento, contagem de calorias e treino personalizado com IA.",
    canonicalPath: "/blog",
    ogType: "website",
    bodyHtml: body,
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ─── GET /blog/:slug ────────────────────────────────────────────────────────
router.get("/blog/:slug", (req: Request, res: Response) => {
  const post = getPostBySlug(req.params.slug);
  if (!post) {
    const html = pageShell({
      title: "Post não encontrado — IA Calorias",
      description: "O post que você procura não existe ou foi removido.",
      canonicalPath: `/blog/${req.params.slug}`,
      bodyHtml: notFoundPage(),
    });
    res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
    return;
  }

  const articleHtml = injectCtaIntoArticleHtml(post.html, renderCtaTrial());
  const related = getRelatedPosts(post);
  const relatedHtml = related.length
    ? `<div class="related"><h2>Leia também</h2><div class="grid">${related.map(renderBlogCard).join("")}</div></div>`
    : "";

  const body = `<article>
    <h1>${escapeHtml(post.title)}</h1>
    <div class="meta mono">${formatDate(post.date)} · ${post.readingTimeMinutes} min de leitura</div>
    ${articleHtml}
  </article>
  ${relatedHtml}`;

  const html = pageShell({
    title: `${post.title} — IA Calorias`,
    description: post.description,
    canonicalPath: `/blog/${post.slug}`,
    ogImage: post.coverImage,
    ogType: "article",
    jsonLd: articleJsonLd(post),
    bodyHtml: body,
  });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ─── GET /sitemap.xml ───────────────────────────────────────────────────────
router.get("/sitemap.xml", (_req: Request, res: Response) => {
  const posts = getAllPosts();
  const urls = [
    `<url><loc>${SITE_URL}/blog</loc></url>`,
    ...posts.map(
      (p) => `<url><loc>${SITE_URL}/blog/${p.slug}</loc><lastmod>${p.date.toISOString().slice(0, 10)}</lastmod></url>`
    ),
  ].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  res.type("application/xml").send(xml);
});

// ─── GET /robots.txt ────────────────────────────────────────────────────────
router.get("/robots.txt", (_req: Request, res: Response) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

export default router;
