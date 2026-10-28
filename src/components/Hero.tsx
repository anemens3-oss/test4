import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createCarScene, CarSceneController } from '../three/carScene';
import { PAINT_PRESETS, PaintPresetId } from '../three/carModel';
import { SITE_CONFIG } from '../config/siteConfig';
import { ArrowDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const Hero: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<CarSceneController | null>(null);

  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeStage, setActiveStage] = useState<number>(1);
  // Default to crimson ('Заводской ярко-красный') so the Challenger immediately has rich, saturated paint
  const [activePaint, setActivePaint] = useState<PaintPresetId>('crimson');

  // 1. Mount single WebGL context & handle resize / reduced-motion / pointer parallax
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const controller = createCarScene();
    controllerRef.current = controller;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    controller.setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      controller.setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleMotionChange);

    controller.mount(canvasContainerRef.current, {
      onLoadProgress: (pct) => setLoadProgress(pct),
      onLoadComplete: () => {
        setLoadProgress(100);
        setIsLoaded(true);
      },
      onWebGLError: (reason) => {
        setWebglError(reason);
        setIsLoaded(true);
      },
    });

    const handleResize = () => {
      controller.resize();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      controller.setPointerNormalized(nx, ny);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      controller.unmount();
      controllerRef.current = null;
    };
  }, []);

  // 2. Bind 7-scene continuous GSAP ScrollTrigger choreography
  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.55,
        onUpdate: (self) => {
          const p = self.progress;
          setScrollProgress(p);
          controllerRef.current?.setProgress(p);

          if (p < 0.12) setActiveStage(1);
          else if (p < 0.28) setActiveStage(2);
          else if (p < 0.40) setActiveStage(3);
          else if (p < 0.55) setActiveStage(4);
          else if (p < 0.71) setActiveStage(5);
          else if (p < 0.85) setActiveStage(6);
          else setActiveStage(7);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleStageSelect = (targetStage: number) => {
    if (!sectionRef.current) return;
    const stageOffsets = [0.0, 0.20, 0.34, 0.47, 0.64, 0.78, 0.96];
    const targetProgress = stageOffsets[targetStage - 1] ?? 0;

    const rect = sectionRef.current.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const scrollableDistance = sectionRef.current.offsetHeight - window.innerHeight;

    window.scrollTo({
      top: sectionTop + scrollableDistance * targetProgress,
      behavior: 'smooth',
    });
  };

  const handlePaintSelect = (presetId: PaintPresetId) => {
    setActivePaint(presetId);
    controllerRef.current?.setPaintPreset(presetId);
  };

  const currentStageData =
    SITE_CONFIG.scrollStages.find((s) => s.stage === activeStage) ||
    SITE_CONFIG.scrollStages[0];

  // Smoothly dissolve Prologue title as the car starts rolling forward in Scene 02
  const prologueOpacity = Math.max(0, 1 - scrollProgress / 0.10);
  const prologueShiftY = Math.min(36, (scrollProgress / 0.10) * 36);
  const showPrologueOverlay = scrollProgress < 0.11;

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative h-[680vh] bg-[#08090c] text-[#f5f5f3]"
    >
      {/* Sticky Full-Viewport 3D Studio Stage */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden studio-vignette flex flex-col justify-between">
        {/* WebGL Canvas Mount */}
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        />

        {/* Static Studio Fallback if WebGL Context Fails */}
        {webglError && (
          <div className="absolute inset-0 z-0 flex items-center justify-center p-6 bg-[#08090c]">
            <div className="max-w-xl w-full border border-[#1e222b] bg-[#101217] p-8 text-left">
              <div className="text-xs font-mono text-[#e04f26] uppercase tracking-widest mb-2">
                {SITE_CONFIG.hero.vehicleBadge}
              </div>
              <div className="text-2xl font-display font-bold uppercase text-white mb-3">
                Аппаратное ускорение 3D недоступно в вашем браузере
              </div>
              <p className="text-sm text-[#9ca3af] leading-relaxed">
                Интерактивная 3D-сцена отключена, однако все разделы компетенций, оснащения цеха и прямых контактов доступны ниже.
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay while GLB initializes */}
        {!isLoaded && (
          <div className="absolute inset-0 z-30 bg-[#08090c] flex flex-col items-center justify-center px-6 transition-opacity duration-500">
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs font-mono text-[#8e939e] mb-2 tabular-nums">
                <span>DODGE CHALLENGER SRT HELLCAT</span>
                <span>{loadProgress}%</span>
              </div>
              <div className="w-full h-[2px] bg-[#1e222b] overflow-hidden">
                <div
                  className="h-full bg-[#e04f26] transition-all duration-200"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* UI OVERLAY LAYER — Keeps center viewport open for the Challenger & V8 Engine */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-22 flex-1 flex flex-col justify-between pb-4 sm:pb-6 pointer-events-none">
          {/* Top Sub-bar: Vehicle Identification & Continuous Scene Progress */}
          <div>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2.5 text-[11px] sm:text-xs font-mono text-[#9ca3af] tabular-nums">
              <span className="truncate">{SITE_CONFIG.hero.vehicleBadge}</span>
              <span className="shrink-0 text-[#f5f5f3]">
                {currentStageData.indexLabel} · {currentStageData.code}
              </span>
            </div>
            {/* Ultra-thin continuous scroll progress line */}
            <div className="w-full h-[1px] bg-white/5 overflow-hidden">
              <div
                className="h-full bg-[#e04f26] transition-transform duration-75 origin-left"
                style={{ transform: `scaleX(${scrollProgress})` }}
              />
            </div>

            {/* SCENE 01 — PROLOGUE MINIMAL HEADER (Dissolves cleanly as car drives forward) */}
            {showPrologueOverlay && (
              <div
                className="pt-5 sm:pt-8 max-w-2xl"
                style={{
                  opacity: prologueOpacity,
                  transform: `translateY(-${prologueShiftY}px)`,
                }}
              >
                <div className="text-[11px] font-mono text-[#e04f26] uppercase tracking-[0.2em] mb-2">
                  {SITE_CONFIG.tagline}
                </div>
                <h1
                  className="font-display font-extrabold uppercase tracking-tight text-[#f5f5f3] leading-[0.90] mb-3"
                  style={{ fontSize: 'clamp(2.35rem, 6vw, 5.25rem)' }}
                >
                  {SITE_CONFIG.hero.headline}
                </h1>
                <p className="text-xs sm:text-sm text-[#9ca3af] max-w-lg leading-relaxed">
                  {SITE_CONFIG.hero.russianSubtitle}
                </p>
              </div>
            )}
          </div>

          {/* LOWER / SIDE NARRATIVE HUD FOR SCENES 02–07 (Never blocks center 3D model on mobile or desktop) */}
          <div className="mt-auto mb-3 sm:mb-5">
            {showPrologueOverlay ? (
              <div
                className="inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.22em] text-[#f5f5f3]"
                style={{ opacity: prologueOpacity }}
              >
                <span className="w-2 h-2 bg-[#e04f26]" />
                <span>{SITE_CONFIG.hero.scrollPrompt}</span>
                <ArrowDown className="w-3.5 h-3.5 text-[#e04f26] animate-bounce" />
              </div>
            ) : (
              <div
                className={`w-full flex ${
                  currentStageData.align === 'right' ? 'md:justify-end' : 'md:justify-start'
                }`}
              >
                <div className="max-w-md w-full bg-[#090b10]/88 border border-[#222733] p-4 sm:p-6 pointer-events-auto">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#e04f26] uppercase tracking-wider mb-1.5 tabular-nums">
                    <span>{currentStageData.kicker}</span>
                    <span>{currentStageData.indexLabel}</span>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-display font-bold uppercase text-[#f5f5f3] tracking-tight leading-tight mb-2">
                    {currentStageData.title}
                  </h2>

                  <p className="text-xs text-[#9ca3af] leading-relaxed mb-3.5">
                    {currentStageData.description}
                  </p>

                  <div className="pt-3 border-t border-[#1e222b] flex items-center justify-between gap-4 text-[11px] font-mono tabular-nums">
                    <span className="text-[#6b7280]">{currentStageData.metricLabel}</span>
                    <span className="text-[#f5f5f3] font-medium">
                      {currentStageData.metricValue}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Studio Control Bar: 7-Scene Timeline & 3-Color Body Paint Switcher */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-auto">
            {/* 7-Scene Direct Selector */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-mono text-[#8e939e] uppercase mr-1.5">
                Сцена:
              </span>
              {SITE_CONFIG.scrollStages.map((st) => {
                const isCurrent = activeStage === st.stage;
                return (
                  <button
                    key={st.stage}
                    onClick={() => handleStageSelect(st.stage)}
                    className={`px-2 sm:px-2.5 py-1 text-[11px] font-mono tabular-nums border transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#e04f26] border-[#e04f26] text-white font-semibold'
                        : 'bg-[#101217]/90 border-[#1e222b] text-[#9ca3af] hover:text-white hover:border-[#343a46]'
                    }`}
                    title={`${st.indexLabel} · ${st.title}`}
                  >
                    0{st.stage}
                  </button>
                );
              })}
            </div>

            {/* 3-Color Body Paint Selector (Factory Bright Red, Deep Graphite, Rich Black) */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-mono text-[#8e939e] uppercase">
                  Цвет кузова:
                </span>
                <div className="flex items-center gap-1.5">
                  {PAINT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePaintSelect(preset.id)}
                      className={`w-5 h-5 border transition-transform cursor-pointer ${
                        activePaint === preset.id
                          ? 'border-white scale-110'
                          : 'border-white/30 hover:border-white/70'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                      aria-label={`Цвет кузова ${preset.name}`}
                    />
                  ))}
                </div>
              </div>

              <a
                href="#expertise"
                className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-mono text-[#9ca3af] hover:text-white transition-colors uppercase tracking-wider"
              >
                <span>К разделам сайта</span>
                <ArrowDown className="w-3.5 h-3.5 text-[#e04f26]" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
