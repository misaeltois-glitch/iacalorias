export async function generateDeviceFingerprint(): Promise<string> {
  const signals: string[] = [];

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('ia-calorias', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('ia-calorias', 4, 17);
      signals.push(canvas.toDataURL());
    }
  } catch {
    signals.push('canvas-blocked');
  }

  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        signals.push(String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)));
        signals.push(String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)));
      } else {
        signals.push('webgl-no-ext');
      }
    }
  } catch {
    signals.push('webgl-blocked');
  }

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ac = new AudioCtx();
      signals.push(String(ac.sampleRate));
      ac.close();
    }
  } catch {
    signals.push('audio-unavailable');
  }

  signals.push(`${screen.width}x${screen.height}`);
  signals.push(String(window.devicePixelRatio ?? 1));
  signals.push(String(screen.colorDepth ?? 24));
  signals.push(String((navigator as any).hardwareConcurrency ?? 'unknown'));
  signals.push(String((navigator as any).deviceMemory ?? 'unknown'));
  signals.push(String(navigator.maxTouchPoints ?? 0));
  signals.push(navigator.platform ?? 'unknown');
  signals.push(navigator.language ?? 'unknown');
  try {
    signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    signals.push('tz-unknown');
  }

  const raw = signals.join('|||');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
