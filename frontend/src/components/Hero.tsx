import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Scale, ArrowRight, Zap } from 'lucide-react';
import QuantumCanvas from './QuantumCanvas';

/* ─────────────────────────────────────────────────────────
   Framer Motion entrance variants
───────────────────────────────────────────────────────── */
const container = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } },
};
const item = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

/* ─────────────────────────────────────────────────────────
   Hero
───────────────────────────────────────────────────────── */
const Hero: React.FC = () => {
  const noMotion = useReducedMotion();

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: '#050507', minHeight: 'clamp(600px, 90vh, 860px)' }}
      aria-label="Hero — Mugen AI Bias Auditor"
    >
      {/* Shared particle canvas */}
      <QuantumCanvas />

      {/* Edge vignette — keeps canvas nodes from looking cut-off */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, #050507 100%)',
        }}
        aria-hidden="true"
      />

      {/* Hero content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-24 max-w-5xl mx-auto"
        style={{ minHeight: 'clamp(600px, 90vh, 860px)' }}
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Compliance badge */}
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase mb-12">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            EU AI Act · EEOC · ECOA Compliant
          </span>
        </motion.div>

        {/* H1 — mixed contrast + inline icons */}
        <motion.h1
          variants={item}
          className="font-display font-extrabold tracking-tight leading-none mb-7 select-none"
          style={{ fontSize: 'clamp(2.75rem, 8vw, 6.5rem)' }}
        >
          {/* Row 1 */}
          <span className="flex flex-wrap justify-center items-baseline gap-x-4 gap-y-1 mb-2">
            <span className="text-slate-500">The future of AI is</span>
          </span>

          {/* Row 2 — white keywords + icons */}
          <span className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2">
            <span className="text-white">Fair</span>

            {/* Inline icons — sized relative to the heading */}
            <span
              className="inline-flex items-center gap-2"
              aria-label="ShieldCheck and Scale icons"
              style={{ fontSize: 0 }}
            >
              <ShieldCheck
                className="text-emerald-400"
                strokeWidth={1.6}
                style={{
                  width:  'clamp(1.75rem, 4.2vw, 3.75rem)',
                  height: 'clamp(1.75rem, 4.2vw, 3.75rem)',
                }}
              />
              <Scale
                className="text-emerald-400"
                strokeWidth={1.6}
                style={{
                  width:  'clamp(1.75rem, 4.2vw, 3.75rem)',
                  height: 'clamp(1.75rem, 4.2vw, 3.75rem)',
                }}
              />
            </span>

            <span className="text-white">Compliant.</span>
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          variants={item}
          className="text-base md:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed mb-11"
        >
          Detect bias, mitigate risk, and generate EU AI Act compliance reports in under&nbsp;5&nbsp;minutes.
          Upload your tabular model to begin.
        </motion.p>

        {/* CTA row */}
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {/* Primary — solid white, black text (VEX style) */}
          <Link
            to="/"
            id="hero-cta-launch"
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg text-sm font-bold text-black bg-white
                       hover:bg-white/90 hover:scale-[1.02]
                       transition-all duration-200
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Zap className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12 shrink-0" />
            Launch Audit
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
          </Link>

          {/* Secondary — ghost */}
          <Link
            to="/how-it-works"
            id="hero-cta-how"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold text-slate-300
                       border border-white/[0.12] bg-transparent
                       hover:bg-white/[0.06] hover:border-white/25 hover:text-white
                       transition-all duration-200
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30"
          >
            See how it works
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
