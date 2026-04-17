import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import { getMasterTier } from "../lib/master-emails.js";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function resolveSubTier(userId?: string, sessionId?: string): Promise<"free" | "limited" | "unlimited"> {
  if (userId) {
    const sub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (sub) return sub.tier as "free" | "limited" | "unlimited";
  }
  if (sessionId) {
    const sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
    if (sub) return sub.tier as "free" | "limited" | "unlimited";
  }
  return "free";
}

// POST /api/chat
// Body: { sessionId: string, messages: [{role: "user"|"assistant", content: string}] }
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, messages, tzOffset: rawTzOffset, foodPrefs, supportMode } = req.body as {
    sessionId?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    tzOffset?: number;
    foodPrefs?: Record<string, string[]>;
    supportMode?: boolean;
  };
  // tzOffset: minutes behind UTC (e.g. 180 for UTC-3 Brazil)
  const tzOffset = Math.max(-840, Math.min(840, Number(rawTzOffset) || 0));
  const tzOffsetMs = tzOffset * 60 * 1000;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "bad_request", message: "messages are required" });
    return;
  }

  // Limit history to last 20 messages to avoid token bloat
  const trimmedMessages = messages.slice(-20);

  const masterTier = getMasterTier(req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);

  // Build context using local timezone
  // tzOffsetMs converts UTC to local: local_midnight_UTC = UTC_midnight + tzOffsetMs
  const localNow = new Date(Date.now() - tzOffsetMs); // current moment in local "UTC" frame
  const todayStart  = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(),     0, 0, 0, 0) + tzOffsetMs);
  const todayEnd    = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + 1, 0, 0, 0, 0) + tzOffsetMs);
  const yesterStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() - 1, 0, 0, 0, 0) + tzOffsetMs);
  const weekStart   = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() - 6, 0, 0, 0, 0) + tzOffsetMs);

  type MealRow = { dishName: string; calories: number; protein: number; carbs: number; fat: number; fiber: number | null };
  let todayAnalyses: MealRow[] = [];
  let yesterdayAnalyses: MealRow[] = [];
  let weekAnalyses: MealRow[] = [];
  let goals: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; objective: string | null; mealsPerDay: number | null } | null = null;

  const mealCols = { dishName: true, calories: true, protein: true, carbs: true, fat: true, fiber: true } as const;

  try {
    if (userId) {
      [todayAnalyses, yesterdayAnalyses, weekAnalyses] = await Promise.all([
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, todayStart),  lt(analysesTable.createdAt, todayEnd)),  columns: mealCols }),
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, yesterStart), lt(analysesTable.createdAt, todayStart)), columns: mealCols }),
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, weekStart),   lt(analysesTable.createdAt, todayStart)), columns: mealCols, limit: 200 }),
      ]);
    } else if (sessionId) {
      [todayAnalyses, yesterdayAnalyses, weekAnalyses] = await Promise.all([
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, todayStart),  lt(analysesTable.createdAt, todayEnd)),  columns: mealCols }),
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, yesterStart), lt(analysesTable.createdAt, todayStart)), columns: mealCols }),
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, weekStart),   lt(analysesTable.createdAt, todayStart)), columns: mealCols, limit: 200 }),
      ]);
    }

    const goalsRow = userId
      ? await db.query.goalsTable.findFirst({ where: eq(goalsTable.userId, userId), orderBy: (t, { desc: d }) => [d(t.updatedAt)] })
      : sessionId ? await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId!) }) : null;

    if (goalsRow) {
      goals = { calories: goalsRow.calories ?? null, protein: goalsRow.protein ?? null, carbs: goalsRow.carbs ?? null, fat: goalsRow.fat ?? null, fiber: goalsRow.fiber ?? null, objective: goalsRow.objective ?? null, mealsPerDay: goalsRow.mealsPerDay ?? null };
    }
  } catch {
    // Context fetch failed — continue without it
  }

  // ─── Totals (needed by both situation detection and context builder) ──────────
  const sum = (meals: MealRow[]) => meals.reduce((a, m) => ({
    calories: a.calories + m.calories,
    protein:  a.protein  + m.protein,
    carbs:    a.carbs    + m.carbs,
    fat:      a.fat      + m.fat,
    fiber:    a.fiber    + (m.fiber ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const todayTotals     = sum(todayAnalyses);
  const yesterdayTotals = sum(yesterdayAnalyses);

  // ─── Behavioral pattern detection ────────────────────────────────────────────
  let lastAnalysisDate: Date | null = null;
  let totalAnalysesCount = 0;
  let streakDays = 0;

  try {
    const dateCols = { createdAt: true } as const;
    let recentRows: { createdAt: Date }[] = [];

    if (userId) {
      recentRows = await db.query.analysesTable.findMany({
        where: eq(analysesTable.userId, userId),
        orderBy: [desc(analysesTable.createdAt)],
        limit: 90,
        columns: dateCols,
      });
    } else if (sessionId) {
      recentRows = await db.query.analysesTable.findMany({
        where: eq(analysesTable.sessionId, sessionId!),
        orderBy: [desc(analysesTable.createdAt)],
        limit: 90,
        columns: dateCols,
      });
    }

    totalAnalysesCount = recentRows.length;
    if (recentRows.length > 0) lastAnalysisDate = recentRows[0].createdAt;

    // Compute streak: consecutive days with ≥1 analysis going back from today
    const daySet = new Set(recentRows.map(r => {
      const d = new Date(r.createdAt.getTime() - tzOffsetMs);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    }));
    const todayKey = `${localNow.getUTCFullYear()}-${localNow.getUTCMonth()}-${localNow.getUTCDate()}`;
    let checkDay = new Date(localNow);
    while (true) {
      const key = `${checkDay.getUTCFullYear()}-${checkDay.getUTCMonth()}-${checkDay.getUTCDate()}`;
      if (daySet.has(key)) {
        streakDays++;
        checkDay = new Date(checkDay.getTime() - 86400000);
      } else {
        // Allow today if no log yet
        if (key === todayKey && todayAnalyses.length === 0) {
          checkDay = new Date(checkDay.getTime() - 86400000);
          continue;
        }
        break;
      }
      if (streakDays > 365) break;
    }
  } catch {
    // Continue without behavioral data
  }

  // ─── Situation taxonomy ───────────────────────────────────────────────────────
  const msPerDay = 86400000;
  const realNow = new Date();
  const daysSinceLastLog = lastAnalysisDate !== null
    ? Math.floor((realNow.getTime() - lastAnalysisDate.getTime()) / msPerDay)
    : null;

  const localHour = localNow.getUTCHours();
  const isNewUser        = totalAnalysesCount <= 3;
  const isLongAbsent     = !isNewUser && daysSinceLastLog !== null && daysSinceLastLog >= 3;
  const returnedToday    = isLongAbsent && todayAnalyses.length > 0;
  const goalsCalories    = goals?.calories ?? null;
  const todayCalPct      = goalsCalories && todayTotals.calories > 0
    ? todayTotals.calories / goalsCalories : null;
  const isOverGoal       = todayCalPct !== null && todayCalPct > 1.2;
  const isUnderGoal      = todayCalPct !== null && todayCalPct < 0.55 && todayAnalyses.length > 0;
  const isOnTrack        = todayCalPct !== null && todayCalPct >= 0.55 && todayCalPct <= 1.2;
  const isLateNight      = localHour >= 21 || localHour < 5;
  const isEvening        = localHour >= 18 && localHour < 21;
  const mealsPerDay      = goals?.mealsPerDay ?? 3;
  const missingMeals     = Math.max(0, mealsPerDay - todayAnalyses.length);

  let situationBlock = "";

  if (isNewUser) {
    situationBlock = `
SITUAÇÃO DETECTADA → USUÁRIO NOVO (${totalAnalysesCount} registro(s) no total)
Esta pessoa está dando os primeiros passos. Prioridade: fazê-la sentir que está no lugar certo. Celebre o fato de estar usando o app — registrar já é o maior obstáculo. Não sobrecarregue com informações. Se ela perguntar algo técnico, simplifique ao máximo. Tom: acolhedor, animado, sem pressão.`;

  } else if (isLongAbsent && returnedToday) {
    situationBlock = `
SITUAÇÃO DETECTADA → RETORNO APÓS ${daysSinceLastLog} DIA(S) DE AUSÊNCIA — e já registrou algo hoje
Ela sumiu por ${daysSinceLastLog} dias, mas VOLTOU — e a primeira coisa que fez foi registrar. Isso é enorme. Demonstre alívio genuíno pela volta, sem drama e sem cobrar a ausência. Não diga "sumiu" ou "cadê você". Foque em reconhecer o gesto de voltar e ajudar a retomar o ritmo sem pressão. Tom: aliviado, encorajador, sem julgamento.`;

  } else if (isLongAbsent && todayAnalyses.length === 0) {
    situationBlock = `
SITUAÇÃO DETECTADA → ${daysSinceLastLog} DIA(S) SEM REGISTRAR — abriu o app mas ainda não registrou hoje
Ela abriu o app depois de ${daysSinceLastLog} dias. Isso já é um sinal de intenção. Não mencione a ausência como falha — não pergunte "por que sumiu?". Ofereça a ação mínima para ela começar: "fotografa o próximo lanche, isso já conta". Se ela estiver conversando com você, provavelmente está procurando motivação ou permissão para recomeçar — dê isso a ela. Tom: gentil, prático, sem peso.`;

  } else if (!isNewUser && daysSinceLastLog === 1 && todayAnalyses.length === 0) {
    situationBlock = `
SITUAÇÃO DETECTADA → NÃO REGISTROU ONTEM E AINDA NÃO REGISTROU HOJE
Pode ser correria ou pode ser que desanimou. Não julgue nem dramatize. Se for ${isLateNight ? "noite" : isEvening ? "fim de tarde" : "início de dia"}, ajuste o tom: ${isLateNight || isEvening ? "o dia praticamente passou — ajude a planejar amanhã, sem culpa pelo hoje." : "o dia ainda é longo — encoraje o próximo registro de forma leve."}`;

  } else if (todayAnalyses.length === 0 && !isNewUser && !isLongAbsent) {
    situationBlock = `
SITUAÇÃO DETECTADA → SEM REGISTRO HOJE (usuário ativo, streak de ${streakDays} dias)
${isLateNight || isEvening
  ? `Já é ${isLateNight ? "noite" : "fim de tarde"} e nada registrado hoje. Não cobre — pode ter sido um dia difícil. Mencione de forma leve que ainda dá para registrar o jantar se quiser, mas sem pressão.`
  : `Ainda é cedo para o dia. Pode não ter comido ainda ou não ter registrado. Tom encorajador — o dia ainda está inteiro.`}`;

  } else if (isOverGoal) {
    const excessKcal = Math.round(todayTotals.calories - (goalsCalories ?? todayTotals.calories));
    situationBlock = `
SITUAÇÃO DETECTADA → ACIMA DA META CALÓRICA HOJE (+${excessKcal} kcal além da meta de ${goalsCalories} kcal)
Não minimize, mas não dramatize. Honestidade com humor leve quando cabível. Foque no que ainda dá para fazer: jantar mais leve, hidratação, retomar amanhã. NUNCA sugira compensação severa (jejum, restrição drástica) — isso é gatilho de desistência. Tom: honesto, prático, sem alarme.`;

  } else if (isUnderGoal) {
    situationBlock = `
SITUAÇÃO DETECTADA → COMENDO POUCO (${Math.round(todayTotals.calories)} kcal, menos de 55% da meta de ${goalsCalories} kcal)
Comer muito pouco é tão problemático quanto comer demais. Pode ser correria, estresse ou tentativa de restrição excessiva. Pergunte com cuidado se está tudo bem — pode ser só correria. Sugira algo prático e rápido para complementar. Tom: preocupado mas sem alarme, prático.`;

  } else if (isOnTrack && missingMeals > 0) {
    situationBlock = `
SITUAÇÃO DETECTADA → DIA NO CAMINHO CERTO — ainda faltam ${missingMeals} refeição(ões) para registrar
Está indo bem. Reforce o positivo. Mencione de forma leve e sem cobrança que ainda faltam refeições para completar o dia — não como obrigação, mas como convite. Tom: encorajador, leve.`;

  } else if (isOnTrack && missingMeals === 0) {
    situationBlock = `
SITUAÇÃO DETECTADA → DIA COMPLETO E DENTRO DA META${streakDays >= 7 ? ` — streak de ${streakDays} dias!` : ""}
${streakDays >= 7 ? `Streak impressionante de ${streakDays} dias. Celebre genuinamente — esse nível de consistência já é excepcional. Ela está criando um hábito real.` : "Completou o dia dentro da meta. Celebre sem exagero — reforce que consistência é o que muda o resultado no longo prazo."}`;

  } else if (streakDays >= 7) {
    situationBlock = `
SITUAÇÃO DETECTADA → USUÁRIO CONSISTENTE (streak de ${streakDays} dias)
Esta pessoa está comprometida de verdade. Reconheça isso — não de forma genérica ("parabéns!"), mas específica para o momento dela. Ela merece insights mais avançados se perguntar algo técnico.`;
  }

  const contextParts: string[] = [];

  // Today
  if (todayAnalyses.length > 0) {
    contextParts.push(`Refeições de HOJE (${todayAnalyses.length}): ${todayAnalyses.map(m => m.dishName).join(", ")}`);
    contextParts.push(`Consumido hoje: ${Math.round(todayTotals.calories)} kcal | Prot ${todayTotals.protein.toFixed(1)}g | Carbs ${todayTotals.carbs.toFixed(1)}g | Gord ${todayTotals.fat.toFixed(1)}g | Fibras ${todayTotals.fiber.toFixed(1)}g`);
  } else {
    contextParts.push("Hoje: nenhuma refeição registrada ainda.");
  }

  // Yesterday
  if (yesterdayAnalyses.length > 0) {
    contextParts.push(`Refeições de ONTEM (${yesterdayAnalyses.length}): ${yesterdayAnalyses.map(m => m.dishName).join(", ")}`);
    contextParts.push(`Consumido ontem: ${Math.round(yesterdayTotals.calories)} kcal | Prot ${yesterdayTotals.protein.toFixed(1)}g | Carbs ${yesterdayTotals.carbs.toFixed(1)}g | Gord ${yesterdayTotals.fat.toFixed(1)}g | Fibras ${yesterdayTotals.fiber.toFixed(1)}g`);
    if (goals?.calories) {
      const diff = yesterdayTotals.calories - goals.calories;
      if (diff < -50) contextParts.push(`Ontem o usuário ficou ${Math.abs(Math.round(diff))} kcal abaixo da meta calórica.`);
      else if (diff > 50) contextParts.push(`Ontem o usuário consumiu ${Math.round(diff)} kcal acima da meta calórica.`);
      else contextParts.push("Ontem o usuário bateu a meta calórica.");
    }
  }

  // Last 7 days (excluding today)
  if (weekAnalyses.length > 0) {
    const weekTotals = weekAnalyses.reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein }), { calories: 0, protein: 0 });
    const weekDaysWithData = Math.min(6, new Set(weekAnalyses.map((m: any) => (m as any).createdAt?.toISOString?.()?.slice(0,10) ?? '')).size || Math.ceil(weekAnalyses.length / 3));
    const avgCal = Math.round(weekTotals.calories / Math.max(weekDaysWithData, 1));
    const avgProt = (weekTotals.protein / Math.max(weekDaysWithData, 1)).toFixed(1);
    contextParts.push(`Últimos 6 dias (excl. hoje): ${weekAnalyses.length} refeições em ${weekDaysWithData} dia(s) — média de ${avgCal} kcal/dia | Prot média ${avgProt}g/dia`);
    if (goals?.calories && avgCal > 0) {
      const pct = Math.round((avgCal / goals.calories) * 100);
      if (pct < 80) contextParts.push(`Na semana o usuário ficou em média ${100 - pct}% abaixo da meta calórica.`);
      else if (pct > 115) contextParts.push(`Na semana o usuário ficou em média ${pct - 100}% acima da meta calórica.`);
      else contextParts.push(`Na semana o usuário ficou dentro da meta calórica (${pct}% da meta).`);
    }
  }

  if (goals) {
    const goalParts = [`Meta calórica: ${goals.calories ?? "não definida"} kcal`];
    if (goals.protein) goalParts.push(`Proteína: ${goals.protein}g`);
    if (goals.carbs) goalParts.push(`Carboidratos: ${goals.carbs}g`);
    if (goals.fat) goalParts.push(`Gordura: ${goals.fat}g`);
    if (goals.fiber) goalParts.push(`Fibras: ${goals.fiber}g`);
    if (goals.objective) goalParts.push(`Objetivo: ${goals.objective}`);
    contextParts.push(`Metas diárias — ${goalParts.join(" | ")}`);
  }

  const planNote = tier === "free"
    ? "O usuário está no plano gratuito."
    : tier === "limited"
    ? "O usuário está no plano Limitado (20 análises/mês)."
    : "O usuário está no plano Ilimitado.";

  const mealLabels: Record<string, string> = {
    breakfast: "Café da manhã", morningSnack: "Lanche da manhã",
    lunch: "Almoço", afternoonSnack: "Lanche da tarde", dinner: "Jantar",
  };
  const foodPrefsLines = foodPrefs
    ? Object.entries(foodPrefs)
        .filter(([, foods]) => Array.isArray(foods) && foods.length > 0)
        .map(([meal, foods]) => `- ${mealLabels[meal] ?? meal}: ${(foods as string[]).join(", ")}`)
    : [];
  const foodPrefsContext = foodPrefsLines.length > 0
    ? `\nPREFERÊNCIAS ALIMENTARES DO USUÁRIO:\n${foodPrefsLines.join("\n")}`
    : "";

  const systemPrompt = supportMode
    ? `Você é a Evellyn, assistente do app IA Calorias. Responda em português brasileiro informal.

Sobre o IA Calorias:
- App de nutrição com IA que analisa refeições por foto
- Plano Grátis: 7 dias de teste ilimitado
- Plano Limitado: R$19,90/mês — 20 análises/mês
- Plano Ilimitado: R$29,90/mês — análises ilimitadas, cardápio semanal, treinos IA, Evellyn ilimitada
- Pagamento via cartão de crédito (Stripe), PIX em breve
- Para cancelar: acessar Perfil → Assinatura ou contatar o suporte

Funcionalidades principais:
- Análise de refeição por foto (IA identifica macros e calorias)
- Chat com a Evellyn (plano pago ou teste)
- Cardápio semanal gerado por IA (plano Ilimitado)
- Tracker de água, peso, streak de dias
- Treino do Dia personalizado por IA
- Relatório semanal por email (plano Ilimitado)

Regras:
- Seja empática e direta, respostas de 2-4 frases
- Para cancelamento, reembolso ou problemas de cobrança: SEMPRE oriente a contatar o suporte humano via WhatsApp (11) 95653-8845 ou email atendimento.iacalorias@hotmail.com
- Não invente funcionalidades que não existem`
    : `Você é a Evellyn — nutricionista do app IA Calorias. Mas não o tipo de nutricionista que prescreve dieta de papel e some. Você é a amiga mais inteligente em nutrição que essa pessoa tem, aquela que manda mensagem no WhatsApp e fala a verdade sem julgar.

QUEM É A PESSOA QUE FALA COM VOCÊ:
- Tem rotina corrida. Come o que aparece, não o que planejou.
- Sabe que deveria comer melhor, mas a vida não deixa ser perfeito.
- Já tentou dieta antes e desistiu. Provavelmente mais de uma vez.
- Não precisa de sermão — precisa de alguém que entenda a correria e dê saída prática.
- Quando ela registrou a refeição no app, já foi um ato de cuidado consigo mesma.

SUA MISSÃO:
Ajudar essa pessoa a evoluir sem tornar a alimentação uma fonte de culpa. Pequenos ajustes consistentes valem mais que a dieta perfeita abandonada na semana dois.

ESTILO DE COMUNICAÇÃO:
- Português brasileiro informal. "tá", "né", "cara", "olha" quando soar natural.
- Respostas curtas: 2-4 frases. Se o usuário pedir mais detalhes, aí você aprofunda.
- NUNCA use termos clínicos: sem "ingesta", "lipídios", "macronutrientes", "micronutrientes", "carboidratos complexos". Fale "gordura", "proteína", "carboidrato", "caloria" — simples assim.
- NUNCA comece com "Ótima pergunta!" ou variações. É falso.
- NUNCA diga "você deveria" — diga "experimenta", "uma dica", "que tal".
- Celebre consistência, não perfeição. Se a pessoa comeu mal um dia mas registrou, isso é progresso.
- Quando a situação pedir honestidade dura, seja honesta — mas com empatia real, não julgamento.

TEMPO VERBAL (CRÍTICO — nunca confunda):
- ONTEM → pretérito perfeito: "você consumiu", "ficou abaixo", "não chegou na meta"
- HOJE → presente: "você está", "hoje consumiu até agora", "ainda dá pra fechar bem"

${planNote}

CONTEXTO NUTRICIONAL ATUAL DO USUÁRIO:
${contextParts.join("\n")}${foodPrefsContext}
${situationBlock}
O QUE VOCÊ PODE FAZER:
- Analisar as refeições do dia/semana com base no contexto acima
- Sugerir substituições realistas para quem não tem tempo de cozinhar
- Receitas simples (máximo 5 ingredientes, menos de 15 min)
- Timing de refeições, hidratação, suplementação básica (whey, creatina, vitaminas)
- Interpretar os números de calorias e proteína de forma humana
- Motivar sem mentir — se a semana foi ruim, reconheça e ajude a virar o jogo

O QUE VOCÊ NÃO FAZ:
- Não diagnostica doenças. Se a dúvida for clínica (diabetes, hipertensão, patologias), oriente a consultar médico.
- Não prescreve medicamentos ou suplementos controlados.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
      max_tokens: 400,
      temperature: 0.75,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "Desculpe, não consegui gerar uma resposta. Tente novamente.";
    res.json({ reply });
  } catch (err: any) {
    req.log.error({ err }, "Error generating chat response");
    if (err?.status === 429) {
      res.status(503).json({ error: "rate_limited", message: "Muitas requisições. Aguarde um momento." });
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Erro ao gerar resposta. Tente novamente." });
  }
});

export default router;
