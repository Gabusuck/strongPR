import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';

export const StaticExerciseImage: React.FC<{
  mediaId?: string | null;
  alt?: string;
  style?: React.CSSProperties;
  size?: number;
}> = ({ mediaId, alt = '', style, size }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!mediaId || error) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          background: '#F8F9FD',
        }}
      >
        <Dumbbell size={size || 20} opacity={0.35} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: '#F8F9FD',
        overflow: 'hidden',
      }}
    >
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          <Dumbbell size={size || 18} color="var(--accent-color)" opacity={0.25} />
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
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none',
          ...style,
        }}
      />
    </div>
  );
};
