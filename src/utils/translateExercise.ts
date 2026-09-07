// Tradução de exercícios: dicionário palavra-a-palavra + overrides de nomes completos + pesquisa inteligente em português

export function normalizeStr(str: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const WORD_DICT: Record<string, string> = {
  // Movimentos
  'press': 'Press', 'curl': 'Rosca', 'raise': 'Elevação', 'raises': 'Elevações',
  'row': 'Remada', 'rows': 'Remadas', 'fly': 'Fly', 'flye': 'Fly', 'flyes': 'Flys',
  'pulldown': 'Puxada', 'pull-up': 'Dominadas', 'pullup': 'Dominadas', 'pull-ups': 'Dominadas',
  'chin-up': 'Chin-Up', 'chin-ups': 'Chin-Ups', 'pull': 'Puxada', 'pull-over': 'Pullover',
  'pullover': 'Pullover', 'push-up': 'Flexão', 'pushup': 'Flexão', 'push-ups': 'Flexões',
  'push': 'Empurrar', 'deadlift': 'Peso Morto', 'deadlifts': 'Peso Morto',
  'squat': 'Agachamento', 'squats': 'Agachamentos', 'lunge': 'Afundo', 'lunges': 'Afundos',
  'extension': 'Extensão', 'extensions': 'Extensões', 'shrug': 'Encolhimento', 'shrugs': 'Encolhimentos',
  'crunch': 'Abdominal', 'crunches': 'Abdominais', 'plank': 'Prancha', 'twist': 'Rotação',
  'dip': 'Mergulho', 'dips': 'Mergulhos', 'kickback': 'Kickback', 'kickbacks': 'Kickbacks',
  'thrust': 'Empurrão', 'swing': 'Balanço', 'swings': 'Balanços',
  'jump': 'Salto', 'jumps': 'Saltos', 'step': 'Step', 'steps': 'Steps',
  'walk': 'Caminhada', 'bridge': 'Ponte', 'bridges': 'Pontes', 'roll': 'Rolo',
  'stretch': 'Alongamento', 'hold': 'Sustentação', 'sit-up': 'Abdominal',
  'sit-ups': 'Abdominais', 'situp': 'Abdominal', 'good': 'Bom', 'morning': 'Dia',
  'skull': 'Testa', 'crusher': 'Crusher', 'crushers': 'Crushers',
  'overhead': 'Ombros', 'sport': 'Desporto', 'side': 'Lateral',
  'hip': 'Quadril', 'hips': 'Quadris',
  // Equipamento
  'barbell': 'Barra', 'dumbbell': 'Halteres', 'dumbell': 'Halteres',
  'dumbbells': 'Halteres', 'cable': 'Cabo', 'cables': 'Cabos',
  'machine': 'Máquina', 'kettlebell': 'Kettlebell', 'kettlebells': 'Kettlebells',
  'band': 'Elástico', 'bands': 'Elásticos', 'bar': 'Barra', 'ez': 'EZ',
  'smith': 'Smith', 'trap': 'Trapézio', 'traps': 'Trapézio', 't-bar': 'T-Bar',
  'ball': 'Bola', 'box': 'Caixa', 'board': 'Prancha',
  'lever': 'Máquina', 'leverage': 'Máquina', 'hammer': 'Hammer',
  // Posições / Modificadores
  'incline': 'Inclinado', 'decline': 'Declinado', 'flat': 'Plano',
  'standing': 'em Pé', 'seated': 'Sentado', 'lying': 'Deitado',
  'single': 'Unilateral', 'double': 'Bilateral', 'alternating': 'Alternado',
  'reverse': 'Inverso', 'wide': 'Largo', 'narrow': 'Fechado', 'close': 'Fechado',
  'grip': 'Pega', 'front': 'Frontal', 'rear': 'Posterior', 'lateral': 'Lateral',
  'cross': 'Cruzado', 'sumo': 'Sumo', 'romanian': 'Romeno', 'bulgarian': 'Búlgaro',
  'nordic': 'Nórdico', 'concentration': 'Concentrada',
  'preacher': 'Scott', 'military': 'Militar', 'arnold': 'Arnold', 'goblet': 'Goblet',
  'hack': 'Hack', 'upper': 'Superior', 'lower': 'Inferior', 'inner': 'Interno',
  'outer': 'Externo', 'face': 'Face', 'high': 'Alto', 'low': 'Baixo',
  'wide-grip': 'Pega Larga', 'close-grip': 'Pega Fechada', 'neutral': 'Neutro',
  'underhand': 'Pegada Supinada', 'overhand': 'Pegada Pronada',
  'supinated': 'Supinado', 'pronated': 'Pronado', 'parallel': 'Paralelo',
  'split': 'Dividido', 'loaded': 'Carregado', 'bodyweight': 'Peso Corporal',
  'assisted': 'Assistido', 'weighted': 'com Peso', 'unilateral': 'Unilateral',
  'isolateral': 'Isolateral', 'iso-lateral': 'Isolateral',
  'bilateral': 'Bilateral', 'isometric': 'Isométrico', 'eccentric': 'Excêntrico',
  'chest-supported': 'com Apoio no Peito', 'supported': 'Apoiado',
  // Partes do corpo
  'chest': 'Peito', 'back': 'Costas', 'shoulder': 'Ombro', 'shoulders': 'Ombros',
  'arm': 'Braço', 'arms': 'Braços', 'leg': 'Perna', 'legs': 'Pernas',
  'glute': 'Glúteo', 'glutes': 'Glúteos', 'hamstring': 'Isquiotibial',
  'hamstrings': 'Isquiotibiais', 'quad': 'Quadríceps', 'quads': 'Quadríceps',
  'quadricep': 'Quadríceps', 'quadriceps': 'Quadríceps', 'calf': 'Gémeos',
  'calves': 'Gémeos', 'ab': 'Abdominal', 'abs': 'Abdominais',
  'abdominal': 'Abdominal', 'abdominals': 'Abdominais', 'core': 'Core',
  'tricep': 'Tríceps', 'triceps': 'Tríceps', 'bicep': 'Bíceps', 'biceps': 'Bíceps',
  'forearm': 'Antebraço', 'forearms': 'Antebraços', 'wrist': 'Pulso',
  'wrists': 'Pulsos', 'neck': 'Pescoço', 'lat': 'Grande Dorsal', 'lats': 'Lats',
  'body': 'Corpo', 'weight': 'Peso', 'resistance': 'Resistência',
  // Outros comuns
  'zottman': 'Zottman', 'spider': 'Aranha',
  'zercher': 'Zercher', 'jefferson': 'Jefferson', 'sissy': 'Sissy',
  'pistol': 'Pistola', 'glute-ham': 'Glúteo-Isquio',
  'plyometric': 'Pliométrico', 'explosive': 'Explosivo', 'power': 'Potência',
  'clean': 'Clean', 'snatch': 'Arranco', 'jerk': 'Arranque',
  'turkish': 'Turco', 'getup': 'Levantar', 'get-up': 'Levantar',
  'windmill': 'Moinho de Vento', 'halo': 'Halo', 'farmer': 'Fazendeiro',
  'carry': 'Transporte', 'march': 'Marcha',
  'knee': 'Joelho', 'ankle': 'Tornozelo', 'foot': 'Pé', 'feet': 'Pés',
  'elbow': 'Cotovelo', 'elbows': 'Cotovelos',
  'chin': 'Mento',
  'with': 'com', 'without': 'sem', 'and': 'e', 'on': 'no',
  'in': 'em', 'to': 'para', 'of': 'de', 'the': '',
  'at': 'no', 'by': 'por', 'for': 'para',
  'partial': 'Parcial', 'full': 'Completo', 'half': 'Meio',
  'slow': 'Lento', 'fast': 'Rápido', 'tempo': 'Tempo',
  'superset': 'Supersérie', 'drop': 'Drop',
  '3/4': '3/4', '90/90': '90/90', '21s': '21s',
};

// Overrides para nomes completos muito comuns
const NAME_OVERRIDES: Record<string, string> = {
  // Peito
  'Bench Press': 'Supino Plano',
  'Barbell Bench Press': 'Supino Plano com Barra',
  'Incline Bench Press': 'Supino Inclinado',
  'Barbell Incline Bench Press': 'Supino Inclinado com Barra',
  'Decline Bench Press': 'Supino Declinado',
  'Barbell Decline Bench Press': 'Supino Declinado com Barra',
  'Dumbbell Bench Press': 'Supino Plano com Halteres',
  'Dumbbell Incline Bench Press': 'Supino Inclinado com Halteres',
  'Dumbbell Decline Bench Press': 'Supino Declinado com Halteres',
  'Push-Up': 'Flexões de Braço',
  'Push Up': 'Flexões de Braço',
  'Chest Fly': 'Aberturas / Fly de Peito',
  'Dumbbell Fly': 'Aberturas com Halteres',
  'Cable Fly': 'Fly no Cabo / Crossover',
  'Pec Deck': 'Pec Deck / Voador',
  'Lever Chest Press': 'Press de Peito na Máquina',
  'Lever Incline Chest Press': 'Press Inclinado na Máquina',
  'Lever Decline Chest Press': 'Press Declinado na Máquina',
  'Chest Dip': 'Mergulho para Peitoral',

  // Costas / Remadas
  'Pull-Up': 'Dominadas / Elevações',
  'Chin-Up': 'Chin-Up (Pegada Supinada)',
  'Lat Pulldown': 'Puxada para Dorsal',
  'Cable Lat Pulldown': 'Puxada para Dorsal no Cabo',
  'Wide Grip Lat Pulldown': 'Puxada Aberta para Dorsal',
  'Close Grip Lat Pulldown': 'Puxada Fechada para Dorsal',
  'Cable Wide Grip Lat Pulldown': 'Puxada Aberta no Cabo',
  'Cable Close Grip Lat Pulldown': 'Puxada Fechada no Cabo',
  'Pull Over': 'Pullover',
  'Dumbbell Pullover': 'Pullover com Haltere',
  'Bent Over Row': 'Remada Curvada',
  'Bent-Over Row': 'Remada Curvada',
  'Barbell Bent Over Row': 'Remada Curvada com Barra',
  'Barbell Reverse Grip Bent Over Row': 'Remada Curvada Supinada com Barra',
  'Barbell Pendlay Row': 'Remada Pendlay com Barra',
  'T-Bar Row': 'Remada T-Bar',
  'Barbell T-Bar Row': 'Remada T-Bar com Barra',
  'Seated Row': 'Remada Sentada',
  'Cable Seated Row': 'Remada Sentada no Cabo',
  'Cable Low Seated Row': 'Remada Baixa no Cabo',
  'Cable High Row': 'Remada Alta no Cabo',
  'Dumbbell Row': 'Remada com Haltere',
  'Dumbbell Bent Over Row': 'Remada Curvada com Halteres',
  'Dumbbell One Arm Bent-Over Row': 'Remada Unilateral com Haltere',
  'One Arm Dumbbell Row': 'Remada Unilateral com Haltere',
  'Single Arm Row': 'Remada Unilateral',
  'Upright Row': 'Remada Vertical',
  'Barbell Upright Row': 'Remada Vertical com Barra',
  'Dumbbell Upright Row': 'Remada Vertical com Halteres',
  'Cable Upright Row': 'Remada Vertical no Cabo',

  // Remadas em Máquina (Lever / Iso-lateral / Hammer)
  'Lever Unilateral Row': 'Remada Isolateral na Máquina',
  'Lever Alternating Narrow Grip Seated Row': 'Remada Isolateral Sentada na Máquina',
  'Lever One Arm Lateral High Row': 'Remada Alta Isolateral na Máquina',
  'Lever One Arm Bent Over Row': 'Remada Curvada Unilateral na Máquina',
  'Lever Seated Row': 'Remada Sentada na Máquina',
  'Lever High Row': 'Remada Alta na Máquina',
  'Lever Narrow Grip Seated Row': 'Remada Sentada com Pega Fechada na Máquina',
  'Lever Bent Over Row': 'Remada Curvada na Máquina',
  'Lever Bent-Over Row': 'Remada Curvada na Máquina',
  'Lever Bent-Over Row with V-Bar': 'Remada Curvada na Máquina com Barra V',
  'Lever T Bar Row': 'Remada T-Bar na Máquina',
  'Lever T-Bar Row': 'Remada T-Bar na Máquina',
  'Lever Reverse T-Bar Row': 'Remada T-Bar Inversa na Máquina',
  'Lever Reverse Grip Vertical Row': 'Remada Vertical na Máquina',
  'Lever T-Bar Reverse Grip Row': 'Remada T-Bar na Máquina com Pega Inversa',
  'Lever Front Pulldown': 'Puxada Frontal na Máquina',

  // Smith Machine
  'Smith Bench Press': 'Supino Plano na Smith Machine',
  'Smith Incline Bench Press': 'Supino Inclinado na Smith Machine',
  'Smith Decline Bench Press': 'Supino Declinado na Smith Machine',
  'Smith Squat': 'Agachamento na Smith Machine',
  'Smith Hack Squat': 'Agachamento Hack na Smith Machine',
  'Smith Shoulder Press': 'Press de Ombros na Smith Machine',
  'Smith Bent Over Row': 'Remada Curvada na Smith Machine',
  'Smith Upright Row': 'Remada Vertical na Smith Machine',
  'Smith Shrug': 'Encolhimento de Ombros na Smith Machine',

  // Pernas
  'Squat': 'Agachamento Livre',
  'Barbell Squat': 'Agachamento com Barra',
  'Barbell Front Squat': 'Agachamento Frontal com Barra',
  'Deadlift': 'Peso Morto',
  'Barbell Deadlift': 'Peso Morto com Barra',
  'Romanian Deadlift': 'Peso Morto Romeno',
  'Barbell Romanian Deadlift': 'Peso Morto Romeno com Barra',
  'Dumbbell Romanian Deadlift': 'Peso Morto Romeno com Halteres',
  'Sumo Deadlift': 'Peso Morto Sumo',
  'Stiff Leg Deadlift': 'Peso Morto Stiff',
  'Barbell Stiff Leg Deadlift': 'Peso Morto Stiff com Barra',
  'Dumbbell Stiff Leg Deadlift': 'Peso Morto Stiff com Halteres',
  'Hip Thrust': 'Hip Thrust (Elevação Pélvica)',
  'Barbell Hip Thrust': 'Hip Thrust com Barra',
  'Glute Bridge': 'Ponte de Glúteo',
  'Lunge': 'Afundo / Passada',
  'Dumbbell Lunge': 'Afundos com Halteres',
  'Barbell Lunge': 'Afundos com Barra',
  'Walking Lunge': 'Afundos em Caminhada',
  'Reverse Lunge': 'Afundo Reverso',
  'Bulgarian Split Squat': 'Agachamento Búlgaro',
  'Dumbbell Bulgarian Split Squat': 'Agachamento Búlgaro com Halteres',
  'Front Squat': 'Agachamento Frontal',
  'Goblet Squat': 'Agachamento Goblet',
  'Hack Squat': 'Agachamento Hack',
  'Leg Press': 'Leg Press 45°',
  'Lever Leg Press': 'Leg Press na Máquina',
  'Leg Curl': 'Curl de Pernas',
  'Lying Leg Curl': 'Curl de Pernas Deitado',
  'Seated Leg Curl': 'Curl de Pernas Sentado',
  'Lever Lying Leg Curl': 'Curl de Pernas Deitado na Máquina',
  'Lever Seated Leg Curl': 'Curl de Pernas Sentado na Máquina',
  'Leg Extension': 'Extensão de Pernas',
  'Lever Leg Extension': 'Extensão de Pernas na Máquina',
  'Calf Raise': 'Elevação de Gémeos / Panturrilha',
  'Standing Calf Raise': 'Elevação de Gémeos em Pé',
  'Seated Calf Raise': 'Elevação de Gémeos Sentado',
  'Barbell Standing Calf Raise': 'Elevação de Gémeos em Pé com Barra',
  'Dumbbell Standing Calf Raise': 'Elevação de Gémeos em Pé com Halteres',
  'Lever Seated Calf Raise': 'Elevação de Gémeos Sentado na Máquina',
  'Lever Calf Press': 'Prensa de Gémeos na Máquina',
  'Nordic Curl': 'Curl Nórdico',

  // Ombros / Press Militar / Desenvolvimento
  'Overhead Press': 'Press Militar de Ombros',
  'Barbell Overhead Press': 'Press Militar com Barra',
  'Barbell Seated Overhead Press': 'Press de Ombros Sentado com Barra',
  'Military Press': 'Press Militar',
  'Barbell Standing Military Press': 'Press Militar em Pé com Barra',
  'Barbell Standing Close Grip Military Press': 'Press Militar em Pé com Barra (Pega Fechada)',
  'Barbell Standing Wide Military Press': 'Press Militar em Pé com Barra (Pega Larga)',
  'Barbell Seated Behind Head Military Press': 'Press Militar Sentado Atrás da Cabeça com Barra',
  'Shoulder Press': 'Press de Ombros',
  'Dumbbell Shoulder Press': 'Press de Ombros com Halteres',
  'Dumbbell Seated Shoulder Press': 'Press de Ombros Sentado com Halteres',
  'Dumbbell Standing Overhead Press': 'Press de Ombros em Pé com Halteres',
  'Dumbbell Standing Alternate Overhead Press': 'Press de Ombros Alternado em Pé com Halteres',
  'Dumbbell One Arm Shoulder Press': 'Press de Ombros Unilateral com Haltere',
  'Arnold Press': 'Press Arnold com Halteres',
  'Lateral Raise': 'Elevação Lateral',
  'Dumbbell Lateral Raise': 'Elevação Lateral com Halteres',
  'Cable Lateral Raise': 'Elevação Lateral no Cabo',
  'Front Raise': 'Elevação Frontal',
  'Dumbbell Front Raise': 'Elevação Frontal com Halteres',
  'Cable Front Raise': 'Elevação Frontal no Cabo',
  'Rear Delt Fly': 'Fly Posterior de Ombros',
  'Dumbbell Rear Delt Fly': 'Fly Posterior com Halteres',
  'Cable Rear Delt Fly': 'Fly Posterior no Cabo',
  'Face Pull': 'Face Pull no Cabo',
  'Cable Face Pull': 'Face Pull no Cabo com Corda',
  'Shrug': 'Encolhimento de Ombros / Trapézio',
  'Dumbbell Shrug': 'Encolhimento de Ombros com Halteres',
  'Barbell Shrug': 'Encolhimento de Ombros com Barra',
  'Lever Military Press': 'Press Militar na Máquina',
  'Lever Shoulder Press': 'Press de Ombros na Máquina',
  'Lever One Arm Shoulder Press': 'Press de Ombros Unilateral na Máquina',
  'Lever Lateral Raise': 'Elevação Lateral na Máquina',
  'Smith Standing Military Press': 'Press Militar em Pé na Smith Machine',
  'Smith Seated Shoulder Press': 'Press de Ombros Sentado na Smith Machine',
  'Kettlebell Two Arm Military Press': 'Press Militar com Kettlebells',
  'Kettlebell Seated Two Arm Military Press': 'Press Militar Sentado com Kettlebells',
  'Kettlebell One Arm Military Press To The Side': 'Press Militar Unilateral com Kettlebell',
  'Cable Shoulder Press': 'Press de Ombros no Cabo',
  'Band Shoulder Press': 'Press de Ombros com Elástico',

  // Braços / Bíceps
  'Bicep Curl': 'Rosca Bíceps',
  'Barbell Curl': 'Rosca Direta com Barra',
  'Barbell Bicep Curl': 'Rosca Direta com Barra',
  'Dumbbell Bicep Curl': 'Rosca Bíceps com Halteres',
  'Dumbbell Curl': 'Rosca com Halteres',
  'Hammer Curl': 'Rosca Martelo',
  'Dumbbell Hammer Curl': 'Rosca Martelo com Halteres',
  'Cable Hammer Curl': 'Rosca Martelo no Cabo',
  'Concentration Curl': 'Rosca Concentrada',
  'Dumbbell Concentration Curl': 'Rosca Concentrada com Haltere',
  'Preacher Curl': 'Rosca Scott',
  'EZ Bar Preacher Curl': 'Rosca Scott com Barra EZ',
  'EZ Barbell Preacher Curl': 'Rosca Scott com Barra EZ',
  'Dumbbell Preacher Curl': 'Rosca Scott com Haltere',
  'Zottman Curl': 'Rosca Zottman com Halteres',
  'Incline Curl': 'Rosca Inclinada',
  'Dumbbell Incline Curl': 'Rosca Inclinada com Halteres',
  'Cable Curl': 'Rosca Bíceps no Cabo',
  'Cable Bicep Curl': 'Rosca Bíceps no Cabo',
  'EZ Bar Curl': 'Rosca Bíceps com Barra EZ',
  'EZ Barbell Curl': 'Rosca Bíceps com Barra EZ',
  'Lever Bicep Curl': 'Rosca Bíceps na Máquina',
  'Lever Preacher Curl': 'Rosca Scott na Máquina',
  'Spider Curl': 'Rosca Aranha',

  // Braços / Tríceps
  'Skull Crusher': 'Tríceps Testa (Skull Crusher)',
  'Barbell Skull Crusher': 'Tríceps Testa com Barra',
  'EZ Barbell Skull Crusher': 'Tríceps Testa com Barra EZ',
  'Dumbbell Skull Crusher': 'Tríceps Testa com Halteres',
  'Tricep Extension': 'Extensão de Tríceps',
  'Overhead Tricep Extension': 'Extensão de Tríceps Acima da Cabeça',
  'Dumbbell Overhead Tricep Extension': 'Extensão de Tríceps com Haltere Acima da Cabeça',
  'Cable Overhead Triceps Extension': 'Extensão de Tríceps Acima da Cabeça no Cabo',
  'Tricep Pushdown': 'Puxada de Tríceps no Cabo',
  'Cable Tricep Pushdown': 'Puxada de Tríceps no Cabo',
  'Cable Rope Tricep Pushdown': 'Puxada de Tríceps no Cabo com Corda',
  'Tricep Kickback': 'Kickback de Tríceps',
  'Dumbbell Tricep Kickback': 'Kickback de Tríceps com Haltere',
  'Cable Tricep Kickback': 'Kickback de Tríceps no Cabo',
  'Dip': 'Mergulho / Paralelas',
  'Tricep Dip': 'Mergulho para Tríceps',
  'Wrist Curl': 'Rosca de Pulso',
  'Reverse Curl': 'Rosca Inversa',

  // Core / Abdominais
  'Crunch': 'Abdominal Tradicional',
  'Sit-Up': 'Abdominal Completo',
  'Plank': 'Prancha Abdominal',
  'Side Plank': 'Prancha Lateral',
  'Russian Twist': 'Rotação Russa',
  'Leg Raise': 'Elevação de Pernas',
  'Hanging Leg Raise': 'Elevação de Pernas em Suspensão',
  'Cable Crunch': 'Abdominal no Cabo',
  'Good Morning': 'Bom Dia (Good Morning)',
  'Hyperextension': 'Hiperextensão Lombar',
  'Back Extension': 'Extensão Lombar',
  'Farmer Walk': 'Caminhada do Fazendeiro',
  'Turkish Get-Up': 'Levantamento Turco',
  'Clean And Press': 'Clean & Press',
};

export function translateExerciseName(name: string): string {
  if (!name) return 'Exercício';
  const lowerName = name.toLowerCase().trim();

  // 1. Direct match in NAME_OVERRIDES
  for (const [eng, pt] of Object.entries(NAME_OVERRIDES)) {
    if (eng.toLowerCase() === lowerName) return pt;
  }

  // 2. Word-by-word with clean capitalization and dictionary lookups
  const words = name.split(/[\s/]+/);
  const translated = words.map(word => {
    const clean = word.replace(/[^a-zA-Z0-9'-]/g, '');
    const lower = clean.toLowerCase();
    const trans = WORD_DICT[lower];
    if (trans === '') return null;
    if (trans) return trans;
    return word;
  }).filter(Boolean);

  return translated.join(' ');
}

export function getExerciseAliases(name: string): string[] {
  const lower = name.toLowerCase();
  const aliases: string[] = [];

  // Equipamento
  if (lower.includes('lever') || lower.includes('machine')) {
    aliases.push('maquina', 'articulada', 'hammer', 'alavanca');
  }
  if (lower.includes('cable')) {
    aliases.push('cabo', 'polia', 'roldana');
  }
  if (lower.includes('barbell') || lower.includes('bar')) {
    aliases.push('barra');
  }
  if (lower.includes('dumbbell') || lower.includes('dumbell')) {
    aliases.push('haltere', 'halteres', 'halter');
  }
  if (lower.includes('smith')) {
    aliases.push('smith', 'guiada');
  }
  if (lower.includes('band')) {
    aliases.push('elastico');
  }
  if (lower.includes('kettlebell')) {
    aliases.push('kettlebell');
  }

  // Unilateral / Isolateral
  if (lower.includes('unilateral') || lower.includes('one arm') || lower.includes('single arm') || lower.includes('alternating')) {
    aliases.push('isolateral', 'iso-lateral', 'iso lateral', 'unilateral', 'alternado', 'alternada', '1 braco', 'um braco');
  }

  // Costas / Remadas
  if (lower.includes('row')) {
    aliases.push('remada', 'remadas', 'costas', 'dorsal', 'dorsais');
  }
  if (lower.includes('bent over') || lower.includes('bent-over')) {
    aliases.push('curvada', 'curvado');
  }
  if (lower.includes('pulldown') || lower.includes('pull-up') || lower.includes('pullup') || lower.includes('chin-up')) {
    aliases.push('puxada', 'puxadas', 'elevacao', 'elevacoes', 'dominadas', 'dorsal', 'costas');
  }

  // Peito / Supino
  if (lower.includes('press') && (lower.includes('bench') || lower.includes('chest') || lower.includes('incline') || lower.includes('decline'))) {
    aliases.push('supino', 'peito', 'peitoral', 'press');
  }
  if (lower.includes('fly') || lower.includes('flye')) {
    aliases.push('aberturas', 'crucifixo', 'voador', 'peito');
  }

  // Bíceps / Braços
  if (lower.includes('curl')) {
    aliases.push('rosca', 'direta', 'biceps', 'bracos');
  }
  if (lower.includes('hammer')) {
    aliases.push('martelo');
  }
  if (lower.includes('preacher')) {
    aliases.push('scott');
  }

  // Pernas
  if (lower.includes('squat')) {
    aliases.push('agachamento', 'agachamentos', 'pernas', 'quadriceps');
  }
  if (lower.includes('deadlift')) {
    aliases.push('peso morto', 'terra', 'posterior', 'gluteos');
  }
  if (lower.includes('lunge')) {
    aliases.push('afundo', 'afundos', 'passada', 'passadas', 'pernas');
  }
  if (lower.includes('calf') || lower.includes('calves')) {
    aliases.push('gemeos', 'gemeo', 'panturrilha', 'panturrilhas', 'pernas');
  }

  // Tríceps
  if (lower.includes('tricep') || lower.includes('triceps') || lower.includes('skull crusher') || lower.includes('pushdown')) {
    aliases.push('triceps', 'tricep', 'bracos', 'testa', 'frances');
  }

  // Ombros / Press Militar / Desenvolvimento
  if (lower.includes('shoulder') || lower.includes('military') || lower.includes('overhead') || lower.includes('lateral raise') || lower.includes('arnold')) {
    aliases.push('ombro', 'ombros', 'deltoide', 'deltoides', 'militar', 'press militar', 'overhead press', 'desenvolvimento');
  }

  // Posições / Modificadores
  if (lower.includes('seated')) {
    aliases.push('sentado', 'sentada');
  }
  if (lower.includes('standing')) {
    aliases.push('em pe', 'pe');
  }
  if (lower.includes('incline')) {
    aliases.push('inclinado', 'inclinada');
  }
  if (lower.includes('decline')) {
    aliases.push('declinado', 'declinada');
  }

  // Core
  if (lower.includes('crunch') || lower.includes('sit-up') || lower.includes('plank') || lower.includes('ab')) {
    aliases.push('abdominal', 'abdominais', 'barriga', 'core');
  }

  return aliases;
}

export function matchesExerciseQuery(
  ex: { name: string; muscle_group?: string; target?: string; secondary_muscles?: string[]; category?: string },
  query: string
): boolean {
  const qNorm = normalizeStr(query);
  if (!qNorm) return true;

  const tokens = qNorm.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const rawName = normalizeStr(ex.name);
  const translated = normalizeStr(translateExerciseName(ex.name));
  const aliases = getExerciseAliases(ex.name).map(normalizeStr).join(' ');
  const muscle = normalizeStr(ex.muscle_group || ex.category || '');
  const target = normalizeStr(ex.target || '');
  const secondaries = (ex.secondary_muscles || []).map(normalizeStr).join(' ');

  const searchable = `${rawName} ${translated} ${aliases} ${muscle} ${target} ${secondaries}`;

  return tokens.every(token => searchable.includes(token));
}

export function filterExercisesBySearch<T extends { name: string; muscle_group?: string; target?: string; secondary_muscles?: string[]; category?: string }>(
  list: T[],
  query: string
): T[] {
  const qNorm = normalizeStr(query);
  if (!qNorm) return list;

  const tokens = qNorm.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return list;

  // 1. Strict multi-token search (all tokens must match)
  const strictMatches = list.filter(item => matchesExerciseQuery(item, query));
  if (strictMatches.length > 0) return strictMatches;

  // 2. Typo-tolerant fallback: match any token with length >= 3
  const validTokens = tokens.filter(t => t.length >= 3);
  if (validTokens.length === 0) return [];

  return list.filter(item => {
    const rawName = normalizeStr(item.name);
    const translated = normalizeStr(translateExerciseName(item.name));
    const aliases = getExerciseAliases(item.name).map(normalizeStr).join(' ');
    const muscle = normalizeStr(item.muscle_group || item.category || '');
    const target = normalizeStr(item.target || '');
    const secondaries = (item.secondary_muscles || []).map(normalizeStr).join(' ');
    const searchable = `${rawName} ${translated} ${aliases} ${muscle} ${target} ${secondaries}`;

    return validTokens.some(token => searchable.includes(token));
  });
}

export type MainMuscleCategory = 'Peito' | 'Costas' | 'Ombros' | 'Braços' | 'Pernas' | 'Abs' | 'Outro';

export function getExerciseCategory(item: {
  name: string;
  muscle_group?: string;
  target?: string;
  secondary_muscles?: string[];
  category?: string;
}): MainMuscleCategory {
  const name = (item.name || '').toLowerCase();
  const target = (item.target || '').toLowerCase();
  const muscleGroup = (item.muscle_group || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();

  // 1. Direct name-based gym classification
  if (
    name.includes('bench press') ||
    name.includes('chest press') ||
    name.includes('chest fly') ||
    name.includes('pec deck') ||
    name.includes('push-up') ||
    name.includes('push up') ||
    name.includes('chest dip')
  ) {
    return 'Peito';
  }
  if (
    name.includes('military') ||
    name.includes('overhead press') ||
    name.includes('shoulder press') ||
    name.includes('lateral raise') ||
    name.includes('front raise') ||
    name.includes('rear delt') ||
    name.includes('arnold press') ||
    name.includes('face pull') ||
    name.includes('shrug')
  ) {
    return 'Ombros';
  }
  if (
    name.includes('row') ||
    name.includes('pulldown') ||
    name.includes('pull-up') ||
    name.includes('pull up') ||
    name.includes('chin-up') ||
    name.includes('chin up') ||
    name.includes('pullover') ||
    name.includes('hyperextension') ||
    name.includes('back extension')
  ) {
    return 'Costas';
  }
  if (
    name.includes('curl') ||
    name.includes('skull crusher') ||
    name.includes('tricep extension') ||
    name.includes('tricep pushdown') ||
    name.includes('tricep kickback') ||
    name.includes('wrist curl') ||
    name.includes('tricep dip') ||
    name.includes('triceps dip')
  ) {
    return 'Braços';
  }
  if (
    name.includes('squat') ||
    name.includes('leg press') ||
    name.includes('lunge') ||
    name.includes('leg extension') ||
    name.includes('leg curl') ||
    name.includes('calf raise') ||
    name.includes('hip thrust') ||
    name.includes('glute bridge') ||
    name.includes('romanian deadlift') ||
    name.includes('stiff leg')
  ) {
    return 'Pernas';
  }
  if (
    name.includes('crunch') ||
    name.includes('sit-up') ||
    name.includes('plank') ||
    name.includes('russian twist') ||
    name.includes('hanging leg raise') ||
    name.includes('ab wheel')
  ) {
    return 'Abs';
  }

  // 2. Target muscle classification
  if (target === 'pectorals' || target === 'serratus anterior' || muscleGroup === 'chest') return 'Peito';
  if (target === 'delts' || muscleGroup === 'shoulders' || muscleGroup === 'deltoids' || muscleGroup === 'rotator cuff') return 'Ombros';
  if (
    target === 'lats' ||
    target === 'upper back' ||
    target === 'traps' ||
    target === 'spine' ||
    target === 'levator scapulae' ||
    muscleGroup === 'back' ||
    muscleGroup === 'lats' ||
    muscleGroup === 'traps' ||
    muscleGroup === 'trapezius' ||
    muscleGroup === 'upper back' ||
    muscleGroup === 'lower back' ||
    muscleGroup === 'rhomboids' ||
    muscleGroup === 'latissimus dorsi'
  ) return 'Costas';
  if (
    target === 'biceps' ||
    target === 'triceps' ||
    target === 'forearms' ||
    muscleGroup === 'biceps' ||
    muscleGroup === 'triceps' ||
    muscleGroup === 'forearms' ||
    muscleGroup === 'wrist flexors' ||
    muscleGroup === 'wrist extensors' ||
    muscleGroup === 'wrists' ||
    muscleGroup === 'hands'
  ) return 'Braços';
  if (
    target === 'quads' ||
    target === 'hamstrings' ||
    target === 'glutes' ||
    target === 'calves' ||
    target === 'adductors' ||
    target === 'abductors' ||
    muscleGroup === 'quadriceps' ||
    muscleGroup === 'hamstrings' ||
    muscleGroup === 'glutes' ||
    muscleGroup === 'calves' ||
    muscleGroup === 'soleus' ||
    muscleGroup === 'ankles' ||
    muscleGroup === 'ankle stabilizers'
  ) return 'Pernas';
  if (
    target === 'abs' ||
    muscleGroup === 'abdominals' ||
    muscleGroup === 'core' ||
    muscleGroup === 'obliques' ||
    muscleGroup === 'hip flexors'
  ) return 'Abs';

  // 3. Category fallback
  if (cat.includes('peito') || cat.includes('chest')) return 'Peito';
  if (cat.includes('costas') || cat.includes('back')) return 'Costas';
  if (cat.includes('ombro') || cat.includes('shoulder')) return 'Ombros';
  if (cat.includes('braço') || cat.includes('arm')) return 'Braços';
  if (cat.includes('perna') || cat.includes('leg')) return 'Pernas';
  if (cat.includes('abs') || cat.includes('core')) return 'Abs';

  return 'Outro';
}

export function matchesCategoryFilter(
  item: { name: string; muscle_group?: string; target?: string; secondary_muscles?: string[]; category?: string },
  filterKey: string
): boolean {
  if (filterKey === 'all' || filterKey === 'bookmarked') return true;
  const cat = getExerciseCategory(item);
  const filterMap: Record<string, MainMuscleCategory> = {
    chest: 'Peito',
    arms: 'Braços',
    shoulders: 'Ombros',
    back: 'Costas',
    abdominals: 'Abs',
    legs: 'Pernas'
  };
  return filterMap[filterKey] === cat;
}

