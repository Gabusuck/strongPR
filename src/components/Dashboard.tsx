import React from 'react';
import type { Workout, PersonalRecord } from '../types';
import { Trophy, Flame, Dumbbell, Play, Clock, Calendar } from 'lucide-react';

interface DashboardProps {
  workouts: Workout[];
  prs: PersonalRecord[];
  onStartWorkout: () => void;
  onNavigate: (tab: 'workout' | 'history' | 'prs') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workouts,
  prs,
  onStartWorkout,
  onNavigate,
}) => {
  const totalWorkouts = workouts.length;
  const totalPRs = prs.length;
  
  // Workouts in the last 7 days
  const getRecentWorkoutsCount = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return workouts.filter(w => new Date(w.date) >= oneWeekAgo).length;
  };
  
  const recentWorkouts = getRecentWorkoutsCount();
  
  // Get last workout
  const lastWorkout = workouts.length > 0 
    ? [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  // Get 3 most recent PRs
  const recentPRs = [...prs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
  };

  // Generate 70 days grid (10 weeks) for the gym activity visual tracker
  const getActivityGridDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 49; i >= 0; i--) { // 50 days (7 weeks) is cleaner on small screens
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const count = workouts.filter((w) => {
        const wDateStr = new Date(w.date).toISOString().split('T')[0];
        return wDateStr === dateStr;
      }).length;
      
      days.push({ date: dateStr, count });
    }
    return days;
  };

  const activityDays = getActivityGridDays();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Premium Greeting Card */}
      <div className="greeting-card">
        <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: '#fff' }}>
            Olá, Guerreiro! 💪
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.85rem', fontWeight: 500, maxWidth: '220px' }}>
            O único treino mau é aquele que não acontece. Vamos esmagar hoje?
          </p>
        </div>
        <span style={{ fontSize: '3rem', zIndex: 1, filter: 'drop-shadow(0 0 10px rgba(255,94,58,0.5))' }}>🔥</span>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        <div className="stat-box" style={{ background: 'linear-gradient(180deg, rgba(255,94,58,0.05) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '6px' }}>
            <Dumbbell size={18} />
          </div>
          <div className="stat-val">{totalWorkouts}</div>
          <div className="stat-lbl">Treinos</div>
        </div>
        
        <div className="stat-box" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.05) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#f59e0b', marginBottom: '6px' }}>
            <Trophy size={18} />
          </div>
          <div className="stat-val">{totalPRs}</div>
          <div className="stat-lbl">PRs Totais</div>
        </div>

        <div className="stat-box" style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.05) 0%, rgba(255,255,255,0.01) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: '6px' }}>
            <Flame size={18} />
          </div>
          <div className="stat-val">{recentWorkouts}</div>
          <div className="stat-lbl">Esta Sem.</div>
        </div>
      </div>

      {/* GitHub-style Activity Grid */}
      <div className="glass-card" style={{ marginBottom: 0, padding: '16px' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
          Consistência de Treino
        </h3>
        
        <div className="activity-grid">
          {activityDays.map((day, idx) => (
            <div 
              key={idx}
              className={`activity-day ${day.count > 1 ? 'active-2' : day.count === 1 ? 'active-1' : ''}`}
              title={`${day.count} treino(s) em ${day.date}`}
            />
          ))}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '8px', padding: '0 2px' }}>
          <span>Há 50 dias</span>
          <span>Hoje</span>
        </div>
      </div>

      {/* Main Start Action Button */}
      <button 
        className="btn btn-primary" 
        onClick={onStartWorkout}
        style={{ width: '100%', padding: '16px', borderRadius: 'var(--border-radius-md)', fontSize: '1.05rem' }}
      >
        <Play size={20} fill="currentColor" />
        Iniciar Novo Treino
      </button>

      {/* Last Workout Section */}
      <div className="glass-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
            Último Registo
          </h3>
          {lastWorkout && (
            <button 
              onClick={() => onNavigate('history')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Ver Tudo
            </button>
          )}
        </div>
        
        {lastWorkout ? (
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
              {lastWorkout.name}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px', display: 'flex', gap: '12px' }}>
              <span>{formatDate(lastWorkout.date)}</span>
              {lastWorkout.duration && (
                <span>
                  ⏱️ {Math.floor(lastWorkout.duration / 60)} min
                </span>
              )}
              <span>💪 {lastWorkout.exercises.length} exs</span>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {lastWorkout.exercises.slice(0, 3).map((ex, idx) => (
                <span 
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {ex.name.split(' (')[0]}
                </span>
              ))}
              {lastWorkout.exercises.length > 3 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  +{lastWorkout.exercises.length - 3}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Nenhum treino registado ainda.
          </div>
        )}
      </div>

      {/* Recent PRs Section */}
      <div className="glass-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            <Trophy size={16} style={{ color: '#f59e0b' }} />
            Recordes Recentes (PRs)
          </h3>
          {prs.length > 0 && (
            <button 
              onClick={() => onNavigate('prs')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Todos os PRs
            </button>
          )}
        </div>

        {recentPRs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentPRs.map((pr) => (
              <div 
                key={pr.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '10px',
                  borderLeft: '3px solid #f59e0b',
                  borderTop: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    {pr.exerciseName.split(' (')[0]}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatDate(pr.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f59e0b' }}>
                    {pr.weight} kg × {pr.reps}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    1RM: {pr.estimated1RM} kg
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            Começa a registar treinos para veres aqui os teus recordes pessoais!
          </div>
        )}
      </div>

    </div>
  );
};
