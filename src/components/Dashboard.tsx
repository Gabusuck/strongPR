import React from 'react';
import type { Workout, PersonalRecord } from '../types';
import { Trophy, Flame, Dumbbell, Play, Clock } from 'lucide-react';

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
  // Calculate statistics
  const totalWorkouts = workouts.length;
  const totalPRs = prs.length;
  
  // Calculate workout streak (workouts in the last 7 days)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Welcome Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
          Olá, Campeão! 👋
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Pronto para superar os teus limites hoje?
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--accent)', marginBottom: '4px' }}>
            <Dumbbell size={20} />
          </div>
          <div className="stat-val">{totalWorkouts}</div>
          <div className="stat-lbl">Treinos</div>
        </div>
        
        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', color: '#eab308', marginBottom: '4px' }}>
            <Trophy size={20} />
          </div>
          <div className="stat-val">{totalPRs}</div>
          <div className="stat-lbl">PRs Totais</div>
        </div>

        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', color: '#ef4444', marginBottom: '4px' }}>
            <Flame size={20} />
          </div>
          <div className="stat-val">{recentWorkouts}</div>
          <div className="stat-lbl">Esta Sem.</div>
        </div>
      </div>

      {/* Main Action Button */}
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
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--text-secondary)' }} />
            Último Treino
          </h3>
          {lastWorkout && (
            <button 
              onClick={() => onNavigate('history')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Ver Histórico
            </button>
          )}
        </div>
        
        {lastWorkout ? (
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {lastWorkout.name}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px', display: 'flex', gap: '12px' }}>
              <span>{formatDate(lastWorkout.date)}</span>
              {lastWorkout.duration && (
                <span>
                  ⏱️ {Math.floor(lastWorkout.duration / 60)} min
                </span>
              )}
              <span>💪 {lastWorkout.exercises.length} exercícios</span>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {lastWorkout.exercises.slice(0, 3).map((ex, idx) => (
                <span 
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
                  +{lastWorkout.exercises.length - 3} mais
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Ainda não registaste nenhum treino. Começa hoje!
          </div>
        )}
      </div>

      {/* Recent PRs Section */}
      <div className="glass-card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} style={{ color: '#eab308' }} />
            Recordes Recentes (PRs)
          </h3>
          {prs.length > 0 && (
            <button 
              onClick={() => onNavigate('prs')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Ver Todos
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
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  borderLeft: '3px solid #eab308',
                  borderTop: '1px solid var(--border-color)',
                  borderRight: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {pr.exerciseName.split(' (')[0]}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Batido em {formatDate(pr.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#eab308' }}>
                    {pr.weight} kg × {pr.reps}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    1RM Est: {pr.estimated1RM} kg
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Os teus recordes pessoais vão aparecer aqui à medida que treinas!
          </div>
        )}
      </div>

    </div>
  );
};
