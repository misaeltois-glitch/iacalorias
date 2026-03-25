# PROMPT MASTER — MÓDULO DE TREINO + INTEGRAÇÃO NUTRICIONAL
## V1.0 | Especialista Fullstack + Educador Físico + Nutricionista Esportivo
## Para uso no Claude Code / Replit — integrado ao App de Análise Nutricional

---

## 🎯 CONTEXTO GERAL

Você é um **engenheiro fullstack sênior**, um **educador físico CREF especialista em fisiologia do exercício e periodização** e um **nutricionista esportivo CRN com experiência em nutrição funcional** — todos trabalhando juntos em um único cérebro.

Este prompt é uma EXTENSÃO do app de análise nutricional por foto (SaaS freemium). O app já possui:
- Análise de foto do prato → retorna macronutrientes
- Sistema de metas diárias (calorias, proteína, carbo, fibra, gordura)
- Questionário de calibração nutricional
- Sistema anti-bypass com 5 camadas de persistência para limite de uso
- Autenticação: Google, Apple, Email + Senha
- Stack: HTML + CSS + JavaScript puro (hospedado no Replit)

Agora vamos adicionar o **módulo de planejamento de treino completo** que se INTEGRA com a nutrição, criando um ecossistema fitness 360°.

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 1 — QUESTIONÁRIO DE PERFIL FITNESS (COLETA DE DADOS DO USUÁRIO)
# ═══════════════════════════════════════════════════════════════════════

## 1.1 FLUXO DO QUESTIONÁRIO — ETAPA POR ETAPA

O questionário deve ser uma experiência visual premium, com transições suaves entre etapas. Cada etapa ocupa a tela inteira (fullscreen step) com animação de slide horizontal.

### ETAPA 1 — OBJETIVO PRINCIPAL
```
Título: "Qual é o seu objetivo principal?"
Subtítulo: "Isso define toda a estrutura do seu treino"

Cards selecionáveis (toque único, estilo radio):
┌─────────────────────────────────────────────┐
│ 🏋️ HIPERTROFIA (Ganho de massa muscular)    │
│ Foco: volume alto, cargas moderadas-altas   │
│ Rep range: 8-12 | Descanso: 60-90s          │
├─────────────────────────────────────────────┤
│ 💪 FORÇA (Aumento de carga máxima)          │
│ Foco: cargas pesadas, volume moderado       │
│ Rep range: 3-6 | Descanso: 3-5min           │
├─────────────────────────────────────────────┤
│ 🔥 EMAGRECIMENTO (Perda de gordura)         │
│ Foco: circuitos, HIIT, déficit calórico     │
│ Rep range: 12-20 | Descanso: 30-60s         │
├─────────────────────────────────────────────┤
│ 🏃 CONDICIONAMENTO (Resistência geral)      │
│ Foco: endurance muscular, cardio integrado  │
│ Rep range: 15-25 | Descanso: 30-45s         │
├─────────────────────────────────────────────┤
│ 🧘 SAÚDE E BEM-ESTAR (Manutenção geral)    │
│ Foco: funcional, mobilidade, equilíbrio     │
│ Rep range: 10-15 | Descanso: 60s            │
└─────────────────────────────────────────────┘

Variável salva: user.goal = "hypertrophy" | "strength" | "fat_loss" | "endurance" | "wellness"
```

### ETAPA 2 — DADOS ANTROPOMÉTRICOS
```
Título: "Seus dados físicos"
Subtítulo: "Usamos para calcular seu plano ideal"

Campos (todos obrigatórios):
├── Sexo biológico: [Masculino] [Feminino]
│   → variável: user.sex = "male" | "female"
│   → Impacta: cálculo do TMB, distribuição de volume, considerações hormonais
│
├── Idade: slider de 14 a 70 anos (padrão: 25)
│   → variável: user.age = number
│   → Impacta: intensidade máxima, volume semanal, tempo de recuperação
│   → Regras:
│       14-17: adolescente (limitar cargas, priorizar técnica, +20% descanso)
│       18-35: adulto jovem (capacidade máxima de recuperação)
│       36-50: adulto (ajustar volume -10%, priorizar aquecimento)
│       51-65: maduro (ajustar volume -25%, incluir mobilidade obrigatória)
│       66+: sênior (priorizar funcional, equilíbrio, sem cargas pesadas)
│
├── Peso atual: campo numérico em kg (40-200kg)
│   → variável: user.weight = number
│
├── Altura: campo numérico em cm (140-220cm)
│   → variável: user.height = number
│
├── Percentual de gordura (OPCIONAL): slider 5%-50%
│   → variável: user.bodyFat = number | null
│   → Se informado: usar fórmula de Katch-McArdle para TMB
│   → Se não: usar Harris-Benedict revisada
│
└── Circunferência da cintura (OPCIONAL): campo em cm
    → variável: user.waist = number | null
    → Usado para: classificação de risco cardiovascular (OMS)
    → Homens > 94cm = risco | > 102cm = alto risco
    → Mulheres > 80cm = risco | > 88cm = alto risco
```

### ETAPA 3 — NÍVEL DE EXPERIÊNCIA
```
Título: "Há quanto tempo você treina?"
Subtítulo: "Isso define a complexidade dos exercícios e o volume semanal"

Cards selecionáveis:
┌──────────────────────────────────────────────────────────┐
│ 🟢 INICIANTE (0-6 meses de treino consistente)           │
│ Nunca treinou ou está retornando após longa pausa        │
│ → Split recomendado: Full Body 3x/semana                 │
│ → Volume: 10-12 séries/músculo/semana                    │
│ → Foco: aprender padrões motores, técnica perfeita       │
├──────────────────────────────────────────────────────────┤
│ 🟡 INTERMEDIÁRIO (6 meses - 2 anos consistentes)         │
│ Já domina os movimentos básicos, busca progressão        │
│ → Split recomendado: Upper/Lower 4x ou PPL 3x            │
│ → Volume: 14-18 séries/músculo/semana                    │
│ → Foco: sobrecarga progressiva, periodização linear       │
├──────────────────────────────────────────────────────────┤
│ 🔴 AVANÇADO (2+ anos de treino consistente)              │
│ Treina há anos, busca otimização e quebra de platô       │
│ → Split recomendado: PPL 6x ou PPLUL 5x                  │
│ → Volume: 18-25 séries/músculo/semana                    │
│ → Foco: periodização ondulada, técnicas avançadas         │
└──────────────────────────────────────────────────────────┘

Variável: user.level = "beginner" | "intermediate" | "advanced"
```

### ETAPA 4 — DISPONIBILIDADE DE TREINO
```
Título: "Quantos dias por semana você pode treinar?"
Subtítulo: "Escolha os dias e definiremos a melhor divisão"

Seletor visual (cards-toggle para cada dia da semana):
[SEG] [TER] [QUA] [QUI] [SEX] [SÁB] [DOM]
  ✓     ✓     ✗     ✓     ✓     ✗     ✗

Variáveis:
├── user.trainingDays = ["mon","tue","thu","fri"] (array dos dias selecionados)
├── user.daysPerWeek = 4 (contagem automática)
└── user.consecutiveMax = 2 (máximo de dias consecutivos — para calcular fadiga)

Duração da sessão (slider):
├── 30 min | 45 min | 60 min | 75 min | 90 min | 120 min
└── variável: user.sessionDuration = number (em minutos)

Horário preferido (opcional — impacta recomendações de nutrição pré/pós):
├── [Manhã 5h-9h] [Meio-dia 10h-14h] [Tarde 15h-18h] [Noite 19h-23h]
└── variável: user.preferredTime = "morning" | "midday" | "afternoon" | "night"
```

### ETAPA 5 — LOCAL E EQUIPAMENTOS
```
Título: "Onde você vai treinar?"
Subtítulo: "Adaptamos os exercícios ao que você tem disponível"

Cards selecionáveis (seleção única):
┌──────────────────────────────────────────────┐
│ 🏢 ACADEMIA COMPLETA                         │
│ Barras, halteres, máquinas, cabos, etc.      │
│ → Acesso a todos os exercícios do banco       │
├──────────────────────────────────────────────┤
│ 🏠 HOME GYM (equipamentos básicos)           │
│ Halteres, barra, banco, elásticos            │
│ → Subconjunto de exercícios adaptados         │
├──────────────────────────────────────────────┤
│ 🤸 PESO CORPORAL (sem equipamento)           │
│ Apenas o próprio corpo + objetos domésticos   │
│ → Exercícios calistênicos e isométricos       │
├──────────────────────────────────────────────┤
│ 🔧 PERSONALIZADO                             │
│ Selecione exatamente o que você tem           │
│ → Abre checklist de equipamentos              │
└──────────────────────────────────────────────┘

Se "PERSONALIZADO" → mostrar checklist multi-select:
□ Barra reta          □ Barra W / EZ
□ Halteres            □ Anilhas
□ Banco reto          □ Banco inclinável
□ Rack / Gaiola       □ Polia / Crossover
□ Leg Press           □ Smith Machine
□ Elásticos           □ Kettlebell
□ Bola suíça          □ TRX / Suspensão
□ Barra fixa          □ Paralelas
□ Step / Caixa        □ Rolo de espuma
□ Esteira             □ Bicicleta ergométrica
□ Corda de pular      □ Remo ergométrico

Variáveis:
├── user.gym = "full_gym" | "home_gym" | "bodyweight" | "custom"
└── user.equipment = ["barbell","dumbbells","bench","cables",...] (se custom)
```

### ETAPA 6 — LESÕES E RESTRIÇÕES (CRÍTICO PARA SEGURANÇA)
```
Título: "Possui alguma lesão ou restrição?"
Subtítulo: "Sua segurança é prioridade — adaptamos tudo para você"

Toggle inicial: [Não tenho restrições] ←→ [Sim, tenho restrições]

Se SIM → mostrar checklist multi-select por região:
┌─ OMBRO ──────────────────────────────────┐
│ □ Tendinite do manguito rotador           │
│ □ Bursite subacromial                     │
│ □ Instabilidade / luxação                 │
│ □ Impacto do ombro                        │
│ □ Outra: [campo livre]                    │
├─ COTOVELO ───────────────────────────────┤
│ □ Epicondilite lateral (cotovelo de tenist│
│ □ Epicondilite medial (cotovelo de golfist│
├─ PUNHO / MÃO ───────────────────────────┤
│ □ Síndrome do túnel do carpo              │
│ □ Tendinite no punho                      │
├─ COLUNA ─────────────────────────────────┤
│ □ Hérnia de disco (cervical / lombar)     │
│ □ Protrusão discal                        │
│ □ Escoliose                               │
│ □ Espondilolistese                        │
│ □ Lombalgia crônica                       │
│ □ Outra: [campo livre]                    │
├─ QUADRIL ────────────────────────────────┤
│ □ Impacto femoroacetabular                │
│ □ Bursite trocantérica                    │
│ □ Artrose                                 │
├─ JOELHO ─────────────────────────────────┤
│ □ Condromalácia patelar                   │
│ □ Lesão de menisco                        │
│ □ Lesão de LCA / LCP / LCL / LCM         │
│ □ Tendinite patelar                       │
│ □ Artrose                                 │
│ □ Outra: [campo livre]                    │
├─ TORNOZELO / PÉ ────────────────────────┤
│ □ Entorse recorrente                      │
│ □ Fascite plantar                         │
│ □ Tendinite de Aquiles                    │
└──────────────────────────────────────────┘

Campo adicional: "Observações médicas:" [textarea livre]

Variáveis:
├── user.hasInjuries = boolean
├── user.injuries = [{ region: "knee", condition: "condromalacia", notes: "" }]
└── user.medicalNotes = string

REGRAS DE SEGURANÇA (o sistema DEVE respeitar):
├── Hérnia lombar → EXCLUIR: agachamento livre, terra, leg press 45°, good morning
│   SUBSTITUIR POR: leg press horizontal, agachamento no smith, extensora, flexora
├── Condromalácia → EXCLUIR: agachamento profundo, leg extension com carga alta
│   SUBSTITUIR POR: agachamento parcial, isometria em parede, step-up baixo
├── Tendinite ombro → EXCLUIR: desenvolvimento atrás da nuca, elevação lateral acima de 90°
│   SUBSTITUIR POR: elevação lateral parcial, rotação externa com elástico
├── Lombalgia → EXCLUIR: exercícios com carga axial pesada
│   SUBSTITUIR POR: versões com apoio (banco, smith), cinto lombar obrigatório
├── LCA → EXCLUIR: movimentos de pivô, saltos, agachamento instável
│   SUBSTITUIR POR: isometria, cadeia cinética fechada controlada
└── Qualquer lesão → ADICIONAR: aquecimento específico da região + mobilidade
```

### ETAPA 7 — PREFERÊNCIAS DE TREINO
```
Título: "Personalize seu estilo"
Subtítulo: "Tornamos o treino mais prazeroso para você"

Cardio integrado ao treino:
├── [Não quero cardio]
├── [Cardio leve — 10min caminhada pós-treino]
├── [Cardio moderado — 20min esteira/bike]
├── [HIIT — intervalado de alta intensidade]
└── variável: user.cardio = "none" | "light" | "moderate" | "hiit"

Incluir aquecimento detalhado:
├── [Sim, com mobilidade + ativação] (adiciona 10-15min)
├── [Apenas aquecimento básico] (5min)
├── [Não, eu faço por conta]
└── variável: user.warmup = "full" | "basic" | "none"

Técnicas avançadas (apenas intermediário/avançado):
├── □ Drop-set (redução de carga sem descanso)
├── □ Rest-pause (pausa curta e retoma até falha)
├── □ Super-set (dois exercícios sem descanso)
├── □ Bi-set (dois exercícios do mesmo grupo)
├── □ Tri-set (três exercícios sequenciais)
├── □ Giant-set (quatro ou mais exercícios)
├── □ Pirâmide crescente / decrescente
├── □ FST-7 (7 séries com 30s descanso)
├── □ Negativas / excêntrico acentuado
├── □ Isometria / pausa no ponto de tensão
└── variável: user.techniques = ["dropset","superset","restpause",...]

Variável: user.preferences = { cardio, warmup, techniques }
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 2 — ALGORITMO DE GERAÇÃO DE TREINO (MOTOR PRINCIPAL)
# ═══════════════════════════════════════════════════════════════════════

## 2.1 SELEÇÃO AUTOMÁTICA DO SPLIT (DIVISÃO DE TREINO)

```
REGRA MATRIZ — baseada em dias disponíveis + nível + objetivo:

╔══════════════╦════════════════════════════════════════════════════════════╗
║ DIAS/SEMANA  ║ SPLIT RECOMENDADO                                        ║
╠══════════════╬════════════════════════════════════════════════════════════╣
║ 2 dias       ║ Full Body A/B                                            ║
║              ║ → Cada sessão treina todos os grupos com ênfases          ║
║              ║ → Full A: foco em push + quads  | Full B: pull + post     ║
╠══════════════╬════════════════════════════════════════════════════════════╣
║ 3 dias       ║ INICIANTE: Full Body A/B/C                               ║
║              ║ INTER/AVANÇ: Push / Pull / Legs                          ║
║              ║ EMAGRECIMENTO: Full Body + HIIT                          ║
╠══════════════╬════════════════════════════════════════════════════════════╣
║ 4 dias       ║ INICIANTE: Upper A / Lower A / Upper B / Lower B         ║
║              ║ INTERMEDIÁRIO: Upper / Lower / Push / Pull                ║
║              ║ AVANÇADO: Upper/Lower 2x (variações de intensidade)       ║
╠══════════════╬════════════════════════════════════════════════════════════╣
║ 5 dias       ║ INTER: PPLUL (Push/Pull/Legs/Upper/Lower)                ║
║              ║ AVANÇ: PPL + Upper/Lower (volume alto)                   ║
║              ║ EMAG: 3 musculação + 2 HIIT                              ║
╠══════════════╬════════════════════════════════════════════════════════════╣
║ 6 dias       ║ INTER/AVANÇ: PPL x2 (Push/Pull/Legs repetido)            ║
║              ║ AVANÇ FORÇA: Powerbuilding (força + hipertrofia)          ║
║              ║ EMAG: 4 musculação + 2 HIIT/cardio                       ║
╠══════════════╬════════════════════════════════════════════════════════════╣
║ 7 dias       ║ NÃO RECOMENDADO — forçar pelo menos 1 dia de descanso    ║
║              ║ Se insistir: PPL x2 + dia ativo (mobilidade/yoga/leve)   ║
╚══════════════╩════════════════════════════════════════════════════════════╝
```

## 2.2 BANCO DE EXERCÍCIOS — ESTRUTURA DO BANCO DE DADOS

```
CADA EXERCÍCIO DEVE CONTER:

{
  id: "ex_001",
  name: "Supino reto com barra",
  nameEN: "Barbell Bench Press",
  category: "compound",               // compound | isolation | bodyweight | machine
  primaryMuscle: "chest",             // grupo principal
  secondaryMuscles: ["triceps","anterior_deltoid"], // grupos auxiliares
  movementPattern: "horizontal_push", // padrão de movimento
  equipment: ["barbell","bench"],     // equipamentos necessários
  difficulty: "intermediate",         // beginner | intermediate | advanced
  force: "push",                      // push | pull | static
  mechanic: "compound",              // compound | isolation
  instructions: [                     // passo a passo textual
    "Deite no banco com os pés apoiados no chão",
    "Segure a barra com pegada um pouco mais larga que os ombros",
    "Desça a barra controladamente até tocar o peito",
    "Empurre a barra até estender os braços completamente"
  ],
  tips: [
    "Mantenha as escápulas retraídas durante todo o movimento",
    "Não salte a barra do peito",
    "Expire na subida, inspire na descida"
  ],
  contraindications: ["shoulder_impingement","rotator_cuff_injury"],
  alternatives: ["ex_002","ex_003"], // IDs de exercícios substitutos
  videoUrl: null,                    // URL do vídeo demonstrativo (futuro)
  gifUrl: null,                      // URL do GIF animado (futuro)
  muscleActivation: {                // % de ativação muscular (baseado em EMG)
    chest: 85,
    triceps: 60,
    anterior_deltoid: 40
  },
  sets: { min: 3, max: 5 },
  reps: {
    hypertrophy: { min: 8, max: 12 },
    strength: { min: 3, max: 6 },
    endurance: { min: 15, max: 20 },
    fatLoss: { min: 12, max: 15 }
  },
  restSeconds: {
    hypertrophy: { min: 60, max: 90 },
    strength: { min: 180, max: 300 },
    endurance: { min: 30, max: 45 },
    fatLoss: { min: 30, max: 60 }
  },
  tempo: "3-1-2-0"                   // excêntrica-pausa-concêntrica-topo
}
```

## 2.3 GRUPOS MUSCULARES E EXERCÍCIOS OBRIGATÓRIOS

```
O banco de exercícios DEVE conter NO MÍNIMO os seguintes exercícios por grupo:

═══ PEITO (chest) ═══
COMPOSTOS:
├── Supino reto com barra (barbell bench press)
├── Supino inclinado com barra (incline barbell bench press)
├── Supino declinado com barra (decline barbell bench press)
├── Supino reto com halteres (dumbbell bench press)
├── Supino inclinado com halteres (incline dumbbell press)
├── Flexão de braço (push-up) [bodyweight]
├── Flexão inclinada (decline push-up) [bodyweight]
└── Supino no smith machine

ISOLAMENTO:
├── Crucifixo reto com halteres (dumbbell fly)
├── Crucifixo inclinado com halteres
├── Crossover na polia (cable crossover)
├── Crossover polia baixa (low cable fly)
├── Peck deck / fly na máquina
└── Pullover com halter

═══ COSTAS (back) ═══
COMPOSTOS:
├── Barra fixa (pull-up) [bodyweight]
├── Barra fixa supinada (chin-up) [bodyweight]
├── Remada curvada com barra (barbell row)
├── Remada curvada com halteres (dumbbell row)
├── Remada cavaleiro / T-bar row
├── Puxada frontal na polia (lat pulldown)
├── Puxada triângulo / pegada neutra
├── Remada baixa na polia (seated cable row)
└── Levantamento terra (deadlift) — se sem restrição lombar

ISOLAMENTO:
├── Pullover na polia
├── Remada alta com barra (upright row)
├── Puxada com braço reto (straight-arm pulldown)
└── Hiperextensão lombar (back extension)

═══ OMBROS (shoulders) ═══
COMPOSTOS:
├── Desenvolvimento militar com barra (overhead press)
├── Desenvolvimento com halteres (dumbbell shoulder press)
├── Desenvolvimento Arnold
├── Desenvolvimento no smith machine
└── Push press (força)

ISOLAMENTO:
├── Elevação lateral com halteres (lateral raise)
├── Elevação lateral na polia (cable lateral raise)
├── Elevação frontal com halteres (front raise)
├── Crucifixo inverso / reverse fly (rear delt)
├── Face pull na polia (face pull)
└── Rotação externa com elástico (rotator cuff)

═══ TRÍCEPS (triceps) ═══
├── Tríceps testa com barra EZ (skull crusher)
├── Tríceps na polia com corda (cable pushdown rope)
├── Tríceps na polia com barra reta (cable pushdown bar)
├── Tríceps francês com halter (overhead extension)
├── Tríceps coice com halter (kickback)
├── Mergulho no banco (bench dip) [bodyweight]
├── Mergulho nas paralelas (dips) [bodyweight]
└── Tríceps testa com halteres

═══ BÍCEPS (biceps) ═══
├── Rosca direta com barra reta (barbell curl)
├── Rosca direta com barra EZ (EZ bar curl)
├── Rosca alternada com halteres (alternating dumbbell curl)
├── Rosca martelo (hammer curl)
├── Rosca concentrada (concentration curl)
├── Rosca scott / banco preacher (preacher curl)
├── Rosca na polia baixa (cable curl)
├── Rosca inversa (reverse curl) — foco em antebraço
└── Rosca 21 (técnica avançada)

═══ QUADRÍCEPS (quads) ═══
COMPOSTOS:
├── Agachamento livre com barra (barbell back squat)
├── Agachamento frontal (front squat)
├── Agachamento goblet com halter/kettlebell
├── Agachamento no smith machine
├── Leg press 45° / horizontal
├── Hack squat na máquina
├── Agachamento búlgaro (bulgarian split squat)
├── Avanço / Passada (lunge) — frente, trás, lateral
└── Step-up em caixa

ISOLAMENTO:
├── Cadeira extensora (leg extension)
└── Sissy squat

═══ POSTERIORES DE COXA (hamstrings) ═══
COMPOSTOS:
├── Levantamento terra romeno (Romanian deadlift — RDL)
├── Levantamento terra romeno com halteres
├── Stiff com barra (stiff-legged deadlift)
├── Good morning (se sem restrição lombar)
└── Agachamento sumô

ISOLAMENTO:
├── Mesa flexora (lying leg curl)
├── Cadeira flexora sentado (seated leg curl)
├── Flexão nórdica (nordic curl) [bodyweight — avançado]
└── Ponte com barra (barbell hip thrust) — ênfase glúteo

═══ GLÚTEOS (glutes) ═══
├── Hip thrust com barra (barbell hip thrust)
├── Elevação pélvica (glute bridge) [bodyweight]
├── Abdução de quadril na máquina
├── Abdução de quadril na polia (cable kickback)
├── Agachamento sumô profundo
├── Stiff unilateral
├── Frog pump [bodyweight]
└── Clamshell com elástico (ativação)

═══ PANTURRILHA (calves) ═══
├── Elevação de panturrilha em pé (standing calf raise)
├── Elevação de panturrilha sentado (seated calf raise)
├── Elevação de panturrilha no leg press
├── Elevação de panturrilha unilateral
└── Panturrilha burro (donkey calf raise)

═══ ABDÔMEN (abs / core) ═══
├── Prancha frontal (plank) [bodyweight]
├── Prancha lateral (side plank) [bodyweight]
├── Abdominal supra (crunch)
├── Abdominal infra (leg raise / reverse crunch)
├── Abdominal oblíquo (Russian twist)
├── Abdominal na roda (ab wheel rollout)
├── Elevação de pernas na barra (hanging leg raise)
├── Pallof press na polia (anti-rotação)
├── Dead bug [bodyweight]
├── Bird dog [bodyweight]
└── Woodchop na polia

═══ ANTEBRAÇO (forearms) ═══
├── Rosca de punho com barra (wrist curl)
├── Rosca de punho inversa (reverse wrist curl)
├── Farmer's walk / caminhada do fazendeiro
└── Hang com barra fixa (dead hang)
```

## 2.4 LÓGICA DE MONTAGEM DO TREINO — PSEUDOCÓDIGO

```javascript
function generateWorkoutPlan(user) {
  // 1. DETERMINAR O SPLIT
  const split = determineSplit(user.daysPerWeek, user.level, user.goal);
  
  // 2. CRIAR SESSÕES DE TREINO
  const sessions = [];
  
  for (const day of split.sessions) {
    const session = {
      dayOfWeek: user.trainingDays[sessions.length],
      name: day.name,        // ex: "Push A", "Legs", "Full Body A"
      focus: day.muscles,    // ex: ["chest","shoulders","triceps"]
      warmup: generateWarmup(day.muscles, user),
      exercises: [],
      cooldown: generateCooldown(user),
      estimatedDuration: 0,
      totalVolume: 0
    };
    
    // 3. SELECIONAR EXERCÍCIOS PARA CADA GRUPO DA SESSÃO
    for (const muscle of day.muscles) {
      const exercises = selectExercises({
        muscle,
        goal: user.goal,
        level: user.level,
        equipment: user.equipment,
        injuries: user.injuries,
        isPrimary: day.primaryMuscles.includes(muscle),
        maxExercises: day.primaryMuscles.includes(muscle) ? 3 : 2
      });
      
      // 4. DEFINIR SÉRIES, REPS E DESCANSO POR EXERCÍCIO
      for (const exercise of exercises) {
        const prescription = calculatePrescription({
          exercise,
          goal: user.goal,
          level: user.level,
          sessionDuration: user.sessionDuration,
          techniques: user.techniques,
          isFirstExercise: session.exercises.length === 0
        });
        
        session.exercises.push({
          ...exercise,
          order: session.exercises.length + 1,
          sets: prescription.sets,
          reps: prescription.reps,       // ex: "8-12" ou "4x12,10,8,6" (pirâmide)
          rest: prescription.restSeconds, // em segundos
          tempo: prescription.tempo,      // ex: "3-1-2-0"
          rpe: prescription.rpe,          // Rating of Perceived Exertion (1-10)
          notes: prescription.notes,      // dicas específicas
          technique: prescription.technique // drop-set, rest-pause, etc.
        });
      }
    }
    
    // 5. CALCULAR DURAÇÃO ESTIMADA
    session.estimatedDuration = calculateDuration(session);
    
    // 6. AJUSTAR SE EXCEDER TEMPO DISPONÍVEL
    if (session.estimatedDuration > user.sessionDuration) {
      session = trimSession(session, user.sessionDuration);
    }
    
    sessions.push(session);
  }
  
  // 7. GERAR PLANO DE PERIODIZAÇÃO (4-6 semanas)
  const plan = {
    user: user.id,
    createdAt: new Date(),
    split: split.name,
    weeks: generatePeriodization(sessions, user),
    nutritionLink: linkToNutritionGoals(user), // INTEGRAÇÃO COM MÓDULO NUTRI
    deloadWeek: calculateDeloadWeek(user.level)
  };
  
  return plan;
}
```

## 2.5 REGRAS DE COMPOSIÇÃO DO TREINO

```
REGRA 1 — ORDEM DOS EXERCÍCIOS:
├── Primeiro: compostos multiarticulares pesados (squat, bench, deadlift, OHP)
├── Segundo: compostos auxiliares (variações, ângulos diferentes)
├── Terceiro: isolamento para músculos principais
├── Quarto: isolamento para músculos secundários
└── Último: core/abdômen (se incluído na sessão)

REGRA 2 — VOLUME SEMANAL POR GRUPO MUSCULAR (séries de trabalho):
╔═══════════════╦════════════╦══════════════╦══════════════╗
║ GRUPO         ║ INICIANTE  ║ INTERMEDIÁRIO║ AVANÇADO     ║
╠═══════════════╬════════════╬══════════════╬══════════════╣
║ Peito         ║ 10-12      ║ 14-18        ║ 18-22        ║
║ Costas        ║ 10-12      ║ 14-18        ║ 18-22        ║
║ Ombros        ║ 8-10       ║ 12-16        ║ 16-20        ║
║ Quadríceps    ║ 10-12      ║ 14-18        ║ 18-22        ║
║ Isquiotibiais ║ 8-10       ║ 10-14        ║ 14-18        ║
║ Glúteos       ║ 8-10       ║ 10-14        ║ 14-18        ║
║ Bíceps        ║ 6-8        ║ 10-14        ║ 14-18        ║
║ Tríceps       ║ 6-8        ║ 10-14        ║ 14-18        ║
║ Panturrilha   ║ 6-8        ║ 8-12         ║ 12-16        ║
║ Abdômen       ║ 6-8        ║ 8-12         ║ 12-16        ║
╚═══════════════╩════════════╩══════════════╩══════════════╝

REGRA 3 — FREQUÊNCIA SEMANAL POR GRUPO:
├── Mínimo: 1x/semana (aceitável apenas para manutenção)
├── Ideal para hipertrofia: 2x/semana (Schoenfeld et al., 2016)
├── Ideal para força: 2-3x/semana
└── Máximo: 4x/semana (apenas avançados com volume controlado)

REGRA 4 — PROGRESSÃO DE CARGA (sobrecarga progressiva):
├── Iniciante: +2,5kg (upper) / +5kg (lower) quando completar todas as reps
├── Intermediário: +1-2,5kg quando completar reps com RPE ≤ 8
├── Avançado: periodização ondulada (peso/reps variam por sessão)
├── REGRA DE OURO: se o exercício pede 3x10 e você faz 3x10 com facilidade
│   → na próxima semana suba a carga
└── Se falhar nas reps → manter carga até completar protocolo

REGRA 5 — DELOAD (semana de recuperação):
├── Iniciante: deload a cada 6-8 semanas
├── Intermediário: deload a cada 4-6 semanas
├── Avançado: deload a cada 3-4 semanas
├── Formato: reduzir volume em 40-50% mantendo intensidade (carga)
│   OU reduzir intensidade em 40-50% mantendo volume (séries/reps)
└── Durante deload: metas nutricionais permanecem iguais (manutenção)

REGRA 6 — RPE (Rating of Perceived Exertion):
├── Séries de aquecimento: RPE 5-6 (poderia fazer +5 reps)
├── Séries de trabalho compostos: RPE 7-8 (sobram 2-3 reps)
├── Séries de trabalho isolamento: RPE 8-9 (sobra 1-2 reps)
├── Última série (se AMRAP): RPE 9-10 (próximo da falha)
└── NUNCA treinar até falha MUSCULAR em compostos pesados (risco de lesão)
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 3 — INTEGRAÇÃO TREINO + NUTRIÇÃO (O DIFERENCIAL DO APP)
# ═══════════════════════════════════════════════════════════════════════

## 3.1 CÁLCULOS AUTOMÁTICOS BASEADOS NO PERFIL

```
FÓRMULAS QUE O SISTEMA DEVE IMPLEMENTAR:

1. TAXA METABÓLICA BASAL (TMB):

   Se user.bodyFat informado → Katch-McArdle:
   TMB = 370 + (21.6 × massa_magra_kg)
   massa_magra_kg = user.weight × (1 - user.bodyFat/100)

   Se NÃO informado → Harris-Benedict Revisada:
   Homens: TMB = 88.362 + (13.397 × peso_kg) + (4.799 × altura_cm) - (5.677 × idade)
   Mulheres: TMB = 447.593 + (9.247 × peso_kg) + (3.098 × altura_cm) - (4.330 × idade)

2. FATOR DE ATIVIDADE (baseado nos dias de treino + intensidade):
   ├── Sedentário (0 dias): 1.2
   ├── Levemente ativo (1-2 dias): 1.375
   ├── Moderadamente ativo (3-4 dias): 1.55
   ├── Muito ativo (5-6 dias): 1.725
   └── Extremamente ativo (6-7 dias + trabalho físico): 1.9

3. GASTO ENERGÉTICO TOTAL DIÁRIO (GET):
   GET = TMB × Fator_Atividade

4. META CALÓRICA CONFORME OBJETIVO:
   ├── Hipertrofia: GET + 300 a +500 kcal (superávit controlado)
   ├── Força: GET + 200 a +400 kcal (superávit moderado)
   ├── Emagrecimento: GET - 300 a -500 kcal (déficit moderado)
   │   → NUNCA abaixo de 1.200 kcal (mulheres) ou 1.500 kcal (homens)
   ├── Condicionamento: GET ± 0 (manutenção)
   └── Saúde: GET ± 0 a -200 kcal (leve déficit ou manutenção)

5. DISTRIBUIÇÃO DE MACRONUTRIENTES:

   ╔════════════════╦═══════════╦══════════╦══════════╦══════════╗
   ║ OBJETIVO       ║ PROTEÍNA  ║ CARBO    ║ GORDURA  ║ FIBRA    ║
   ╠════════════════╬═══════════╬══════════╬══════════╬══════════╣
   ║ Hipertrofia    ║ 1.8-2.2  ║ 4-6      ║ 0.8-1.0  ║ 25-35g   ║
   ║                ║ g/kg      ║ g/kg     ║ g/kg     ║          ║
   ╠════════════════╬═══════════╬══════════╬══════════╬══════════╣
   ║ Força          ║ 1.6-2.0  ║ 3-5      ║ 0.8-1.2  ║ 25-35g   ║
   ╠════════════════╬═══════════╬══════════╬══════════╬══════════╣
   ║ Emagrecimento  ║ 2.0-2.4  ║ 2-3      ║ 0.6-0.8  ║ 30-40g   ║
   ║                ║ (alto p/  ║ (baixo)  ║ (mínimo) ║ (sacied.)║
   ║                ║ preservar)║          ║          ║          ║
   ╠════════════════╬═══════════╬══════════╬══════════╬══════════╣
   ║ Condicionamento║ 1.4-1.8  ║ 4-6      ║ 0.8-1.0  ║ 25-30g   ║
   ╠════════════════╬═══════════╬══════════╬══════════╬══════════╣
   ║ Saúde geral    ║ 1.2-1.6  ║ 3-5      ║ 0.8-1.2  ║ 25-30g   ║
   ╚════════════════╩═══════════╩══════════╩══════════╩══════════╝

   EXEMPLO DE CÁLCULO COMPLETO:
   Homem, 80kg, 175cm, 25 anos, 15% gordura, hipertrofia, 5x/semana
   ├── Massa magra: 80 × (1-0.15) = 68kg
   ├── TMB (Katch-McArdle): 370 + (21.6 × 68) = 1.838,8 kcal
   ├── GET: 1.838,8 × 1.725 = 3.171,9 kcal
   ├── Meta calórica: 3.171,9 + 400 = ~3.570 kcal/dia
   ├── Proteína: 80 × 2.0 = 160g (640 kcal)
   ├── Gordura: 80 × 0.9 = 72g (648 kcal)
   ├── Calorias restantes p/ carbo: 3.570 - 640 - 648 = 2.282 kcal
   ├── Carboidrato: 2.282 / 4 = 570g
   └── Fibra: 30g/dia
```

## 3.2 NUTRIÇÃO PERIÓDICA (NUTRIÇÃO QUE MUDA COM O TREINO)

```
FEATURE PREMIUM — NUTRIÇÃO ADAPTATIVA:

DIA DE TREINO (training day):
├── Calorias: GET + superávit completo
├── Carboidrato: distribução concentrada pré e pós-treino
│   ├── Pré-treino (1-2h antes): 30-40% do carbo total do dia
│   ├── Pós-treino (até 2h depois): 25-35% do carbo total do dia
│   └── Restante: distribuído nas outras refeições
├── Proteína: distribuída igualmente entre todas as refeições (20-40g por refeição)
└── Alertas:
    ├── "Você treina hoje! Priorize carboidratos no pré-treino"
    ├── "Pós-treino: uma boa fonte de proteína + carbo acelerará sua recuperação"
    └── "Hidratação: beba pelo menos 500ml de água durante o treino"

DIA DE DESCANSO (rest day):
├── Calorias: GET (sem superávit) ou GET - 100 a -200 kcal
├── Carboidrato: reduzido em 15-25% comparado ao dia de treino
├── Gordura: levemente aumentada para compensar (saciedade)
├── Proteína: IGUAL ao dia de treino (recuperação muscular continua)
└── Alertas:
    ├── "Dia de descanso — seu corpo está se recuperando do treino de ontem"
    ├── "Mantenha a proteína alta mesmo sem treinar"
    └── "Foco em alimentos anti-inflamatórios: frutas vermelhas, peixes, vegetais"

DIA DE DELOAD:
├── Calorias: GET (manutenção)
├── Macros: distribuição padrão
└── Alertas:
    ├── "Semana de deload — coma na manutenção para otimizar a recuperação"
    └── "Boa semana para incluir mais vegetais e micronutrientes"
```

## 3.3 ALERTAS INTELIGENTES DO "NUTRICIONISTA + PERSONAL"

```
O sistema deve emitir alertas contextuais combinando TREINO + NUTRIÇÃO:

ALERTA 1 — Proteína insuficiente no pós-treino:
├── Trigger: usuário registra refeição pós-treino com < 20g proteína
├── Tipo: warning (amarelo)
└── Mensagem: "Seu pós-treino de [nome do treino] pede pelo menos 20-30g de
    proteína para otimizar a recuperação muscular. Considere adicionar
    frango, ovos, whey ou iogurte grego."

ALERTA 2 — Treino de pernas + carbo baixo:
├── Trigger: dia de treino de pernas/lower + carbo < 50% da meta
├── Tipo: warning
└── Mensagem: "Hoje é dia de pernas — o treino mais exigente da semana.
    Você está com apenas X% do carbo diário. Considere uma refeição
    rica em carboidratos complexos antes do treino."

ALERTA 3 — Déficit calórico excessivo + treino pesado:
├── Trigger: déficit > 700 kcal em dia de treino
├── Tipo: danger (vermelho)
└── Mensagem: "Atenção: seu déficit calórico hoje está muito alto para um
    dia de treino de [grupo muscular]. Isso pode prejudicar seu desempenho
    e recuperação. Coma pelo menos mais Xg de carboidrato."

ALERTA 4 — Dia de descanso + excesso calórico:
├── Trigger: dia de descanso + calorias > GET + 300
├── Tipo: info (azul)
└── Mensagem: "Hoje é dia de descanso e você já ultrapassou sua meta
    calórica em X kcal. Considere que os dias sem treino pedem
    menos calorias para evitar acúmulo de gordura."

ALERTA 5 — Streak de consistência:
├── Trigger: usuário registra treino + refeições por 7 dias seguidos
├── Tipo: success (verde)
└── Mensagem: "🔥 7 dias seguidos de treino + dieta no alvo!
    Sua consistência está construindo resultados. Continue assim!"

ALERTA 6 — Sugestão de suplementação contextual:
├── Trigger: usuário não atinge meta de proteína por 3 dias consecutivos
├── Tipo: suggestion (roxo)
└── Mensagem: "Você tem tido dificuldade em atingir sua meta de proteína.
    Considere incluir um suplemento de whey protein (25-30g por dose)
    como complemento — não substituto — das refeições."

ALERTA 7 — Lembrete de hidratação:
├── Trigger: 30 minutos antes do horário preferido de treino
├── Tipo: reminder
└── Mensagem: "Seu treino de [nome] começa em 30 minutos.
    Beba 300-500ml de água agora para chegar hidratado."
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 4 — INTERFACE DO MÓDULO DE TREINO (UI/UX)
# ═══════════════════════════════════════════════════════════════════════

## 4.1 TELA DO PLANO DE TREINO SEMANAL (VISÃO CALENDÁRIO)

```
LAYOUT — VISÃO SEMANAL:

┌─────────────────────────────────────────────────────────┐
│ ← Semana 3 de 6                         [Editar plano] │
│                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌────┐│
│ │ SEG │ │ TER │ │ QUA │ │ QUI │ │ SEX │ │ SÁB │ │DOM ││
│ │PUSH │ │PULL │ │REST │ │LEGS │ │UPPER│ │REST │ │REST││
│ │ ✅  │ │ ✅  │ │ 😴 │ │ 🏋️  │ │     │ │     │ │    ││
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └────┘│
│                                                         │
│ HOJE — QUINTA (LEGS)                                    │
│ ┌──────────────────────────────────────────────────────┐│
│ │ 🏋️ Treino de Pernas                      ~65 min   ││
│ │                                                      ││
│ │ 🔥 Aquecimento (8 min)                              ││
│ │   • Mobilidade de quadril — 2 min                   ││
│ │   • Agachamento sem peso — 2x15                     ││
│ │   • Ativação de glúteo — 2x12                       ││
│ │                                                      ││
│ │ 💪 Treino Principal                                  ││
│ │   1. Agachamento livre      4x8-10  ⏱️ 120s  RPE 8  ││
│ │   2. Leg press 45°          4x10-12 ⏱️ 90s   RPE 8  ││
│ │   3. Stiff com barra        3x10-12 ⏱️ 90s   RPE 7  ││
│ │   4. Cadeira extensora      3x12-15 ⏱️ 60s   RPE 8  ││
│ │   5. Mesa flexora           3x12-15 ⏱️ 60s   RPE 8  ││
│ │   6. Panturrilha em pé      4x15-20 ⏱️ 45s   RPE 9  ││
│ │                                                      ││
│ │ 🧊 Volta à calma (5 min)                            ││
│ │   • Alongamento posterior — 30s cada lado            ││
│ │   • Alongamento quadríceps — 30s cada lado           ││
│ │                                                      ││
│ │ [▶ INICIAR TREINO]                                   ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ 📊 RESUMO NUTRICIONAL DO DIA                           │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Dia de treino (pernas) — Calorias recomendadas: 3570 ││
│ │ Pré-treino: Priorize 150g de carbo complexo         ││
│ │ Pós-treino: 30g proteína + 60g carbo rápido         ││
│ │ [Ver detalhes nutricionais →]                        ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 4.2 TELA DE EXECUÇÃO DO TREINO (PLAYER MODE)

```
PLAYER DE TREINO — TELA DURANTE A EXECUÇÃO:

┌─────────────────────────────────────────────────────────┐
│ TREINO DE PERNAS — Exercício 1 de 6          ⏱️ 12:34  │
│                                                         │
│              ┌─────────────────────┐                    │
│              │                     │                    │
│              │   [GIF/ANIMAÇÃO     │                    │
│              │    DO EXERCÍCIO]    │                    │
│              │                     │                    │
│              └─────────────────────┘                    │
│                                                         │
│          AGACHAMENTO LIVRE COM BARRA                    │
│                                                         │
│          Série 2 de 4    │    8-10 repetições           │
│                                                         │
│     ┌──────────────────────────────────┐                │
│     │  Série 1:  10 reps ✅ 80kg       │                │
│     │  Série 2:  [  ] reps [  ] kg     │  ← atual      │
│     │  Série 3:  — reps — kg           │                │
│     │  Série 4:  — reps — kg           │                │
│     └──────────────────────────────────┘                │
│                                                         │
│     RPE alvo: 8  │  Tempo: 3-1-2-0  │  Descanso: 120s  │
│                                                         │
│     💡 "Mantenha as escápulas retraídas e o core        │
│         ativado durante todo o movimento"               │
│                                                         │
│     ┌──────────────┐  ┌──────────────┐                  │
│     │ ← ANTERIOR   │  │  COMPLETAR ✓ │                  │
│     └──────────────┘  └──────────────┘                  │
│                                                         │
│     Ao completar → Timer de descanso inicia automatico  │
│     ┌──────────────────────────────────┐                │
│     │      ⏱️ DESCANSO: 01:48          │                │
│     │      ████████████░░░░░            │                │
│     │      [Pular descanso]             │                │
│     └──────────────────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

## 4.3 TELA DE PROGRESSO E EVOLUÇÃO

```
DASHBOARD DE PROGRESSO:

┌─────────────────────────────────────────────────────────┐
│ 📊 MEU PROGRESSO                            [Período ▼]│
│                                                         │
│ ┌─── MÉTRICAS CORPORAIS ───────────────────────────────┐│
│ │ Peso: 80.5kg → 79.2kg (▼1.3kg em 4 semanas)        ││
│ │ [Gráfico de linha do peso ao longo das semanas]      ││
│ │                                                      ││
│ │ Medidas (se informadas):                             ││
│ │ Braço: 35cm → 36cm ▲  │  Cintura: 85cm → 82cm ▼    ││
│ │ Coxa: 58cm → 59cm ▲   │  Quadril: 95cm → 94cm ▼    ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─── PERFORMANCE NO TREINO ────────────────────────────┐│
│ │ Recordes pessoais recentes:                          ││
│ │ 🏆 Supino reto: 80kg → 85kg (+5kg!)                 ││
│ │ 🏆 Agachamento: 100kg → 110kg (+10kg!)              ││
│ │ 🏆 Terra: 120kg → 130kg (+10kg!)                    ││
│ │                                                      ││
│ │ Volume total semanal:                                ││
│ │ [Gráfico de barras — volume por grupo muscular]      ││
│ │ Peito ████████████ 18 séries                         ││
│ │ Costas ██████████████ 20 séries                      ││
│ │ Pernas █████████████████ 24 séries                   ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─── ADERÊNCIA ────────────────────────────────────────┐│
│ │ Treinos planejados: 20  │  Realizados: 18 (90%) ✅  ││
│ │ Refeições registradas: 85  │  No alvo: 72 (85%)     ││
│ │ Streak atual: 🔥 12 dias                             ││
│ │ [Heatmap de aderência — estilo GitHub]               ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─── COMPARAÇÃO FOTO (PREMIUM) ────────────────────────┐│
│ │ [Foto Semana 1]  ←→  [Foto Semana 4]                ││
│ │ Slider de comparação side-by-side                    ││
│ │ [Adicionar foto desta semana 📷]                     ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 4.4 BOTTOM NAV ATUALIZADA (com módulo de treino)

```
BOTTOM NAVIGATION — 5 ABAS:
┌────────┬────────┬──────────┬────────┬────────┐
│ 🏠     │ 🏋️     │   📷     │ 📊     │ 👤    │
│ Home   │ Treino │ Analisar │ Progres│ Perfil │
└────────┴────────┴──────────┴────────┴────────┘

🏠 Home → Dashboard resumido (hoje: treino + nutrição + streak)
🏋️ Treino → Plano semanal + player de treino + histórico
📷 Analisar → Câmera para análise nutricional da foto
📊 Progresso → Gráficos de evolução (peso, medidas, cargas, aderência)
👤 Perfil → Dados pessoais, metas, plano, configurações
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 5 — PERIODIZAÇÃO E INTELIGÊNCIA DO PLANO
# ═══════════════════════════════════════════════════════════════════════

## 5.1 PERIODIZAÇÃO AUTOMÁTICA

```
O sistema gera planos de 4 a 8 semanas com progressão automática:

PERIODIZAÇÃO LINEAR (para iniciantes):
├── Semana 1-2: Adaptação (RPE 6-7, aprender movimentos)
├── Semana 3-4: Progressão (RPE 7-8, aumentar cargas 5-10%)
├── Semana 5-6: Intensificação (RPE 8-9, cargas mais altas)
├── Semana 7: Pico (RPE 9, máximo do mesociclo)
└── Semana 8: DELOAD (RPE 5-6, volume reduzido 50%)

PERIODIZAÇÃO ONDULADA DIÁRIA (para intermediários/avançados):
├── Segunda (Push): Volume alto — 4x12 @ 65-70%
├── Terça (Pull): Força — 5x5 @ 80-85%
├── Quinta (Legs): Hipertrofia — 3x8-10 @ 70-75%
├── Sexta (Upper): Potência — 6x3 @ 85-90%
└── Cada semana: mesma estrutura mas cargas progridem 2-5%

PERIODIZAÇÃO POR BLOCO (para avançados):
├── Bloco 1 (3 semanas): Acumulação — volume alto, carga moderada
├── Bloco 2 (3 semanas): Transmutação — volume moderado, carga alta
├── Bloco 3 (2 semanas): Realização — volume baixo, carga máxima
└── Bloco 4 (1 semana): Deload — recuperação total
```

## 5.2 SUBSTITUIÇÃO INTELIGENTE DE EXERCÍCIOS

```
O sistema deve permitir trocar exercícios COM INTELIGÊNCIA:

QUANDO O USUÁRIO TOCA EM UM EXERCÍCIO → MODAL:
├── "Trocar exercício"
├── Sistema sugere 3-5 alternativas baseadas em:
│   ├── Mesmo padrão de movimento (push, pull, hinge, squat, carry)
│   ├── Mesmo grupo muscular primário
│   ├── Compatível com equipamentos disponíveis
│   ├── Compatível com restrições/lesões
│   └── Nível de dificuldade similar ou menor
├── Exemplo: Usuário quer trocar "Supino reto com barra"
│   → Sugestões:
│   ├── Supino reto com halteres (mesmo ângulo, diferente estabilização)
│   ├── Supino no smith machine (mais seguro, mesmo padrão)
│   ├── Flexão de braço (bodyweight, mesmo push horizontal)
│   └── Chest press na máquina (isolamento do mesmo padrão)
└── Após troca: o volume e a prescrição se ajustam automaticamente
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 6 — REGRAS DE NEGÓCIO FREE vs PREMIUM
# ═══════════════════════════════════════════════════════════════════════

```
╔════════════════════════════════╦═══════════╦══════════════╗
║ FUNCIONALIDADE                 ║ FREE      ║ PREMIUM      ║
╠════════════════════════════════╬═══════════╬══════════════╣
║ Questionário de perfil         ║ ✅ Sim    ║ ✅ Sim       ║
║ Geração do plano de treino     ║ ✅ 1x     ║ ✅ Ilimitado ║
║ Visualizar treino do dia       ║ ✅ Sim    ║ ✅ Sim       ║
║ Player de treino (execução)    ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Timer de descanso              ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Registro de cargas/reps        ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Histórico de treinos           ║ ❌ Bloq.  ║ ✅ Completo  ║
║ Troca de exercícios            ║ ❌ Bloq.  ║ ✅ Ilimitado ║
║ Periodização automática        ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Gráficos de evolução           ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Comparação de fotos            ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Alertas nutri + treino         ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Nutrição periódica             ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Exportar treino em PDF         ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Análise de fotos (nutrição)    ║ 3 grátis  ║ ✅ Ilimitado ║
║ Metas personalizadas           ║ ❌ Bloq.  ║ ✅ Sim       ║
║ Suporte a múltiplos planos     ║ ❌ Bloq.  ║ ✅ Sim       ║
╚════════════════════════════════╩═══════════╩══════════════╝

REGRA DO FREE PARA TREINO:
├── O usuário FREE pode preencher o questionário e VER o plano gerado
├── Ao clicar em "Iniciar Treino" → tela de upgrade
├── Ao clicar em qualquer feature premium → tela de upgrade
├── O plano gerado funciona como "isca" — mostra o valor antes de cobrar
└── Pode gerar o plano apenas 1 vez — para gerar outro → upgrade

COPY DA TELA DE UPGRADE (treino):
├── Título: "Seu plano está pronto! Desbloqueie para começar"
├── Subtítulo: "Treino personalizado + nutrição integrada"
├── Preview do plano (blur + overlay)
├── Benefícios:
│   ├── "Player de treino com timer automático"
│   ├── "Registro de cargas e evolução"
│   ├── "Periodização que se adapta ao seu progresso"
│   └── "Alertas de nutrição pré e pós-treino"
└── CTA: "Desbloquear agora — R$ X,XX/mês"
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 7 — ESTRUTURA TÉCNICA DE ARQUIVOS
# ═══════════════════════════════════════════════════════════════════════

```
NOVOS ARQUIVOS A CRIAR (além dos já existentes do módulo nutri):

js/
├── workout-questionnaire.js   (etapas do questionário, coleta de dados)
├── workout-engine.js          (algoritmo de geração do plano)
├── workout-player.js          (player de treino, timer, registro)
├── workout-progress.js        (gráficos, recordes, evolução)
├── exercise-database.js       (banco completo de 200+ exercícios)
├── periodization.js           (lógica de periodização linear/ondulada/bloco)
├── nutrition-integration.js   (cálculos TMB/GET, nutrição periódica, alertas)
└── pdf-export.js              (geração de PDF do treino — premium)

css/
├── workout.css                (estilos específicos do módulo de treino)
├── player.css                 (player de execução, timer, registro)
└── progress.css               (gráficos, dashboard, heatmap)

data/
└── exercises.json             (banco de dados de exercícios — JSON estático)
```

---

# ═══════════════════════════════════════════════════════════════════════
# SEÇÃO 8 — CHECKLIST FINAL DE IMPLEMENTAÇÃO
# ═══════════════════════════════════════════════════════════════════════

```
FASE 1 — FUNDAÇÃO (prioridade máxima):
□ Banco de exercícios JSON com 200+ exercícios categorizados
□ Questionário de 7 etapas com validação e animações
□ Algoritmo de seleção de split baseado no perfil
□ Algoritmo de geração do plano (exercícios + séries + reps + descanso)
□ Lógica de exclusão por lesões e substituição inteligente

FASE 2 — NUTRIÇÃO INTEGRADA:
□ Fórmulas TMB (Harris-Benedict + Katch-McArdle)
□ Cálculo automático de macros baseado no objetivo
□ Nutrição periódica (dia de treino vs dia de descanso)
□ Alertas cruzados treino + nutrição (7 tipos)
□ Sincronização das metas nutricionais com o plano de treino

FASE 3 — INTERFACE:
□ Tela do plano semanal (visão calendário com cards por dia)
□ Player de treino com timer automático e registro de séries
□ Modal de troca de exercício com sugestões inteligentes
□ Dashboard de progresso (peso, medidas, cargas, aderência)
□ Heatmap de consistência (estilo GitHub)
□ Bottom nav atualizada com 5 abas

FASE 4 — PERIODIZAÇÃO:
□ Periodização linear automática (iniciantes)
□ Periodização ondulada diária (intermediários)
□ Periodização por bloco (avançados)
□ Semana de deload automática
□ Progressão de carga automática baseada em registro

FASE 5 — PREMIUM FEATURES:
□ Exportação do plano em PDF personalizado (com logo do app)
□ Comparação de fotos side-by-side (antes/depois)
□ Gráficos de evolução de 1RM estimado por exercício
□ Suporte a múltiplos planos simultâneos
□ Sugestão de suplementação contextual (whey, creatina, etc.)

FASE 6 — POLIMENTO:
□ Animações de transição entre telas (slide horizontal)
□ Haptic feedback ao completar série (se mobile)
□ Sons sutis de confirmação (timer, série completa, PR batido)
□ Skeleton loading em todas as telas de dados
□ PWA: funcionar offline (plano do dia cacheado no Service Worker)
□ Acessibilidade: aria-labels, contraste WCAG AA, focus visible
```

---

> **INSTRUÇÃO FINAL AO DESENVOLVEDOR:**
>
> Este prompt cobre a implementação completa de um módulo de treino fitness
> integrado ao app de análise nutricional por foto.
>
> PRIORIDADES:
> 1. O banco de exercícios DEVE ser extenso e cientificamente correto
> 2. A lógica de lesões DEVE excluir exercícios perigosos sem exceção
> 3. A integração nutrição + treino é o DIFERENCIAL — não pode ser superficial
> 4. O player de treino deve funcionar como um personal trainer digital
> 5. A periodização deve ser automática e baseada em ciência (Schoenfeld, Helms)
> 6. O modelo freemium deve mostrar valor ANTES de cobrar (isca do plano gratuito)
>
> Pense como 3 profissionais trabalhando juntos:
> - Um engenheiro sênior que preza por código limpo e performance
> - Um educador físico CREF que segue as diretrizes do ACSM e NSCA
> - Um nutricionista CRN que aplica nutrição baseada em evidências
>
> O resultado final deve ser indistinguível de um app profissional de mercado
> como SmartFit, Freeletics ou JEFIT — mas com a integração nutricional
> que nenhum deles oferece.
