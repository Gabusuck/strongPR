# StrongPR - Gym Tracker (PWA)

Uma aplicação Web Progressiva (PWA) minimalista, moderna e funcional para ginásio, focada no registo de treinos e acompanhamento de recordes pessoais (PRs).

## 🌍 Aplicação em Produção
O projeto está publicado e pronto para ser instalado a partir de:
👉 **[strong-snowy.vercel.app](https://strong-snowy.vercel.app)**

---

## ⚡ Funcionalidades
1. **Dashboard:** Total de treinos, quantidade de PRs batidos, histórico recente e início rápido de treino.
2. **Treino Ativo (Workout Log):** Controlo do tempo total de treino, exercícios, séries (sets), pesos e repetições.
3. **Temporizador de Descanso:** Disparo automático ao concluir uma série, com alertas sonoros e vibração tátil nativa.
4. **Recordes Pessoais (PR Tracker):** Gráficos SVG interativos gerados sob medida (sem bibliotecas externas) para visualizar a evolução de carga. Opção para introduzir marcas antigas manualmente.
5. **Histórico de Treinos:** Linha de tempo cronológica com abas expansíveis para rever os pesos e séries levantados em treinos passados.
6. **Catálogo de Exercícios:** Base de dados inicial categorizada por grupos musculares, com opção de criar ou apagar exercícios personalizados.
7. **PWA offline:** Funciona 100% sem internet graças a um Service Worker de cache eficiente.
8. **Backup e Restauro:** Exporta ou importa todos os teus dados num ficheiro `.json` para nunca perderes o teu progresso.

---

## 🚀 Como Executar Localmente

### 1. Instalar dependências:
```bash
npm install
```

### 2. Iniciar em modo de desenvolvimento:
```bash
npm run dev
```
Abre `http://localhost:5173` no teu navegador.

### 3. Compilar para produção:
```bash
npm run build
```

---

## 📦 Estrutura de Ficheiros
- `src/App.tsx`: Orquestrador principal e rotas por abas.
- `src/types.ts`: Definições de tipos TypeScript.
- `src/storage.ts`: Persistência local (`localStorage`), cálculo de 1RM e exportação/importação.
- `src/index.css`: Design system moderno com variáveis, glassmorphism e animações.
- `src/components/`: Componentes modulares (Dashboard, WorkoutLog, PRTracker, etc.).
- `public/manifest.json`: Ficheiro de manifesto PWA.
- `public/sw.js`: Service Worker com cache e suporte offline.
- `vercel.json`: Regras de reencaminhamento de URL e cabeçalhos de desativação de cache para atualizações instantâneas.
