import React, { useState, useRef } from 'react';
import type { Workout, PersonalRecord, Exercise, AppSettings, AppData } from '../types';
import { PRTracker } from './PRTracker';
import { ExercisesList } from './ExercisesList';
import { exportBackup, importBackup } from '../storage';
import { Trophy, Flame, Dumbbell, Calendar, Volume2, VolumeX, Smartphone, Download, Upload, RotateCcw, Timer, ShieldAlert, ArrowLeft, User } from 'lucide-react';

interface ProfileViewProps {
  workouts: Workout[];
  prs: PersonalRecord[];
  exercises: Exercise[];
  settings: AppSettings;
  appData: AppData;
  onUpdateSettings: (settings: AppSettings) => void;
  onImportData: (data: AppData) => void;
  onResetData: () => void;
  onAddManualPR: (exerciseId: string, weight: number, reps: number, date: string) => void;
  onAddCustomExercise: (name: string, category: string) => void;
  onDeleteCustomExercise: (id: string) => void;
}

type ProfileSubView = 'main' | 'prs' | 'exercises' | 'settings';

export const ProfileView: React.FC<ProfileViewProps> = ({
  workouts,
  prs,
  exercises,
  settings,
  appData,
  onUpdateSettings,
  onImportData,
  onResetData,
  onAddManualPR,
  onAddCustomExercise,
  onDeleteCustomExercise,
}) => {
  const [subView, setSubView] = useState<ProfileSubView>('main');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

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
  const getActivityGridDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 49; i >= 0; i--) {
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

  const handleRestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onUpdateSettings({
      ...settings,
      defaultRestDuration: isNaN(val) ? 90 : val
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus({ type: null, message: '' });
      const importedData = await importBackup(file);
      onImportData(importedData);
      setImportStatus({ type: 'success', message: 'Dados importados com sucesso!' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', message: 'Erro ao importar backup. Verifica o ficheiro.' });
    }
  };

  const handleResetClick = () => {
    if (confirm('ATENÇÃO: Tens a certeza absoluta de que queres eliminar TODOS os teus dados de treinos, exercícios personalizados e recordes pessoais? Esta ação é irreversível.')) {
      onResetData();
      setSubView('main');
    }
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

  if (subView === 'settings') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Settings Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setSubView('main')}
            style={{ background: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Definições</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Configura as preferências da tua aplicação.</p>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={18} style={{ color: 'var(--accent-color)' }} />
            Preferências de Treino
          </h3>

          {/* Rest Timer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Descanso Padrão</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Intervalo sugerido após séries.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                className="form-input"
                value={settings.defaultRestDuration}
                onChange={handleRestTimeChange}
                style={{ width: '70px', textAlign: 'center', fontWeight: 800, fontFamily: 'var(--font-display)', padding: '8px' }}
                min={10}
                max={600}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>seg</span>
            </div>
          </div>

          {/* Sound */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Som do Alerta</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Som ao terminar tempo de descanso.</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ ...settings, enableSound: !settings.enableSound })}
              style={{
                background: settings.enableSound ? 'rgba(255, 94, 58, 0.08)' : '#f1f5f9',
                border: '1px solid',
                borderColor: settings.enableSound ? 'var(--accent-color)' : 'var(--border-color)',
                color: settings.enableSound ? 'var(--accent-color)' : 'var(--text-secondary)',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {settings.enableSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>

          {/* Vibration */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Vibrar Dispositivo</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Vibração no fim do descanso.</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ ...settings, enableVibration: !settings.enableVibration })}
              style={{
                background: settings.enableVibration ? 'rgba(255, 94, 58, 0.08)' : '#f1f5f9',
                border: '1px solid',
                borderColor: settings.enableVibration ? 'var(--accent-color)' : 'var(--border-color)',
                color: settings.enableVibration ? 'var(--accent-color)' : 'var(--text-secondary)',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Smartphone size={18} />
            </button>
          </div>
        </div>

        {/* Backups */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} style={{ color: '#10b981' }} />
            Backup de Dados
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Faz cópias de segurança locais regularmente. Limpar a cache do telemóvel apaga os dados locais.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary btn-small"
              onClick={() => exportBackup(appData)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={14} /> Exportar
            </button>
            
            <button 
              className="btn btn-secondary btn-small"
              onClick={handleImportClick}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Upload size={14} /> Importar
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />

          {importStatus.type && (
            <div 
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                backgroundColor: importStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                color: importStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
                border: importStatus.type === 'success' ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(239,68,68,0.15)',
                marginTop: '4px'
              }}
            >
              {importStatus.message}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} />
            Zona de Perigo
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Elimina definitivamente o teu progresso na aplicação.</p>
          <button 
            className="btn btn-danger btn-small"
            onClick={handleResetClick}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
          >
            <RotateCcw size={14} /> Apagar Tudo e Reiniciar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 15px var(--accent-glow)' }}>
          <User size={30} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Atleta Gabin</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>Nível: Superador 💪</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid">
        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '4px' }}>
            <Dumbbell size={16} />
          </div>
          <div className="stat-val">{totalWorkouts}</div>
          <div className="stat-lbl">Treinos</div>
        </div>
        
        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', justifyContent: 'center', color: '#f59e0b', marginBottom: '4px' }}>
            <Trophy size={16} />
          </div>
          <div className="stat-val">{totalPRs}</div>
          <div className="stat-lbl">PRs</div>
        </div>

        <div className="stat-box">
          <div style={{ display: 'flex', justifyContent: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '4px' }}>
            <Flame size={16} />
          </div>
          <div className="stat-val">{recentWorkouts}</div>
          <div className="stat-lbl">Streak</div>
        </div>
      </div>

      {/* Consistency activity grid */}
      <div className="glass-card" style={{ marginBottom: 0, padding: '16px' }}>
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
          <span>Há 50 dias</span>
          <span>Hoje</span>
        </div>
      </div>

      {/* Navigation list for subviews */}
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

        {/* Definições */}
        <div 
          className="glass-card interactive" 
          onClick={() => setSubView('settings')}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', marginBottom: 0, cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RotateCcw size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Definições da Aplicação</span>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Temporizadores, som/vibração e backups.</div>
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 800 }}>→</span>
        </div>

      </div>

    </div>
  );
};
