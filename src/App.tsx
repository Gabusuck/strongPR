import { useState, useEffect, useRef } from 'react';
import type { ActiveTab, AppData, Workout, AppSettings } from './types';
import { loadAppData, saveAppData, checkAndUpdatePRs, INITIAL_DATA, exportBackup, importBackup } from './storage';
import { WorkoutLog } from './components/WorkoutLog';
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { DashboardView } from './components/DashboardView';
import { PRView } from './components/PRView';
import { RoutinesView } from './components/RoutinesView';
import { History, Dumbbell, User, Sparkles, CheckCircle2, Trophy, Upload, MoreVertical, Volume2, VolumeX, Smartphone, Download, ShieldAlert, RotateCcw, X, BarChart3, Medal } from 'lucide-react';

interface CustomDialogConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

declare global {
  interface Window {
    customAlert: (title: string, message: string, onConfirm?: () => void) => void;
    customConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  }
}

export default function App() {
  const [appData, setAppData] = useState<AppData>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  
  // Custom dialog alert/confirm state
  const [dialog, setDialog] = useState<CustomDialogConfig>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Assign dialog handlers to window
  window.customAlert = (title, message, onConfirm) => {
    setDialog({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      }
    });
  };

  window.customConfirm = (title, message, onConfirm, onCancel) => {
    setDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
        if (onCancel) onCancel();
      }
    });
  };

  // PR congratulations modal state
  const [newPRsModal, setNewPRsModal] = useState<{ isOpen: boolean, count: number }>({ isOpen: false, count: 0 });

  // Settings modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Swipe-to-close for settings modal
  const swipeTouchStartY = useRef<number>(0);
  const onSettingsTouchStart = (e: React.TouchEvent) => {
    swipeTouchStartY.current = e.touches[0].clientY;
  };
  const onSettingsTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - swipeTouchStartY.current;
    if (delta > 60) setShowSettingsModal(false);
  };

  // Lock body scroll when settings modal is open
  useEffect(() => {
    if (showSettingsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSettingsModal]);

  const handleImportClick = () => {
    backupInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus({ type: null, message: '' });
      const importedData = await importBackup(file);
      handleImportData(importedData);
      setImportStatus({ type: 'success', message: 'Dados importados com sucesso!' });
      if (backupInputRef.current) backupInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', message: 'Erro ao importar backup. Verifica o ficheiro.' });
    }
  };

  // Load app data on mount
  useEffect(() => {
    // One-time cleanup to wipe old logs/history for the user to start fresh
    const didWipe = localStorage.getItem('strongpr_wiped_old_logs');
    if (!didWipe) {
      localStorage.removeItem('strongpr_app_data');
      localStorage.removeItem('strongpr_active_workout');
      localStorage.setItem('strongpr_wiped_old_logs', 'true');
      window.location.reload();
      return;
    }

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

  // Start workout from a pre-defined template
  const handleStartWorkoutFromTemplate = (template: any) => {
    const newWorkout: Workout = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      templateId: template.id,
      name: template.name,
      date: new Date().toISOString(),
      exercises: template.exercises.map((ex: any) => ({
        ...ex,
        sets: ex.sets.map((s: any) => ({
          ...s,
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          isCompleted: false // Começa sempre limpo
        }))
      })),
      duration: 0
    };
    setActiveWorkout(newWorkout);
    setActiveTab('workout');
  };

  // Add a new template
  const handleAddTemplate = (name: string, templateExercises: any[]) => {
    const newTemplate = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name,
      exercises: templateExercises.map((ex: any) => ({
        ...ex,
        sets: ex.sets.map((s: any) => ({ ...s, isCompleted: false }))
      }))
    };
    
    updateAppDataState({
      ...appData,
      templates: [...appData.templates, newTemplate]
    });
  };

  // Delete an existing template
  const handleDeleteTemplate = (templateId: string) => {
    updateAppDataState({
      ...appData,
      templates: appData.templates.filter(t => t.id !== templateId)
    });
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
      window.customAlert('Séries Não Concluídas', 'Não podes gravar um treino sem séries concluídas. Conclui pelo menos uma série clicando no visto (OK).');
      return;
    }

    const finalWorkout: Workout = {
      ...activeWorkout,
      exercises: completedExercises,
      date: new Date().toISOString(),
    };

    const { updatedPRs, newPRsCount } = checkAndUpdatePRs(finalWorkout, appData.prs);
    const updatedWorkouts = [finalWorkout, ...appData.workouts];

    // Atualizar os pesos/reps no template correspondente se este treino veio de um template
    let updatedTemplates = [...appData.templates];
    if (finalWorkout.templateId) {
      const templateIdx = updatedTemplates.findIndex(t => t.id === finalWorkout.templateId);
      if (templateIdx !== -1) {
        updatedTemplates[templateIdx] = {
          ...updatedTemplates[templateIdx],
          exercises: completedExercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({
              ...s,
              isCompleted: false // Reset para a próxima sessão
            }))
          }))
        };
      }
    }

    const updatedData: AppData = {
      ...appData,
      workouts: updatedWorkouts,
      prs: updatedPRs,
      templates: updatedTemplates
    };

    updateAppDataState(updatedData);
    setActiveWorkout(null);
    
    if (newPRsCount > 0) {
      setNewPRsModal({ isOpen: true, count: newPRsCount });
    } else {
      setActiveTab('dashboard'); // Redirect to dashboard to see updated stats
    }
  };

  // Cancel and discard active workout
  const handleCancelWorkout = () => {
    window.customConfirm(
      'Cancelar Treino',
      'Tens a certeza que queres apagar o treino atual? Todas as séries não gravadas serão perdidas.',
      () => {
        setActiveWorkout(null);
      }
    );
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
      case 'dashboard':
        return (
          <DashboardView
            workouts={appData.workouts}
            prs={appData.prs}
            profile={appData.profile}
            onStartWorkout={handleStartWorkout}
            onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
          />
        );
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
            templates={appData.templates}
            workouts={appData.workouts}
            onUpdateWorkout={handleUpdateActiveWorkout}
            onSaveWorkout={handleSaveWorkout}
            onCancelWorkout={handleCancelWorkout}
            onStartWorkout={handleStartWorkout}
            onAddTemplate={handleAddTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onStartWorkoutFromTemplate={handleStartWorkoutFromTemplate}
          />
        );
      case 'prs':
        return (
          <PRView
            prs={appData.prs}
          />
        );
      case 'routines':
        return (
          <RoutinesView
            templates={appData.templates}
            exercises={appData.exercises}
            onStartWorkoutFromTemplate={(t) => { handleStartWorkoutFromTemplate(t); setActiveTab('workout'); }}
            onAddTemplate={handleAddTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        );
      case 'profile':
        return (
          <ProfileView 
            workouts={appData.workouts}
            prs={appData.prs}
            exercises={appData.exercises}
            profile={appData.profile}
            onUpdateProfile={(updatedProfile) => updateAppDataState({ ...appData, profile: updatedProfile })}
            onAddManualPR={handleAddManualPR}
            onAddCustomExercise={handleAddExercise}
            onDeleteCustomExercise={handleDeleteExercise}
          />
        );
      default:
        return (
          <DashboardView
            workouts={appData.workouts}
            prs={appData.prs}
            profile={appData.profile}
            onStartWorkout={handleStartWorkout}
            onNavigate={(tab) => setActiveTab(tab as ActiveTab)}
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
          <img src="/logo.png" alt="StrongPR" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '6px' }} />
          StrongPR
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Workout header buttons */}
          {activeWorkout && activeTab === 'workout' && (
            <button
              onClick={handleSaveWorkout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#10b981',
                border: 'none',
                color: '#fff',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
              }}
            >
              ✓ Finalizar
            </button>
          )}
          {activeWorkout && activeTab !== 'workout' && (
            <div
              onClick={() => setActiveTab('workout')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '5px 10px 5px 8px',
                borderRadius: '20px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: '#10b981',
                animation: 'pulse 2s infinite',
                flexShrink: 0
              }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#059669', letterSpacing: '0.01em' }}>Em treino</span>
            </div>
          )}

          {/* 3-dots Settings Icon */}
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--transition-fast)'
            }}
            className="interactive"
            title="Definições"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-content">
        {renderContent()}
      </main>

      {/* Bottom Translucent Glass Navigation Bar */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={20} />
          <span>Início</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={20} />
          <span>Histórico</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => setActiveTab('workout')}
          style={{ position: 'relative' }}
        >
          <Dumbbell size={20} />
          <span>Treinar</span>
          {activeWorkout && (
            <span 
              style={{
                position: 'absolute',
                top: '6px',
                right: '14px',
                width: '6px',
                height: '6px',
                backgroundColor: 'var(--success)',
                borderRadius: '50%',
              }}
            />
          )}
        </button>

        <button 
          className={`nav-item ${activeTab === 'prs' ? 'active' : ''}`}
          onClick={() => setActiveTab('prs')}
        >
          <Medal size={20} />
          <span>Records</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={20} />
          <span>Perfil</span>
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

      {/* Custom Alert/Confirm Dialog */}
      {dialog.isOpen && (
        <div 
          onClick={dialog.type === 'alert' ? dialog.onConfirm : undefined}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '340px', backgroundColor: 'var(--bg-card)', borderRadius: '24px', padding: '24px', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-color)', animation: 'scaleUp var(--transition-fast) cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
              {/* Icon badge based on context */}
              <div style={{ display: 'inline-flex', alignSelf: 'center', padding: '12px', borderRadius: '50%', backgroundColor: dialog.title.toLowerCase().includes('eliminar') || dialog.title.toLowerCase().includes('apagar') || dialog.title.toLowerCase().includes('atenção') ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 94, 58, 0.08)', color: dialog.title.toLowerCase().includes('eliminar') || dialog.title.toLowerCase().includes('apagar') || dialog.title.toLowerCase().includes('atenção') ? 'var(--danger)' : 'var(--accent-color)', marginBottom: '4px' }}>
                <ShieldAlert size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{dialog.title}</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.45', fontWeight: 600 }}>{dialog.message}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {dialog.type === 'confirm' && (
                <button 
                  className="btn btn-secondary" 
                  onClick={dialog.onCancel}
                  style={{ flex: 1, padding: '10px 14px', fontSize: '0.8rem', fontWeight: 800 }}
                >
                  Cancelar
                </button>
              )}
              <button 
                className="btn btn-primary" 
                onClick={dialog.onConfirm}
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.8rem', fontWeight: 800, backgroundColor: dialog.title.toLowerCase().includes('eliminar') || dialog.title.toLowerCase().includes('apagar') || dialog.title.toLowerCase().includes('atenção') ? 'var(--danger)' : 'var(--accent-color)', borderColor: dialog.title.toLowerCase().includes('eliminar') || dialog.title.toLowerCase().includes('apagar') || dialog.title.toLowerCase().includes('atenção') ? 'var(--danger)' : 'var(--accent-color)', color: '#ffffff' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          onClick={() => setShowSettingsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onSettingsTouchStart}
            onTouchEnd={onSettingsTouchEnd}
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '24px 24px 0 0',
              padding: '12px 20px 32px',
              boxShadow: '0 -8px 40px rgba(15, 23, 42, 0.15)',
            }}
          >
            {/* Drag Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--border-color)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Definições</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Preferences */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 0, padding: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={16} style={{ color: 'var(--accent-color)' }} />
                  Preferências de Treino
                </h4>

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
                      value={appData.settings.defaultRestDuration}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        handleUpdateSettings({
                          ...appData.settings,
                          defaultRestDuration: isNaN(val) ? 90 : val
                        });
                      }}
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
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Som ao terminar o descanso.</div>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings({ ...appData.settings, enableSound: !appData.settings.enableSound })}
                    style={{
                      background: appData.settings.enableSound ? 'rgba(255, 94, 58, 0.08)' : '#f1f5f9',
                      border: '1px solid',
                      borderColor: appData.settings.enableSound ? 'var(--accent-color)' : 'var(--border-color)',
                      color: appData.settings.enableSound ? 'var(--accent-color)' : 'var(--text-secondary)',
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
                    {appData.settings.enableSound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                </div>

                {/* Vibration */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Vibrar Dispositivo</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Vibração no fim do descanso.</div>
                  </div>
                  <button
                    onClick={() => handleUpdateSettings({ ...appData.settings, enableVibration: !appData.settings.enableVibration })}
                    style={{
                      background: appData.settings.enableVibration ? 'rgba(255, 94, 58, 0.08)' : '#f1f5f9',
                      border: '1px solid',
                      borderColor: appData.settings.enableVibration ? 'var(--accent-color)' : 'var(--border-color)',
                      color: appData.settings.enableVibration ? 'var(--accent-color)' : 'var(--text-secondary)',
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
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: 0, padding: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} style={{ color: '#10b981' }} />
                  Cópia de Segurança
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Exporta ou importa os teus dados em formato JSON.
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={() => exportBackup(appData)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem' }}
                  >
                    <Download size={14} /> Exportar
                  </button>
                  
                  <button 
                    className="btn btn-secondary btn-small"
                    onClick={handleImportClick}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem' }}
                  >
                    <Upload size={14} /> Importar
                  </button>
                </div>

                <input
                  type="file"
                  ref={backupInputRef}
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
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: 0, padding: '16px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={16} />
                  Zona de Perigo
                </h4>
                <button 
                  className="btn btn-danger btn-small"
                  onClick={() => {
                    window.customConfirm(
                      'Eliminar Todo o Progresso',
                      'ATENÇÃO: Tens a certeza absoluta de que queres eliminar TODOS os teus dados de treinos, exercícios personalizados e recordes pessoais? Esta ação é irreversível.',
                      () => {
                        handleResetData();
                        setShowSettingsModal(false);
                      }
                    );
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', fontSize: '0.78rem' }}
                >
                  <RotateCcw size={14} /> Eliminar Progresso
                </button>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '10px' }}>
                StrongPR PWA • Versão 1.3.0
              </div>
            </div>
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
      window.customAlert('Campo Obrigatório', 'Por favor, indica o teu nome.');
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
      <div style={{ textAlign: 'center', marginBottom: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <img src="/logo.png" alt="StrongPR Logo" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
          StrongPR
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px', fontWeight: 600 }}>
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
            <button type="button" className="btn btn-secondary btn-small" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
              <Upload size={12} style={{ marginRight: '6px' }} />
              Carregar Foto
            </button>
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
