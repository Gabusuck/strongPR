import React, { useState, useEffect, useMemo } from 'react';
import type { WorkoutExercise, Exercise } from '../types';
import { X, Search, Plus, Check, ChevronLeft, Dumbbell, Info, Bookmark } from 'lucide-react';
import { translateExerciseName, filterExercisesBySearch, getExerciseCategory, matchesCategoryFilter } from '../utils/translateExercise';
import { preloadExercises } from './WorkoutLog';

export interface ApiExercise {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  media_id: string;
  instructions: string[];
}

interface CreateRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, exercises: WorkoutExercise[]) => void;
  exercises?: Exercise[];
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Peito',
  arms: 'Braços',
  shoulders: 'Ombros',
  back: 'Costas',
  abdominals: 'Abs',
  legs: 'Pernas',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  glutes: 'Glúteos',
  quadriceps: 'Quadríceps',
  hamstrings: 'Isquiotibiais',
  calves: 'Gémeos',
  forearms: 'Antebraço',
  lats: 'Dorsais',
  traps: 'Trapézio',
};

const ALL_FILTER_MUSCLES = ['chest', 'arms', 'shoulders', 'back', 'abdominals', 'legs'];

const StaticExerciseImage: React.FC<{ mediaId: string; alt: string; style?: React.CSSProperties }> = ({ mediaId, alt, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!mediaId || error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: '#F8F9FD' }}>
        <Dumbbell size={24} opacity={0.35} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#F8F9FD', overflow: 'hidden' }}>
      {!loaded && (
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Dumbbell size={22} color="var(--accent-color)" opacity={0.25} />
        </div>
      )}
      <img
        src={`https://static.exercisedb.dev/media/${mediaId}.gif`}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          ...style,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
    </div>
  );
};

export function CreateRoutineModal({ isOpen, onClose, onSave, exercises = [] }: CreateRoutineModalProps) {
  const [routineName, setRoutineName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>([]);
  const [selectedDetailExercise, setSelectedDetailExercise] = useState<ApiExercise | null>(null);

  // Bookmarked exercises
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('strongpr_bookmarked_exercises');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('strongpr_bookmarked_exercises', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    preloadExercises().then(data => {
      setApiExercises(data);
    });
  }, [isOpen]);

  const toggleSelectExercise = (id: string) => {
    setSelectedExerciseIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Local custom exercises
  const localExercises = useMemo(() => exercises.filter(ex => ex.isCustom), [exercises]);

  const filteredApiExercises = useMemo(() => {
    const base = searchQuery.trim() !== ''
      ? apiExercises
      : apiExercises.filter(ex => muscleFilter === 'bookmarked'
          ? bookmarkedIds.includes(ex.id)
          : matchesCategoryFilter(ex, muscleFilter));
    return filterExercisesBySearch(base, searchQuery);
  }, [apiExercises, muscleFilter, bookmarkedIds, searchQuery]);

  const filteredLocalExercises = useMemo(() => {
    const base = searchQuery.trim() !== ''
      ? localExercises
      : localExercises.filter(ex => muscleFilter === 'bookmarked'
          ? bookmarkedIds.includes(ex.id)
          : matchesCategoryFilter(ex, muscleFilter));
    return filterExercisesBySearch(base, searchQuery);
  }, [localExercises, muscleFilter, bookmarkedIds, searchQuery]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 150) {
      setVisibleLimit(prev => Math.min(prev + 30, filteredApiExercises.length));
    }
  };

  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName.trim()) {
      window.customAlert('Nome da Rotina', 'Por favor introduz um nome para a rotina de treino.');
      return;
    }
    if (selectedExerciseIds.length === 0) {
      window.customAlert('Exercícios', 'Por favor seleciona pelo menos um exercício para a rotina.');
      return;
    }

    const workoutExercises: WorkoutExercise[] = [];

    // Map selected API exercises
    apiExercises.filter(ex => selectedExerciseIds.includes(ex.id)).forEach((ex, idx) => {
      workoutExercises.push({
        id: ex.id,
        name: ex.name,
        category: getExerciseCategory(ex),
        sets: [
          { id: `s_${Date.now()}_${idx}_1`, weight: 0, reps: 10, isCompleted: false },
          { id: `s_${Date.now()}_${idx}_2`, weight: 0, reps: 10, isCompleted: false },
          { id: `s_${Date.now()}_${idx}_3`, weight: 0, reps: 10, isCompleted: false },
        ]
      });
    });

    // Map selected custom exercises
    localExercises.filter(ex => selectedExerciseIds.includes(ex.id)).forEach((ex, idx) => {
      workoutExercises.push({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        sets: [
          { id: `s_loc_${Date.now()}_${idx}_1`, weight: 0, reps: 10, isCompleted: false },
          { id: `s_loc_${Date.now()}_${idx}_2`, weight: 0, reps: 10, isCompleted: false },
          { id: `s_loc_${Date.now()}_${idx}_3`, weight: 0, reps: 10, isCompleted: false },
        ]
      });
    });

    onSave(routineName.trim(), workoutExercises);
    setRoutineName('');
    setSelectedExerciseIds([]);
    setSearchQuery('');
    setMuscleFilter('all');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => { onClose(); setSelectedDetailExercise(null); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.2)'
        }}
      >
        {/* Detail Inspection Modal View */}
        {selectedDetailExercise ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <button onClick={() => setSelectedDetailExercise(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={22} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {translateExerciseName(selectedDetailExercise.name)}
                </h3>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedDetailExercise.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '2px' }}>
                  {getExerciseCategory(selectedDetailExercise)}
                </div>
              </div>
              <button onClick={() => setSelectedDetailExercise(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {selectedDetailExercise.media_id && (
                <div style={{ margin: '16px 0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '240px', position: 'relative', border: '1px solid var(--border-color)' }}>
                  <img
                    src={`https://static.exercisedb.dev/media/${selectedDetailExercise.media_id}.gif`}
                    alt={selectedDetailExercise.name}
                    style={{ maxHeight: '90%', maxWidth: '90%', objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Primary Muscle */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Músculo Principal</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '10px', backgroundColor: 'rgba(91,94,244,0.08)', color: 'var(--accent-color)', border: '1px solid rgba(91,94,244,0.2)' }}>
                  {getExerciseCategory(selectedDetailExercise)}
                </span>
              </div>

              {/* Secondary Muscles */}
              {selectedDetailExercise.secondary_muscles.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Músculos Secundários</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedDetailExercise.secondary_muscles.map(m => (
                      <span key={m} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                        {MUSCLE_LABELS[m.toLowerCase()] || m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {selectedDetailExercise.instructions && selectedDetailExercise.instructions.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Execução</div>
                  <ol style={{ paddingLeft: '0', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none' }}>
                    {selectedDetailExercise.instructions.map((step, i) => (
                      <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                        <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(91,94,244,0.08)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', marginTop: '1px' }}>{i + 1}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{step.replace(/^Step:\s*\d+\s*/i, '')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Toggle selection button */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
              <button
                type="button"
                className={`btn ${selectedExerciseIds.includes(selectedDetailExercise.id) ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => {
                  toggleSelectExercise(selectedDetailExercise.id);
                  setSelectedDetailExercise(null);
                }}
                style={{ width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 800 }}
              >
                {selectedExerciseIds.includes(selectedDetailExercise.id) ? '✓ Selecionado para a Rotina' : '+ Adicionar à Rotina'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Create Routine & Exercise Catalog View */
          <form onSubmit={handleSaveRoutine} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Top Modal Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 850, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Criar Nova Rotina
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Routine Name Input */}
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Nome da rotina (ex: Treino A — Push)"
                  value={routineName}
                  onChange={e => setRoutineName(e.target.value)}
                  style={{ fontSize: '0.95rem', fontWeight: 700, padding: '12px 14px', borderRadius: '14px' }}
                />
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Procurar exercício em português ou inglês..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '38px', fontSize: '0.85rem', borderRadius: '12px' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Muscle Filter Scrollable Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '10px 0 2px', scrollbarWidth: 'none' }}>
                <button
                  type="button"
                  onClick={() => setMuscleFilter('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: muscleFilter === 'all' ? 'var(--text-primary)' : 'var(--bg-secondary)',
                    color: muscleFilter === 'all' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  Todos
                </button>

                <button
                  type="button"
                  onClick={() => setMuscleFilter('bookmarked')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: muscleFilter === 'bookmarked' ? 'var(--text-primary)' : 'var(--bg-secondary)',
                    color: muscleFilter === 'bookmarked' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  ⭐ Favoritos ({bookmarkedIds.length})
                </button>

                {ALL_FILTER_MUSCLES.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMuscleFilter(m)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      backgroundColor: muscleFilter === m ? 'var(--accent-color)' : 'var(--bg-secondary)',
                      color: muscleFilter === m ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {MUSCLE_LABELS[m] || m}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List Content */}
            <div
              onScroll={handleScroll}
              style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {/* Custom Local Exercises */}
              {filteredLocalExercises.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 6px 8px' }}>
                    Os Teus Exercícios
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filteredLocalExercises.map((ex: Exercise) => {
                      const isSelected = selectedExerciseIds.includes(ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => toggleSelectExercise(ex.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '14px',
                            backgroundColor: isSelected ? 'rgba(91, 94, 244, 0.08)' : 'var(--bg-card)',
                            border: `1.5px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Dumbbell size={20} color="var(--accent-color)" />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {ex.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                {ex.category}
                              </div>
                            </div>
                          </div>
                          <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`, backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* API Exercises Catalog */}
              {filteredApiExercises.slice(0, visibleLimit).map((ex) => {
                const isSelected = selectedExerciseIds.includes(ex.id);
                const isBookmarked = bookmarkedIds.includes(ex.id);
                const translatedName = translateExerciseName(ex.name);

                return (
                  <div
                    key={ex.id}
                    onClick={() => toggleSelectExercise(ex.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      backgroundColor: isSelected ? 'rgba(91, 94, 244, 0.08)' : 'var(--bg-card)',
                      border: `1.5px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      {/* Thumbnail */}
                      <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                        <StaticExerciseImage mediaId={ex.media_id} alt={ex.name} />
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {translatedName}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ex.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            {getExerciseCategory(ex)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Checkbox */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                      {/* Star Bookmark */}
                      <button
                        type="button"
                        onClick={(e) => toggleBookmark(ex.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isBookmarked ? '#f59e0b' : 'var(--text-muted)', opacity: isBookmarked ? 1 : 0.4 }}
                        title="Guardar nos Favoritos"
                      >
                        <Bookmark size={17} fill={isBookmarked ? '#f59e0b' : 'none'} />
                      </button>

                      {/* Info Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailExercise(ex);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                        title="Ver Execução"
                      >
                        <Info size={17} />
                      </button>

                      {/* Selection Checkbox */}
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`, backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginLeft: '4px' }}>
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredApiExercises.length === 0 && filteredLocalExercises.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Dumbbell size={32} opacity={0.3} style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.88rem', fontWeight: 700 }}>Nenhum exercício encontrado</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Tenta pesquisar por outro nome ou grupo muscular.</p>
                </div>
              )}
            </div>

            {/* Bottom Sticky Action Bar */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedExerciseIds.length > 0 ? 'var(--accent-color)' : 'var(--text-muted)' }}>
                  {selectedExerciseIds.length} selecionado{selectedExerciseIds.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '14px', fontSize: '0.92rem', fontWeight: 800 }}
              >
                <Plus size={16} /> Criar Rotina ({selectedExerciseIds.length})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
