import { useState, useEffect, useRef } from 'react';
import type { ActiveTab, AppData, Workout, AppSettings } from './types';
import { loadAppData, saveAppData, checkAndUpdatePRs, INITIAL_DATA } from './storage';
import { WorkoutLog } from './components/WorkoutLog';
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { History, Dumbbell, User, Sparkles, CheckCircle2, Trophy, Upload } from 'lucide-react';

export default function App() {
  const [appData, setAppData] = useState<AppData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<ActiveTab>('workout'); // Default to workout tab as it's the middle/heart of the app
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  
  // PR congratulations modal state
  const [newPRsModal, setNewPRsModal] = useState<{ isOpen: boolean, count: number }>({ isOpen: false, count: 0 });

  // Load app data on mount
  useEffect(() => {
    const data = loadAppData();
    setAppData(data);
    
    const savedActiveWorkout = localStorage.getItem('strongpr_active_workout');
    if (savedActiveWorkout) {
      try {
        setActiveWorkout(JSON.parse(savedActiveWorkout));
      } catch (e) {
        console.error('Error loading active workout', e);
      }
    }
  }, []);

  // Save active workout to localStorage
  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem('strongpr_active_workout', JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem('strongpr_active_workout');
    }
  }, [activeWorkout]);

  // Helper to save all data and update state
  const updateAppDataState = (newData: AppData) => {
    setAppData(newData);
    saveAppData(newData);
  };

  // Start a new blank workout
  const handleStartWorkout = () => {
    const newWorkout: Workout = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: `Treino de ${new Date().toLocaleDateString('pt-PT', { weekday: 'long' }).split('-')[0]}`,
      date: new Date().toISOString(),
      exercises: [],
      duration: 0
    };
    setActiveWorkout(newWorkout);
    setActiveTab('workout');
  };

  // Update active workout
  const handleUpdateActiveWorkout = (updated: Workout) => {
    setActiveWorkout(updated);
  };

  // Save completed workout
  const handleSaveWorkout = () => {
    if (!activeWorkout) return;

    const completedExercises = activeWorkout.exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets.filter((s) => s.isCompleted)
      }))
      .filter((ex) => ex.sets.length > 0);

    if (completedExercises.length === 0) {
      alert('Não podes gravar um treino sem séries concluídas. Conclui pelo menos uma série clicando no visto (OK).');
      return;
    }

    const finalWorkout: Workout = {
      ...activeWorkout,
      exercises: completedExercises,
      date: new Date().toISOString(),
    };

    const { updatedPRs, newPRsCount } = checkAndUpdatePRs(finalWorkout, appData.prs);
    const updatedWorkouts = [finalWorkout, ...appData.workouts];

    const updatedData: AppData = {
      ...appData,
      workouts: updatedWorkouts,
      prs: updatedPRs,
    };

    updateAppDataState(updatedData);
    setActiveWorkout(null);
    
    if (newPRsCount > 0) {
      setNewPRsModal({ isOpen: true, count: newPRsCount });
    } else {
      setActiveTab('profile'); // Redirect to profile to see updated stats/grid
    }
  };

  // Cancel and discard active workout
  const handleCancelWorkout = () => {
    if (confirm('Tens a certeza que queres apagar o treino atual? Todas as séries não gravadas serão perdidas.')) {
      setActiveWorkout(null);
    }
  };

  // Delete a workout from history
  const handleDeleteWorkout = (workoutId: string) => {
    const updatedWorkouts = appData.workouts.filter(w => w.id !== workoutId);
    updateAppDataState({
      ...appData,
      workouts: updatedWorkouts
    });
  };

  // Add custom exercise
  const handleAddExercise = (name: string, category: string) => {
    const newExercise = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name,
      category,
      isCustom: true
    };
    
    updateAppDataState({
      ...appData,
      exercises: [...appData.exercises, newExercise]
    });
  };

  // Delete custom exercise
  const handleDeleteExercise = (id: string) => {
    updateAppDataState({
      ...appData,
      exercises: appData.exercises.filter(ex => ex.id !== id)
    });
  };

  // Add manual PR
  const handleAddManualPR = (exerciseId: string, weight: number, reps: number, date: string) => {
    const exercise = appData.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    const est1RM = Math.round(weight * (1 + 0.0333 * reps) * 10) / 10;
    
    const newPR = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      exerciseId,
      exerciseName: exercise.name,
      weight,
      reps,
      estimated1RM: est1RM,
      date,
    };

    updateAppDataState({
      ...appData,
      prs: [...appData.prs, newPR]
    });
  };

  // Settings updates
  const handleUpdateSettings = (newSettings: AppSettings) => {
    updateAppDataState({
      ...appData,
      settings: newSettings
    });
  };

  // Import backup data
  const handleImportData = (newData: AppData) => {
    setAppData(newData);
    setActiveWorkout(null);
    setActiveTab('profile');
  };

  // Reset all application data
  const handleResetData = () => {
    updateAppDataState(INITIAL_DATA);
    setActiveWorkout(null);
    setActiveTab('profile');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'history':
        return (
          <HistoryView 
            workouts={appData.workouts}
            onDeleteWorkout={handleDeleteWorkout}
          />
        );
      case 'workout':
        return (
          <WorkoutLog 
            activeWorkout={activeWorkout}
            exercises={appData.exercises}
            settings={appData.settings}
            onUpdateWorkout={handleUpdateActiveWorkout}
            onSaveWorkout={handleSaveWorkout}
            onCancelWorkout={handleCancelWorkout}
            onStartWorkout={handleStartWorkout}
          />
        );
      case 'profile':
        return (
          <ProfileView 
            workouts={appData.workouts}
            prs={appData.prs}
            exercises={appData.exercises}
            settings={appData.settings}
            appData={appData}
            profile={appData.profile}
            onUpdateProfile={(updatedProfile) => updateAppDataState({ ...appData, profile: updatedProfile })}
            onUpdateSettings={handleUpdateSettings}
            onImportData={handleImportData}
            onResetData={handleResetData}
            onAddManualPR={handleAddManualPR}
            onAddCustomExercise={handleAddExercise}
            onDeleteCustomExercise={handleDeleteExercise}
          />
        );
      default:
        return (
          <WorkoutLog 
            activeWorkout={activeWorkout}
            exercises={appData.exercises}
            settings={appData.settings}
            onUpdateWorkout={handleUpdateActiveWorkout}
            onSaveWorkout={handleSaveWorkout}
            onCancelWorkout={handleCancelWorkout}
            onStartWorkout={handleStartWorkout}
          />
        );
    }
  };

  // Onboarding welcome flow if not onboarded
  if (appData.profile && !appData.profile.onboarded) {
    return (
      <div className="app-container" style={{ padding: '24px 20px', overflowY: 'auto' }}>
        <OnboardWizard 
          onComplete={(profileData) => {
            updateAppDataState({
              ...appData,
              profile: {
                ...profileData,
                onboarded: true
              }
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* App Header */}
      <header className="app-header">
        <h1 className="app-title" onClick={() => setActiveTab('workout')} style={{ cursor: 'pointer' }}>
          <Dumbbell size={22} style={{ transform: 'rotate(-45deg)' }} />
          StrongPR
        </h1>
        
        {/* Glow Indicators or Quick Active Workout link */}
        {activeWorkout && activeTab !== 'workout' && (
          <button
            onClick={() => setActiveTab('workout')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 94, 58, 0.08)',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              animation: 'pulse 2s infinite'
            }}
          >
            Treino Ativo ⚡
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {renderContent()}
      </main>

      {/* Bottom Floating Capsule Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          title="Histórico"
        >
          <History size={22} />
        </button>

        <button 
          className={`nav-item ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => setActiveTab('workout')}
          style={{ position: 'relative' }}
          title="Treinar"
        >
          <Dumbbell size={22} />
          {activeWorkout && (
            <span 
              style={{
                position: 'absolute',
                top: '10px',
                right: '16px',
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--accent-color)',
                borderRadius: '50%',
                boxShadow: '0 0 6px var(--accent-color)'
              }}
            />
          )}
        </button>

        <button 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
          title="Perfil"
        >
          <User size={22} />
        </button>
      </nav>

      {/* PR Celebration Modal */}
      {newPRsModal.isOpen && (
        <div className="modal-overlay" onClick={() => setNewPRsModal({ isOpen: false, count: 0 })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', marginBottom: '16px' }}>
              <Trophy size={44} fill="#f59e0b" style={{ color: '#f59e0b' }} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
              <Sparkles size={18} />
              Novo Recorde Pessoal!
            </h3>

            <p style={{ color: 'var(--text-primary)', fontSize: '0.92rem', fontWeight: 700, lineHeight: '1.4', marginBottom: '20px' }}>
              Parabéns! Superaste as tuas marcas anteriores em <span style={{ color: 'var(--accent-color)', fontWeight: 800 }}>{newPRsModal.count}</span> {newPRsModal.count === 1 ? 'exercício' : 'exercícios'} neste treino!
            </p>

            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px', fontWeight: 600 }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> Treino guardado no histórico.
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => {
                setNewPRsModal({ isOpen: false, count: 0 });
                setActiveTab('profile');
              }}
              style={{ width: '100%', padding: '14px' }}
            >
              Uau, incrível! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Inline styles for pulse animations */}
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 94, 58, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(255, 94, 58, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 94, 58, 0); }
        }
      `}</style>

    </div>
  );
}

interface OnboardWizardProps {
  onComplete: (profile: { name: string; weight: number; height: number; age: number; avatarUrl: string; avatarType: 'emoji' | 'image' | 'silhouette' }) => void;
}

const OnboardWizard: React.FC<OnboardWizardProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('175');
  const [age, setAge] = useState('25');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarType, setAvatarType] = useState<'emoji' | 'image' | 'silhouette'>('silhouette');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawBase64 = ev.target?.result as string;
        
        const img = new Image();
        (window as any)._activeOnboardImg = img;
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 120;
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
              const compressed = canvas.toDataURL('image/jpeg', 0.6);
              setAvatarUrl(compressed);
              setAvatarType('image');
            } else {
              setAvatarUrl(rawBase64);
              setAvatarType('image');
            }
          } catch (err) {
            console.error('Canvas compression error in onboarding', err);
            setAvatarUrl(rawBase64);
            setAvatarType('image');
          }
          delete (window as any)._activeOnboardImg;
        };

        img.onerror = (err) => {
          console.error('Image load error in onboarding', err);
          setAvatarUrl(rawBase64);
          setAvatarType('image');
          delete (window as any)._activeOnboardImg;
        };

        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor, indica o teu nome.');
      return;
    }
    onComplete({
      name,
      weight: parseFloat(weight) || 70,
      height: parseFloat(height) || 175,
      age: parseInt(age, 10) || 25,
      avatarUrl,
      avatarType
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', justifyContent: 'center', padding: '20px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          StrongPR
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px', fontWeight: 600 }}>
          Configuração de Perfil Inicial
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }} className="glass-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--accent-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', transition: 'all var(--transition-fast)' }}
          >
            {avatarType === 'image' ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%', padding: '20px', color: 'var(--text-muted)' }}>
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}>Carregar Foto</button>
            {avatarType === 'image' && (
              <button type="button" className="btn btn-secondary btn-small" onClick={() => { setAvatarUrl(''); setAvatarType('silhouette'); }} style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Remover</button>
            )}
          </div>
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome Completo</label>
          <input type="text" required placeholder="ex: Gabin Amaral" className="form-input" value={name} onChange={(e) => setName(e.target.value)} style={{ fontWeight: 600, padding: '10px 12px' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peso (kg)</label>
            <input type="number" step="0.1" required className="form-input" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ fontWeight: 700, fontFamily: 'var(--font-display)', padding: '10px 8px', textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Altura (cm)</label>
            <input type="number" required className="form-input" value={height} onChange={(e) => setHeight(e.target.value)} style={{ fontWeight: 700, fontFamily: 'var(--font-display)', padding: '10px 8px', textAlign: 'center' }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Idade</label>
            <input type="number" required className="form-input" value={age} onChange={(e) => setAge(e.target.value)} style={{ fontWeight: 700, fontFamily: 'var(--font-display)', padding: '10px 8px', textAlign: 'center' }} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '12px 14px', width: '100%', fontWeight: 800, fontSize: '0.85rem' }}>
          Criar Perfil & Treinar
        </button>
      </form>
    </div>
  );
};
