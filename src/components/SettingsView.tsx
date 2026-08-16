import React, { useRef, useState } from 'react';
import type { AppSettings, AppData } from '../types';
import { exportBackup, importBackup } from '../storage';
import { Volume2, VolumeX, Smartphone, Download, Upload, RotateCcw, Timer, ShieldAlert } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  appData: AppData;
  onUpdateSettings: (settings: AppSettings) => void;
  onImportData: (data: AppData) => void;
  onResetData: () => void;
  onNavigateCatalog: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  appData,
  onUpdateSettings,
  onImportData,
  onResetData,
  onNavigateCatalog,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleRestTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onUpdateSettings({
      ...settings,
      defaultRestDuration: isNaN(val) ? 90 : val
    });
  };

  const handleExport = () => {
    exportBackup(appData);
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
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', message: 'Erro ao importar backup. Verifica o ficheiro.' });
    }
  };

  const handleResetClick = () => {
    if (confirm('ATENÇÃO: Tens a certeza absoluta de que queres eliminar TODOS os teus dados de treinos, exercícios personalizados e recordes pessoais? Esta ação é irreversível.')) {
      onResetData();
      alert('Aplicação reiniciada com sucesso.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Definições</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Configura as preferências da tua aplicação.
        </p>
      </div>

      {/* Preferences Section */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Timer size={18} style={{ color: 'var(--accent)' }} />
          Preferências de Treino
        </h3>

        {/* Rest Timer Setting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tempo de Descanso Padrão</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sugestão de intervalo entre séries.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              className="form-input"
              value={settings.defaultRestDuration}
              onChange={handleRestTimeChange}
              style={{ width: '80px', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-display)' }}
              min={10}
              max={600}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>seg</span>
          </div>
        </div>

        {/* Sound Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Som do Temporizador</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emitir sinal sonoro no fim do descanso.</div>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, enableSound: !settings.enableSound })}
            style={{
              background: settings.enableSound ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: settings.enableSound ? 'var(--accent)' : 'var(--border-color)',
              color: settings.enableSound ? 'var(--accent)' : 'var(--text-secondary)',
              width: '44px',
              height: '44px',
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

        {/* Vibration Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Vibrar Telemóvel</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vibrar o dispositivo ao terminar o tempo.</div>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, enableVibration: !settings.enableVibration })}
            style={{
              background: settings.enableVibration ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: settings.enableVibration ? 'var(--accent)' : 'var(--border-color)',
              color: settings.enableVibration ? 'var(--accent)' : 'var(--text-secondary)',
              width: '44px',
              height: '44px',
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

      {/* Exercises Catalog Link Card */}
      <div 
        className="glass-card interactive" 
        onClick={onNavigateCatalog}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '18px 16px', 
          cursor: 'pointer',
          marginBottom: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.25rem' }}>💪</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Catálogo de Exercícios</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Visualizar, pesquisar e criar exercícios personalizados.
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 'bold' }}>→</span>
      </div>

      {/* Backup and Restore Section */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} style={{ color: '#10b981' }} />
          Cópia de Segurança & Backup
        </h3>
        
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Os teus dados são guardados localmente no navegador. Faz backups regulares para não perderes o teu progresso se limpares a cache.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary btn-small"
            onClick={handleExport}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Download size={16} /> Exportar
          </button>
          
          <button 
            className="btn btn-secondary btn-small"
            onClick={handleImportClick}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Upload size={16} /> Importar
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />

        {/* Import status notification */}
        {importStatus.type && (
          <div 
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 500,
              backgroundColor: importStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: importStatus.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: importStatus.type === 'success' ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
              marginTop: '4px'
            }}
          >
            {importStatus.message}
          </div>
        )}
      </div>

      {/* Danger Zone Section */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: 0 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} />
          Zona de Perigo
        </h3>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Estas opções apagam permanentemente dados da tua aplicação. Sê cauteloso.
        </p>

        <button 
          className="btn btn-danger btn-small"
          onClick={handleResetClick}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
        >
          <RotateCcw size={16} /> Eliminar e Reiniciar Aplicação
        </button>
      </div>

      {/* Version Tag */}
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '10px' }}>
        StrongPR PWA • Versão 1.0.0 (Offline)
      </div>

    </div>
  );
};
