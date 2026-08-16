// Tradução de exercícios: dicionário palavra-a-palavra + overrides de nomes completos

const WORD_DICT: Record<string, string> = {
  // Movimentos
  'press': 'Press', 'curl': 'Curl', 'raise': 'Elevação', 'raises': 'Elevações',
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
  'skull': 'Skull', 'crusher': 'Crusher', 'crushers': 'Crushers',
  'overhead': 'Ombros', 'sport': 'Desporto', 'side': 'Lateral',
  'hip': 'Quadril', 'hips': 'Quadris',
  // Equipamento
  'barbell': 'Barra', 'dumbbell': 'Haltere', 'dumbell': 'Haltere',
  'dumbbells': 'Halteres', 'cable': 'Cabo', 'cables': 'Cabos',
  'machine': 'Máquina', 'kettlebell': 'Kettlebell', 'kettlebells': 'Kettlebells',
  'band': 'Elástico', 'bands': 'Elásticos', 'bar': 'Barra', 'ez': 'EZ',
  'smith': 'Smith', 'trap': 'Trapézio', 'traps': 'Trapézio', 't-bar': 'T-Bar',
  'ball': 'Bola', 'box': 'Caixa', 'board': 'Prancha',
  // Posições / Modificadores
  'incline': 'Inclinado', 'decline': 'Declinado', 'flat': 'Plano',
  'standing': 'Em Pé', 'seated': 'Sentado', 'lying': 'Deitado',
  'single': 'Unilateral', 'double': 'Bilateral', 'alternating': 'Alternado',
  'reverse': 'Inverso', 'wide': 'Largo', 'narrow': 'Fechado', 'close': 'Fechado',
  'grip': 'Pega', 'front': 'Frontal', 'rear': 'Posterior', 'lateral': 'Lateral',
  'cross': 'Cruzado', 'sumo': 'Sumo', 'romanian': 'Romeno', 'bulgarian': 'Búlgaro',
  'nordic': 'Nórdico', 'hammer': 'Martelo', 'concentration': 'Concentração',
  'preacher': 'Scott', 'military': 'Militar', 'arnold': 'Arnold', 'goblet': 'Goblet',
  'hack': 'Hack', 'upper': 'Superior', 'lower': 'Inferior', 'inner': 'Interno',
  'outer': 'Externo', 'face': 'Face', 'high': 'Alto', 'low': 'Baixo',
  'wide-grip': 'Pega Larga', 'close-grip': 'Pega Fechada', 'neutral': 'Neutro',
  'underhand': 'Pegada Supinada', 'overhand': 'Pegada Pronada',
  'supinated': 'Supinado', 'pronated': 'Pronado', 'parallel': 'Paralelo',
  'split': 'Dividido', 'loaded': 'Carregado', 'bodyweight': 'Peso Corporal',
  'assisted': 'Assistido', 'weighted': 'Carregado', 'unilateral': 'Unilateral',
  'bilateral': 'Bilateral', 'isometric': 'Isométrico', 'eccentric': 'Excêntrico',
  // Partes do corpo
  'chest': 'Peito', 'back': 'Costas', 'shoulder': 'Ombro', 'shoulders': 'Ombros',
  'arm': 'Braço', 'arms': 'Braços', 'leg': 'Perna', 'legs': 'Pernas',
  'glute': 'Glúteo', 'glutes': 'Glúteos', 'hamstring': 'Isquiotibial',
  'hamstrings': 'Isquiotibiais', 'quad': 'Quadríceps', 'quads': 'Quadríceps',
  'quadricep': 'Quadríceps', 'quadriceps': 'Quadríceps', 'calf': 'Gémeo',
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
  'superset': 'Superserie', 'drop': 'Drop',
  '3/4': '3/4', '90/90': '90/90', '21s': '21s',
};

// Overrides para nomes completos muito comuns
const NAME_OVERRIDES: Record<string, string> = {
  'Bench Press': 'Press de Banco',
  'Incline Bench Press': 'Press de Banco Inclinado',
  'Decline Bench Press': 'Press de Banco Declinado',
  'Push-Up': 'Flexão',
  'Push Up': 'Flexão',
  'Pull-Up': 'Dominadas',
  'Chin-Up': 'Chin-Up',
  'Squat': 'Agachamento',
  'Deadlift': 'Peso Morto',
  'Romanian Deadlift': 'Peso Morto Romeno',
  'Sumo Deadlift': 'Peso Morto Sumo',
  'Stiff Leg Deadlift': 'Peso Morto Stiff',
  'Hip Thrust': 'Hip Thrust',
  'Glute Bridge': 'Ponte de Glúteo',
  'Lunge': 'Afundo',
  'Reverse Lunge': 'Afundo Reverso',
  'Bulgarian Split Squat': 'Agachamento Búlgaro',
  'Front Squat': 'Agachamento Frontal',
  'Goblet Squat': 'Agachamento Goblet',
  'Hack Squat': 'Agachamento Hack',
  'Leg Press': 'Leg Press',
  'Leg Curl': 'Curl de Pernas',
  'Leg Extension': 'Extensão de Pernas',
  'Calf Raise': 'Elevação de Gémeos',
  'Standing Calf Raise': 'Elevação de Gémeos em Pé',
  'Seated Calf Raise': 'Elevação de Gémeos Sentado',
  'Overhead Press': 'Press Militar',
  'Military Press': 'Press Militar',
  'Arnold Press': 'Press Arnold',
  'Lateral Raise': 'Elevação Lateral',
  'Front Raise': 'Elevação Frontal',
  'Rear Delt Fly': 'Fly de Deltóide Posterior',
  'Face Pull': 'Face Pull',
  'Shrug': 'Encolhimento de Ombros',
  'Bent Over Row': 'Remada Curvada',
  'Bent-Over Row': 'Remada Curvada',
  'T-Bar Row': 'Remada T-Bar',
  'Seated Row': 'Remada Sentado',
  'Cable Row': 'Remada no Cabo',
  'Lat Pulldown': 'Puxada para o Peitoral',
  'Wide Grip Lat Pulldown': 'Puxada Aberta',
  'Close Grip Lat Pulldown': 'Puxada Fechada',
  'Pull Over': 'Pullover',
  'Chest Fly': 'Fly de Peito',
  'Cable Fly': 'Fly no Cabo',
  'Pec Deck': 'Pec Deck',
  'Bicep Curl': 'Rosca Bíceps',
  'Hammer Curl': 'Rosca Martelo',
  'Concentration Curl': 'Rosca Concentrada',
  'Preacher Curl': 'Rosca Scott',
  'Zottman Curl': 'Rosca Zottman',
  'Incline Curl': 'Rosca Inclinada',
  'Cable Curl': 'Rosca no Cabo',
  'EZ Bar Curl': 'Rosca Barra EZ',
  'Skull Crusher': 'Skull Crusher',
  'Tricep Extension': 'Extensão de Tríceps',
  'Overhead Tricep Extension': 'Extensão de Tríceps Acima da Cabeça',
  'Tricep Pushdown': 'Puxada de Tríceps',
  'Tricep Kickback': 'Kickback de Tríceps',
  'Dip': 'Mergulho',
  'Crunch': 'Abdominal',
  'Sit-Up': 'Abdominal Completo',
  'Plank': 'Prancha',
  'Russian Twist': 'Rotação Russa',
  'Leg Raise': 'Elevação de Pernas',
  'Hanging Leg Raise': 'Elevação de Pernas Suspenso',
  'Good Morning': 'Bom Dia',
  'Nordic Curl': 'Curl Nórdico',
  'Hyperextension': 'Hiperextensão',
  'Back Extension': 'Extensão de Costas',
  'Dumbbell Row': 'Remada com Haltere',
  'One Arm Dumbbell Row': 'Remada Unilateral',
  'Single Arm Row': 'Remada Unilateral',
  'Upright Row': 'Remada Vertical',
  'Wrist Curl': 'Rosca de Pulso',
  'Reverse Curl': 'Rosca Inversa',
  'Farmer Walk': 'Caminhada do Fazendeiro',
  'Turkish Get-Up': 'Levantar Turco',
  'Clean And Press': 'Clean & Press',
};

export function translateExerciseName(name: string): string {
  // Check full name override first (case-insensitive)
  const lowerName = name.toLowerCase();
  for (const [eng, pt] of Object.entries(NAME_OVERRIDES)) {
    if (eng.toLowerCase() === lowerName) return pt;
  }

  // Word-by-word translation
  const words = name.split(/[\s/]+/);
  const translated = words.map(word => {
    const clean = word.replace(/[^a-zA-Z0-9'-]/g, '');
    const lower = clean.toLowerCase();
    const trans = WORD_DICT[lower];
    // If translation is empty string (e.g. 'the'), skip
    if (trans === '') return null;
    if (trans) return trans;
    // Keep original if no translation (names like "EZ", numbers, etc.)
    return word;
  }).filter(Boolean);

  return translated.join(' ');
}
