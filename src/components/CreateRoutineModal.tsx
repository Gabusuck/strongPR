import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { WorkoutExercise, Exercise, WorkoutTemplate } from '../types';
import { X, Search, Plus, Check, ChevronLeft, Dumbbell, Trash2, GripVertical, Layers, Bookmark } from 'lucide-react';
import { translateExerciseName, filterExercisesBySearch, getExerciseCategory, matchesCategoryFilter } from '../utils/translateExercise';
import { resolveExerciseMediaId } from '../utils/exerciseUtils';
import { StaticExerciseImage } from './StaticExerciseImage';
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
  onSave: (name: string, exercises: WorkoutExercise[], templateId?: string) => void;
  exercises?: Exercise[];
  initialTemplate?: WorkoutTemplate | null;
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

export function CreateRoutineModal({ isOpen, onClose, onSave, exercises = [], initialTemplate }: CreateRoutineModalProps) {
  const [routineName, setRoutineName] = useState('');
  const [routineExercises, setRoutineExercises] = useState<WorkoutExercise[]>([]);
  
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const touchStartY = useRef<number>(0);
  const touchActiveIdx = useRef<number | null>(null);
  const exerciseContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>([]);
  const [selectedDetailExercise, setSelectedDetailExercise] = useState<ApiExercise | null>(null);

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
    if (initialTemplate) {
      setRoutineName(initialTemplate.name || '');
      setRoutineExercises(
        (initialTemplate.exercises || []).map(ex => ({
          ...ex,
          sets: ex.sets && ex.sets.length > 0
            ? ex.sets.map(s => ({ ...s, isCompleted: false }))
            : [
                { id: `s_${Date.now()}_1`, weight: 0, reps: 10, isCompleted: false },
                { id: `s_${Date.now()}_2`, weight: 0, reps: 10, isCompleted: false },
                { id: `s_${Date.now()}_3`, weight: 0, reps: 10, isCompleted: false },
              ]
        }))
      );
    } else {
      setRoutineName('');
      setRoutineExercises([]);
    }
    setShowPicker(false);
    setSelectedDetailExercise(null);
    setSearchQuery('');
    setMuscleFilter('all');
    preloadExercises().then(data => {
      setApiExercises(data);
    });
  }, [isOpen, initialTemplate]);

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchActiveIdx.current = idx;
    setDraggingIdx(idx);
    setDragOverIdx(idx);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchActiveIdx.current === null) return;
    const currentY = e.touches[0].clientY;
    const activeIdx = touchActiveIdx.current;
    for (let i = 0; i < exerciseContainerRefs.current.length; i++) {
      const el = exerciseContainerRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        if (currentY >= rect.top && currentY <= rect.bottom) {
          if (i !== activeIdx) {
            setRoutineExercises(prev => {
              const list = [...prev];
              const [moved] = list.splice(activeIdx, 1);
              list.splice(i, 0, moved);
              return list;
            });
            touchActiveIdx.current = i;
            setDraggingIdx(i);
            setDragOverIdx(i);
            if (window.navigator?.vibrate) {
              window.navigator.vibrate(10);
            }
          }
          break;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    touchActiveIdx.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingIdx(idx);
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggingIdx !== null && draggingIdx !== toIdx) {
      setRoutineExercises(prev => {
        const list = [...prev];
        const [moved] = list.splice(draggingIdx, 1);
        list.splice(toIdx, 0, moved);
        return list;
      });
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const removeExercise = (index: number) => {
    setRoutineExercises(prev => prev.filter((_, i) => i !== index));
  };

  const addSet = (index: number) => {
    setRoutineExercises(prev => prev.map((ex, i) => {
      if (i !== index) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [
          ...ex.sets,
          {
            id: `s_${Date.now()}_${ex.sets.length + 1}`,
            weight: lastSet ? lastSet.weight : 0,
            reps: lastSet ? lastSet.reps : 10,
            isCompleted: false
          }
        ]
      };
    }));
  };

  const removeSet = (index: number) => {
    setRoutineExercises(prev => prev.map((ex, i) => {
      if (i !== index || ex.sets.length <= 1) return ex;
      return {
        ...ex,
        sets: ex.sets.slice(0, -1)
      };
    }));
  };

  const handleAddExerciseFromPicker = (ex: ApiExercise | Exercise) => {
    const category = 'category' in ex && ex.category ? ex.category : getExerciseCategory(ex as ApiExercise);
    const newEx: WorkoutExercise = {
      id: ex.id,
      name: ex.name,
      category: category || 'Geral',
      sets: [
        { id: `s_${Date.now()}_1`, weight: 0, reps: 10, isCompleted: false },
        { id: `s_${Date.now()}_2`, weight: 0, reps: 10, isCompleted: false },
        { id: `s_${Date.now()}_3`, weight: 0, reps: 10, isCompleted: false },
      ]
    };
    setRoutineExercises(prev => [...prev, newEx]);
  };

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
    if (routineExercises.length === 0) {
      window.customAlert('Exercícios', 'Por favor adiciona pelo menos um exercício à rotina.');
      return;
    }

    onSave(routineName.trim(), routineExercises, initialTemplate?.id);
    setRoutineName('');
    setRoutineExercises([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => { onClose(); setShowPicker(false); setSelectedDetailExercise(null); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(6px)',
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
        {selectedDetailExercise ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              </div>
              <button onClick={() => setSelectedDetailExercise(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

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

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Músculo Principal</div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '10px', backgroundColor: 'rgba(91,94,244,0.08)', color: 'var(--accent-color)', border: '1px solid rgba(91,94,244,0.2)' }}>
                  {getExerciseCategory(selectedDetailExercise)}
                </span>
              </div>

              {selectedDetailExercise.instructions && selectedDetailExercise.instructions.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Instruções</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDetailExercise.instructions.map((inst, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--accent-color)', fontWeight: 800 }}>{i + 1}.</span>
                        <span>{inst}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  handleAddExerciseFromPicker(selectedDetailExercise);
                  setSelectedDetailExercise(null);
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                + Adicionar à Rotina
              </button>
            </div>
          </div>
        ) : showPicker ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowPicker(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                    Adicionar Exercício
                  </h3>
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="btn btn-secondary btn-small"
                  style={{ padding: '6px 14px', fontSize: '0.78rem', fontWeight: 800 }}
                >
                  Concluir ({routineExercises.length})
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar exercício (ex: supino, remada, curls)..."
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '40px', fontSize: '0.85rem' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                <button
                  onClick={() => setMuscleFilter('all')}
                  style={{
                    padding: '5px 12px', borderRadius: '14px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', border: 'none',
                    background: muscleFilter === 'all' ? 'var(--accent-color)' : 'rgba(0,0,0,0.05)',
                    color: muscleFilter === 'all' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer'
                  }}
                >
                  Todos
                </button>
                <button
                  onClick={() => setMuscleFilter('bookmarked')}
                  style={{
                    padding: '5px 12px', borderRadius: '14px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', border: 'none',
                    background: muscleFilter === 'bookmarked' ? '#f59e0b' : 'rgba(0,0,0,0.05)',
                    color: muscleFilter === 'bookmarked' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  ⭐ Favoritos
                </button>
                {ALL_FILTER_MUSCLES.map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscleFilter(m)}
                    style={{
                      padding: '5px 12px', borderRadius: '14px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', border: 'none',
                      background: muscleFilter === m ? 'var(--accent-color)' : 'rgba(0,0,0,0.05)',
                      color: muscleFilter === m ? '#fff' : 'var(--text-secondary)', cursor: 'pointer'
                    }}
                  >
                    {MUSCLE_LABELS[m] || m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }} onScroll={handleScroll}>
              {filteredLocalExercises.map(ex => {
                const isAlreadyIn = routineExercises.some(re => re.id === ex.id);
                return (
                  <div
                    key={ex.id}
                    onClick={() => handleAddExerciseFromPicker(ex)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: '14px', background: '#fff', border: '1px solid var(--border-color)',
                      marginBottom: '8px', cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{ex.name}</div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{ex.category} • Personalizado</span>
                    </div>
                    <button
                      style={{
                        padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
                        background: isAlreadyIn ? 'rgba(52,199,89,0.12)' : 'rgba(91,94,244,0.1)',
                        color: isAlreadyIn ? 'var(--success)' : 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      {isAlreadyIn ? <Check size={14} /> : <Plus size={14} />} {isAlreadyIn ? 'Adicionado' : 'Adicionar'}
                    </button>
                  </div>
                );
              })}

              {filteredApiExercises.slice(0, visibleLimit).map(ex => {
                const isAlreadyIn = routineExercises.some(re => re.id === ex.id);
                const isBookmarked = bookmarkedIds.includes(ex.id);
                return (
                  <div
                    key={ex.id}
                    onClick={() => handleAddExerciseFromPicker(ex)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '14px', background: '#fff', border: '1px solid var(--border-color)',
                      marginBottom: '8px', cursor: 'pointer', transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); setSelectedDetailExercise(ex); }}
                      style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#F8F9FD', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}
                      title="Ver animação e detalhes"
                    >
                      {ex.media_id ? (
                        <img src={`https://static.exercisedb.dev/media/${ex.media_id}.gif`} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} loading="lazy" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      ) : (
                        <Dumbbell size={18} color="var(--accent-color)" opacity={0.4} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {translateExerciseName(ex.name)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ex.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>
                        {getExerciseCategory(ex)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleBookmark(ex.id, e)}
                        style={{ background: 'none', border: 'none', padding: '6px', color: isBookmarked ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer' }}
                        title={isBookmarked ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <Bookmark size={16} fill={isBookmarked ? '#f59e0b' : 'none'} />
                      </button>
                      <button
                        onClick={() => handleAddExerciseFromPicker(ex)}
                        style={{
                          padding: '6px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, border: 'none',
                          background: isAlreadyIn ? 'rgba(52,199,89,0.12)' : 'rgba(91,94,244,0.1)',
                          color: isAlreadyIn ? 'var(--success)' : 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                        }}
                      >
                        {isAlreadyIn ? <Check size={14} /> : <Plus size={14} />} {isAlreadyIn ? 'Adicionado' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredApiExercises.length === 0 && filteredLocalExercises.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Nenhum exercício encontrado para "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveRoutine} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                  {initialTemplate ? 'Editar Rotina' : 'Criar Nova Rotina'}
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', margin: 0 }}>
                  Organiza a ordem dos exercícios e as séries planeadas.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nome da Rotina
                </label>
                <input
                  type="text"
                  required
                  value={routineName}
                  onChange={e => setRoutineName(e.target.value)}
                  placeholder="ex: Push Day (Peito & Tríceps), Pernas Pesado..."
                  className="form-input"
                  style={{ height: '46px', fontSize: '0.95rem', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="var(--accent-color)" />
                    Ordem dos Exercícios ({routineExercises.length})
                  </label>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Arrasta pelo ícone ⠿ para reordenar
                  </span>
                </div>

                {routineExercises.length === 0 ? (
                  <div
                    onClick={() => setShowPicker(true)}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '18px',
                      padding: '36px 20px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(91,94,244,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                      <Plus size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Adicionar Primeiro Exercício</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Escolhe exercícios do catálogo para montar a tua rotina.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {routineExercises.map((ex, idx) => {
                      const isDragging = draggingIdx === idx;
                      const isDragOver = dragOverIdx === idx && draggingIdx !== null && draggingIdx !== idx;
                      const mediaId = resolveExerciseMediaId(ex, apiExercises);

                      return (
                        <div
                          key={`${ex.id}_${idx}`}
                          ref={(el) => { exerciseContainerRefs.current[idx] = el; }}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(idx, e)}
                          onDragOver={(e) => handleDragOver(idx, e)}
                          onDrop={(e) => handleDrop(idx, e)}
                          onDragEnd={handleDragEnd}
                          style={{
                            background: isDragging ? 'rgba(91,94,244,0.06)' : '#FFFFFF',
                            border: isDragging
                              ? '2px solid var(--accent-color)'
                              : isDragOver
                              ? '2px dashed var(--accent-color)'
                              : '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                            boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.14)' : '0 1px 4px rgba(0,0,0,0.03)',
                            transition: 'all 0.15s ease',
                            userSelect: isDragging ? 'none' : 'auto'
                          }}
                        >
                          {/* Drag Handle */}
                          <div
                            style={{
                              touchAction: 'none',
                              cursor: 'grab',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isDragging ? 'var(--accent-color)' : 'var(--text-muted)',
                              padding: '6px 2px',
                              flexShrink: 0
                            }}
                            title="Arrasta para mudar a ordem"
                            onTouchStart={(e) => handleTouchStart(idx, e)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                          >
                            <GripVertical size={20} />
                          </div>

                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '7px',
                              background: 'rgba(91, 94, 244, 0.12)',
                              color: 'var(--accent-color)',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {idx + 1}
                          </div>

                          {/* Exercise Thumbnail */}
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <StaticExerciseImage mediaId={mediaId} alt={ex.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {translateExerciseName(ex.name)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '1px 6px', borderRadius: '4px' }}>
                                {ex.category || 'Geral'}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                                {ex.sets.length} {ex.sets.length === 1 ? 'série' : 'séries'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'var(--bg-primary)', padding: '2px 4px', borderRadius: '8px' }}>
                            <button
                              type="button"
                              onClick={() => removeSet(idx)}
                              disabled={ex.sets.length <= 1}
                              style={{
                                width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: '#fff',
                                color: ex.sets.length <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                fontWeight: 800, fontSize: '0.8rem', cursor: ex.sets.length <= 1 ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                              title="Remover série"
                            >
                              -
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
                              {ex.sets.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => addSet(idx)}
                              style={{
                                width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: '#fff',
                                color: 'var(--accent-color)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                              title="Adicionar série"
                            >
                              +
                            </button>
                          </div>

                        <button
                          type="button"
                          onClick={() => removeExercise(idx)}
                          style={{
                            width: '30px', height: '30px', borderRadius: '8px', border: 'none',
                            background: 'rgba(255, 59, 48, 0.08)', color: 'var(--danger)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}
                          title="Remover exercício da rotina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}

                    <button
                      type="button"
                      onClick={() => setShowPicker(true)}
                      style={{
                        padding: '12px',
                        borderRadius: '14px',
                        border: '1.5px dashed var(--accent-color)',
                        background: 'rgba(91, 94, 244, 0.04)',
                        color: 'var(--accent-color)',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                    >
                      <Plus size={16} /> Adicionar Mais Exercícios
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '13px', fontWeight: 700 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, padding: '13px', fontWeight: 800, fontSize: '0.9rem' }}
              >
                ✓ Guardar Rotina ({routineExercises.length})
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
