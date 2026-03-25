export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'triceps' | 'biceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs';
export type Equipment = 'barbell' | 'dumbbells' | 'bench' | 'cable' | 'machine' | 'pullup_bar' | 'dips_bar' | 'ez_bar' | 'bands' | 'none' | 'leg_press' | 'smith' | 'kettlebell';
export type ExerciseCategory = 'compound' | 'isolation' | 'bodyweight';
export type InjuryKey = 'lumbar_disc' | 'lumbar_pain' | 'knee_condromalacia' | 'lca' | 'shoulder_impingement' | 'rotator_cuff' | 'tennis_elbow' | 'knee_meniscus' | 'ankle';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  force: 'push' | 'pull' | 'static';
  contraindications: InjuryKey[];
  alternatives: string[];
  tip: string;
}

export const exercises: Exercise[] = [
  // ═══ PEITO ═══
  { id: 'supino_barra', name: 'Supino Reto com Barra', category: 'compound', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['barbell', 'bench'], difficulty: 'intermediate', force: 'push', contraindications: ['shoulder_impingement', 'rotator_cuff'], alternatives: ['supino_halteres', 'supino_smith', 'flexao'], tip: 'Mantenha as escápulas retraídas e os pés firmes no chão.' },
  { id: 'supino_inclinado', name: 'Supino Inclinado com Halteres', category: 'compound', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'push', contraindications: ['shoulder_impingement'], alternatives: ['supino_inclinado_barra'], tip: 'Banco a 30-45°. Desça os halteres até alinhar com o peito.' },
  { id: 'supino_halteres', name: 'Supino Reto com Halteres', category: 'compound', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'push', contraindications: ['shoulder_impingement'], alternatives: ['supino_barra', 'flexao'], tip: 'Maior amplitude que a barra. Controle a descida em 3 segundos.' },
  { id: 'supino_smith', name: 'Supino no Smith Machine', category: 'compound', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['smith'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['supino_barra', 'supino_halteres'], tip: 'Mais seguro que a barra livre. Ideal para iniciantes ou treinar sozinho.' },
  { id: 'flexao', name: 'Flexão de Braço', category: 'bodyweight', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'shoulders'], equipment: ['none'], difficulty: 'beginner', force: 'push', contraindications: ['tennis_elbow'], alternatives: ['supino_halteres', 'flexao_declinada'], tip: 'Core ativado o tempo todo. Desça até quase tocar o chão.' },
  { id: 'crucifixo', name: 'Crucifixo com Halteres', category: 'isolation', primaryMuscle: 'chest', secondaryMuscles: ['shoulders'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'push', contraindications: ['shoulder_impingement', 'rotator_cuff'], alternatives: ['crossover', 'peck_deck'], tip: 'Leve flexão fixa nos cotovelos. Foco no alongamento do peitoral.' },
  { id: 'crossover', name: 'Crossover na Polia', category: 'isolation', primaryMuscle: 'chest', secondaryMuscles: [], equipment: ['cable'], difficulty: 'intermediate', force: 'push', contraindications: ['shoulder_impingement'], alternatives: ['crucifixo', 'peck_deck'], tip: 'Puxe cruzando na frente do corpo. Esprema o peitoral no final.' },
  { id: 'peck_deck', name: 'Peck Deck / Fly na Máquina', category: 'isolation', primaryMuscle: 'chest', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['crucifixo', 'crossover'], tip: 'Mantenha as costas apoiadas. Controle o retorno lentamente.' },

  // ═══ COSTAS ═══
  { id: 'barra_fixa', name: 'Barra Fixa (Pull-up)', category: 'bodyweight', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'shoulders'], equipment: ['pullup_bar'], difficulty: 'intermediate', force: 'pull', contraindications: ['shoulder_impingement', 'tennis_elbow'], alternatives: ['puxada_frontal', 'remada_maquina'], tip: 'Trave as escápulas na fase inicial. Puxe o peito até a barra.' },
  { id: 'barra_supinada', name: 'Barra Fixa Supinada (Chin-up)', category: 'bodyweight', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['pullup_bar'], difficulty: 'intermediate', force: 'pull', contraindications: ['tennis_elbow'], alternatives: ['puxada_supinada', 'rosca_direta'], tip: 'Pegada supinada ativa mais o bíceps. Excelente exercício bi-articular.' },
  { id: 'remada_barra', name: 'Remada Curvada com Barra', category: 'compound', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'shoulders'], equipment: ['barbell'], difficulty: 'intermediate', force: 'pull', contraindications: ['lumbar_disc', 'lumbar_pain'], alternatives: ['remada_halteres', 'remada_cable'], tip: 'Tronco a 45° e costas neutras. Não arredonde a lombar.' },
  { id: 'remada_halteres', name: 'Remada com Halteres (1 braço)', category: 'compound', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['remada_barra', 'remada_cable'], tip: 'Apoie o joelho e a mão no banco. Puxe o halter até o quadril.' },
  { id: 'puxada_frontal', name: 'Puxada Frontal na Polia', category: 'compound', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'shoulders'], equipment: ['cable'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['barra_fixa', 'puxada_triangulo'], tip: 'Incline levemente o tronco. Puxe a barra até a clavícula.' },
  { id: 'puxada_triangulo', name: 'Puxada Triângulo (Pegada Neutra)', category: 'compound', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['cable'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['puxada_frontal', 'remada_cable'], tip: 'Pegada neutra reduz stress no ombro. Ótima alternativa para quem tem impacto.' },
  { id: 'remada_cable', name: 'Remada Baixa na Polia', category: 'compound', primaryMuscle: 'back', secondaryMuscles: ['biceps'], equipment: ['cable'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['remada_halteres', 'puxada_triangulo'], tip: 'Mantenha o tronco ereto. Puxe até o umbigo e esprema as escápulas.' },
  { id: 'pullover', name: 'Pullover com Halter', category: 'isolation', primaryMuscle: 'back', secondaryMuscles: ['chest'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'pull', contraindications: ['shoulder_impingement'], alternatives: ['puxada_frontal'], tip: 'Movimento em arco. Foca no grande dorsal. Mantenha cotovelos semi-flexionados.' },

  // ═══ OMBROS ═══
  { id: 'desenvolvimento_barra', name: 'Desenvolvimento Militar com Barra', category: 'compound', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: ['barbell'], difficulty: 'intermediate', force: 'push', contraindications: ['shoulder_impingement', 'rotator_cuff', 'lumbar_disc'], alternatives: ['desenvolvimento_halteres', 'desenvolvimento_smith'], tip: 'Empurre a barra verticalmente. Não arqueie excessivamente a lombar.' },
  { id: 'desenvolvimento_halteres', name: 'Desenvolvimento com Halteres', category: 'compound', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'push', contraindications: ['shoulder_impingement'], alternatives: ['desenvolvimento_barra', 'arnold_press'], tip: 'Pode ser feito sentado ou em pé. Neutro nos ombros durante o movimento.' },
  { id: 'arnold_press', name: 'Desenvolvimento Arnold', category: 'compound', primaryMuscle: 'shoulders', secondaryMuscles: ['triceps'], equipment: ['dumbbells', 'bench'], difficulty: 'intermediate', force: 'push', contraindications: ['shoulder_impingement', 'rotator_cuff'], alternatives: ['desenvolvimento_halteres'], tip: 'Rotação durante o movimento. Ativa os três feixes do deltóide.' },
  { id: 'elevacao_lateral', name: 'Elevação Lateral com Halteres', category: 'isolation', primaryMuscle: 'shoulders', secondaryMuscles: [], equipment: ['dumbbells'], difficulty: 'beginner', force: 'push', contraindications: ['shoulder_impingement'], alternatives: ['elevacao_lateral_cabo', 'face_pull'], tip: 'Cotovelhos ligeiramente flexionados. Eleve até a altura dos ombros (não acima).' },
  { id: 'elevacao_lateral_cabo', name: 'Elevação Lateral na Polia', category: 'isolation', primaryMuscle: 'shoulders', secondaryMuscles: [], equipment: ['cable'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['elevacao_lateral'], tip: 'Tensão constante pela polia. Ótimo para finalizar o deltóide medial.' },
  { id: 'face_pull', name: 'Face Pull na Polia', category: 'isolation', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: ['cable'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['crucifixo_inverso'], tip: 'Excelente para saúde rotacional do ombro. Puxe para o nível dos olhos.' },
  { id: 'crucifixo_inverso', name: 'Crucifixo Inverso (Rear Delt)', category: 'isolation', primaryMuscle: 'shoulders', secondaryMuscles: ['back'], equipment: ['dumbbells', 'bench'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['face_pull'], tip: 'Foca no deltóide posterior. Essencial para postura e equilíbrio.' },

  // ═══ TRÍCEPS ═══
  { id: 'triceps_barra', name: 'Tríceps Testa com Barra EZ', category: 'isolation', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: ['ez_bar', 'bench'], difficulty: 'intermediate', force: 'push', contraindications: ['tennis_elbow'], alternatives: ['triceps_halteres', 'triceps_cable_corda'], tip: 'Desça a barra até a testa. Cotovelos fixos, apenas antebraço se move.' },
  { id: 'triceps_cable_corda', name: 'Tríceps na Polia com Corda', category: 'isolation', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: ['cable'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['triceps_cable_barra', 'triceps_barra'], tip: 'Abra a corda no final do movimento para máxima contração.' },
  { id: 'triceps_cable_barra', name: 'Tríceps na Polia com Barra', category: 'isolation', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: ['cable'], difficulty: 'beginner', force: 'push', contraindications: ['tennis_elbow'], alternatives: ['triceps_cable_corda'], tip: 'Cotovelos fixos ao lado do corpo. Extensão completa para máxima contração.' },
  { id: 'triceps_frances', name: 'Tríceps Francês com Halter', category: 'isolation', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: ['dumbbells'], difficulty: 'intermediate', force: 'push', contraindications: ['tennis_elbow'], alternatives: ['triceps_cable_corda', 'triceps_barra'], tip: 'Segure o halter com as duas mãos acima da cabeça.' },
  { id: 'mergulho_paralelas', name: 'Mergulho nas Paralelas (Dips)', category: 'bodyweight', primaryMuscle: 'triceps', secondaryMuscles: ['chest', 'shoulders'], equipment: ['dips_bar'], difficulty: 'intermediate', force: 'push', contraindications: ['shoulder_impingement', 'rotator_cuff'], alternatives: ['triceps_cable_corda', 'mergulho_banco'], tip: 'Incline levemente o tronco. Desça até 90° no cotovelo.' },
  { id: 'mergulho_banco', name: 'Mergulho no Banco (Bench Dip)', category: 'bodyweight', primaryMuscle: 'triceps', secondaryMuscles: [], equipment: ['bench'], difficulty: 'beginner', force: 'push', contraindications: ['shoulder_impingement'], alternatives: ['triceps_cable_corda'], tip: 'Coloque os pés mais longe para aumentar a dificuldade.' },

  // ═══ BÍCEPS ═══
  { id: 'rosca_direta_barra', name: 'Rosca Direta com Barra', category: 'isolation', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: ['barbell'], difficulty: 'beginner', force: 'pull', contraindications: ['tennis_elbow'], alternatives: ['rosca_halteres', 'rosca_ez'], tip: 'Cotovelos fixos ao lado do corpo. Suba completamente e desça controlado.' },
  { id: 'rosca_ez', name: 'Rosca Direta com Barra EZ', category: 'isolation', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: ['ez_bar'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['rosca_direta_barra', 'rosca_halteres'], tip: 'Menos stress no punho que a barra reta. Ótima para quem tem desconforto.' },
  { id: 'rosca_halteres', name: 'Rosca Alternada com Halteres', category: 'isolation', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: ['dumbbells'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['rosca_direta_barra', 'rosca_martelo'], tip: 'Supine o pulso no topo do movimento para máxima contração.' },
  { id: 'rosca_martelo', name: 'Rosca Martelo', category: 'isolation', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: ['dumbbells'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['rosca_halteres'], tip: 'Pegada neutra. Ativa braquiorradial e bíceps braquial lateral.' },
  { id: 'rosca_concentrada', name: 'Rosca Concentrada', category: 'isolation', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: ['dumbbells'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['rosca_cable'], tip: 'Apoie o cotovelo na coxa interna. Isolamento máximo do bíceps.' },
  { id: 'rosca_cable', name: 'Rosca na Polia Baixa', category: 'isolation', primaryMuscle: 'biceps', secondaryMuscles: [], equipment: ['cable'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['rosca_concentrada', 'rosca_halteres'], tip: 'Tensão constante pela polia. Ótimo para finalizar o bíceps.' },

  // ═══ QUADRÍCEPS ═══
  { id: 'agachamento', name: 'Agachamento Livre com Barra', category: 'compound', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['barbell'], difficulty: 'intermediate', force: 'push', contraindications: ['lumbar_disc', 'lca', 'knee_condromalacia'], alternatives: ['agachamento_smith', 'leg_press', 'agachamento_goblet'], tip: 'Pés na largura dos ombros. Desça até a coxa ficar paralela ao chão.' },
  { id: 'agachamento_smith', name: 'Agachamento no Smith Machine', category: 'compound', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['smith'], difficulty: 'beginner', force: 'push', contraindications: ['lca'], alternatives: ['agachamento', 'leg_press'], tip: 'Coloque os pés levemente à frente do corpo. Mais seguro que o livre.' },
  { id: 'agachamento_goblet', name: 'Agachamento Goblet com Halter', category: 'compound', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'abs'], equipment: ['dumbbells'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['agachamento_smith', 'leg_press'], tip: 'Segure o halter próximo ao peito. Ótimo para aprender o padrão do agachamento.' },
  { id: 'leg_press', name: 'Leg Press 45°', category: 'compound', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['leg_press'], difficulty: 'beginner', force: 'push', contraindications: ['lumbar_disc', 'lca'], alternatives: ['agachamento_smith', 'agachamento_goblet'], tip: 'Não trave o joelho no topo. Desça até 90° ou um pouco além.' },
  { id: 'agachamento_bulgaro', name: 'Agachamento Búlgaro (Split Squat)', category: 'compound', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['dumbbells', 'bench'], difficulty: 'intermediate', force: 'push', contraindications: ['lca', 'knee_meniscus'], alternatives: ['avanco', 'agachamento'], tip: 'Pé de trás elevado num banco. Excelente para equilíbrio e unilateral.' },
  { id: 'avanco', name: 'Avanço / Passada com Halteres', category: 'compound', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'hamstrings'], equipment: ['dumbbells'], difficulty: 'beginner', force: 'push', contraindications: ['lca', 'knee_condromalacia'], alternatives: ['agachamento_goblet', 'leg_press'], tip: 'Passo longo. Joelho da frente alinhado com o pé, não passando dele.' },
  { id: 'extensora', name: 'Cadeira Extensora', category: 'isolation', primaryMuscle: 'quads', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'push', contraindications: ['lca', 'knee_condromalacia'], alternatives: ['avanco'], tip: 'Ideal para isolar o quadríceps. Controle a descida.' },

  // ═══ ISQUIOTIBIAIS ═══
  { id: 'rdl', name: 'Levantamento Terra Romeno (RDL)', category: 'compound', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: ['barbell'], difficulty: 'intermediate', force: 'pull', contraindications: ['lumbar_disc'], alternatives: ['rdl_halteres', 'stiff'], tip: 'Incline o tronco mantendo as costas neutras. Barra próxima ao corpo.' },
  { id: 'rdl_halteres', name: 'RDL com Halteres', category: 'compound', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: ['dumbbells'], difficulty: 'beginner', force: 'pull', contraindications: ['lumbar_pain'], alternatives: ['rdl', 'mesa_flexora'], tip: 'Mesma técnica do RDL com barra. Halteres permitem maior amplitude.' },
  { id: 'mesa_flexora', name: 'Mesa Flexora (Lying Leg Curl)', category: 'isolation', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['rdl_halteres', 'flexora_sentado'], tip: 'Controle a extensão. Não deixe os quadris subirem da mesa.' },
  { id: 'flexora_sentado', name: 'Cadeira Flexora Sentado', category: 'isolation', primaryMuscle: 'hamstrings', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'pull', contraindications: [], alternatives: ['mesa_flexora'], tip: 'Posição sentada oferece maior ativação do semimembranoso.' },
  { id: 'stiff', name: 'Stiff com Barra (Straight-leg Deadlift)', category: 'compound', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes', 'back'], equipment: ['barbell'], difficulty: 'intermediate', force: 'pull', contraindications: ['lumbar_disc', 'lumbar_pain'], alternatives: ['rdl', 'mesa_flexora'], tip: 'Joelhos quase esticados. Foca no alongamento máximo dos isquiotibiais.' },

  // ═══ GLÚTEOS ═══
  { id: 'hip_thrust', name: 'Hip Thrust com Barra', category: 'compound', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: ['barbell', 'bench'], difficulty: 'intermediate', force: 'push', contraindications: ['lumbar_pain'], alternatives: ['elevacao_pelvica', 'glute_bridge'], tip: 'Banco na altura dos omoplatas. Esprema os glúteos no topo.' },
  { id: 'elevacao_pelvica', name: 'Elevação Pélvica (Glute Bridge)', category: 'bodyweight', primaryMuscle: 'glutes', secondaryMuscles: ['hamstrings'], equipment: ['none'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['hip_thrust'], tip: 'Pés na largura dos quadris. Mantenha a contração 1-2s no topo.' },
  { id: 'abdutora', name: 'Abdução de Quadril na Máquina', category: 'isolation', primaryMuscle: 'glutes', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'push', contraindications: ['lca'], alternatives: ['abdutora_cabo'], tip: 'Ativa glúteo médio e tensor da fáscia lata. Controle o retorno.' },
  { id: 'abdutora_cabo', name: 'Abdução na Polia (Cable Kickback)', category: 'isolation', primaryMuscle: 'glutes', secondaryMuscles: [], equipment: ['cable'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['abdutora', 'elevacao_pelvica'], tip: 'Apoie-se numa barra. Movimento controlado para trás e acima.' },
  { id: 'agachamento_sumo', name: 'Agachamento Sumô com Halter', category: 'compound', primaryMuscle: 'glutes', secondaryMuscles: ['quads', 'hamstrings'], equipment: ['dumbbells'], difficulty: 'beginner', force: 'push', contraindications: ['lca'], alternatives: ['hip_thrust', 'elevacao_pelvica'], tip: 'Pés abertos além dos ombros, dedos apontados para fora.' },

  // ═══ PANTURRILHA ═══
  { id: 'panturrilha_pe', name: 'Elevação de Panturrilha em Pé', category: 'isolation', primaryMuscle: 'calves', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'push', contraindications: ['ankle'], alternatives: ['panturrilha_leg_press', 'panturrilha_unilateral'], tip: 'Amplitude completa: desça abaixo do nível e suba na ponta dos pés.' },
  { id: 'panturrilha_sentado', name: 'Elevação de Panturrilha Sentado', category: 'isolation', primaryMuscle: 'calves', secondaryMuscles: [], equipment: ['machine'], difficulty: 'beginner', force: 'push', contraindications: ['ankle'], alternatives: ['panturrilha_pe'], tip: 'Foca no sóleo (abaixo do gastrocnêmio). Joelhos a 90°.' },
  { id: 'panturrilha_leg_press', name: 'Panturrilha no Leg Press', category: 'isolation', primaryMuscle: 'calves', secondaryMuscles: [], equipment: ['leg_press'], difficulty: 'beginner', force: 'push', contraindications: [], alternatives: ['panturrilha_pe'], tip: 'Use apenas a ponta dos pés na plataforma. Amplitude completa.' },
  { id: 'panturrilha_unilateral', name: 'Elevação Unilateral de Panturrilha', category: 'isolation', primaryMuscle: 'calves', secondaryMuscles: [], equipment: ['none'], difficulty: 'beginner', force: 'push', contraindications: ['ankle'], alternatives: ['panturrilha_pe'], tip: 'Segure num apoio. Mais difícil que bilateral. Excelente para desequilíbrios.' },

  // ═══ ABDÔMEN ═══
  { id: 'prancha', name: 'Prancha Frontal (Plank)', category: 'bodyweight', primaryMuscle: 'abs', secondaryMuscles: [], equipment: ['none'], difficulty: 'beginner', force: 'static', contraindications: ['lumbar_disc'], alternatives: ['prancha_lateral', 'dead_bug'], tip: 'Corpo em linha reta. Quadris nem acima nem abaixo da linha do tronco.' },
  { id: 'prancha_lateral', name: 'Prancha Lateral (Side Plank)', category: 'bodyweight', primaryMuscle: 'abs', secondaryMuscles: [], equipment: ['none'], difficulty: 'beginner', force: 'static', contraindications: [], alternatives: ['prancha', 'dead_bug'], tip: 'Ativa oblíquos e quadrado lombar. Mantenha quadril elevado.' },
  { id: 'crunch', name: 'Abdominal Supra (Crunch)', category: 'bodyweight', primaryMuscle: 'abs', secondaryMuscles: [], equipment: ['none'], difficulty: 'beginner', force: 'pull', contraindications: ['lumbar_disc'], alternatives: ['dead_bug', 'elevacao_pernas'], tip: 'Só eleve os ombros. Não puxe o pescoço com as mãos.' },
  { id: 'elevacao_pernas', name: 'Elevação de Pernas (Leg Raise)', category: 'bodyweight', primaryMuscle: 'abs', secondaryMuscles: [], equipment: ['none'], difficulty: 'intermediate', force: 'pull', contraindications: ['lumbar_disc'], alternatives: ['crunch', 'dead_bug'], tip: 'Desça as pernas controladamente. Lombar apoiada no chão.' },
  { id: 'dead_bug', name: 'Dead Bug', category: 'bodyweight', primaryMuscle: 'abs', secondaryMuscles: [], equipment: ['none'], difficulty: 'beginner', force: 'static', contraindications: [], alternatives: ['prancha', 'bird_dog'], tip: 'Lombar sempre colada no chão. Mova braços e pernas opostos simultaneamente.' },
  { id: 'russian_twist', name: 'Russian Twist', category: 'bodyweight', primaryMuscle: 'abs', secondaryMuscles: [], equipment: ['none'], difficulty: 'beginner', force: 'static', contraindications: ['lumbar_disc', 'lumbar_pain'], alternatives: ['prancha_lateral', 'dead_bug'], tip: 'Giro vem do tronco, não dos braços. Pés podem ficar no chão se necessário.' },
];

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(e => e.id === id);
}

export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return exercises.filter(e => e.primaryMuscle === muscle);
}

export function filterByEquipment(exs: Exercise[], available: Equipment[]): Exercise[] {
  if (available.includes('none')) return exs;
  return exs.filter(e => e.equipment.some(eq => available.includes(eq) || eq === 'none'));
}

export function filterByInjuries(exs: Exercise[], injuries: InjuryKey[]): Exercise[] {
  if (!injuries.length) return exs;
  return exs.filter(e => !e.contraindications.some(c => injuries.includes(c)));
}

export function getAlternatives(exercise: Exercise, available: Equipment[], injuries: InjuryKey[]): Exercise[] {
  return exercise.alternatives
    .map(id => getExerciseById(id))
    .filter((e): e is Exercise => !!e)
    .filter(e => filterByEquipment([e], available).length > 0)
    .filter(e => filterByInjuries([e], injuries).length > 0);
}
