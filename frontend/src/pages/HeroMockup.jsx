import { useEffect, useRef, useState } from 'react';
import { FileText, Sparkles, Wand2, Check, Loader2 } from 'lucide-react';

/* ============================================================
   HeroMockup — animated mockup of the Flux editor
   ----------------------------------------------------------
   Choreography (loops every ~14 seconds):
     0.0s   prompt input is empty, cursor blinking
     0.4s   typewriter: "An investor update for Q4 2025"
     3.6s   "Generate" button pulses
     4.0s   3 sections appear one-by-one, status "queued"
     5.5s   first section flips to "streaming", text streams in
     8.5s   first section flips to "done"; second begins
     11.5s  second done; third begins
     13.5s  third done; pause; loop
   ============================================================ */

const PROMPT_TEXT = 'An investor update for Q4 2025';

const SECTIONS = [
  {
    title: 'Executive Summary',
    body: "Flux's core platform delivered 3.4× growth in active document generation YoY, with weekly retention now at 68%. Enterprise tier crossed 240 logos.",
  },
  {
    title: 'Q4 Highlights',
    body: 'Shipped section-level refinement, JWKS auth migration, and the new export pipeline. NPS climbed from 41 to 56 across paying cohorts.',
  },
  {
    title: 'Forward Outlook',
    body: 'Q1 priorities: collaborative editing, template marketplace, on-prem deployment for regulated buyers. Forecasting 2× ARR by end of FY26.',
  },
];

const TOTAL_DURATION = 14000; // ms

function useLoopClock() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = (now - start) % TOTAL_DURATION;
      setT(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

function statusFor(sectionIdx, t) {
  // Section 0: queued 4000-5500, streaming 5500-8500, done 8500+
  // Section 1: queued 4000-8500, streaming 8500-11500, done 11500+
  // Section 2: queued 4000-11500, streaming 11500-13500, done 13500+
  if (t < 4000) return 'hidden';
  const ranges = [
    { stream: 5500, done: 8500 },
    { stream: 8500, done: 11500 },
    { stream: 11500, done: 13500 },
  ];
  const r = ranges[sectionIdx];
  if (t < r.stream) return 'queued';
  if (t < r.done) return 'streaming';
  return 'done';
}

function streamProgress(sectionIdx, t) {
  // 0..1 over the streaming window
  const ranges = [
    [5500, 8500],
    [8500, 11500],
    [11500, 13500],
  ];
  const [s, e] = ranges[sectionIdx];
  if (t <= s) return 0;
  if (t >= e) return 1;
  return (t - s) / (e - s);
}

function StatusPill({ status }) {
  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(14,14,16,0.06)', color: 'rgba(14,14,16,0.55)' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(14,14,16,0.35)' }} />
        Queued
      </span>
    );
  }
  if (status === 'streaming') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full text-white" style={{ background: 'var(--w-violet)' }}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Streaming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
      <Check className="w-3 h-3" />
      Done
    </span>
  );
}

export default function HeroMockup() {
  const t = useLoopClock();
  const scrollRef = useRef(null);

  // typewriter prompt
  const promptT = Math.max(0, t - 400);
  const promptChars = Math.min(PROMPT_TEXT.length, Math.floor(promptT / 90));
  const promptVisible = PROMPT_TEXT.slice(0, promptChars);

  // generate button pulse window
  const generatePulse = t > 3400 && t < 4000;

  // auto-scroll content as more sections appear/stream
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = t < 7500 ? 0 : t < 10500 ? 70 : t < 13000 ? 160 : 220;
    el.scrollTo({ top: target, behavior: 'smooth' });
  }, [t]);

  return (
    <div className="relative w-full" style={{ perspective: 1800 }}>
      <div
        className="relative mx-auto"
        style={{ maxWidth: 980 }}
      >
        {/* Soft glow underneath */}
        <div
          aria-hidden
          className="absolute -inset-x-10 -bottom-12 h-32 rounded-full blur-3xl opacity-70"
          style={{ background: 'radial-gradient(closest-side, rgba(255,63,164,0.45), transparent 70%)' }}
        />

        {/* Window chrome */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F7F9 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.7) inset, 0 0 0 1px rgba(14,14,16,0.06), 0 30px 60px -20px rgba(14,14,16,0.4), 0 60px 120px -40px rgba(91,61,245,0.4)',
          }}
        >
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(14,14,16,0.06)' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#FEBC2E' }} />
              <span className="w-3 h-3 rounded-full" style={{ background: '#28C840' }} />
            </div>
            <div className="text-[12px] font-medium" style={{ color: 'rgba(14,14,16,0.55)' }}>
              flux <span style={{ color: 'rgba(14,14,16,0.3)' }}>/ untitled</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] px-2 py-1 rounded-md" style={{ background: 'rgba(14,14,16,0.05)', color: 'rgba(14,14,16,0.55)' }}>
                .docx
              </span>
              <span className="text-[11px] px-2 py-1 rounded-md text-white" style={{ background: 'var(--w-ink)' }}>
                Export
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-[220px_1fr]">
            {/* Sidebar */}
            <aside className="border-r p-4" style={{ borderColor: 'rgba(14,14,16,0.06)', background: 'rgba(14,14,16,0.015)' }}>
              <div className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(14,14,16,0.4)' }}>
                Workspace
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: 'rgba(91,61,245,0.10)', color: 'var(--w-violet)' }}>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="font-medium truncate">Q4 Investor Update</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ color: 'rgba(14,14,16,0.55)' }}>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate">Roadmap brief</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ color: 'rgba(14,14,16,0.55)' }}>
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate">Sales deck v3</span>
                </div>
              </div>

              <div className="text-[11px] font-medium uppercase tracking-wider mt-5 mb-2" style={{ color: 'rgba(14,14,16,0.4)' }}>
                Templates
              </div>
              <div className="space-y-1 text-[13px]" style={{ color: 'rgba(14,14,16,0.55)' }}>
                <div className="px-2 py-1.5">Pitch deck</div>
                <div className="px-2 py-1.5">Whitepaper</div>
                <div className="px-2 py-1.5">Weekly report</div>
              </div>
            </aside>

            {/* Main editor */}
            <div ref={scrollRef} className="relative" style={{ height: 380, overflow: 'hidden' }}>
              <div className="p-6">
                {/* Prompt input */}
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'rgba(14,14,16,0.4)' }}>
                  <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--w-violet)' }} />
                  Prompt
                </div>
                <div
                  className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
                  style={{
                    background: '#fff',
                    boxShadow: 'inset 0 0 0 1px rgba(14,14,16,0.08)',
                  }}
                >
                  <div className="text-[15px] flex-1" style={{ color: 'var(--w-ink)' }}>
                    {promptVisible}
                    <span
                      className="inline-block w-[2px] h-[1em] align-middle ml-[1px]"
                      style={{
                        background: 'var(--w-ink)',
                        opacity: Math.floor(t / 530) % 2 === 0 ? 1 : 0,
                        transform: 'translateY(2px)',
                      }}
                    />
                  </div>
                  <button
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg text-white whitespace-nowrap transition-transform"
                    style={{
                      background: 'var(--w-violet)',
                      transform: generatePulse ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: generatePulse ? '0 0 0 6px rgba(91,61,245,0.18)' : '0 4px 12px -4px rgba(91,61,245,0.5)',
                    }}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Generate
                  </button>
                </div>

                {/* Section list */}
                <div className="space-y-3">
                  {SECTIONS.map((section, i) => {
                    const status = statusFor(i, t);
                    if (status === 'hidden') return null;
                    const stream = streamProgress(i, t);
                    const charsToShow = status === 'streaming' ? Math.floor(stream * section.body.length) : status === 'done' ? section.body.length : 0;
                    const visibleBody = section.body.slice(0, charsToShow);
                    return (
                      <div
                        key={i}
                        className="rounded-xl p-4"
                        style={{
                          background: '#fff',
                          boxShadow: 'inset 0 0 0 1px rgba(14,14,16,0.06)',
                          animation: 'flx-mockup-in 360ms cubic-bezier(0.16,1,0.3,1) both',
                          animationDelay: `${i * 220}ms`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(14,14,16,0.06)', color: 'rgba(14,14,16,0.55)' }}>
                              §{i + 1}
                            </div>
                            <div className="text-[14px] font-medium">{section.title}</div>
                          </div>
                          <StatusPill status={status} />
                        </div>
                        {(status === 'streaming' || status === 'done') && (
                          <div className="text-[13px] leading-relaxed" style={{ color: 'rgba(14,14,16,0.7)' }}>
                            {visibleBody}
                            {status === 'streaming' && (
                              <span className="inline-block w-[2px] h-[1em] align-middle ml-[1px]" style={{ background: 'var(--w-violet)' }} />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes flx-mockup-in {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  );
}
