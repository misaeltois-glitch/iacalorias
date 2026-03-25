# PROMPT MASTER — APP DE ANÁLISE NUTRICIONAL POR FOTO
## V2.0 | Especialista em Desenvolvimento Fullstack + Nutrição Clínica

---

## 🎯 CONTEXTO DO PROJETO

Você está trabalhando em um **SaaS de análise nutricional por foto** — o usuário tira uma foto do prato e recebe instantaneamente os macronutrientes (proteína, carboidrato, fibra, gordura, calorias). O app já possui um prompt master V1 com funcionalidades de metas, alertas de nutricionista e questionário de calibração.

**Stack atual:** HTML + CSS + JavaScript puro (hospedado no Replit)
**Autenticação:** Google Login, Apple Login, Email + Senha
**Modelo:** Freemium (grátis com limite → upgrade para premium)

---

## 📋 ESCOPO DESTA ATUALIZAÇÃO — 3 PILARES

### PILAR 1: Sistema anti-bypass "Continuar sem se identificar" (prioridade máxima)
### PILAR 2: Redesign da comunicação visual completa
### PILAR 3: Onboarding passo a passo da SaaS

---

# ═══════════════════════════════════════════════════════
# PILAR 1 — SISTEMA DE LIMITE PARA USUÁRIOS ANÔNIMOS
# ═══════════════════════════════════════════════════════

## 1.1 REGRA DE NEGÓCIO FUNDAMENTAL

```
USUÁRIO ANÔNIMO ("Continuar sem se identificar"):
├── Pode analisar até 3 fotos de refeição GRATUITAMENTE
├── Esse limite é PERMANENTE e vinculado ao DISPOSITIVO, não ao navegador
├── Recarregar a página → NÃO reseta o contador
├── Fechar e abrir o app → NÃO reseta o contador
├── Limpar cache/cookies → NÃO reseta o contador
├── Usar aba anônima → NÃO reseta o contador
├── Trocar de navegador no mesmo dispositivo → NÃO reseta o contador
└── Na tentativa da 4ª imagem → REDIRECIONAR para tela de UPGRADE obrigatoriamente
```

## 1.2 ESTRATÉGIA DE PERSISTÊNCIA MULTI-CAMADA (INSPIRAÇÃO BIG TECH)

O sistema de tracking DEVE usar **5 camadas simultâneas de persistência**. Se UMA camada for apagada pelo usuário, as outras 4 ainda mantêm o estado. O contador só reseta se TODAS as 5 forem eliminadas — o que é praticamente impossível para um usuário comum.

### CAMADA 1 — localStorage (básica)
```javascript
// Salvar a cada análise
localStorage.setItem('nutri_usage', JSON.stringify({
  count: 2,
  firstUse: '2026-03-25T10:00:00Z',
  lastUse: '2026-03-25T12:30:00Z',
  deviceId: 'fingerprint_hash_aqui'
}));
```

### CAMADA 2 — IndexedDB (resistente a "limpar dados do site")
```javascript
// IndexedDB persiste mesmo quando o usuário limpa localStorage
// Criar banco: 'NutriAppDB', store: 'usage'
// Guardar o mesmo objeto { count, firstUse, lastUse, deviceId }
```

### CAMADA 3 — Cookie com expiração longa (365 dias)
```javascript
// Cookie HttpOnly + Secure + SameSite=Strict
// Valor: base64 do { count, deviceId }
// Max-Age: 31536000 (1 ano)
document.cookie = `nutri_track=${encodedData}; max-age=31536000; path=/; SameSite=Strict; Secure`;
```

### CAMADA 4 — Cache API / Service Worker
```javascript
// Armazenar dados dentro do Service Worker cache
// Mesmo que o usuário limpe "cookies e dados", o SW cache frequentemente persiste
// Guardar em: caches.open('nutri-usage-v1')
```

### CAMADA 5 — Fingerprint do dispositivo + Backend (CAMADA PRINCIPAL)
```
ESTA É A CAMADA MAIS IMPORTANTE — é a que torna o sistema à prova de bala.

O fingerprint deve ser composto por:
├── Canvas fingerprint (renderização única de cada GPU)
├── WebGL renderer + vendor
├── AudioContext fingerprint
├── Resolução da tela + devicePixelRatio + colorDepth
├── Timezone + idioma do navegador
├── Número de núcleos do processador (navigator.hardwareConcurrency)
├── Memória do dispositivo (navigator.deviceMemory)
├── Plataforma (navigator.platform)
├── Fontes instaladas (via medição de largura de texto)
└── Touch support + maxTouchPoints

Gerar um HASH SHA-256 combinando todos esses valores.
Esse hash identifica o dispositivo de forma ÚNICA.
Enviar para o backend a cada análise de foto.
O backend mantém o contador vinculado ao hash.
```

### LÓGICA DE RECONCILIAÇÃO (qual valor prevalece)
```
Ao iniciar o app:
1. Ler todas as 5 camadas
2. Pegar o MAIOR valor de count entre todas
3. Sincronizar todas as camadas com esse valor
4. Se o backend tiver um count maior que todas as camadas locais → usar o do backend
5. NUNCA usar o menor valor (isso significaria que o usuário apagou alguma camada)
```

### PSEUDOCÓDIGO DO FLUXO COMPLETO
```javascript
async function canUserAnalyze() {
  const MAX_FREE = 3;
  
  // 1. Gerar fingerprint do dispositivo
  const deviceFingerprint = await generateDeviceFingerprint();
  
  // 2. Buscar contagem de todas as camadas
  const localCount = getFromLocalStorage();
  const indexedCount = await getFromIndexedDB();
  const cookieCount = getFromCookie();
  const cacheCount = await getFromServiceWorkerCache();
  const backendCount = await getFromBackend(deviceFingerprint);
  
  // 3. Pegar o MAIOR (anti-bypass)
  const realCount = Math.max(
    localCount || 0,
    indexedCount || 0,
    cookieCount || 0,
    cacheCount || 0,
    backendCount || 0
  );
  
  // 4. Sincronizar todas as camadas com o valor real
  await syncAllLayers(realCount, deviceFingerprint);
  
  // 5. Decisão
  if (realCount >= MAX_FREE) {
    showUpgradeScreen(); // <<< TELA DE UPGRADE
    return false;
  }
  
  return true;
}

async function afterSuccessfulAnalysis() {
  const newCount = currentCount + 1;
  await syncAllLayers(newCount, deviceFingerprint);
  
  // Feedback visual progressivo
  if (newCount === 1) showToast("Você usou 1 de 3 análises gratuitas");
  if (newCount === 2) showToast("Você usou 2 de 3 análises gratuitas — restam apenas 1!");
  if (newCount === 3) showUpgradeTeaser(); // Prévia suave do upgrade
}
```

## 1.3 TELA DE UPGRADE (quando atingir o limite)

```
DESIGN DA TELA DE UPGRADE:
├── NÃO deve parecer um bloqueio/erro — deve parecer uma OPORTUNIDADE
├── Mostrar o resultado da última análise ao fundo (blur + overlay escuro)
├── Card central com:
│   ├── Ícone animado (ex: foguete ou coroa)
│   ├── Headline: "Você desbloqueou o máximo gratuito!"
│   ├── Sub: "Faça upgrade para análises ilimitadas + metas personalizadas"
│   ├── Benefícios do plano premium (3-4 bullets visuais):
│   │   ├── ∞ Análises ilimitadas de refeições
│   │   ├── 🎯 Metas diárias personalizadas por macro
│   │   ├── 🔔 Alertas inteligentes de nutricionista
│   │   └── 📊 Histórico completo + gráficos de evolução
│   ├── Botão primário: "Começar agora — R$ X,XX/mês"
│   ├── Botão secundário: "Ver planos"
│   └── Link discreto: "Ou faça login para recuperar seu progresso"
├── Animação de entrada: slide-up com backdrop blur
└── NÃO ter botão de fechar (o único caminho é upgrade ou login)
```

## 1.4 BARRA DE PROGRESSO DE USO (sempre visível para anônimos)

```
Para usuários não logados, exibir SEMPRE uma barra sutil no topo ou no footer:

[████████░░░░] 2/3 análises gratuitas usadas

- Ao clicar na barra → abre modal com benefícios do cadastro/upgrade
- Cores progressivas:
  - 1/3 → verde (tranquilo)
  - 2/3 → amarelo/laranja (atenção)
  - 3/3 → vermelho (esgotado) → redireciona automaticamente
```

---

# ═══════════════════════════════════════════════════════
# PILAR 2 — REDESIGN DA COMUNICAÇÃO VISUAL
# ═══════════════════════════════════════════════════════

## 2.1 IDENTIDADE VISUAL OBRIGATÓRIA

```
PALETA DE CORES:
├── Primary: #0D9F6E (verde vivo — saúde, frescor, confiança)
├── Primary Dark: #057A55
├── Secondary: #F59E0B (amber — energia, vitalidade)
├── Accent: #3B82F6 (azul — tecnologia, precisão)
├── Background: #FAFBFC (off-white limpo)
├── Surface: #FFFFFF
├── Text Primary: #111827
├── Text Secondary: #6B7280
├── Error: #EF4444
├── Success: #10B981
├── Warning: #F59E0B
└── Gradiente hero: linear-gradient(135deg, #0D9F6E 0%, #065F46 100%)

TIPOGRAFIA:
├── Display/Headlines: "Plus Jakarta Sans" (Google Fonts) — weight 700/800
├── Body: "Plus Jakarta Sans" — weight 400/500
├── Números/Dados: "DM Mono" ou "JetBrains Mono" — para macros e valores
└── Tamanhos: 14px body, 16px lead, 24px h3, 32px h2, 48px h1, 64px hero

BORDAS E SOMBRAS:
├── Border-radius padrão: 16px (cards), 12px (botões), 24px (modais)
├── Shadow sutil: 0 1px 3px rgba(0,0,0,0.08)
├── Shadow card: 0 4px 24px rgba(0,0,0,0.06)
├── Shadow elevada: 0 12px 48px rgba(0,0,0,0.12)
└── Glassmorphism para overlays: backdrop-filter: blur(20px); background: rgba(255,255,255,0.8)

ÍCONES:
├── Usar Lucide Icons (https://lucide.dev) — consistência, leveza
├── Tamanho padrão: 20px inline, 24px em cards, 32px em features
└── Stroke-width: 1.5px (mais elegante que 2px padrão)
```

## 2.2 COMPONENTES VISUAIS QUE DEVEM SER REDESENHADOS

### Tela de captura da foto
```
ANTES: Botão genérico de câmera
DEPOIS:
├── Área de captura com moldura arredondada estilizada
├── Guia visual: "Centralize seu prato na área"
├── Ícone de prato com animação pulse sutil
├── Overlay com grid de terços (estilo câmera profissional)
├── Botão de captura grande, circular, com gradiente verde
├── Micro-animação ao tirar a foto (flash + ripple)
└── Preview instantâneo com skeleton loading nos macros
```

### Card de resultado nutricional
```
DESIGN DO CARD DE RESULTADO:
├── Card com border-radius: 24px e shadow elevada
├── Foto do prato no topo (16:9, com object-fit: cover)
├── Abaixo da foto: nome do prato detectado (bold, 20px)
├── Grid 2x2 com os macros em cards menores:
│   ├── Proteína → ícone 🥩 + valor em DM Mono bold + barra de progresso
│   ├── Carboidrato → ícone 🍞 + valor + barra
│   ├── Fibra → ícone 🥬 + valor + barra
│   └── Gordura → ícone 🫒 + valor + barra
├── Total de calorias em destaque (centro, 32px, gradiente)
├── Rodapé: "Analisado por IA • Precisão estimada: ~85%"
├── Cada macro deve ter COR própria:
│   ├── Proteína: #EF4444 (vermelho)
│   ├── Carboidrato: #F59E0B (amber)
│   ├── Fibra: #10B981 (verde)
│   └── Gordura: #8B5CF6 (roxo)
└── Animação: cada barra de progresso preenche com delay sequencial (stagger)
```

### Tela de login/cadastro
```
DESIGN DA TELA DE AUTH:
├── Background: gradiente verde escuro com padrão geométrico sutil (SVG)
├── Card central em glassmorphism (blur + branco translúcido)
├── Logo no topo do card
├── Título: "Entre na sua conta" ou "Crie sua conta"
├── Botões de login social (Google, Apple) — estilo nativo, full-width:
│   ├── Google: fundo branco, borda cinza, ícone colorido do Google
│   └── Apple: fundo preto, texto branco, ícone da Apple
├── Divisor: "──── ou ────"
├── Campos de email e senha com ícones inline
├── Botão primário: gradiente verde, full-width, 48px de altura
├── Link inferior: "Continuar sem se identificar" (discreto, cinza, small)
│   └── Abaixo: "(3 análises gratuitas)"
└── Transição entre Login ↔ Cadastro: sem mudar de página, animação de slide
```

## 2.3 MICROINTERAÇÕES OBRIGATÓRIAS

```
1. Ao tirar foto → flash branco de 200ms + vibração haptic (se mobile)
2. Enquanto analisa → skeleton com shimmer gradient nos campos de macro
3. Resultado chegando → cada macro aparece com fade-in + slide-up em sequência (stagger 150ms)
4. Barras de progresso → preenchem de 0 até o valor com easing ease-out-cubic
5. Botão de câmera → pulse animation constante (chama atenção)
6. Troca de tela → slide horizontal (não pular, transicionar)
7. Toast notifications → slide-in do topo com auto-dismiss em 4s
8. Counter de uso → número atualiza com contagem animada (count-up)
9. Tela de upgrade → backdrop blur + card slide-up + confetti sutil no botão
10. Loading geral → spinner personalizado (não usar spinner genérico, criar um com CSS que combine com a marca)
```

---

# ═══════════════════════════════════════════════════════
# PILAR 3 — ONBOARDING PASSO A PASSO DA SAAS
# ═══════════════════════════════════════════════════════

## 3.1 FLUXO COMPLETO DO PRIMEIRO ACESSO

```
PASSO 1 — SPLASH SCREEN (2 segundos)
├── Logo centralizado com animação de fade-in + scale
├── Tagline abaixo: "Sua nutrição na palma da mão"
├── Background: gradiente da marca
├── Barra de loading sutil
└── Auto-avança para o Step 2

PASSO 2 — ONBOARDING CAROUSEL (3 telas deslizáveis)
├── Tela 1: "Fotografe seu prato"
│   ├── Ilustração/ícone grande de câmera + prato
│   ├── Texto: "Tire uma foto da sua refeição e descubra os nutrientes em segundos"
│   └── Indicador: ● ○ ○
├── Tela 2: "Acompanhe seus macros"
│   ├── Ilustração de gráfico de barras colorido
│   ├── Texto: "Veja proteína, carbo, fibra e gordura de cada refeição"
│   └── Indicador: ○ ● ○
├── Tela 3: "Atinja suas metas"
│   ├── Ilustração de alvo/meta com check
│   ├── Texto: "Defina metas diárias e receba alertas como um nutricionista pessoal"
│   ├── Badge: "⭐ Disponível no plano Premium"
│   └── Indicador: ○ ○ ●
├── Botão fixo inferior: "Começar" (aparece na tela 3 ou após swipe completo)
└── Link "Pular" no canto superior direito

PASSO 3 — TELA DE DECISÃO (AUTH vs ANÔNIMO)
├── Card superior: "Crie sua conta"
│   ├── Benefícios listados: "Salve seu histórico", "Sincronize entre dispositivos"
│   ├── Botão Google (primário, grande)
│   ├── Botão Apple (primário, grande)
│   ├── Botão Email (secundário)
│   └── Cada botão com ícone à esquerda
├── Divisor visual
└── Card inferior (discreto, menor destaque):
    ├── "Continuar sem se identificar"
    ├── Subtexto: "Você terá 3 análises gratuitas"
    ├── Ícone de cadeado aberto
    └── Estilo: borda tracejada, cor cinza, fonte menor

PASSO 4A — SE ESCOLHEU CRIAR CONTA (fluxo de auth)
├── Formulário de cadastro (depende do método escolhido)
├── Google/Apple → redirect OAuth → volta direto para o app
├── Email → campos: nome, email, senha, confirmar senha
├── Após criar conta → vai para o PASSO 5

PASSO 4B — SE ESCOLHEU "CONTINUAR SEM SE IDENTIFICAR"
├── Gerar fingerprint do dispositivo silenciosamente
├── Criar sessão anônima no backend vinculada ao fingerprint
├── Inicializar contador = 0 em todas as 5 camadas
├── Mostrar toast: "Bem-vindo! Você tem 3 análises gratuitas"
├── Ir direto para a HOME do app
└── Barra de uso visível: [░░░░░░░░░░░░] 0/3

PASSO 5 — QUESTIONÁRIO DE CALIBRAÇÃO (apenas para logados / premium)
├── Tela 1: "Qual seu objetivo?"
│   ├── Cards selecionáveis (toque para selecionar):
│   │   ├── 🏋️ Ganhar massa muscular
│   │   ├── ⚖️ Perder peso
│   │   ├── 🍎 Alimentação saudável
│   │   └── 📊 Apenas monitorar
│   └── Um card por vez selecionado (radio-style)
├── Tela 2: "Dados básicos"
│   ├── Sexo: Masculino / Feminino / Prefiro não dizer
│   ├── Idade: seletor numérico (slider ou input)
│   ├── Peso: kg (campo numérico)
│   ├── Altura: cm (campo numérico)
│   └── Nível de atividade: Sedentário / Leve / Moderado / Intenso
├── Tela 3: "Suas metas calculadas"
│   ├── Mostrar os valores calculados automaticamente:
│   │   ├── Calorias diárias: XXXX kcal
│   │   ├── Proteína: XXXg
│   │   ├── Carboidrato: XXXg
│   │   ├── Fibra: XXg
│   │   └── Gordura: XXg
│   ├── Cada valor editável (campo numérico inline)
│   ├── Texto: "Calculamos com base nas suas respostas. Ajuste se preferir."
│   └── Botão: "Salvar e começar"
└── Após conclusão → HOME do app com metas configuradas
```

## 3.2 FLUXO DA HOME PRINCIPAL (após onboarding)

```
HOME — LAYOUT:
├── HEADER:
│   ├── Saudação: "Bom dia, [Nome]!" ou "Bom dia!" (se anônimo)
│   ├── Avatar (se logado) ou ícone genérico
│   ├── Streak: "🔥 3 dias seguidos" (se logado)
│   └── Se anônimo: badge "[0/3] Análises gratuitas"
│
├── CARD PRINCIPAL — CÂMERA:
│   ├── Card grande (destaque máximo)
│   ├── Ícone de câmera com animação pulse
│   ├── Texto: "Analise sua refeição"
│   ├── Subtexto: "Tire uma foto ou escolha da galeria"
│   ├── Botão: "Abrir câmera" (gradiente verde, full-width)
│   └── Para anônimo: mostrar "(X de 3 gratuitas)" abaixo do botão
│
├── RESUMO DO DIA (só logados / premium):
│   ├── Card com os 4 macros em formato de arco/gauge:
│   │   ├── Calorias consumidas vs meta
│   │   ├── Proteína consumida vs meta
│   │   ├── Carbo consumido vs meta
│   │   └── Gordura consumida vs meta
│   ├── Se algum macro excedeu → borda vermelha + ícone de alerta
│   └── Se todos dentro da meta → borda verde + "No caminho certo! ✅"
│
├── ÚLTIMAS REFEIÇÕES:
│   ├── Lista horizontal scrollável (cards pequenos)
│   ├── Cada card: miniatura da foto + nome + calorias
│   ├── Toque → abre detalhes completos
│   └── Se anônimo: mostrar apenas as que analisou (máx 3)
│
├── BANNER DE UPGRADE (só para anônimos e free):
│   ├── Card com gradiente sutil amber → verde
│   ├── Texto: "Desbloqueie análises ilimitadas"
│   ├── Botão: "Ver planos"
│   └── Ícone de coroa/estrela
│
└── BOTTOM NAV (tab bar):
    ├── 🏠 Home
    ├── 📊 Histórico (premium)
    ├── 📷 Analisar (botão central destacado, maior)
    ├── 🎯 Metas (premium)
    └── 👤 Perfil
```

## 3.3 FLUXO DO CLIQUE EM "ANALISAR" (para anônimos)

```
FLUXO ANTI-BYPASS — DECISÃO NO MOMENTO DA ANÁLISE:

1. Usuário clica em "Analisar" ou "Abrir câmera"
2. Sistema executa canUserAnalyze():
   ├── Gera fingerprint
   ├── Consulta todas as 5 camadas
   ├── Pega o Math.max() de todas
   └── Consulta o backend com o fingerprint

3. SE count < 3:
   ├── Permitir captura da foto
   ├── Após resultado: incrementar em todas as 5 camadas
   ├── Mostrar toast com contagem atualizada
   └── Se count === 2: mostrar "Última análise gratuita!" com destaque

4. SE count >= 3:
   ├── NÃO abrir a câmera
   ├── Abrir tela de UPGRADE diretamente
   ├── Backdrop blur na tela atual
   ├── Card de upgrade com benefícios
   ├── Opções:
   │   ├── "Fazer upgrade" → tela de planos/pagamento
   │   └── "Fazer login" → tela de auth (caso já tenha conta premium)
   └── NÃO há opção de fechar/voltar sem escolher uma das duas

5. SE o usuário fazer login e a conta for FREE:
   ├── O contador do anônimo NÃO se transfere para a conta
   ├── A conta logada free tem SEU PRÓPRIO limite de 3
   └── Apenas contas PREMIUM têm análises ilimitadas

6. SE o usuário fazer login e a conta for PREMIUM:
   ├── Desbloquear tudo imediatamente
   ├── Esconder barra de progresso de uso
   ├── Mostrar toast: "Bem-vindo de volta! Análises ilimitadas ativadas 🎉"
   └── Redirecionar para HOME com layout premium
```

---

# ═══════════════════════════════════════════════════════
# ESPECIFICAÇÕES TÉCNICAS DE IMPLEMENTAÇÃO
# ═══════════════════════════════════════════════════════

## ESTRUTURA DE ARQUIVOS SUGERIDA

```
/
├── index.html                  (entrada principal)
├── css/
│   ├── variables.css           (cores, fontes, espaçamentos)
│   ├── base.css                (reset, tipografia global)
│   ├── components.css          (cards, botões, inputs, modais)
│   ├── layout.css              (grid, header, nav, footer)
│   ├── animations.css          (keyframes, transições, micro-interações)
│   └── responsive.css          (breakpoints mobile-first)
├── js/
│   ├── app.js                  (inicialização, router, state management)
│   ├── auth.js                 (Google/Apple/Email login, sessão)
│   ├── fingerprint.js          (geração do device fingerprint multi-sinal)
│   ├── usage-tracker.js        (5 camadas de persistência + sync)
│   ├── camera.js               (captura, preview, envio para API)
│   ├── nutrition-api.js        (chamada à API de análise, parsing)
│   ├── onboarding.js           (carousel, questionário, calibração)
│   ├── upgrade.js              (tela de upgrade, planos, checkout)
│   ├── ui.js                   (toasts, modais, animações, transições)
│   └── utils.js                (helpers, formatação, validação)
├── assets/
│   ├── icons/                  (SVGs dos ícones)
│   ├── illustrations/          (SVGs do onboarding)
│   └── logo/                   (logo em diferentes tamanhos)
├── sw.js                       (Service Worker — cache de uso + offline)
└── manifest.json               (PWA manifest)
```

## DEVICE FINGERPRINT — IMPLEMENTAÇÃO DETALHADA

```javascript
// fingerprint.js — NÃO usar bibliotecas externas, implementar do zero

async function generateDeviceFingerprint() {
  const signals = [];
  
  // 1. Canvas fingerprint
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('fingerprint', 2, 15);
  ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
  ctx.fillText('fingerprint', 4, 17);
  signals.push(canvas.toDataURL());
  
  // 2. WebGL
  const gl = document.createElement('canvas').getContext('webgl');
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      signals.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
      signals.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    }
  }
  
  // 3. Audio fingerprint
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const analyser = audioCtx.createAnalyser();
    const gain = audioCtx.createGain();
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioCtx.currentTime);
    // Capturar snapshot do audio processing
    signals.push(audioCtx.sampleRate.toString());
    audioCtx.close();
  } catch (e) {
    signals.push('audio-unavailable');
  }
  
  // 4. Hardware
  signals.push(screen.width + 'x' + screen.height);
  signals.push(window.devicePixelRatio.toString());
  signals.push(screen.colorDepth.toString());
  signals.push(navigator.hardwareConcurrency?.toString() || 'unknown');
  signals.push(navigator.deviceMemory?.toString() || 'unknown');
  signals.push(navigator.maxTouchPoints?.toString() || '0');
  
  // 5. Ambiente
  signals.push(navigator.platform);
  signals.push(navigator.language);
  signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // 6. Gerar hash SHA-256
  const raw = signals.join('|||');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
```

## TELA DE UPGRADE — HTML/CSS DE REFERÊNCIA

```
A tela de upgrade DEVE seguir esse padrão visual:
├── Overlay escuro: background: rgba(0,0,0,0.6) + backdrop-filter: blur(12px)
├── Card centralizado: max-width: 420px, padding: 32px, border-radius: 24px
├── Animação de entrada: translateY(100px) → translateY(0) em 400ms ease-out
├── Dentro do card:
│   ├── Badge: "PRO" em pill dourada (background: linear-gradient amber)
│   ├── Título: "Hora de desbloquear tudo!" — 24px, bold
│   ├── Subtítulo: "Você aproveitou suas 3 análises gratuitas" — 14px, cinza
│   ├── Lista de benefícios com ícones check verdes:
│   │   ├── "Análises ilimitadas de refeições"
│   │   ├── "Metas diárias personalizadas"
│   │   ├── "Alertas inteligentes de nutricionista"
│   │   └── "Histórico completo + gráficos"
│   ├── Preço: "R$ 19,90/mês" — com o preço grande e "/mês" pequeno
│   ├── Botão primário: "Começar agora" — full-width, 48px, gradiente verde
│   ├── Botão secundário: "Já tenho conta → Fazer login" — ghost style
│   └── Garantia: "7 dias grátis • Cancele quando quiser"
└── Não ter X de fechar — a única saída é upgrade ou login
```

---

# ═══════════════════════════════════════════════════════
# REGRAS GERAIS DE QUALIDADE
# ═══════════════════════════════════════════════════════

## MOBILE FIRST
- Todo o CSS deve começar pelo mobile (max-width: 480px)
- Breakpoints: 480px (mobile), 768px (tablet), 1024px (desktop)
- Touch targets mínimos de 44x44px
- Inputs com font-size: 16px (evita zoom no iOS)
- Viewport meta tag com viewport-fit=cover

## PERFORMANCE
- Lazy loading em imagens
- CSS crítico inline no <head>
- Service Worker para cache de assets estáticos
- Intersection Observer para animações on-scroll
- Debounce em inputs e scroll events

## ACESSIBILIDADE
- Contraste WCAG AA mínimo em todos os textos
- aria-labels em botões com apenas ícone
- Focus visible em todos os interativos
- Reduzir animações se prefers-reduced-motion

## SEGURANÇA DO SISTEMA DE USO
- NUNCA confiar apenas no client-side para o contador
- O backend DEVE ser a fonte da verdade
- O fingerprint DEVE ser gerado a cada verificação (não cachear o hash)
- Rate limiting no endpoint de análise: máx 10 requests/minuto por fingerprint
- Logs de tentativas de bypass (mesmo fingerprint tentando resetar via API)

---

# ═══════════════════════════════════════════════════════
# RESUMO EXECUTIVO — CHECKLIST DE IMPLEMENTAÇÃO
# ═══════════════════════════════════════════════════════

```
□ Implementar fingerprint.js com 10+ sinais de dispositivo
□ Implementar usage-tracker.js com 5 camadas de persistência
□ Implementar lógica de reconciliação (Math.max de todas as camadas)
□ Endpoint backend: POST /api/usage/check (fingerprint → count)
□ Endpoint backend: POST /api/usage/increment (fingerprint → count+1)
□ Tela de onboarding: splash + carousel 3 telas + decisão auth
□ Tela de auth: Google + Apple + Email com design glassmorphism
□ Botão "Continuar sem se identificar" com subtexto "(3 análises)"
□ Barra de progresso de uso para anônimos (0/3, 1/3, 2/3, 3/3)
□ Tela de upgrade: card sem X, benefícios, CTA, login secundário
□ Redesign do card de resultado: foto + macros coloridos + barras animadas
□ Redesign da home: saudação + card câmera + resumo dia + últimas refeições
□ Bottom nav: Home, Histórico, Analisar, Metas, Perfil
□ Questionário de calibração (objetivo + dados + metas calculadas)
□ Microinterações: flash, shimmer, stagger, count-up, toast, transitions
□ Mobile-first CSS com 3 breakpoints
□ Service Worker para cache + persistência de uso
□ PWA manifest para "instalar" como app
□ Todas as features premium bloqueadas com UI de upgrade
```

---

> **INSTRUÇÃO FINAL:** Implemente TODO o código funcional, não apenas estrutura.
> Cada arquivo .js e .css deve estar completo e pronto para uso.
> O sistema de tracking de uso DEVE funcionar end-to-end na primeira execução.
> A experiência visual deve ser indistinguível de um produto real de mercado.
> Pense como um time de 3 pessoas: um engenheiro sênior fullstack, um designer UI/UX sênior e um nutricionista clínico — todos trabalhando juntos.
