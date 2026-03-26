import { Router, type IRouter, type Request, type Response } from "express";
import { db, workoutProfilesTable, workoutLogsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router: IRouter = Router();

async function findProfile(userId?: string, sessionId?: string) {
  if (userId) {
    const p = await db.query.workoutProfilesTable.findFirst({
      where: eq(workoutProfilesTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (p) return p;
  }
  if (sessionId) {
    return db.query.workoutProfilesTable.findFirst({
      where: eq(workoutProfilesTable.sessionId, sessionId),
    });
  }
  return null;
}

// GET /api/workout/profile
router.get("/profile", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "sessionId required" }); return; }

  const profile = await findProfile(userId, sessionId);
  if (!profile) { res.status(404).json({ error: "not_found" }); return; }
  res.json(profile);
});

// POST /api/workout/profile
router.post("/profile", async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "sessionId required" }); return; }

  const { goal, sex, age, weight, height, bodyFat, waist, level, trainingDays,
    sessionDuration, preferredTime, gym, equipment, hasInjuries, injuries,
    medicalNotes, cardio, warmup, techniques } = req.body;

  if (!goal || !sex || !age || !weight || !height || !level || !gym) {
    res.status(400).json({ error: "missing required fields" }); return;
  }

  const existing = await findProfile(userId, sessionId);
  if (existing) {
    await db.update(workoutProfilesTable)
      .set({ goal, sex, age, weight, height, bodyFat, waist, level, trainingDays,
        sessionDuration, preferredTime, gym, equipment: equipment ?? [], hasInjuries: !!hasInjuries,
        injuries: injuries ?? [], medicalNotes, cardio, warmup, techniques: techniques ?? [],
        updatedAt: new Date() })
      .where(eq(workoutProfilesTable.id, existing.id));
    res.json({ id: existing.id, updated: true });
    return;
  }

  const id = randomUUID();
  await db.insert(workoutProfilesTable).values({
    id, sessionId: sessionId || null, userId: userId || null,
    goal, sex, age, weight, height, bodyFat, waist, level, trainingDays: trainingDays ?? [],
    sessionDuration, preferredTime, gym, equipment: equipment ?? [], hasInjuries: !!hasInjuries,
    injuries: injuries ?? [], medicalNotes, cardio, warmup, techniques: techniques ?? [],
  });
  res.status(201).json({ id, created: true });
});

// POST /api/workout/log
router.post("/log", async (req: Request, res: Response) => {
  const { sessionId, sessionName, date, durationMinutes, exercises, notes } = req.body;
  const userId = req.user?.userId;
  if (!sessionName || !date) { res.status(400).json({ error: "sessionName and date required" }); return; }

  const id = randomUUID();
  await db.insert(workoutLogsTable).values({
    id, sessionId: sessionId || null, userId: userId || null,
    sessionName, date, durationMinutes: durationMinutes || null,
    exercises: exercises || [], notes: notes || null,
  });
  res.status(201).json({ id });
});

// GET /api/workout/logs
router.get("/logs", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "sessionId required" }); return; }

  const where = userId
    ? eq(workoutLogsTable.userId, userId)
    : eq(workoutLogsTable.sessionId, sessionId);

  const logs = await db.query.workoutLogsTable.findMany({
    where, orderBy: (t, { desc }) => [desc(t.createdAt)], limit: 50,
  });
  res.json(logs);
});

// POST /api/workout/ai-quick — generate a targeted workout via AI
router.post("/ai-quick", async (req: Request, res: Response) => {
  const { muscleGroup, sessionId } = req.body as { muscleGroup: string; sessionId?: string };
  const userId = req.user?.userId;

  if (!muscleGroup) { res.status(400).json({ error: "muscleGroup required" }); return; }

  // Load saved profile for context
  const savedProfile = await findProfile(userId, sessionId).catch(() => null);

  const levelMap: Record<string, string> = {
    beginner: "Iniciante (0-6 meses de treino)",
    intermediate: "Intermediário (6 meses a 2 anos)",
    advanced: "Avançado (2+ anos contínuos)",
  };
  const gymMap: Record<string, string> = {
    full_gym: "academia completa",
    home_gym: "academia em casa",
    bodyweight: "sem equipamentos (peso corporal)",
    custom: "equipamentos variados",
  };

  const levelStr = savedProfile?.level ? levelMap[savedProfile.level] ?? savedProfile.level : "Intermediário";
  const gymStr = savedProfile?.gym ? gymMap[savedProfile.gym] ?? savedProfile.gym : "academia completa";
  const goalStr = savedProfile?.goal ?? "hipertrofia";
  const injuriesStr = savedProfile?.injuries?.length
    ? `Restrições/lesões: ${(savedProfile.injuries as string[]).join(", ")}.`
    : "Sem lesões ou restrições.";

  const systemPrompt = `Você é um personal trainer experiente especializado em musculação. Gere treinos objetivos, seguros e eficientes baseados no perfil do aluno.`;

  const userPrompt = `Gere um treino de academia para HOJE com foco em: **${muscleGroup}**.

Perfil do aluno:
- Nível: ${levelStr}
- Objetivo: ${goalStr}
- Local de treino: ${gymStr}
- ${injuriesStr}

Instruções:
- Inclua 5 a 7 exercícios
- Varie entre compostos e isolados
- Adapte volume/intensidade ao nível
- Cada exercício deve ter uma dica de execução curta e prática
- Se houver lesões, evite movimentos contraindicados
- Escreva nomes dos exercícios em português (BR)

Responda APENAS com JSON válido neste formato exato:
{
  "sessionName": "Treino de [Músculo] - IA",
  "focusLabel": "${muscleGroup}",
  "estimatedMinutes": 50,
  "exercicios": [
    {
      "nome": "Nome do Exercício",
      "categoria": "composto",
      "series": 4,
      "repeticoes": "8-12",
      "descansoSegundos": 90,
      "rpe": 7,
      "musculoPrimario": "${muscleGroup}",
      "musculosSecundarios": ["Músculo 2"],
      "dica": "Dica curta de execução."
    }
  ],
  "aquecimento": [
    { "nome": "Caminhada na esteira", "duracao": "5 min" }
  ],
  "desaquecimento": [
    { "nome": "Alongamento do músculo trabalhado", "duracao": "2 min" }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1800,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(raw);

    // Transform to WorkoutSession-compatible shape
    const exercises = (data.exercicios ?? []).map((e: any, idx: number) => ({
      exercise: {
        id: `ai_${idx}`,
        name: e.nome,
        category: e.categoria === "composto" ? "compound" : "isolation",
        primaryMuscle: muscleGroup,
        secondaryMuscles: e.musculosSecundarios ?? [],
        equipment: [],
        difficulty: savedProfile?.level ?? "intermediate",
        force: "push",
        contraindications: [],
        alternatives: [],
        tip: e.dica ?? "",
      },
      order: idx + 1,
      sets: e.series ?? 3,
      reps: e.repeticoes ?? "10-12",
      restSeconds: e.descansoSegundos ?? 60,
      rpe: e.rpe ?? 7,
    }));

    const warmup = (data.aquecimento ?? [{ nome: "Aquecimento articular", duracao: "5 min" }]).map((w: any) => ({
      name: w.nome, duration: w.duracao,
    }));
    const cooldown = (data.desaquecimento ?? [{ nome: "Alongamento geral", duracao: "3 min" }]).map((c: any) => ({
      name: c.nome, duration: c.duracao,
    }));

    res.json({
      dayKey: "today",
      dayLabel: "Hoje",
      sessionName: data.sessionName ?? `Treino de ${muscleGroup}`,
      focusLabel: data.focusLabel ?? muscleGroup,
      primaryMuscles: [muscleGroup],
      secondaryMuscles: [],
      warmup,
      exercises,
      cooldown,
      estimatedMinutes: data.estimatedMinutes ?? 50,
      isRestDay: false,
    });
  } catch (err: any) {
    console.error("ai-quick error:", err.message);
    res.status(500).json({ error: "Falha ao gerar treino. Tente novamente." });
  }
});

export default router;
