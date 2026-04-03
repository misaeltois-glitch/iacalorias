// ── Tracking: Meta Pixel + Google Analytics 4 + UTM capture ──────────────────

const UTM_KEY = 'ia-calorias-utms';
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UTMParams = Partial<Record<typeof UTM_PARAMS[number], string>>;

// ── UTM capture ───────────────────────────────────────────────────────────────

/** Reads UTMs from the current URL and saves them (first-touch attribution). */
export function captureUTMs(): void {
  const params = new URLSearchParams(window.location.search);
  const found: UTMParams = {};
  for (const key of UTM_PARAMS) {
    const val = params.get(key);
    if (val) found[key] = val;
  }
  if (Object.keys(found).length > 0) {
    localStorage.setItem(UTM_KEY, JSON.stringify(found));
  }
}

/** Returns stored UTM params (first-touch). */
export function getStoredUTMs(): UTMParams {
  try {
    return JSON.parse(localStorage.getItem(UTM_KEY) ?? '{}');
  } catch {
    return {};
  }
}

// ── Script injection ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function injectScript(src: string, id: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

/** Initialise Meta Pixel if VITE_META_PIXEL_ID is set. */
export function initMetaPixel(): void {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!pixelId) return;

  // Pixel base code (inline)
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      (fbq as any).callMethod
        ? (fbq as any).callMethod(...args)
        : (fbq as any).queue.push(args);
    } as any;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [] as unknown[];
    window.fbq = fbq;
  }

  injectScript(`https://connect.facebook.net/en_US/fbevents.js`, 'meta-pixel-script');
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

/** Initialise Google Analytics 4 if VITE_GA_MEASUREMENT_ID is set. */
export function initGA4(): void {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (!gaId) return;

  injectScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`, 'ga4-script');
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function (...args: unknown[]) { window.dataLayer!.push(args); };
  window.gtag('js', new Date());
  window.gtag('config', gaId);
}

// ── Event tracking ────────────────────────────────────────────────────────────

type EventName =
  | 'InitiateCheckout'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Lead'
  | 'ViewContent';

interface EventParams {
  value?: number;
  currency?: string;
  content_name?: string;
  [key: string]: unknown;
}

/** Fire a conversion event to all active tracking platforms. */
export function trackEvent(name: EventName, params: EventParams = {}): void {
  const p = { currency: 'BRL', ...params };
  try { window.fbq?.('track', name, p); } catch {}
  try {
    if (name === 'Purchase') {
      window.gtag?.('event', 'purchase', { transaction_id: Date.now().toString(), value: p.value, currency: p.currency });
    } else if (name === 'InitiateCheckout') {
      window.gtag?.('event', 'begin_checkout', { value: p.value, currency: p.currency });
    } else if (name === 'CompleteRegistration') {
      window.gtag?.('event', 'sign_up');
    } else if (name === 'Lead') {
      window.gtag?.('event', 'generate_lead');
    }
  } catch {}
}

/** Call once on app boot. */
export function initTracking(): void {
  captureUTMs();
  initMetaPixel();
  initGA4();
}
