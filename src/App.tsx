import { useState, useEffect } from 'react';
import type { ActiveTab, AppData, Workout, Exercise, PersonalRecord, AppSettings } from './types';
import { loadAppData, saveAppData, checkAndUpdatePRs, INITIAL_DATA } from './storage';
import { Dashboard } from './components/Dashboard';
import { WorkoutLog } from './components/WorkoutLog';
import { PRTracker } from './components/PRTracker';
import { ExercisesList } from './components/ExercisesList';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { LayoutGrid, Dumbbell, History, Trophy, Settings, Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [appData, setAppData] = useState<AppData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  
  // PR congratulations modal state
  const [newPRsModal, setNewPRsModal] = useState<{ isOpen: boolean, count: number }>({ isOpen: false, count: 0 });

  // Load app data on mount
  useEffect(() => {
    const data = loadAppData();
    setAppData(data);
    
    // Check if there was an active workout saved in localStorage (session storage equivalent)
    const savedActiveWorkout = localStorage.getItem('strongpr_active_workout');
    if (savedActiveWorkout) {
      try {
        setActiveWorkout(JSON.parse(savedActiveWorkout));
      } catch (e) {
        console.error('Error loading active workout', e);
      }
    }
  }, []);

  // Save active workout to localStorage whenever it changes
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

  // Update active workout during training
  const handleUpdateActiveWorkout = (updated: Workout) => {
    setActiveWorkout(updated);
  };

  // Save completed workout
  const handleSaveWorkout = () => {
    if (!activeWorkout) return;

    // Filter exercises that have at least one completed set
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
      date: new Date().toISOString(), // finalize date to completion time
    };

    // Check for new Personal Records
    const { updatedPRs, newPRsCount } = checkAndUpdatePRs(finalWorkout, appData.prs);

    // Save workout to history
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
      setActiveTab('dashboard');
    }
  };

  // Cancel and discard active workout
  const handleCancelWorkout = () => {
    if (confirm('Tens a certeza que queres apagar o treino atual? Todas as séries não gravadas serão perdidas.')) {
      setActiveWorkout(null);
      setActiveTab('dashboard');
    }
  };

  // Delete a workout from history
  const handleDeleteWorkout = (workoutId: string) => {
    const updatedWorkouts = appData.workouts.filter(w => w.id !== workoutId);
    
    // Note: We don't delete PRs set during this workout automatically, 
    // to preserve historical highest weights, but we update the workouts database.
    updateAppDataState({
      ...appData,
      workouts: updatedWorkouts
    });
  };

  // Add custom exercise
  const handleAddExercise = (name: string, category: string) => {
    const newExercise: Exercise = {
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
    
    const newPR: PersonalRecord = {
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
    // If active workout tab was open, we reset it
    setActiveWorkout(null);
    setActiveTab('dashboard');
  };

  // Reset all application data
  const handleResetData = () => {
    updateAppDataState(INITIAL_DATA);
    setActiveWorkout(null);
    setActiveTab('dashboard');
  };

  // Switch tabs & handle active workout subviews
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            workouts={appData.workouts}
            prs={appData.prs}
            onStartWorkout={handleStartWorkout}
            onNavigate={(tab) => {
              if (tab === 'workout') handleStartWorkout();
              else setActiveTab(tab);
            }}
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
          />
        );
      case 'history':
        return (
          <HistoryView 
            workouts={appData.workouts}
            onDeleteWorkout={handleDeleteWorkout}
          />
        );
      case 'prs':
        return (
          <PRTracker 
            prs={appData.prs}
            exercises={appData.exercises}
            onAddManualPR={handleAddManualPR}
          />
        );
      case 'exercises':
        return (
          <ExercisesList 
            exercises={appData.exercises}
            onAddExercise={handleAddExercise}
            onDeleteExercise={handleDeleteExercise}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            settings={appData.settings}
            appData={appData}
            onUpdateSettings={handleUpdateSettings}
            onImportData={handleImportData}
            onResetData={handleResetData}
            // Navigate to catalog
            onNavigateCatalog={() => setActiveTab('exercises')}
          />
        );
      default:
        return <Dashboard workouts={appData.workouts} prs={appData.prs} onStartWorkout={handleStartWorkout} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      
      {/* App Header */}
      <header className="app-header">
        <h1 className="app-title" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
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
              backgroundColor: 'rgba(249, 115, 22, 0.15)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
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

      {/* Bottom Sticky Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutGrid size={20} />
          Início
        </button>

        <button 
          className={`nav-item ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => {
            if (!activeWorkout) {
              handleStartWorkout();
            } else {
              setActiveTab('workout');
            }
          }}
          style={{ position: 'relative' }}
        >
          <Dumbbell size={20} />
          Treino
          {/* Active Workout Badge Dot */}
          {activeWorkout && (
            <span 
              style={{
                position: 'absolute',
                top: '6px',
                right: '16px',
                width: '8px',
                height: '8px',
                backgroundColor: 'var(--accent)',
                borderRadius: '50%',
                boxShadow: '0 0 8px var(--accent)'
              }}
            />
          )}
        </button>

        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={20} />
          Histórico
        </button>

        <button 
          className={`nav-item ${activeTab === 'prs' ? 'active' : ''}`}
          onClick={() => setActiveTab('prs')}
        >
          <Trophy size={20} />
          Recordes
        </button>

        <button 
          className={`nav-item ${activeTab === 'settings' || activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={20} />
          Definições
        </button>
      </nav>

      {/* PR Celebration Modal */}
      {newPRsModal.isOpen && (
        <div className="modal-overlay" onClick={() => setNewPRsModal({ isOpen: false, count: 0 })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#eab308', marginBottom: '16px' }}>
              <Trophy size={48} fill="#eab308" />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={20} />
              Novo Recorde Pessoal!
            </h3>

            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, lineHeight: '1.4', marginBottom: '20px' }}>
              Parabéns! Superaste as tuas marcas anteriores em <span style={{ color: '#eab308', fontWeight: 800 }}>{newPRsModal.count}</span> {newPRsModal.count === 1 ? 'exercício' : 'exercícios'} neste treino!
            </p>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '24px' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> Treino guardado no histórico.
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => {
                setNewPRsModal({ isOpen: false, count: 0 });
                setActiveTab('dashboard');
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
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
      `}</style>

    </div>
  );
}
