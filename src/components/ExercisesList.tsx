import React, { useState } from 'react';
import type { Exercise } from '../types';
import { Plus, X, Trash2, Search } from 'lucide-react';

interface ExercisesListProps {
  exercises: Exercise[];
  onAddExercise: (name: string, category: string) => void;
  onDeleteExercise: (id: string) => void;
}

const CATEGORIES = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core'];

export const ExercisesList: React.FC<ExercisesListProps> = ({
  exercises,
  onAddExercise,
  onDeleteExercise,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Peito');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCategory) return;

    onAddExercise(newName.trim(), newCategory);
    setNewName('');
    setShowAddModal(false);
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ex.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Exercícios</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            Explora ou adiciona exercícios ao teu catálogo.
          </p>
        </div>
        <button 
          className="btn btn-primary btn-small"
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Procurar exercício..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
        />
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div 
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '99px',
              border: '1px solid',
              borderColor: selectedCategory === cat ? 'var(--accent)' : 'var(--border-color)',
              backgroundColor: selectedCategory === cat ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              color: selectedCategory === cat ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Exercises Grid/List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredExercises.length > 0 ? (
          filteredExercises.map((ex) => (
            <div 
              key={ex.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {ex.name}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{ex.category}</span>
                  {ex.isCustom && (
                    <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      Personalizado
                    </span>
                  )}
                </div>
              </div>

              {ex.isCustom && (
                <button
                  onClick={() => {
                    if (confirm(`Queres mesmo apagar o exercício "${ex.name}"?`)) {
                      onDeleteExercise(ex.id);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(239, 68, 68, 0.6)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    transition: 'color var(--transition-fast), background var(--transition-fast)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = 'var(--danger)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)';
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Nenhum exercício encontrado nesta categoria.
          </div>
        )}
      </div>

      {/* Add Custom Exercise Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Novo Exercício Personalizado</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nome do Exercício</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Prensa de Peito Inclinada"
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Grupo Muscular / Categoria</label>
                <select
                  className="form-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{ background: 'var(--bg-primary)' }}
                >
                  {CATEGORIES.slice(1).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Criar Exercício
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
