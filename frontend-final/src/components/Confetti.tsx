import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

const COLORS = ['#cb9635', '#ffffff', '#3d2b27', '#8f6248', '#b7dcc2', '#e8d5b5'];
const PIECE_COUNT = 65;

type Piece = {
  id: number;
  left: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
};

export type ConfettiProps = {
  active: boolean;
};

const Confetti: React.FC<ConfettiProps> = ({ active }) => {
  const [run, setRun] = useState(false);
  const pieces = useMemo(() => {
    const list: Piece[] = [];
    for (let i = 0; i < PIECE_COUNT; i++) {
      list.push({
        id: i,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 120,
        rotation: (Math.random() - 0.5) * 720
      });
    }
    return list;
  }, []);

  useEffect(() => {
    if (!active) return;
    setRun(true);
    const t = setTimeout(() => setRun(false), 4200);
    return () => clearTimeout(t);
  }, [active]);

  if (!run) return null;

  const content = (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ['--confetti-drift' as string]: `${p.drift}px`,
            ['--confetti-rotation' as string]: `${p.rotation}deg`
          }}
        />
      ))}
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
};

export default Confetti;
