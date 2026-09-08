import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X, Dumbbell, Edit2 } from 'lucide-react';
import type { WorkoutTemplate } from '../types';
import { translateExerciseName } from '../utils/translateExercise';
import { resolveExerciseMediaId, type ApiExerciseItem } from '../utils/exerciseUtils';
import { StaticExerciseImage } from './StaticExerciseImage';
import { preloadExercises } from './WorkoutLog';

interface RoutinePreviewModalProps {
  template: WorkoutTemplate | null;
  onClose: () => void;
  onStartWorkout: (template: WorkoutTemplate) => void;
  onEdit?: (template: WorkoutTemplate) => void;
}

export const RoutinePreviewModal: React.FC<RoutinePreviewModalProps> = ({
  template,
  onClose,
  onStartWorkout,
  onEdit,
}) => {
  const [apiExercises, setApiExercises] = useState<ApiExerciseItem[]>([]);

  useEffect(() => {
    if (template) {
      document.body.style.overflow = 'hidden';
      preloadExercises().then(data => {
        setApiExercises(data);
      });
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [template]);

  if (!template) return null;

  const totalSets = (template.exercises || []).reduce(
    (acc, ex) => acc + (ex.sets ? ex.sets.length : 0),
    0
  );

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '88vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(91, 94, 244, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--accent-color)',
              }}
            >
              <Dumbbell size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  margin: 0,
                }}
              >
                {template.name}
              </h3>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
                  {template.exercises.length} {template.exercises.length === 1 ? 'exercício' : 'exercícios'}
                </span>
                <span>•</span>
                <span>{totalSets} séries planeadas</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Exercise List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {template.exercises.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Esta rotina não tem exercícios definidos.
            </div>
          ) : (
            template.exercises.map((ex, idx) => {
              const mediaId = resolveExerciseMediaId(ex, apiExercises);

              return (
                <div
                  key={ex.id || idx}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '7px',
                        backgroundColor: 'rgba(91, 94, 244, 0.12)',
                        color: 'var(--accent-color)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* Thumbnail Image */}
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
                      <h4
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {translateExerciseName(ex.name)}
                      </h4>
                      {ex.category && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: 'var(--text-secondary)',
                            marginTop: '2px',
                            display: 'inline-block'
                          }}
                        >
                          {ex.category}
                        </span>
                      )}
                    </div>
                  </div>

                {/* Sets list */}
                {ex.sets && ex.sets.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginTop: '2px',
                      paddingLeft: '30px',
                    }}
                  >
                    {ex.sets.map((set, sIdx) => (
                      <div
                        key={set.id || sIdx}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                          S{sIdx + 1}:
                        </span>
                        <span>{set.weight > 0 ? `${set.weight}kg` : '0kg'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>×</span>
                        <span>{set.reps > 0 ? `${set.reps}` : '0'}</span>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Button: Começar Treino */}
        <div
          style={{
            padding: '16px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            display: 'flex',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '14px 18px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              background: '#FFFFFF',
              color: 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(template);
              }}
              style={{
                padding: '14px 18px',
                borderRadius: '16px',
                border: '1px solid rgba(91,94,244,0.3)',
                background: 'rgba(91,94,244,0.08)',
                color: 'var(--accent-color)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Edit2 size={16} /> Editar
            </button>
          )}
          <button
            onClick={() => {
              onStartWorkout(template);
              onClose();
            }}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '16px',
              border: 'none',
              background: 'var(--accent-gradient)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 16px var(--accent-glow)',
            }}
          >
            <Play size={18} fill="#FFFFFF" /> Começar Treino
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
