import { escapeHtml } from "./admin-ui.js";
import type { BlogPost } from "./blog-content.js";

export const SITE_URL = "https://www.iacalorias.com.br";
const GRADIENT = "linear-gradient(135deg, #0D9F6E 0%, #059669 50%, #3B82F6 100%)";
const FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">`;

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

export const BLOG_BASE_CSS = `
  :root {
    --bg: #FAFBFC; --bg-2: #ffffff; --bg-3: #f0f2f4;
    --text-1: #111827; --text-2: #6B7280; --text-3: #9CA3AF;
    --accent: #0D9F6E; --accent-2: #057A55; --border: rgba(0,0,0,0.08);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0a0a0a; --bg-2: #111111; --bg-3: #1a1a1a;
      --text-1: #f5f5f7; --text-2: #86868b; --text-3: #6b6b70;
      --accent: #22c55e; --accent-2: #4ade80; --border: rgba(255,255,255,0.1);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text-1);
    font-family: 'Plus Jakarta Sans', -apple-system, system-ui, sans-serif;
    line-height: 1.6;
  }
  a { color: var(--accent); }
  .mono { font-family: 'DM Mono', monospace; }
  .container { max-width: 760px; margin: 0 auto; padding: 0 20px; }
  header.site-header {
    display: flex; align-items: center; gap: 10px; padding: 20px 0;
    border-bottom: 1px solid var(--border); margin-bottom: 32px;
  }
  header.site-header img { width: 28px; height: 28px; }
  header.site-header a.wordmark { font-weight: 800; font-size: 18px; color: var(--text-1); text-decoration: none; }
  main { padding-bottom: 60px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; margin-top: 24px; }
  .card {
    display: block; text-decoration: none; color: inherit; border: 1px solid var(--border);
    border-radius: 14px; overflow: hidden; background: var(--bg-2); transition: transform .15s;
  }
  .card:hover { transform: translateY(-2px); }
  .card .cover { height: 150px; background: ${GRADIENT}; }
  .card .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card .body { padding: 16px; }
  .card h3 { margin: 0 0 8px; font-size: 17px; }
  .card p { margin: 0 0 10px; font-size: 14px; color: var(--text-2); }
  .card .meta { font-size: 12px; color: var(--text-3); }
  article h1 { font-size: 30px; font-weight: 800; margin-bottom: 8px; }
  article .meta { font-size: 13px; color: var(--text-3); margin-bottom: 28px; }
  article h2 { font-size: 22px; font-weight: 700; margin-top: 36px; }
  article p { font-size: 16px; color: var(--text-1); }
  article ul, article ol { font-size: 16px; }
  article a { text-decoration: underline; }
  .cta-box {
    background: var(--bg-3); border: 1px solid var(--border); border-radius: 16px;
    padding: 24px; text-align: center; margin: 32px 0;
  }
  .cta-box p { margin: 0 0 14px; font-size: 16px; font-weight: 600; }
  .cta-box .btn {
    display: inline-block; background: ${GRADIENT}; color: #fff; font-weight: 700;
    padding: 12px 24px; border-radius: 10px; text-decoration: none; font-size: 15px;
  }
  footer.site-footer {
    border-top: 1px solid var(--border); padding: 24px 0; margin-top: 40px;
    font-size: 13px; color: var(--text-3); display: flex; gap: 16px; flex-wrap: wrap;
  }
  footer.site-footer a { color: var(--text-3); }
  .related { margin-top: 48px; }
  .related h2 { font-size: 18px; }
`;

function siteHeader(): string {
  return `<header class="site-header container">
    <img src="/favicon.svg" alt="" />
    <a class="wordmark" href="/">IA Calorias</a>
  </header>`;
}

function siteFooter(): string {
  return `<footer class="site-footer container">
    <span>© ${new Date().getFullYear()} IA Calorias</span>
    <a href="/termos">Termos</a>
    <a href="/privacidade">Privacidade</a>
  </footer>`;
}

export function pageShell(opts: {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: string;
  bodyHtml: string;
}): string {
  const canonicalUrl = `${SITE_URL}${opts.canonicalPath}`;
  const ogImage = opts.ogImage ? `${SITE_URL}${opts.ogImage}` : `${SITE_URL}/opengraph.jpg`;
  const ogType = opts.ogType ?? "website";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(opts.description)}" />
<link rel="canonical" href="${canonicalUrl}" />

<meta property="og:type" content="${ogType}" />
<meta property="og:site_name" content="IA Calorias" />
<meta property="og:url" content="${canonicalUrl}" />
<meta property="og:title" content="${escapeHtml(opts.title)}" />
<meta property="og:description" content="${escapeHtml(opts.description)}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:locale" content="pt_BR" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(opts.title)}" />
<meta name="twitter:description" content="${escapeHtml(opts.description)}" />
<meta name="twitter:image" content="${ogImage}" />

<link rel="icon" type="image/png" href="/icon-512.png" />
${FONTS_LINK}
<style>${BLOG_BASE_CSS}</style>
${opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : ""}
</head>
<body>
  ${siteHeader()}
  <main class="container">
    ${opts.bodyHtml}
  </main>
  ${siteFooter()}
</body>
</html>`;
}

export function articleJsonLd(post: BlogPost): string {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date.toISOString().slice(0, 10),
    author: { "@type": "Organization", name: "Equipe IA Calorias" },
    publisher: { "@type": "Organization", name: "IA Calorias" },
  };
  if (post.coverImage) data.image = `${SITE_URL}${post.coverImage}`;
  return JSON.stringify(data);
}

export function renderBlogCard(post: BlogPost): string {
  const cover = post.coverImage
    ? `<div class="cover"><img src="${escapeHtml(post.coverImage)}" alt="" /></div>`
    : `<div class="cover"></div>`;
  return `<a class="card" href="/blog/${escapeHtml(post.slug)}">
    ${cover}
    <div class="body">
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.description)}</p>
      <div class="meta mono">${formatDate(post.date)} · ${post.readingTimeMinutes} min de leitura</div>
    </div>
  </a>`;
}

export function renderCtaTrial(): string {
  return `<div class="cta-box">
    <p>Experimente o iacalorias grátis por 7 dias</p>
    <a class="btn" href="/login?tab=register">Começar agora →</a>
  </div>`;
}

export function injectCtaIntoArticleHtml(articleHtml: string, ctaHtml: string): string {
  const chunks = articleHtml.split(/(?=<h2)/);
  let withMidCta = articleHtml;
  if (chunks.length >= 3) {
    withMidCta = [chunks[0], chunks[1], ctaHtml, ...chunks.slice(2)].join("");
  }
  return `${withMidCta}${ctaHtml}`;
}

export function notFoundPage(): string {
  return `<div style="padding: 60px 0; text-align: center;">
    <h1>Post não encontrado</h1>
    <p><a href="/blog">Voltar para o blog</a></p>
  </div>`;
}

export function emptyBlogState(): string {
  return `<div style="padding: 60px 0; text-align: center; color: var(--text-2);">
    <p>Nenhum post publicado ainda. Volte em breve!</p>
  </div>`;
}
