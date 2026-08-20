import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Workout, PersonalRecord, Exercise, UserProfile } from '../types';
import { PRTracker } from './PRTracker';
import { ExercisesList } from './ExercisesList';
import { Trophy, Flame, Dumbbell, Calendar, Upload, ArrowLeft, TrendingUp, X } from 'lucide-react';

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

  // Auto-scroll the full-year grid to the end (today) on load
  React.useEffect(() => {
    if (showYearGridModal && scrollContainerRef.current) {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showYearGridModal]);

  // Modal edit states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editWeight, setEditWeight] = useState(profile.weight.toString());
  const [editHeight, setEditHeight] = useState(profile.height.toString());
  const [editAge, setEditAge] = useState(profile.age.toString());
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl);
  const [editAvatarType, setEditAvatarType] = useState(profile.avatarType);

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
  const getWorkoutVolume = (w: Workout) =>
    w.exercises.reduce((total, ex) =>
      total + ex.sets.filter(s => s.isCompleted).reduce((s, set) => s + set.weight * set.reps, 0), 0);

  // Generate 50 days grid (7 weeks) for the gym activity visual tracker
  const getActivityGridDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 49; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayWorkouts = workouts.filter(w => new Date(w.date).toISOString().split('T')[0] === dateStr);
      const count = dayWorkouts.length;
      const volume = dayWorkouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
      days.push({ date: dateStr, count, volume });
    }
    return days;
  };

  const getFullYearGridDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 370; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayWorkouts = workouts.filter(w => new Date(w.date).toISOString().split('T')[0] === dateStr);
      const count = dayWorkouts.length;
      const volume = dayWorkouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
      days.push({ date: d, count, volume });
    }
    return days;
  };

  const activityDays = getActivityGridDays();
  const fullYearDays = getFullYearGridDays();

  // Volume percentile tiers for color intensity
  const allVolumes = fullYearDays.filter(d => d.volume > 0).map(d => d.volume).sort((a, b) => a - b);
  const p33 = allVolumes[Math.floor(allVolumes.length * 0.33)] || 1;
  const p66 = allVolumes[Math.floor(allVolumes.length * 0.66)] || 2;
  const p90 = allVolumes[Math.floor(allVolumes.length * 0.90)] || 3;

  const getVolumeClass = (volume: number) => {
    if (volume === 0) return '';
    if (volume <= p33) return 'active-1';
    if (volume <= p66) return 'active-2';
    if (volume <= p90) return 'active-3';
    return 'active-4';
  };

  // Download shareable Instagram image using canvas
  const downloadShareImage = () => {
    const canvas = document.createElement('canvas');
    const W = 1080, H = 1920; // 9:16 — Story format
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // === BACKGROUND ===
    const bg = ctx.createLinearGradient(0, H, W, 0);
    bg.addColorStop(0, '#080c14');
    bg.addColorStop(0.5, '#0d1520');
    bg.addColorStop(1, '#111927');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Radial glow top-right
    const glow = ctx.createRadialGradient(W * 0.85, H * 0.06, 0, W * 0.85, H * 0.06, 550);
    glow.addColorStop(0, 'rgba(255,94,58,0.13)');
    glow.addColorStop(1, 'rgba(255,94,58,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Radial glow bottom-left
    const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.92, 0, W * 0.1, H * 0.92, 400);
    glow2.addColorStop(0, 'rgba(255,94,58,0.07)');
    glow2.addColorStop(1, 'rgba(255,94,58,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Helper: rounded rect fill
    const rr = (x: number, y: number, w: number, h: number, r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };

    // === HEADER ===
    const bar = ctx.createLinearGradient(80, 0, 600, 0);
    bar.addColorStop(0, '#ff5e3a');
    bar.addColorStop(1, 'rgba(255,94,58,0)');
    ctx.fillStyle = bar;
    ctx.fillRect(80, 110, 520, 4);

    ctx.fillStyle = 'rgba(255,94,58,0.85)';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CONSISTÊNCIA ANUAL', 80, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.fillText(profile.name || 'Strong', 80, 240);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '500 30px system-ui, sans-serif';
    ctx.fillText(`${new Date().getFullYear()}`, 80, 290);

    // === COMPUTE STATS ===
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const yearWorkouts = workouts.filter(w => new Date(w.date) >= yearAgo);
    const totalVolume = yearWorkouts.reduce((s, w) => s + getWorkoutVolume(w), 0);
    const totalKg = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${Math.round(totalVolume)}kg`;
    const totalHours = yearWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
    const hoursStr = totalHours >= 3600 ? `${Math.floor(totalHours / 3600)}h` : `${Math.round(totalHours / 60)}min`;
    const avgPerWeek = (yearWorkouts.length / 52).toFixed(1);

    // Current streak
    let streak = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (workouts.some(w => new Date(w.date).toISOString().split('T')[0] === ds)) streak++;
      else if (i > 0) break;
    }

    // Best streak
    let bestStreak = 0, cur = 0;
    for (let i = 0; i < fullYearDays.length; i++) {
      if (fullYearDays[i].count > 0) { cur++; bestStreak = Math.max(bestStreak, cur); }
      else cur = 0;
    }

    // Most trained muscle
    const muscleCounts: Record<string, number> = {};
    yearWorkouts.forEach(w => w.exercises.forEach(ex => {
      const cat = ex.category || 'Outro';
      muscleCounts[cat] = (muscleCounts[cat] || 0) + ex.sets.filter(s => s.isCompleted).length;
    }));
    // (topMuscle available for future use)
    const topMuscle = Object.entries(muscleCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? '—';

    // === STAT CARDS — 2 columns × 4 rows ===
    const stats = [
      { label: 'Treinos', value: yearWorkouts.length.toString(), accent: true },
      { label: 'Volume Total', value: totalKg, accent: true },
      { label: 'PRs Batidos', value: prs.length.toString(), accent: false },
      { label: 'Horas Treinadas', value: hoursStr, accent: false },
      { label: 'Treinos / Semana', value: avgPerWeek, accent: false },
      { label: 'Streak Atual', value: `${streak}d`, accent: false },
      { label: 'Melhor Streak', value: `${bestStreak}d`, accent: false },
      { label: 'Músculo Principal', value: topMuscle.length > 8 ? topMuscle.slice(0, 8) + '.' : topMuscle, accent: false },
    ];

    const gridTop = 330;
    const cardW = 460, cardH = 120, cardGap = 20;
    stats.forEach((stat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = 80 + col * (cardW + cardGap);
      const sy = gridTop + row * (cardH + cardGap);

      rr(sx, sy, cardW, cardH, 20, 'rgba(255,255,255,0.04)');
      const cbar = ctx.createLinearGradient(sx, sy, sx + cardW * 0.6, sy);
      cbar.addColorStop(0, stat.accent ? 'rgba(255,94,58,0.9)' : 'rgba(255,255,255,0.15)');
      cbar.addColorStop(1, 'transparent');
      ctx.fillStyle = cbar;
      ctx.fillRect(sx + 18, sy, cardW - 36, 2);

      ctx.fillStyle = stat.accent ? '#ff5e3a' : '#ffffff';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(stat.value, sx + 22, sy + 68);

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.fillText(stat.label, sx + 22, sy + 100);
    });

    // === DIVIDER ===
    const divY = gridTop + 4 * (cardH + cardGap) + 10;
    const div = ctx.createLinearGradient(80, 0, W - 80, 0);
    div.addColorStop(0, 'transparent');
    div.addColorStop(0.2, 'rgba(255,255,255,0.12)');
    div.addColorStop(0.8, 'rgba(255,255,255,0.12)');
    div.addColorStop(1, 'transparent');
    ctx.fillStyle = div;
    ctx.fillRect(80, divY, W - 160, 1);

    // === GRID SECTION LABEL ===
    const gridLabelY = divY + 50;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('GRELHA DE ATIVIDADE', 80, gridLabelY);

    // === CONSISTENCY GRID ===
    const CELL = 14, GAP = 3;
    const COLS = 53, ROWS = 7;
    const gW = COLS * (CELL + GAP) - GAP;
    const gH = ROWS * (CELL + GAP) - GAP;
    const gX = (W - gW) / 2;
    const gY = gridLabelY + 30;

    rr(gX - 22, gY - 18, gW + 44, gH + 44, 20, 'rgba(255,255,255,0.025)');

    fullYearDays.forEach((day, idx) => {
      const col = Math.floor(idx / 7);
      const row = idx % 7;
      const x = gX + col * (CELL + GAP);
      const y = gY + row * (CELL + GAP);
      let fc: string;
      if (day.volume === 0) fc = 'rgba(255,255,255,0.06)';
      else if (day.volume <= p33) fc = 'rgba(255,140,110,0.55)';
      else if (day.volume <= p66) fc = 'rgba(255,94,58,0.75)';
      else if (day.volume <= p90) fc = 'rgba(255,94,58,0.92)';
      else {
        fc = '#ff5e3a';
        ctx.shadowColor = 'rgba(255,94,58,0.6)';
        ctx.shadowBlur = 7;
      }
      rr(x, y, CELL, CELL, 3, fc);
      ctx.shadowBlur = 0;
    });

    // === LEGEND ===
    const legY = gY + gH + 38;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '500 22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('menos', gX, legY + 14);
    ['rgba(255,255,255,0.06)','rgba(255,140,110,0.55)','rgba(255,94,58,0.75)','rgba(255,94,58,0.92)','#ff5e3a'].forEach((c, i) => {
      rr(gX + 98 + i * 26, legY, 18, 18, 4, c);
    });
    ctx.fillText('mais', gX + 98 + 5 * 26 + 8, legY + 14);

    // === WATERMARK ===
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('● strong app', W / 2, H - 60);

    const link = document.createElement('a');
    link.download = `gains_story_${new Date().getFullYear()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 700 }}>
              ⚖️ {profile.weight} kg • {profile.age} anos
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
          {activityDays.map((day, idx) => (
            <div 
              key={idx}
              className={`activity-day ${day.count > 1 ? 'active-2' : day.count === 1 ? 'active-1' : ''}`}
              title={`${day.count} treinos em ${day.date}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px', padding: '0 2px', fontWeight: 600 }}>
          <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '3px' }}>Ver ano inteiro →</span>
          <span>Hoje</span>
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
                onboarded: true
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

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '14px' }}>
                Gravar Alterações
              </button>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Consistency Year Modal */}
      {showYearGridModal && createPortal((() => {
        // Calculate month labels and their column positions
        const monthLabels: { label: string; colIdx: number }[] = [];
        let prevMonth = -1;
        fullYearDays.forEach((day, idx) => {
          if (idx % 7 === 0) {
            const m = day.date.getMonth();
            if (m !== prevMonth) {
              const label = day.date.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase();
              monthLabels.push({ label, colIdx: Math.floor(idx / 7) });
              prevMonth = m;
            }
          }
        });

        return (
          <div 
            onClick={() => setShowYearGridModal(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-primary)', borderRadius: '24px 24px 0 0', padding: '16px 20px 32px', boxShadow: '0 -8px 40px rgba(15, 23, 42, 0.15)', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Drag Handle */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--border-color)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Consistência Anual</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Últimos 365 dias de treinos realizados</p>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 12px)', gap: '3px', marginBottom: '6px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>
                        {Array.from({ length: 53 }).map((_, colIdx) => {
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
                          const formattedDate = day.date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
                          const volLabel = day.volume > 0 ? ` · ${Math.round(day.volume)}kg` : '';
                          return (
                            <div 
                              key={idx}
                              className={`activity-day ${getVolumeClass(day.volume)}`}
                              style={{ width: '12px', height: '12px', borderRadius: '2px', cursor: 'pointer' }}
                              title={`${day.count} treino${day.count !== 1 ? 's' : ''} em ${formattedDate}${volLabel}`}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Menos</span>
                  <div className="activity-day" style={{ width: '10px', height: '10px', borderRadius: '2px' }} />
                  <div className="activity-day active-1" style={{ width: '10px', height: '10px', borderRadius: '2px' }} />
                  <div className="activity-day active-2" style={{ width: '10px', height: '10px', borderRadius: '2px' }} />
                  <div className="activity-day active-3" style={{ width: '10px', height: '10px', borderRadius: '2px' }} />
                  <div className="activity-day active-4" style={{ width: '10px', height: '10px', borderRadius: '2px' }} />
                  <span>Mais</span>
                </div>
                <button
                  onClick={downloadShareImage}
                  title="Descarregar imagem para partilhar"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px',
                    background: 'none',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '50%',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-color)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-color)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

    </div>
  );
};
