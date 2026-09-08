import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Workout, PersonalRecord, Exercise, UserProfile } from '../types';
import { PRTracker } from './PRTracker';
import { ExercisesList } from './ExercisesList';
import { Trophy, Flame, Dumbbell, Calendar, Upload, ArrowLeft, TrendingUp, X } from 'lucide-react';
import { getExerciseWeightMultiplier } from '../utils/exerciseUtils';

interface ProfileViewProps {
  workouts: Workout[];
  prs: PersonalRecord[];
  exercises: Exercise[];
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onAddManualPR: (exerciseId: string, weight: number, reps: number, date: string) => void;
  onAddCustomExercise: (name: string, category: string) => void;
  onDeleteCustomExercise: (id: string) => void;
}

type ProfileSubView = 'main' | 'prs' | 'exercises';

export const ProfileView: React.FC<ProfileViewProps> = ({
  workouts,
  prs,
  exercises,
  profile,
  onUpdateProfile,
  onAddManualPR,
  onAddCustomExercise,
  onDeleteCustomExercise,
}) => {
  const [subView, setSubView] = useState<ProfileSubView>('main');
  const avatarUploadRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Consistency Year Modal states
  const [showYearGridModal, setShowYearGridModal] = useState(false);

  // Auto-scroll the full-year grid to the end (today) on load & lock body scroll
  React.useEffect(() => {
    if (showYearGridModal) {
      document.body.style.overflow = 'hidden';
      if (scrollContainerRef.current) {
        const timer = setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showYearGridModal]);

  // Modal edit states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editWeight, setEditWeight] = useState(profile.weight.toString());
  const [editHeight, setEditHeight] = useState(profile.height.toString());
  const [editAge, setEditAge] = useState(profile.age.toString());
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl);
  const [editAvatarType, setEditAvatarType] = useState(profile.avatarType);
  const [editWeeklyGoal, setEditWeeklyGoal] = useState(profile.weeklyGoal || 4);

  // Calculate statistics
  const totalWorkouts = workouts.length;
  const totalPRs = prs.length;

  const getRecentWorkoutsCount = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return workouts.filter(w => new Date(w.date) >= oneWeekAgo).length;
  };

  const recentWorkouts = getRecentWorkoutsCount();

  // Generate 50 days grid (7 weeks) for the gym activity visual tracker
  // Helper: compute total kg lifted in a workout
  const getWorkoutVolume = (w: Workout) => {
    if (!w || !w.exercises) return 0;
    return (w.exercises || []).reduce((total, ex) => {
      if (!ex || !ex.sets) return total;
      const mult = getExerciseWeightMultiplier(ex);
      return total + (ex.sets || []).filter(s => s && s.isCompleted).reduce((s, set) => s + ((Number(set.weight) || 0) * mult) * (Number(set.reps) || 0), 0);
    }, 0);
  };

  const safeWorkouts = (workouts || []).filter(w => w && w.date);

  // Generate 50 days grid (7 weeks) for the gym activity visual tracker
  const getActivityGridDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 49; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayWorkouts = safeWorkouts.filter(w => {
        try {
          return new Date(w.date).toISOString().split('T')[0] === dateStr;
        } catch {
          return false;
        }
      });
      const count = dayWorkouts.length;
      const volume = dayWorkouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
      days.push({ date: dateStr, count, volume });
    }
    return days;
  };

  const getFullYearGridDays = () => {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jan 1st of the current year
    const jan1 = new Date(currentYear, 0, 1);
    // Find the Monday of the week containing Jan 1st (0 = Mon, 6 = Sun)
    const jan1DayOfWeek = (jan1.getDay() + 6) % 7;
    const startDate = new Date(currentYear, 0, 1 - jan1DayOfWeek);

    // Dec 31st of the current year
    const dec31 = new Date(currentYear, 11, 31);
    // Find the Sunday of the week containing Dec 31st
    const dec31DayOfWeek = (dec31.getDay() + 6) % 7;
    const endDate = new Date(currentYear, 11, 31 + (6 - dec31DayOfWeek));

    const days: {
      date: Date;
      dateStr: string;
      count: number;
      volume: number;
      isCurrentYear: boolean;
      isFuture: boolean;
    }[] = [];

    // Map workouts by YYYY-MM-DD
    const workoutsByDate: Record<string, typeof safeWorkouts> = {};
    safeWorkouts.forEach(w => {
      try {
        const dStr = new Date(w.date).toISOString().split('T')[0];
        if (!workoutsByDate[dStr]) workoutsByDate[dStr] = [];
        workoutsByDate[dStr].push(w);
      } catch {}
    });

    const curr = new Date(startDate);
    while (curr <= endDate) {
      const d = new Date(curr);
      const dateStr = d.toISOString().split('T')[0];
      const isCurrentYear = d.getFullYear() === currentYear;
      const isFuture = d > today;

      let count = 0;
      let volume = 0;

      if (isCurrentYear && !isFuture) {
        const dayWorkouts = workoutsByDate[dateStr] || [];
        count = dayWorkouts.length;
        volume = dayWorkouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
      }

      days.push({
        date: d,
        dateStr,
        count,
        volume,
        isCurrentYear,
        isFuture
      });

      curr.setDate(curr.getDate() + 1);
    }

    return days;
  };

  const getYearMonthLabels = (days: ReturnType<typeof getFullYearGridDays>) => {
    const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const labels: { label: string; colIdx: number }[] = [];

    monthNames.forEach((label, mIdx) => {
      const dayIdx = days.findIndex(d => d.isCurrentYear && d.date.getMonth() === mIdx && d.date.getDate() === 1);
      if (dayIdx >= 0) {
        labels.push({ label, colIdx: Math.floor(dayIdx / 7) });
      }
    });

    return labels;
  };

  const activityDays = getActivityGridDays();
  const fullYearDays = getFullYearGridDays();

  // Compute workout baseline averages for personalized color tiers based on the user's average
  const activeWorkoutVolumes = safeWorkouts
    .map(w => getWorkoutVolume(w))
    .filter(v => v > 0);

  const totalWorkoutVolume = activeWorkoutVolumes.reduce((sum, v) => sum + v, 0);
  const avgWorkoutVolume = activeWorkoutVolumes.length > 0
    ? totalWorkoutVolume / activeWorkoutVolumes.length
    : 0;

  // Classification function based on the athlete's personal average
  const getVolumeTier = (volume: number): { tier: number; label: string } => {
    if (!volume || volume <= 0) return { tier: 0, label: 'Sem Treino' };
    if (activeWorkoutVolumes.length <= 1 || avgWorkoutVolume === 0) {
      return { tier: 3, label: 'Bom Treino' };
    }
    
    // Menos bom / Leve: abaixo de 70% da média pessoal
    if (volume < avgWorkoutVolume * 0.70) {
      return { tier: 1, label: 'Treino Leve' };
    }
    // Moderado: entre 70% e 95% da média pessoal
    if (volume < avgWorkoutVolume * 0.95) {
      return { tier: 2, label: 'Treino Moderado' };
    }
    // Bom Treino: entre 95% e 125% da média pessoal (sólido na média)
    if (volume < avgWorkoutVolume * 1.25) {
      return { tier: 3, label: 'Bom Treino' };
    }
    // Excelente / Monstro: 125%+ da média pessoal
    return { tier: 4, label: 'Treino Excelente 🔥' };
  };

  const getVolumeClass = (volume: number) => {
    const { tier } = getVolumeTier(volume);
    if (tier === 0) return '';
    return `active-${tier}`;
  };

  const [isSharingImage, setIsSharingImage] = useState(false);

  // Safe round rect helper for canvas
  const drawRoundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
  };

  // Download shareable Instagram image using canvas
  const downloadShareImage = async () => {
    if (isSharingImage) return;
    setIsSharingImage(true);

    try {
      const W = 1080, H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Contexto 2D não disponível');

      // ── Helpers ──────────────────────────────────────────
      const rr = (x: number, y: number, w: number, h: number, r: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        drawRoundRectPath(ctx, x, y, w, h, r);
        ctx.fill();
      };
      const txt = (text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
      };

      // ── Palette matching site theme ─────────────────────
      const ACCENT      = '#5B5EF4';
      const ACCENT_DARK = '#4347D0';
      const ACCENT_GLOW = 'rgba(91,94,244,0.35)';
      const TIER_1      = '#C7C8FC';
      const TIER_2      = '#9395F8';
      const TIER_3      = '#5B5EF4';
      const TIER_4      = '#4347D0';
      const EMPTY_CELL  = '#E5E5EA';

      const BLACK       = '#1C1C1E';
      const GREY        = '#8E8E93';
      const LGREY       = '#AEAEB2';
      const WHITE       = '#FFFFFF';
      const CREAM       = '#F2F2F7';
      const CARD_BG     = '#FFFFFF';
      const BORDER      = '#E5E5EA';

      // ── COMPUTE STATS ────────────────────────────────────
      const currentYear = new Date().getFullYear();
      const yw = safeWorkouts.filter(w => {
        try {
          return new Date(w.date).getFullYear() === currentYear;
        } catch {
          return false;
        }
      });
      const vol = yw.reduce((s, w) => s + getWorkoutVolume(w), 0);
      const volStr = vol >= 1000 ? `${(vol/1000).toFixed(1)}t` : `${Math.round(vol)}kg`;
      const secs = yw.reduce((s, w) => s + (w.duration || 0), 0);
      const hrsStr = secs >= 3600 ? `${Math.floor(secs/3600)}h` : secs > 0 ? `${Math.round(secs/60)}min` : '—';
      const avgPW = yw.length > 0 ? (yw.length / 52).toFixed(1) : '0';

      let streak = 0;
      const tod = new Date(); tod.setHours(0,0,0,0);
      for (let i = 0; i < 365; i++) {
        const d = new Date(tod); d.setDate(tod.getDate() - i);
        if (d.getFullYear() !== currentYear) break;
        const ds = d.toISOString().split('T')[0];
        if (safeWorkouts.some(w => {
          try {
            return new Date(w.date).toISOString().split('T')[0] === ds;
          } catch {
            return false;
          }
        })) streak++;
        else if (i > 0) break;
      }
      let best = 0, run = 0;
      for (const day of fullYearDays) {
        if (day.isCurrentYear && day.count > 0) {
          run++;
          best = Math.max(best, run);
        } else if (day.isCurrentYear) {
          run = 0;
        }
      }

      const mc: Record<string,number> = {};
      yw.forEach(w => (w?.exercises || []).forEach(ex => {
        const cat = ex?.category || 'Outro';
        const completedCount = (ex?.sets || []).filter(s => s && s.isCompleted).length;
        mc[cat] = (mc[cat] || 0) + completedCount;
      }));
      const topM = Object.entries(mc).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? '—';
      const topMLabel = topM.length > 9 ? topM.slice(0,9)+'.' : topM;

      const stats = [
        { v: yw.length.toString(),  l: `Treinos (${currentYear})`, hi: true  },
        { v: volStr,                 l: 'Volume Total',             hi: true  },
        { v: prs.length.toString(), l: 'PRs Batidos',              hi: false },
        { v: hrsStr,                 l: 'Horas de Gym',             hi: false },
        { v: avgPW,                  l: 'Treinos/Semana',           hi: false },
        { v: `${streak}d`,          l: 'Streak Atual',             hi: false },
        { v: `${best}d`,            l: 'Melhor Streak',            hi: false },
        { v: topMLabel,              l: 'Músculo Fav.',             hi: false },
      ];

      // ══════════════════════════════════════════════════════
      // SECTION 1 — BRAND INDIGO TOP  (0 → 680px)
      // ══════════════════════════════════════════════════════
      const topH = 680;
      const topGrad = ctx.createLinearGradient(0, 0, W, topH);
      topGrad.addColorStop(0, ACCENT);
      topGrad.addColorStop(1, ACCENT_DARK);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, topH);

      // decorative big circle top-right
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.arc(W + 80, -80, 420, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.arc(W - 80, 300, 250, 0, Math.PI * 2); ctx.fill();

      // App label
      txt('STRONG APP', 80, 130, '600 28px system-ui,sans-serif', 'rgba(255,255,255,0.6)');
      // Year badge
      rr(W - 200, 95, 120, 50, 25, 'rgba(255,255,255,0.18)');
      txt(currentYear.toString(), W - 140, 130, 'bold 26px system-ui,sans-serif', WHITE, 'center');

      // Name
      txt(profile.name || 'Os meus Gains', 80, 270, 'bold 100px system-ui,sans-serif', WHITE);
      // Subtitle line
      const subLine = ctx.createLinearGradient(80, 0, 600, 0);
      subLine.addColorStop(0,'rgba(255,255,255,0.7)'); subLine.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle = subLine; ctx.fillRect(80, 290, 450, 3);

      txt(`Consistência Anual · 1 Jan a 31 Dez ${currentYear}`, 80, 340, '500 30px system-ui,sans-serif', 'rgba(255,255,255,0.75)');

      // ─ 2 hero stats ─
      const heroStats = [
        { v: yw.length.toString(), l: `Treinos em ${currentYear}` },
        { v: volStr,                l: 'Volume levantado' },
      ];
      heroStats.forEach((s, i) => {
        const hx = 80 + i * 470;
        rr(hx, 400, 420, 220, 28, 'rgba(255,255,255,0.13)');
        // left accent bar
        rr(hx, 400, 5, 220, 3, 'rgba(255,255,255,0.5)');
        txt(s.v, hx + 30, 510, 'bold 86px system-ui,sans-serif', WHITE);
        txt(s.l, hx + 30, 560, '500 26px system-ui,sans-serif', 'rgba(255,255,255,0.65)');
      });

      // wave / divider between sections
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.moveTo(0, topH - 60);
      ctx.quadraticCurveTo(W * 0.25, topH + 20, W * 0.5, topH - 30);
      ctx.quadraticCurveTo(W * 0.75, topH - 80, W, topH - 20);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

      // ══════════════════════════════════════════════════════
      // SECTION 2 — WHITE BODY  (680px → bottom)
      // ══════════════════════════════════════════════════════
      ctx.fillStyle = WHITE;
      ctx.fillRect(0, topH, W, H - topH);

      // ─ STAT CARDS 2×3 ─
      const CARD_W = 480, CARD_H = 130, CARD_GAP = 24;
      const cardsTop = topH + 40;
      stats.slice(2).forEach((s, i) => { // first 2 are hero stats above
        const col = i % 2, row = Math.floor(i / 2);
        const cx = 60 + col * (CARD_W + CARD_GAP);
        const cy = cardsTop + row * (CARD_H + CARD_GAP);
        // card
        rr(cx, cy, CARD_W, CARD_H, 22, CARD_BG);
        ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5;
        ctx.beginPath();
        drawRoundRectPath(ctx, cx, cy, CARD_W, CARD_H, 22);
        ctx.stroke();
        // left accent dot
        rr(cx + 24, cy + CARD_H/2 - 18, 6, 36, 3, ACCENT);
        // value
        txt(s.v, cx + 48, cy + 72, 'bold 52px system-ui,sans-serif', BLACK);
        txt(s.l, cx + 48, cy + 108, '500 24px system-ui,sans-serif', LGREY);
      });

      // ─ GRID LABEL ─
      const afterCards = cardsTop + 3 * (CARD_H + CARD_GAP) + 30;
      // label row
      rr(60, afterCards, 8, 36, 4, ACCENT);
      txt(`Consistência ${currentYear}`, 84, afterCards + 28, '700 30px system-ui,sans-serif', BLACK);
      txt(`1 Jan – 31 Dez · ${yw.length} treinos`, W - 60, afterCards + 28, '500 24px system-ui,sans-serif', LGREY, 'right');

      // ─ ACTIVITY GRID ─
      const COLS = Math.ceil(fullYearDays.length / 7), ROWS = 7;
      const CELL = 14, GAP = 3;
      const gW2 = COLS * (CELL + GAP) - GAP;
      const gH2 = ROWS * (CELL + GAP) - GAP;
      const gX2 = (W - gW2) / 2;
      const gY2 = afterCards + 52;

      rr(gX2 - 20, gY2 - 16, gW2 + 40, gH2 + 40, 18, CREAM);

      fullYearDays.forEach((day, idx) => {
        if (!day.isCurrentYear) return;
        const col = Math.floor(idx / 7), row = idx % 7;
        const x = gX2 + col * (CELL + GAP), y = gY2 + row * (CELL + GAP);
        let fc: string;
        const tier = getVolumeTier(day.volume).tier;
        if (tier === 0)      fc = EMPTY_CELL;
        else if (tier === 1) fc = TIER_1;
        else if (tier === 2) fc = TIER_2;
        else if (tier === 3) fc = TIER_3;
        else { fc = TIER_4; ctx.shadowColor = ACCENT_GLOW; ctx.shadowBlur = 6; }
        rr(x, y, CELL, CELL, 3, fc);
        ctx.shadowBlur = 0;
      });

      // ─ LEGEND ─
      const legY2 = gY2 + gH2 + 28;
      txt('menos', gX2, legY2 + 15, '500 22px system-ui,sans-serif', LGREY);
      [EMPTY_CELL, TIER_1, TIER_2, TIER_3, TIER_4].forEach((c, i) => rr(gX2 + 96 + i*26, legY2, 18, 18, 5, c));
      txt('mais', gX2 + 96 + 5*26 + 10, legY2 + 15, '500 22px system-ui,sans-serif', LGREY);

      // ─ BOTTOM STRIP ─
      const stripY = H - 90;
      rr(0, stripY, W, 90, 0, CREAM);
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(60, stripY + 45, 7, 0, Math.PI*2); ctx.fill();
      txt('strong app', 82, stripY + 52, '700 28px system-ui,sans-serif', GREY);
      txt('strong-pr.vercel.app', W - 60, stripY + 52, '500 24px system-ui,sans-serif', LGREY, 'right');

      const fileName = `strongpr_consistencia_${currentYear}.png`;

      // Convert canvas to Blob
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Erro ao converter imagem');

      const file = new File([blob], fileName, { type: 'image/png' });

      // Try Native Share API first (perfect for mobile / iOS Safari / Instagram Stories)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'StrongPR - Consistência Anual',
            text: `A minha consistência de treinos deste ano no StrongPR! 💪🔥`
          });
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return; // User cancelled share modal
          console.warn('Navigator share error, falling back to download:', shareErr);
        }
      }

      // Fallback: Blob URL download for desktop / unsupported browsers
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao partilhar/descarregar imagem:', err);
      alert('Não foi possível gerar a imagem. Tenta novamente.');
    } finally {
      setIsSharingImage(false);
    }
  };



  // Calculate workouts count per week for the last 6 weeks (Monday to Sunday)
  const getWeeklyWorkoutStats = () => {
    const stats = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monday = new Date();
      const daysSinceMonday = (now.getDay() + 6) % 7;
      monday.setDate(now.getDate() - daysSinceMonday - (i * 7));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const count = workouts.filter((w) => {
        const wDate = new Date(w.date);
        return wDate >= monday && wDate <= sunday;
      }).length;
      
      const label = `${monday.getDate()}/${monday.getMonth() + 1}`;
      stats.push({ label, count });
    }
    return stats;
  };

  const weeklyStats = getWeeklyWorkoutStats();

  // Calculate IMC/BMI
  const calculateIMC = () => {
    if (!profile.height || !profile.weight) return { value: 0, label: 'N/A', color: 'var(--text-secondary)' };
    const heightInMeters = profile.height / 100;
    const value = Math.round((profile.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    
    let label = 'Peso Ideal';
    let color = '#10b981'; // Green
    if (value < 18.5) {
      label = 'Abaixo do Peso';
      color = '#eab308'; // Yellow
    } else if (value >= 25 && value < 30) {
      label = 'Acima do Peso';
      color = '#f97316'; // Orange
    } else if (value >= 30) {
      label = 'Obesidade';
      color = '#ef4444'; // Red
    }
    return { value, label, color };
  };

  const imcData = calculateIMC();



  // Image resizing and compression to prevent localstorage quota errors and GC issues on mobile
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawBase64 = ev.target?.result as string;
        
        const img = new Image();
        // Prevent Garbage Collection on iOS Safari while decoding large files
        (window as any)._activeAvatarImg = img;
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 120; // 120px is perfect for avatar
            const MAX_HEIGHT = 120;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.6); // 0.6 is lightweight and high quality
              setEditAvatarUrl(compressed);
              setEditAvatarType('image');
            } else {
              setEditAvatarUrl(rawBase64);
              setEditAvatarType('image');
            }
          } catch (err) {
            console.error('Canvas compression error', err);
            setEditAvatarUrl(rawBase64);
            setEditAvatarType('image');
          }
          delete (window as any)._activeAvatarImg;
        };

        img.onerror = (err) => {
          console.error('Image load error, falling back to raw base64', err);
          setEditAvatarUrl(rawBase64);
          setEditAvatarType('image');
          delete (window as any)._activeAvatarImg;
        };

        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  // Render weekly bar chart
  const renderWeeklyChart = () => {
    const width = 340;
    const height = 120;
    const paddingX = 30;
    const paddingY = 20;
    const barWidth = 22;
    
    const maxCount = Math.max(...weeklyStats.map(s => s.count), 4); // Scale up to at least 4 workouts/week
    
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;
    const stepX = chartWidth / (weeklyStats.length - 1);

    return (
      <div style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '16px', marginTop: '12px', boxShadow: '0 2px 10px rgba(15,23,42,0.02)' }}>
        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={14} style={{ color: 'var(--accent-color)' }} />
          Treinos Semanais (Últimas 6 sem.)
        </h4>
        
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-color)" />
              <stop offset="100%" stopColor="#ff7a00" />
            </linearGradient>
          </defs>
          
          {/* Horizontal lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = paddingY + ratio * chartHeight;
            const val = Math.round(maxCount * (1 - ratio));
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="8" fontWeight="700" fill="var(--text-secondary)">{val}</text>
              </g>
            );
          })}

          {/* Render Bars */}
          {weeklyStats.map((stat, idx) => {
            const x = paddingX + idx * stepX - barWidth / 2;
            const barHeight = (stat.count / maxCount) * chartHeight;
            const y = height - paddingY - barHeight;
            
            return (
              <g key={idx}>
                {/* Background ghost bar */}
                <rect x={x} y={paddingY} width={barWidth} height={chartHeight} fill="#f8fafc" rx="4" opacity="0.5" />
                
                {/* Active bar */}
                {stat.count > 0 && (
                  <rect 
                    x={x} 
                    y={y} 
                    width={barWidth} 
                    height={barHeight} 
                    fill="url(#bar-grad)" 
                    rx="4" 
                  />
                )}
                
                {/* Number of workouts on top */}
                <text 
                  x={x + barWidth / 2} 
                  y={y - 5} 
                  textAnchor="middle" 
                  fontSize="9" 
                  fontWeight="800" 
                  fill={stat.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}
                >
                  {stat.count}
                </text>
                
                {/* Date Label */}
                <text 
                  x={x + barWidth / 2} 
                  y={height - paddingY + 12} 
                  textAnchor="middle" 
                  fontSize="8" 
                  fontWeight="700" 
                  fill="var(--text-secondary)"
                >
                  {stat.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Render IMC gauge (sleek minimalist horizontal slider)
  const renderIMCGauge = () => {
    const value = imcData.value;
    const percentage = Math.min(Math.max((value - 15) / 20, 0), 1); // 15 to 35 range (20 total)

    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
            Índice de Massa Corporal (IMC)
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: imcData.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: imcData.color }} />
            {imcData.label}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>
              {value}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>kg/m²</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>
            {profile.height} cm • {profile.weight} kg
          </div>
        </div>

        {/* Clean Progress Slider Line */}
        <div style={{ position: 'relative', marginTop: '10px', height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
          {/* Highlighted active part of the range */}
          <div 
            style={{
              position: 'absolute',
              left: 0,
              width: `${percentage * 100}%`,
              height: '100%',
              background: imcData.color,
              borderRadius: '3px',
              transition: 'width 0.5s ease-out'
            }} 
          />
          {/* Slider handle dot */}
          <div 
            style={{
              position: 'absolute',
              left: `${percentage * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: `3px solid ${imcData.color}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              transition: 'left 0.5s ease-out',
              zIndex: 5
            }} 
          />
        </div>
      </div>
    );
  };

  // RENDER SUBVIEWS
  if (subView === 'prs') {
    return (
      <div>
        <button 
          onClick={() => setSubView('main')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} /> Voltar ao Perfil
        </button>
        <PRTracker prs={prs} exercises={exercises} onAddManualPR={onAddManualPR} />
      </div>
    );
  }

  if (subView === 'exercises') {
    return (
      <div>
        <button 
          onClick={() => setSubView('main')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={16} /> Voltar ao Perfil
        </button>
        <ExercisesList 
          exercises={exercises} 
          onAddExercise={onAddCustomExercise} 
          onDeleteExercise={onDeleteCustomExercise} 
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--accent-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', fontSize: '28px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} 
            onClick={() => {
              setEditName(profile.name);
              setEditWeight(profile.weight.toString());
              setEditHeight(profile.height.toString());
              setEditAge(profile.age.toString());
              setEditAvatarUrl(profile.avatarUrl);
              setEditAvatarType(profile.avatarType);
              setEditWeeklyGoal(profile.weeklyGoal || 4);
              setShowEditProfileModal(true);
            }}
          >
            {profile.avatarType === 'image' ? (
              <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', padding: '14px', color: 'var(--text-muted)' }}>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{profile.name || 'Sem Nome'}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
              <span>⚖️ {profile.weight} kg</span>
              <span>•</span>
              <span>{profile.age} anos</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-color)', backgroundColor: 'rgba(255, 94, 58, 0.08)', padding: '2px 8px', borderRadius: '8px' }}>🎯 {profile.weeklyGoal || 4}x/semana</span>
            </p>
          </div>
        </div>
        <button 
          className="btn btn-secondary btn-small"
          onClick={() => {
            setEditName(profile.name);
            setEditWeight(profile.weight.toString());
            setEditHeight(profile.height.toString());
            setEditAge(profile.age.toString());
            setEditAvatarUrl(profile.avatarUrl);
            setEditAvatarType(profile.avatarType);
            setEditWeeklyGoal(profile.weeklyGoal || 4);
            setShowEditProfileModal(true);
          }}
          style={{ padding: '8px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Editar
        </button>
      </div>

      {/* IMC Display Card */}
      {renderIMCGauge()}

      {/* Stats Grid */}
      <div className="stat-grid">
        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '4px' }}>
            <Dumbbell size={16} />
          </div>
          <div className="stat-val">{totalWorkouts}</div>
          <div className="stat-lbl">Treinos</div>
        </div>
        
        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', color: '#f59e0b', marginBottom: '4px' }}>
            <Trophy size={16} />
          </div>
          <div className="stat-val">{totalPRs}</div>
          <div className="stat-lbl">PRs</div>
        </div>

        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: '4px' }}>
            <Flame size={16} />
          </div>
          <div className="stat-val">{recentWorkouts}</div>
          <div className="stat-lbl">Streak</div>
        </div>
      </div>

      {/* Consistency Activity Grid */}
      <div 
        className="glass-card interactive" 
        onClick={() => setShowYearGridModal(true)}
        style={{ marginBottom: 0, padding: '16px', cursor: 'pointer' }}
      >
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
          Consistência de Treinos
        </h3>
        
        <div className="activity-grid">
          {activityDays.map((day, idx) => {
            const tierInfo = getVolumeTier(day.volume);
            const volStr = day.volume > 0 ? ` · ${Math.round(day.volume)}kg (${tierInfo.label})` : '';
            return (
              <div 
                key={idx}
                className={`activity-day ${getVolumeClass(day.volume)}`}
                title={`${day.count} treino${day.count !== 1 ? 's' : ''} em ${day.date}${volStr}`}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px', padding: '0 2px', fontWeight: 600 }}>
          <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '3px' }}>Ver ano inteiro →</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span>Leve</span>
            <div className="activity-day" style={{ width: '8px', height: '8px', borderRadius: '2px' }} />
            <div className="activity-day active-1" style={{ width: '8px', height: '8px', borderRadius: '2px' }} title="Abaixo de 70% da média" />
            <div className="activity-day active-2" style={{ width: '8px', height: '8px', borderRadius: '2px' }} title="Moderado (70%-95% da média)" />
            <div className="activity-day active-3" style={{ width: '8px', height: '8px', borderRadius: '2px' }} title="Bom Treino (Média sólida)" />
            <div className="activity-day active-4" style={{ width: '8px', height: '8px', borderRadius: '2px' }} title="Excelente (>125% da média)" />
            <span>Intenso</span>
          </div>
        </div>
      </div>

      {/* Weekly Accumulated Bar Chart */}
      {renderWeeklyChart()}

      {/* Navigation Sub-Pages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Recordes Pessoais (PR Tracker) */}
        <div 
          className="glass-card interactive" 
          onClick={() => setSubView('prs')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', marginBottom: 0, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={18} style={{ color: '#f59e0b' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Os Meus PRs</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Recordes pessoais e gráficos de evolução.</div>
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 800 }}>→</span>
        </div>

        {/* Catálogo de Exercícios */}
        <div 
          className="glass-card interactive" 
          onClick={() => setSubView('exercises')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', marginBottom: 0, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Dumbbell size={18} style={{ color: 'var(--accent-color)' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Catálogo de Exercícios</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Pesquisa, filtros e exercícios personalizados.</div>
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 800 }}>→</span>
        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowEditProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Editar Perfil</h3>
              <button 
                onClick={() => setShowEditProfileModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              onUpdateProfile({
                name: editName,
                weight: parseFloat(editWeight) || 0,
                height: parseFloat(editHeight) || 0,
                age: parseInt(editAge, 10) || 0,
                avatarUrl: editAvatarUrl,
                avatarType: editAvatarType,
                onboarded: true,
                weeklyGoal: editWeeklyGoal,
              });
              setShowEditProfileModal(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Avatar Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--accent-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', fontSize: '38px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                  {editAvatarType === 'image' ? (
                    <img src={editAvatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', padding: '18px', color: 'var(--text-muted)' }}>
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                
                {/* Upload Photo Button */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => avatarUploadRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} /> Carregar Foto
                  </button>
                  {editAvatarType === 'image' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => {
                        setEditAvatarUrl('');
                        setEditAvatarType('silhouette');
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={avatarUploadRef}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Name Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome do Atleta</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Gabin Amaral"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Weight Input */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="form-input"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}
                  />
                </div>

                {/* Height Input */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Altura (cm)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}
                  />
                </div>
              </div>

              {/* Age Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Idade (Anos)</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  style={{ fontWeight: 600 }}
                />
              </div>

              {/* Weekly Frequency Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frequência Semanal de Treino</label>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-color)' }}>{editWeeklyGoal}x por semana</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setEditWeeklyGoal(num)}
                      style={{
                        padding: '10px 0',
                        borderRadius: '10px',
                        border: editWeeklyGoal === num ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                        background: editWeeklyGoal === num ? 'rgba(255, 94, 58, 0.12)' : 'var(--bg-secondary)',
                        color: editWeeklyGoal === num ? 'var(--accent-color)' : 'var(--text-primary)',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '14px' }}>
                Gravar Alterações
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Consistency Year Modal */}
      {showYearGridModal && createPortal((() => {
        const currentYear = new Date().getFullYear();
        const yearWorkouts = safeWorkouts.filter(w => {
          try {
            return new Date(w.date).getFullYear() === currentYear;
          } catch {
            return false;
          }
        });
        const numCols = Math.ceil(fullYearDays.length / 7);
        const monthLabels = getYearMonthLabels(fullYearDays);

        return (
          <div 
            onClick={() => setShowYearGridModal(false)}
            style={{ 
              position: 'fixed', 
              inset: 0, 
              backgroundColor: 'rgba(15,23,42,0.65)', 
              backdropFilter: 'blur(6px)', 
              zIndex: 1100, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                width: '100%', 
                maxWidth: '440px', 
                backgroundColor: '#FFFFFF', 
                borderRadius: '24px', 
                padding: '22px 20px', 
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)', 
                border: '1px solid var(--border-color)',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Consistência · {currentYear}</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>1 de Janeiro a 31 de Dezembro ({yearWorkouts.length} treinos)</p>
                </div>
                <button 
                  onClick={() => setShowYearGridModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Grid content container */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px 12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Weekday labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '102px', fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 800, paddingRight: '4px', paddingTop: '15px' }}>
                    <span>Seg</span>
                    <span>Qua</span>
                    <span>Sex</span>
                  </div>

                  {/* Horizontal Scroll Area */}
                  <div 
                    ref={scrollContainerRef}
                    style={{ flex: 1, overflowX: 'auto', paddingBottom: '6px' }}
                  >
                    <div style={{ width: 'max-content' }}>
                      {/* Month Headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numCols}, 12px)`, gap: '3px', marginBottom: '6px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>
                        {Array.from({ length: numCols }).map((_, colIdx) => {
                          const monthLabel = monthLabels.find(ml => ml.colIdx === colIdx);
                          return (
                            <div key={colIdx} style={{ gridColumnStart: colIdx + 1, width: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {monthLabel ? monthLabel.label : ''}
                            </div>
                          );
                        })}
                      </div>

                      {/* Day Cells Grid */}
                      <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 12px)', gridAutoFlow: 'column', gap: '3px' }}>
                        {fullYearDays.map((day, idx) => {
                          if (!day.isCurrentYear) {
                            return (
                              <div
                                key={idx}
                                style={{ width: '12px', height: '12px', opacity: 0, pointerEvents: 'none' }}
                              />
                            );
                          }

                          const formattedDate = day.date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
                          const tierInfo = getVolumeTier(day.volume);
                          const volLabel = day.volume > 0 ? ` · ${Math.round(day.volume)}kg (${tierInfo.label})` : '';
                          const tooltip = day.isFuture
                            ? formattedDate
                            : `${day.count} treino${day.count !== 1 ? 's' : ''} em ${formattedDate}${volLabel}`;

                          return (
                            <div 
                              key={idx}
                              className={`activity-day ${getVolumeClass(day.volume)}`}
                              style={{ width: '12px', height: '12px', borderRadius: '2px', cursor: 'pointer' }}
                              title={tooltip}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend, total count and download button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 650, padding: '0 4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Leve</span>
                    <div className="activity-day" style={{ width: '10px', height: '10px', borderRadius: '2px' }} />
                    <div className="activity-day active-1" style={{ width: '10px', height: '10px', borderRadius: '2px' }} title="Abaixo de 70% da tua média" />
                    <div className="activity-day active-2" style={{ width: '10px', height: '10px', borderRadius: '2px' }} title="Moderado (70%-95% da média)" />
                    <div className="activity-day active-3" style={{ width: '10px', height: '10px', borderRadius: '2px' }} title="Bom Treino (Média sólida)" />
                    <div className="activity-day active-4" style={{ width: '10px', height: '10px', borderRadius: '2px' }} title="Treino Excelente (>125% da média)" />
                    <span>Intenso</span>
                  </div>
                  {avgWorkoutVolume > 0 && (
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                      Média pessoal: <strong>{Math.round(avgWorkoutVolume)}kg</strong>/treino
                    </span>
                  )}
                </div>
                <button
                  onClick={downloadShareImage}
                  disabled={isSharingImage}
                  title="Partilhar ou descarregar imagem"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px',
                    background: 'none',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '50%',
                    color: isSharingImage ? 'var(--accent-color)' : 'var(--text-secondary)',
                    cursor: isSharingImage ? 'wait' : 'pointer',
                    opacity: isSharingImage ? 0.7 : 1,
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={e => { if (!isSharingImage) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-color)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-color)'; } }}
                  onMouseLeave={e => { if (!isSharingImage) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; } }}
                >
                  {isSharingImage ? (
                    <div style={{ width: '14px', height: '14px', border: '2px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

    </div>
  );
};
