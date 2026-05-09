import { useEffect, useState, useRef } from 'react';
import { Sparkles, TrendingUp, Wand2, Cpu, Zap } from 'lucide-react';

/* ============================================================
   LiveAnalytics — feels alive without scroll dependency.
   ----------------------------------------------------------
   Three live tiles + a streaming activity feed:
     - Drafting Speed: ticks animated upward
     - Docs Created: counter that increments every ~2s (looks live)
     - Avg Generation Time: line chart with moving dot
     - Activity feed: new entries pop in from the top, oldest scroll away
   Everything is autoplay; there's always something moving on screen.
   ============================================================ */

const SPEED_VALUES = [26, 32, 41, 47, 55, 51, 48, 54, 60, 58];

/* Documents the live preview cycles through */
const GEN_DOCS = [
  {
    prompt: 'A Q4 investor update for our Series B board',
    title: 'Q4 Investor Update',
    badge: 'INVESTOR',
    sections: [
      { h: 'Executive Summary', body: 'We grew weekly active workspaces 3.4× year-over-year while holding gross margin at 78%. Enterprise tier crossed 240 logos.' },
      { h: 'Q4 Highlights', body: 'Shipped section refinement, JWKS auth, and the new export pipeline. NPS climbed from 41 to 56.' },
      { h: 'Forward Outlook', body: 'Q1 priorities: collaborative editing, template marketplace, on-prem deployment.' },
    ],
  },
  {
    prompt: 'A pitch deck for our Series A round',
    title: 'Series A Pitch',
    badge: 'PITCH DECK',
    sections: [
      { h: 'The Problem', body: 'Knowledge workers spend 40% of their week formatting and rewriting first drafts that nobody reads end-to-end.' },
      { h: 'Our Solution', body: 'Flux turns rough notes into a structured, on-brand draft in under a minute — exportable to native .docx and .pptx.' },
      { h: 'Traction', body: '270K signups, 8× faster drafting, 40 hours saved per team per week. ARR up 4.2× this year.' },
    ],
  },
  {
    prompt: 'A roadmap brief for the design team',
    title: 'Roadmap Brief — Design',
    badge: 'INTERNAL',
    sections: [
      { h: 'North Star', body: 'Make Flux feel like the fastest way from idea to shipped artifact, on any device, in any room.' },
      { h: 'Q1 Themes', body: 'Live collaboration, template depth, presentation polish. One headline launch per month.' },
      { h: 'Risks', body: 'Spec drift across multiplayer, performance regressions in the editor, and review bottlenecks.' },
    ],
  },
];

/* Total simulated generation duration per doc, in ms */
const GEN_TOTAL_MS = 14000;

function useTicker(intervalMs) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

/* Counter that smoothly ramps to a target value */
function useSmoothCounter(target, durationMs = 800) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(performance.now());
  const targetRef = useRef(target);

  useEffect(() => {
    fromRef.current = val;
    startRef.current = performance.now();
    targetRef.current = target;
    let raf = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setVal(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return val;
}

/* ============================================================
   LiveGenerationPreview — left column.
   A faux Flux editor that loops through GEN_DOCS, showing:
     - Prompt typing in
     - Generate button pulse
     - Sections appearing one by one
     - Body text streaming character-by-character with a violet cursor
     - Token count + speed badges updating live
   ============================================================ */
function LiveGenerationPreview({ docs }) {
  const [phase, setPhase] = useState(0); // ms within current doc cycle
  const [docIdx, setDocIdx] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = (now) => {
      const elapsed = (now - start) % GEN_TOTAL_MS;
      setPhase(elapsed);
      // when we wrap, advance the doc
      if (elapsed < 60) {
        setDocIdx((i) => (i + 1) % GEN_DOCS.length);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const doc = GEN_DOCS[docIdx];

  // Choreography: phases in ms within the 14s loop
  // 0 - 2200       prompt typewriter
  // 2200 - 2800    generate button pulse
  // 2800 - 4200    section 1 appears + streams
  // 4200 - 7600    section 1 streams body
  // 7600 - 11000   section 2 streams body
  // 11000 - 13800  section 3 streams body
  // 13800 - 14000  pause then loop

  const promptFull = doc.prompt;
  const promptChars = phase < 2200 ? Math.floor((phase / 2200) * promptFull.length) : promptFull.length;
  const promptText = promptFull.slice(0, promptChars);
  const promptActive = phase < 2200;

  const genPulse = phase >= 2200 && phase < 2800;

  function sectionState(i) {
    const windows = [
      [2800, 7600],
      [7600, 11000],
      [11000, 13800],
    ];
    const [s, e] = windows[i];
    if (phase < s) return { visible: false, progress: 0, streaming: false, done: false };
    if (phase >= e) return { visible: true, progress: 1, streaming: false, done: true };
    return { visible: true, progress: (phase - s) / (e - s), streaming: true, done: false };
  }

  // Token count display (cosmetic)
  const tokenCount = Math.min(847, Math.floor(phase / 16.5));
  const tokensPerSec = phase > 1000 ? 96 + Math.floor(Math.sin(phase / 240) * 18) : 0;

  return (
    <div
      className="rounded-3xl relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #14121F 0%, #0B0A14 100%)',
      }}
    >
      {/* gradient glow */}
      <div
        aria-hidden
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(91,61,245,0.45), transparent 70%)',
          animation: 'flx-pulse 5.6s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-12 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(255,63,164,0.32), transparent 70%)',
          animation: 'flx-pulse 7s ease-in-out infinite reverse',
        }}
      />

      <div className="relative p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
            </div>
            <span className="ml-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
              flux <span style={{ color: 'rgba(255,255,255,0.3)' }}>· generating</span>
            </span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-2 py-1 rounded-md"
            style={{ background: 'rgba(91,61,245,0.18)', color: '#B6A6FF' }}
          >
            <Cpu className="w-3 h-3" />
            {doc.badge}
          </span>
        </div>

        {/* Prompt */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <Sparkles className="w-3 h-3" style={{ color: '#B6A6FF' }} />
            Prompt
          </div>
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <div className="text-[14px] flex-1" style={{ color: 'rgba(255,255,255,0.92)' }}>
              {promptText}
              {promptActive && (
                <span
                  className="inline-block w-[2px] h-[1em] align-middle ml-[1px]"
                  style={{
                    background: '#B6A6FF',
                    opacity: Math.floor(phase / 280) % 2 === 0 ? 1 : 0,
                    transform: 'translateY(2px)',
                  }}
                />
              )}
            </div>
            <button
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg text-white whitespace-nowrap transition-transform"
              style={{
                background: 'var(--w-violet)',
                transform: genPulse ? 'scale(1.08)' : 'scale(1)',
                boxShadow: genPulse ? '0 0 0 6px rgba(91,61,245,0.28)' : '0 4px 12px -4px rgba(91,61,245,0.6)',
              }}
            >
              <Wand2 className="w-3 h-3" />
              Generate
            </button>
          </div>
        </div>

        {/* Token meter */}
        <div className="flex items-center justify-between mb-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Zap className="w-3 h-3" style={{ color: '#FFD93D' }} />
              <span className="flx-num font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{tokensPerSec}</span>
              <span>tok/s</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
            <span className="flx-num">{tokenCount} / 847 tokens</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{doc.title}</span>
        </div>
        <div className="h-[3px] rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (phase / 13800) * 100)}%`,
              background: 'linear-gradient(90deg, #5B3DF5, #FF3FA4)',
              transition: 'width 80ms linear',
            }}
          />
        </div>

        {/* Sections */}
        <div className="space-y-2.5">
          {doc.sections.map((s, i) => {
            const st = sectionState(i);
            if (!st.visible) {
              return (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3 text-[12px]"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    color: 'rgba(255,255,255,0.3)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                  }}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  Queued · §{i + 1} {s.h}
                </div>
              );
            }
            const charsToShow = Math.floor(st.progress * s.body.length);
            return (
              <div
                key={i}
                className="rounded-xl px-4 py-3.5"
                style={{
                  background: st.done ? 'rgba(255,255,255,0.04)' : 'rgba(91,61,245,0.10)',
                  boxShadow: `inset 0 0 0 1px ${st.streaming ? 'rgba(91,61,245,0.45)' : 'rgba(255,255,255,0.06)'}`,
                  animation: 'flx-feed-in 460ms cubic-bezier(0.16,1,0.3,1) both',
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>
                      §{i + 1}
                    </span>
                    <span className="text-[13px] font-medium text-white">{s.h}</span>
                  </div>
                  {st.streaming ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgba(91,61,245,0.25)', color: '#B6A6FF' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#B6A6FF', animation: 'flx-pulse 1.2s ease-in-out infinite' }} />
                      Streaming
                    </span>
                  ) : st.done ? (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.16)', color: '#7AE89D' }}>
                      Done
                    </span>
                  ) : null}
                </div>
                <div className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {s.body.slice(0, charsToShow)}
                  {st.streaming && (
                    <span
                      className="inline-block w-[2px] h-[1em] align-middle ml-[1px]"
                      style={{ background: '#B6A6FF', opacity: Math.floor(phase / 220) % 2 === 0 ? 1 : 0, transform: 'translateY(2px)' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer stat */}
        <div className="mt-5 flex items-center justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="relative inline-flex">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7AE89D' }} />
              <span className="absolute inset-0 rounded-full" style={{ background: '#7AE89D', animation: 'flx-ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
            </span>
            <span>Live · gpt-flux-1</span>
          </span>
          <span className="flx-num">
            {Math.round(docs).toLocaleString()} docs generated today
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LiveAnalytics() {
  const tick = useTicker(2200);
  const fastTick = useTicker(1000);

  // Smooth counters
  const speedTarget = SPEED_VALUES[tick % SPEED_VALUES.length];
  const speed = useSmoothCounter(speedTarget, 900);

  const docsTarget = 1200 + tick * 3 + Math.floor((fastTick * 7) % 13);
  const docs = useSmoothCounter(docsTarget, 600);

  const avgSecTarget = 38 + ((tick * 7) % 12);
  const avgSec = useSmoothCounter(avgSecTarget, 700);

  // Sparkline data — last N speed values
  const sparkData = SPEED_VALUES.slice(0, 8).map((v, i, arr) => ({
    x: (i / (arr.length - 1)) * 100,
    y: 100 - ((v - 20) / 50) * 100,
  }));
  const sparkPath = `M ${sparkData.map((d) => `${d.x},${d.y}`).join(' L ')}`;
  const lastDot = sparkData[sparkData.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
      {/* LEFT — Live generation preview (document being written in real time) */}
      <LiveGenerationPreview docs={docs} />


      {/* RIGHT — Live stat tiles + sparkline */}
      <div className="grid grid-rows-[auto_auto_1fr] gap-6">
        {/* Stat row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'var(--w-yellow)' }}>
            <div className="text-[12px] font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(14,14,16,0.6)' }}>
              Drafting speed
            </div>
            <div className="flx-num text-[44px] font-medium flx-tight">
              +{speed.toFixed(0)}%
            </div>
            <TrendingUp className="absolute right-4 bottom-4 w-6 h-6" style={{ color: 'rgba(14,14,16,0.25)' }} />
          </div>
          <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'var(--w-pink)' }}>
            <div className="text-[12px] font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Docs today
            </div>
            <div className="flx-num text-[44px] font-medium flx-tight">
              {Math.round(docs).toLocaleString()}
            </div>
            <Sparkles className="absolute right-4 bottom-4 w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>

        {/* Sparkline tile */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--w-surface)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-wider" style={{ color: 'rgba(14,14,16,0.5)' }}>
                Avg generation time
              </div>
              <div className="flx-num text-[28px] font-medium mt-0.5">
                {avgSec.toFixed(0)} sec
              </div>
            </div>
            <div className="flex gap-1 text-[11px]">
              <span className="px-2.5 py-1 rounded-full text-white" style={{ background: 'var(--w-ink)' }}>7d</span>
              <span className="px-2.5 py-1 rounded-full" style={{ color: 'rgba(14,14,16,0.55)', boxShadow: 'inset 0 0 0 1px rgba(14,14,16,0.1)' }}>30d</span>
              <span className="px-2.5 py-1 rounded-full" style={{ color: 'rgba(14,14,16,0.55)', boxShadow: 'inset 0 0 0 1px rgba(14,14,16,0.1)' }}>90d</span>
            </div>
          </div>
          <div className="relative h-[120px]">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              {/* gridlines */}
              {[20, 40, 60, 80].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(14,14,16,0.06)" strokeWidth="0.4" />
              ))}
              {/* fill area */}
              <path
                d={`${sparkPath} L 100,100 L 0,100 Z`}
                fill="url(#flx-spark-fill)"
              />
              {/* line */}
              <path d={sparkPath} fill="none" stroke="#5B3DF5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              {/* dot at end + pulsing ring */}
              <circle cx={lastDot.x} cy={lastDot.y} r="1.6" fill="#5B3DF5" />
              <circle cx={lastDot.x} cy={lastDot.y} r="1.6" fill="none" stroke="#5B3DF5" strokeWidth="0.4" style={{ animation: 'flx-ping 1.6s ease-out infinite', transformOrigin: `${lastDot.x}px ${lastDot.y}px` }} />
              <defs>
                <linearGradient id="flx-spark-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B3DF5" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#5B3DF5" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Tags strip */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--w-surface)' }}>
          <div className="text-[12px] font-medium uppercase tracking-wider mb-3" style={{ color: 'rgba(14,14,16,0.5)' }}>
            Trending topics
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['#Strategy', '#Pitch', '#Q4 Report', '#Brief', '#Whitepaper', '#Roadmap', '#Onboarding'].map((t, i) => (
              <span
                key={t}
                className="text-[12px] px-2.5 py-1 rounded-full bg-white"
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(14,14,16,0.08)',
                  animation: 'flx-tag-glow 4s ease-in-out infinite',
                  animationDelay: `${i * 0.4}s`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes flx-feed-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes flx-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%      { transform: scale(1.15); opacity: 1; }
        }
        @keyframes flx-ping {
          0%   { transform: scale(1); opacity: 0.8; }
          75%  { transform: scale(2.6); opacity: 0; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes flx-tag-glow {
          0%, 100% { box-shadow: inset 0 0 0 1px rgba(14,14,16,0.08); }
          50%      { box-shadow: inset 0 0 0 1px rgba(91,61,245,0.35), 0 0 0 4px rgba(91,61,245,0.06); }
        }
      `}</style>
    </div>
  );
}
