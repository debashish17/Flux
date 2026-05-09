/* ============================================================
   StatArt — small animated thumbnails for the stats rows.
   Three variants:
     - "constellation" : floating user dots with connection lines
     - "bars"          : bar chart racing upward
     - "clock"         : analog clock face with sweeping hand
   ============================================================ */

export default function StatArt({ kind }) {
  if (kind === 'constellation') return <Constellation />;
  if (kind === 'bars') return <RacingBars />;
  if (kind === 'clock') return <SweepingClock />;
  return null;
}

/* --- Constellation: 8 user dots orbiting, connecting lines pulse --- */
function Constellation() {
  // Static positions (% in the 180×180 box). Each dot has its own anim delay.
  const dots = [
    { x: 50, y: 18, d: 0,   color: '#FFD93D', size: 18 },
    { x: 22, y: 38, d: 0.3, color: '#FF3FA4', size: 14 },
    { x: 78, y: 36, d: 0.6, color: '#FFFFFF', size: 14 },
    { x: 14, y: 70, d: 0.9, color: '#FFD93D', size: 12 },
    { x: 86, y: 70, d: 1.2, color: '#FFFFFF', size: 12 },
    { x: 40, y: 88, d: 1.5, color: '#FF3FA4', size: 14 },
    { x: 64, y: 92, d: 1.8, color: '#FFFFFF', size: 10 },
    { x: 50, y: 56, d: 2.1, color: '#FFD93D', size: 22 }, // center
  ];

  return (
    <div className="absolute inset-0">
      {/* Connection lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[
          [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
          [1, 5], [2, 4], [0, 1], [0, 2], [3, 5], [4, 6],
        ].map(([a, b], i) => (
          <line
            key={i}
            x1={dots[a].x} y1={dots[a].y}
            x2={dots[b].x} y2={dots[b].y}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
            style={{
              animation: `flx-line-pulse 3.6s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </svg>

      {/* Dots */}
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            transform: 'translate(-50%, -50%)',
            boxShadow: i === dots.length - 1 ? '0 0 24px 4px rgba(255,255,255,0.35)' : '0 0 8px rgba(0,0,0,0.18)',
            animation: `flx-float 4s ease-in-out infinite`,
            animationDelay: `${d.d}s`,
          }}
        />
      ))}

      {/* Center pulse ring */}
      <span
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '56%',
          width: 22, height: 22,
          transform: 'translate(-50%, -50%)',
          border: '2px solid rgba(255,255,255,0.6)',
          animation: 'flx-ring 2s ease-out infinite',
        }}
      />

      <style>{`
        @keyframes flx-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50%      { transform: translate(-50%, -50%) translateY(-4px); }
        }
        @keyframes flx-line-pulse {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.7; }
        }
        @keyframes flx-ring {
          0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          80%  { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* --- RacingBars: 6 bars that grow at staggered intervals --- */
function RacingBars() {
  const bars = [
    { left: '10%', max: 50, delay: 0,   color: '#5B3DF5' },
    { left: '24%', max: 70, delay: 0.15, color: '#5B3DF5' },
    { left: '38%', max: 38, delay: 0.30, color: '#FF3FA4' },
    { left: '52%', max: 84, delay: 0.45, color: '#5B3DF5' },
    { left: '66%', max: 62, delay: 0.60, color: '#FF3FA4' },
    { left: '80%', max: 92, delay: 0.75, color: '#5B3DF5' },
  ];

  return (
    <div className="absolute inset-0">
      {/* baseline */}
      <div
        className="absolute left-3 right-3 bottom-6 h-px"
        style={{ background: 'rgba(14,14,16,0.18)' }}
      />
      {/* bars */}
      {bars.map((b, i) => (
        <div
          key={i}
          className="absolute bottom-6 rounded-t-md"
          style={{
            left: b.left,
            width: 14,
            background: b.color,
            transformOrigin: '50% 100%',
            height: `${b.max}%`,
            animation: 'flx-bar-race 2.6s cubic-bezier(0.16,1,0.3,1) infinite',
            animationDelay: `${b.delay}s`,
            boxShadow: '0 4px 12px -4px rgba(91,61,245,0.5)',
          }}
        />
      ))}
      {/* trend arrow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
        <path
          d="M 8,82 Q 30,76 50,52 T 92,12"
          fill="none"
          stroke="#FF3FA4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset="200"
          style={{ animation: 'flx-draw 3.2s ease-in-out infinite' }}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="92" cy="12" r="3" fill="#FF3FA4"
          style={{ animation: 'flx-pop 3.2s ease-in-out infinite' }}
        />
      </svg>

      <style>{`
        @keyframes flx-bar-race {
          0%   { transform: scaleY(0.05); }
          50%  { transform: scaleY(1); }
          100% { transform: scaleY(0.6); }
        }
        @keyframes flx-draw {
          0%   { stroke-dashoffset: 200; }
          50%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes flx-pop {
          0%, 40% { opacity: 0; transform: scale(0.4); transform-origin: 92% 12%; }
          55%     { opacity: 1; transform: scale(1.4); }
          70%     { opacity: 1; transform: scale(1); }
          100%    { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* --- SweepingClock: minimalist clock face with sweeping minute hand --- */
function SweepingClock() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg viewBox="-50 -50 100 100" className="w-[140px] h-[140px]">
        {/* outer ring */}
        <circle cx="0" cy="0" r="46" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        {/* hour ticks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const isMain = i % 3 === 0;
          const r1 = isMain ? 38 : 42;
          const r2 = 46;
          return (
            <line
              key={i}
              x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
              x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={isMain ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}
        {/* center dot */}
        <circle cx="0" cy="0" r="3" fill="#FFD93D" />
        {/* center pulse */}
        <circle cx="0" cy="0" r="3" fill="none" stroke="#FFD93D" strokeWidth="1" style={{ animation: 'flx-clock-ping 2s ease-out infinite' }} />

        {/* sweep arc — fills in over the rotation */}
        <circle
          cx="0" cy="0" r="36"
          fill="none"
          stroke="#FFD93D"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="226.19" /* 2πr */
          strokeDashoffset="226.19"
          style={{
            animation: 'flx-clock-fill 6s linear infinite',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
          }}
        />

        {/* minute hand */}
        <g style={{ animation: 'flx-clock-hand 6s linear infinite', transformOrigin: 'center' }}>
          <line x1="0" y1="0" x2="0" y2="-32" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-32" r="2.5" fill="#FF3FA4" />
        </g>
      </svg>

      <style>{`
        @keyframes flx-clock-hand {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes flx-clock-fill {
          from { stroke-dashoffset: 226.19; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes flx-clock-ping {
          0%   { r: 3; opacity: 0.8; }
          80%  { r: 14; opacity: 0; }
          100% { r: 14; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
