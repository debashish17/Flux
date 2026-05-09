import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from '@studio-freight/lenis';
import HeroMockup from './HeroMockup';
import LiveAnalytics from './LiveAnalytics';
import StatArt from './StatArt';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ======================================================================
   FLUX / WOLLO LANDING — R3F hero + GSAP scroll choreography
   ----------------------------------------------------------------------
   Motion responsibilities:
     - Lenis           : buttery smooth-scroll, drives ScrollTrigger
     - HeroScene (R3F) : real 3D hero scene authored in JSX (Three.js)
     - GSAP timeline   : per-section entrances, stagger, counters
     - ScrollTrigger   : pins the analytics block, scrubs marquee speed,
                         drives manifesto word reveal, stat counters, etc.
   ====================================================================== */

const TESTIMONIALS = [
  { quote: "Flux has transformed our team's workflow. Structured drafts, polished exports, and a chat assistant that actually gets context — our turnaround has dropped from days to hours.", name: 'Caleb Whitmore', title: 'Team Lead' },
  { quote: 'This tool. Its structure planning saves me hours per deck, and the support team responds to questions almost the same day.', name: 'Elodie Harrington', title: 'Brand Manager' },
  { quote: "An affordable doc-generation tool that has revolutionized my small business's content workflow. The structure planner saves me time, and exports look client-ready.", name: 'Xavier Sinclair', title: 'Customer Strategist' },
  { quote: "Since adopting Flux, our content production has reached a new level of efficiency. I've seen firsthand the impact on every campaign brief we ship.", name: 'Zephyr Finnegan', title: 'Marketing Operations' },
  { quote: "Of all the AI document tools I've tried, this one stands out. The intuitive editor and section-level refinement have made it indispensable to my work.", name: 'Azura Everly', title: 'Content Strategist' },
  { quote: 'Flux has become an indispensable asset for our content team. The clean editor and feedback loop help us craft compelling narratives and ship faster.', name: 'Caspian Hawthorne', title: 'Document Manager' },
];

const FAQS = [
  { q: 'How does Flux generate documents and presentations?', a: 'You describe what you need, Flux plans the structure, and our AI fills each section with content you can refine inline. Export to .docx or .pptx in one click — fully formatted and ready to share.' },
  { q: 'Can I edit and refine sections after generation?', a: 'Yes. Edit titles and content inline, reorder sections, add or remove blocks, and use feedback-driven AI regeneration — auto-saved as you go.' },
  { q: 'What export formats does Flux support?', a: 'Flux exports to native Microsoft Word (.docx) and PowerPoint (.pptx) — fully editable, professionally formatted, and ready for client delivery.' },
  { q: 'How does Flux ensure data security and privacy?', a: 'Your projects are isolated per account, transmitted over TLS, and stored on managed PostgreSQL with strict ownership checks. Authentication is handled via Supabase with asymmetric JWKS verification.' },
];

/* ----- Lenis smooth-scroll, wired into ScrollTrigger ----- */
function useLenis() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.05,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time) => { lenis.raf(time * 1000); };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); lenis.destroy(); };
  }, []);
}

export default function Landing() {
  useLenis();

  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const heroH1Ref = useRef(null);
  const heroCtasRef = useRef(null);

  const analyticsRef = useRef(null);

  const marqueeRef = useRef(null);
  const marqueeTrackRef = useRef(null);
  const envelopeRef = useRef(null);

  const featureRowRef = useRef(null);
  const manifestoRef = useRef(null);
  const statsRef = useRef(null);
  const testimonialsRef = useRef(null);
  const faqRef = useRef(null);
  const ctaRef = useRef(null);

  // Hero is now light-themed (gradient backdrop + product mockup), so the
  // nav stays in its default ink-on-white state across the page.

  /* ---- Master ScrollTrigger choreography ---- */
  useGSAP(() => {
    const ctx = gsap.context(() => {
      /* Hero entrance — words rise, CTAs scale */
      const split = heroH1Ref.current.querySelectorAll('.flx-word');
      gsap.from(split, {
        yPercent: 110, opacity: 0, duration: 1.2, stagger: 0.08,
        ease: 'power4.out', delay: 0.2,
      });
      gsap.from(heroCtasRef.current.children, {
        y: 24, opacity: 0, scale: 0.96, duration: 0.8,
        stagger: 0.1, ease: 'power3.out', delay: 0.9,
      });

      /* Hero entrance for the mockup (one-time slide-up, no scroll parallax) */
      gsap.from('.flx-hero-mockup', {
        y: 40, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.6,
      });

      /* Analytics is now driven by <LiveAnalytics />, which animates itself
         on autoplay (live feed, smooth counters, sparkline pulse). No GSAP
         needed for that section. */

      /* Marquee scrub — speeds with scroll velocity */
      const marqueeTl = gsap.to(marqueeTrackRef.current, {
        xPercent: -50, duration: 22, ease: 'none', repeat: -1,
      });
      ScrollTrigger.create({
        trigger: marqueeRef.current,
        start: 'top bottom', end: 'bottom top',
        onUpdate: (st) => {
          const v = Math.min(3, 1 + Math.abs(st.getVelocity()) / 800);
          gsap.to(marqueeTl, { timeScale: v, duration: 0.4, overwrite: true });
        },
      });
      /* Envelope above the marquee tilts with scroll */
      gsap.to(envelopeRef.current, {
        rotate: 12, yPercent: -20,
        scrollTrigger: { trigger: marqueeRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 },
      });

      /* Feature cards — staircase entrance */
      const cards = featureRowRef.current.querySelectorAll('.flx-feature-card');
      gsap.from(cards, {
        y: 60, opacity: 0, duration: 1, ease: 'power3.out',
        stagger: { each: 0.12, from: 'start' },
        scrollTrigger: { trigger: featureRowRef.current, start: 'top 75%' },
      });

      /* Manifesto — word-by-word reveal scrubbed by scroll */
      const manifestoWords = manifestoRef.current.querySelectorAll('.flx-mf-word');
      gsap.from(manifestoWords, {
        opacity: 0.15, y: 8, duration: 0.4, stagger: 0.04,
        scrollTrigger: {
          trigger: manifestoRef.current, start: 'top 80%', end: 'bottom 50%',
          scrub: 0.6,
        },
      });

      /* Stats rows — reveal + count up + sticker bounce */
      statsRef.current.querySelectorAll('.flx-stat-row').forEach((row) => {
        const numEl = row.querySelector('.flx-count');
        const sticker = row.querySelector('.flx-sticker');
        const target = parseInt(numEl.dataset.target, 10);
        const prefix = numEl.dataset.prefix || '';
        const suffix = numEl.dataset.suffix || '';

        const obj = { v: 0 };
        gsap.timeline({
          scrollTrigger: { trigger: row, start: 'top 75%', once: true },
        })
          .from(row.querySelector('.flx-stat-thumb'), { scale: 0.92, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0)
          .from(sticker, { y: -10, scale: 0.7, opacity: 0, rotate: -20, duration: 0.6, ease: 'back.out(1.8)' }, 0.2)
          .to(obj, {
            v: target, duration: 1.6, ease: 'power3.out',
            onUpdate: () => { numEl.textContent = `${prefix}${Math.round(obj.v)}${suffix}`; },
          }, 0.1)
          .from(row.querySelector('.flx-stat-copy'), { y: 16, opacity: 0, duration: 0.6 }, 0.4);
      });

      /* Testimonials — bento stagger fade */
      gsap.from(testimonialsRef.current.querySelectorAll('article'), {
        y: 28, opacity: 0, duration: 0.7, stagger: 0.08,
        scrollTrigger: { trigger: testimonialsRef.current, start: 'top 70%' },
      });

      /* FAQ — slide in from left */
      gsap.from(faqRef.current.querySelectorAll('details'), {
        x: -16, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out',
        scrollTrigger: { trigger: faqRef.current, start: 'top 75%' },
      });

      /* Final CTA — card scales up, illustration spins gently with scroll */
      gsap.from(ctaRef.current, {
        scale: 0.96, opacity: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: ctaRef.current, start: 'top 80%' },
      });
      gsap.to(ctaRef.current.querySelector('.flx-cta-art'), {
        rotate: 12,
        scrollTrigger: { trigger: ctaRef.current, start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    }, rootRef);

    return () => ctx.revert();
  }, { scope: rootRef });

  /* Word-split helper for hero headline */
  const heroWords = 'Documents that write themselves.'.split(' ');

  /* Word-split helper for manifesto */
  const manifestoWords = "Flux's Intelligent Models Turn Ideas into Polished Documents and Decks in Real Time.".split(' ');

  return (
    <div ref={rootRef} className="wollo min-h-screen">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-5 py-5">
        <div className="flx-frame">

          {/* ============== STICKY NAV ============== */}
          <header className="flx-nav-shell sticky top-0 z-50">
            <div className="px-5 sm:px-8 lg:px-10 pt-5 pb-4">
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="flx-nav-mark flx-wordmark text-[26px] flx-nav-text">
                  flux<span className="flx-smile" aria-hidden="true"></span>
                </Link>
                <nav className="hidden md:block">
                  <ul className="flx-nav-pill flx-pill px-2 py-1.5 flex items-center gap-1 text-[14px]">
                    <li><a className="flx-nav-text px-4 py-2 rounded-full hover:bg-black/5 transition" href="#features">Features</a></li>
                    <li><a className="flx-nav-text px-4 py-2 rounded-full hover:bg-black/5 transition" href="#integrations">Integrations</a></li>
                    <li><a className="flx-nav-text px-4 py-2 rounded-full hover:bg-black/5 transition" href="#pricing">Pricing</a></li>
                    <li><a className="flx-nav-text px-4 py-2 rounded-full hover:bg-black/5 transition" href="#about">About us</a></li>
                    <li><a className="flx-nav-text px-4 py-2 rounded-full hover:bg-black/5 transition" href="#contact">Contact</a></li>
                  </ul>
                </nav>
                <div className="flex items-center gap-3">
                  <Link to="/login" className="flx-nav-login flx-nav-text hidden sm:inline-block text-[14px] px-2">Log in</Link>
                  <Link to="/login" className="flx-nav-cta flx-btn flx-btn-ink">Start Free Trial</Link>
                </div>
              </div>
            </div>
          </header>

          {/* ============== HERO (Linear/Vercel-style product UI) ============== */}
          <section ref={heroRef} className="relative px-5 sm:px-8 lg:px-12 pt-10 sm:pt-16 pb-0">
            {/* Soft brand-colored mesh gradient backdrop — extends below
                the section so it bleeds into the analytics area, removing
                the hard seam between sections. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -z-10"
              style={{
                inset: '0 0 -240px 0',
                background:
                  'radial-gradient(60% 50% at 20% 0%, rgba(91,61,245,0.18) 0%, transparent 60%),' +
                  'radial-gradient(50% 40% at 90% 10%, rgba(255,63,164,0.15) 0%, transparent 60%),' +
                  'radial-gradient(70% 60% at 50% 100%, rgba(255,217,61,0.12) 0%, transparent 60%)',
              }}
            />

            {/* Eyebrow */}
            <div className="flex justify-center mb-5">
              <div
                className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(91,61,245,0.08)', color: 'var(--w-violet)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--w-violet)' }} />
                AI document &amp; presentation generation
              </div>
            </div>

            {/* Headline */}
            <h1
              ref={heroH1Ref}
              className="text-center flx-tighter font-medium text-[44px] sm:text-[72px] lg:text-[88px] flx-mask max-w-5xl mx-auto"
            >
              {heroWords.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.25em]">
                  <span className="flx-word inline-block">{w}</span>
                </span>
              ))}
            </h1>

            {/* Subhead */}
            <p className="mt-6 text-center text-[17px] sm:text-[19px] max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(14,14,16,0.65)' }}>
              Flux turns a sentence into a polished Word doc or PowerPoint deck — drafted, formatted, and ready to ship.
            </p>

            {/* CTAs */}
            <div ref={heroCtasRef} className="relative z-10 mt-8 flex flex-wrap gap-3 justify-center">
              <Link to="/login" className="flx-btn flx-btn-violet">Start free</Link>
              <Link to="/login" className="flx-btn flx-btn-outline">Watch a 60-sec demo</Link>
            </div>

            {/* Animated product mockup */}
            <div className="flx-hero-mockup relative z-10 mt-12 sm:mt-14" style={{ willChange: 'transform' }}>
              <HeroMockup />
            </div>
          </section>

          {/* ============== ANALYTICS (pinned, scrubbed) ============== */}
          <section ref={analyticsRef} id="features" className="relative px-5 sm:px-8 lg:px-12 pt-32 sm:pt-40 pb-12 -mt-24 sm:-mt-32">
            <h2 className="text-center flx-tighter font-medium text-[40px] sm:text-[64px] lg:text-[80px]">
              Smarter Drafting<br />and Insights
            </h2>

            <div className="mt-12">
              <LiveAnalytics />
            </div>
          </section>

          {/* ============== INTEGRATIONS MARQUEE ============== */}
          <section ref={marqueeRef} id="integrations" className="pt-28 sm:pt-36 pb-16">
            <div className="relative">
              <div ref={envelopeRef} className="absolute z-10 left-1/2 -translate-x-1/2 -top-12">
                <div className="flx-ill-shadow relative">
                  <div style={{ width: 120, height: 80, background: '#5B3DF5', borderRadius: 8 }} />
                  <div style={{ position: 'absolute', right: -6, top: -22 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#FFD93D' }} />
                  </div>
                </div>
              </div>
              <div className="flx-marquee">
                <div ref={marqueeTrackRef} className="flx-marquee-track flx-tighter font-medium text-[120px] sm:text-[180px] lg:text-[200px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className="px-6 relative">
                      {i === 0 || i === 3 ? (
                        <span className="absolute left-4 right-12 rounded-2xl -z-10" style={{ top: '32%', height: '46%', background: 'var(--w-yellow)' }} />
                      ) : null}
                      Integrations
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ============== THREE FEATURE CARDS ============== */}
          <section ref={featureRowRef} className="px-5 sm:px-8 lg:px-12 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {[
                { color: 'var(--w-orange)', n: '01', tag: 'Smart Drafting', title: <>Draft Polished<br />Docs in Minutes</>, raise: true },
                { color: 'var(--w-pink)', n: '02', tag: 'AI Structure', title: <>Plan, Generate,<br />and Refine</>, raise: false },
                { color: 'var(--w-violet)', n: '03', tag: 'One-Click Export', title: <>Export Beautifully<br />to .docx and .pptx</>, raise: true },
              ].map((c) => (
                <div key={c.n} className={`flx-feature-card flx-lift bg-white rounded-3xl p-2.5 ${c.raise ? 'md:translate-y-6' : ''}`}>
                  <div className="px-5 pt-5 pb-6">
                    <p className="text-[18px] sm:text-[20px] flx-tight font-medium leading-tight">{c.title}</p>
                  </div>
                  <div className="flx-grain rounded-2xl relative overflow-hidden p-6 pb-7" style={{ background: c.color, minHeight: 240 }}>
                    <div className="flex items-start justify-between">
                      <div className="flx-num text-white text-[64px] flx-tight font-medium leading-none">{c.n}</div>
                      <span className="flx-sticker" style={{ background: '#fff', color: 'var(--w-ink)' }}>{c.tag}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ============== MANIFESTO ============== */}
          <section ref={manifestoRef} className="px-5 sm:px-8 lg:px-12 py-20 sm:py-28">
            <p className="text-center flx-tighter font-medium text-[36px] sm:text-[56px] lg:text-[80px]">
              {manifestoWords.map((w, i) => (
                <span key={i} className="flx-mf-word inline-block mr-[0.25em]">{w}</span>
              ))}
            </p>
          </section>

          {/* ============== STATS ROWS ============== */}
          <section ref={statsRef} className="px-5 sm:px-8 lg:px-12 pb-20">
            {[
              { color: 'var(--w-violet)', badge: 'var(--w-orange)', badgeText: 'Users', target: 270, prefix: '+', suffix: 'K', copy: "Flux's intelligent models analyze your input in real time, offering structure, insights, and tone calibration tailored to your audience.", art: 'constellation' },
              { color: '#D9D2FF', badge: 'var(--w-pink)', badgeText: 'Faster Drafts', target: 8, prefix: '', suffix: 'X', copy: "Track and analyze the impact of every draft in real time — pinpoint which structures land, refine your approach, and ship documents your readers actually finish.", art: 'bars' },
              { color: 'var(--w-violet)', badge: 'var(--w-violet)', badgeText: 'Saved Weekly', target: 40, prefix: '+', suffix: 'h', copy: 'Effortlessly save hours each week with automated structure planning, AI-assisted refinement, and one-click export — so you ship more and edit less.', art: 'clock' },
            ].map((row, i) => (
              <div key={i} className="flx-stat-row border-t py-10 grid grid-cols-1 md:[grid-template-columns:200px_minmax(0,1fr)_minmax(0,1fr)] gap-8 items-center" style={{ borderColor: 'rgba(14,14,16,0.1)' }}>
                <div className="flx-stat-thumb flx-grain rounded-2xl overflow-hidden relative" style={{ background: row.color, width: 180, height: 180 }}>
                  <StatArt kind={row.art} />
                </div>
                <div className="relative">
                  <span className="flx-sticker absolute -top-2 -left-2 z-10" style={{ background: row.badge, color: '#fff' }}>{row.badgeText}</span>
                  <div className="flx-count flx-num text-[88px] sm:text-[120px] lg:text-[160px] flx-tight font-light leading-none"
                    data-target={row.target} data-prefix={row.prefix} data-suffix={row.suffix}>
                    {row.prefix}0{row.suffix}
                  </div>
                </div>
                <p className="flx-stat-copy leading-relaxed" style={{ color: 'rgba(14,14,16,0.7)' }}>{row.copy}</p>
              </div>
            ))}
          </section>

          {/* ============== TESTIMONIALS ============== */}
          <section ref={testimonialsRef} className="px-5 sm:px-8 lg:px-12 py-20" style={{ background: 'var(--w-surface)' }}>
            <div className="text-[12px] tracking-[0.2em] uppercase" style={{ color: 'rgba(14,14,16,0.6)' }}>Testimonials</div>
            <h3 className="mt-3 flx-tighter font-medium text-[40px] sm:text-[56px] lg:text-[64px]">What People Say</h3>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t) => (
                <article key={t.name} className="bg-white rounded-2xl p-6 flx-lift">
                  <div className="text-[44px] leading-none font-serif" style={{ color: 'var(--w-violet)' }}>“</div>
                  <p className="mt-2 leading-relaxed" style={{ color: 'rgba(14,14,16,0.8)' }}>{t.quote}</p>
                  <div className="mt-6">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm" style={{ color: 'rgba(14,14,16,0.55)' }}>{t.title}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ============== FAQ ============== */}
          <section ref={faqRef} id="pricing" className="px-5 sm:px-8 lg:px-12 py-24">
            <h3 className="text-center flx-tighter font-medium text-[40px] sm:text-[56px] lg:text-[80px]">
              Frequently Asked<br />Questions
            </h3>
            <div className="max-w-3xl mx-auto mt-12">
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0} className={`py-5 border-t ${i === FAQS.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'rgba(14,14,16,0.1)' }}>
                  <summary className="flex items-center justify-between gap-6 text-[18px] sm:text-[20px] font-medium">
                    {f.q}
                    <span className="flx-chev shrink-0">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#0E0E10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                  </summary>
                  <p className="mt-4 leading-relaxed" style={{ color: 'rgba(14,14,16,0.7)' }}>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ============== FINAL CTA ============== */}
          <section id="about" className="px-5 sm:px-8 lg:px-12 pb-16">
            <div ref={ctaRef} className="flx-grain rounded-[28px] overflow-hidden relative grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 sm:p-12 lg:p-16" style={{ background: 'var(--w-periwinkle)' }}>
              <div>
                <h3 className="text-white flx-tighter font-medium text-[40px] sm:text-[56px] lg:text-[72px]">
                  Ship More Docs.<br />Spend Less Time<br />Drafting.
                </h3>
                <Link to="/login" className="flx-btn flx-btn-outline-white mt-8 inline-flex">Start Free Trial</Link>
              </div>
              <div className="relative min-h-[260px] flx-cta-art">
                <div className="absolute inset-0 grid place-items-center">
                  <svg viewBox="0 0 400 320" className="w-full h-full flx-ill-shadow">
                    <ellipse cx="200" cy="220" rx="160" ry="40" fill="#5B3DF5" />
                    <ellipse cx="200" cy="200" rx="130" ry="30" fill="#7A66FF" />
                    <ellipse cx="200" cy="180" rx="100" ry="22" fill="#5B3DF5" />
                    <ellipse cx="200" cy="160" rx="70" ry="16" fill="#7A66FF" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* ============== FOOTER ============== */}
          <footer id="contact" className="px-5 sm:px-8 lg:px-12 pb-10">
            <div className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6" style={{ background: 'var(--w-surface)' }}>
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]" style={{ color: 'rgba(14,14,16,0.75)' }}>
                <li><a href="#features" className="hover:text-black">Features</a></li>
                <li><a href="#integrations" className="hover:text-black">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-black">Pricing</a></li>
                <li><a href="#about" className="hover:text-black">About us</a></li>
                <li><a href="#contact" className="hover:text-black">Contact</a></li>
              </ul>
            </div>
            <p className="text-center text-[12px] mt-5" style={{ color: 'rgba(14,14,16,0.45)' }}>© 2026 Flux. All rights reserved.</p>
          </footer>

        </div>
      </div>
    </div>
  );
}