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

  // 2. Single synchronized GSAP ScrollTrigger controlling the entire 3D sequence
  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.35,
        onUpdate: (self) => {
          const p = self.progress;
          setScrollProgress(p);
          controllerRef.current?.setProgress(p);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handlePaintSelect = (presetId: PaintPresetId) => {
    setActivePaint(presetId);
    controllerRef.current?.setPaintPreset(presetId);
  };

  // Priority 2: When scrolling begins, ALL text and UI elements smoothly fade out
  // so the white road scene, approaching car, grille flight, and engine disassembly have zero clutter.
  const initialUiOpacity = Math.max(0, 1 - scrollProgress / 0.045);
  const initialUiTranslateY = Math.min(28, (scrollProgress / 0.045) * 28);
  const isInitialUiInteractive = scrollProgress < 0.04;

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative h-[260vh] md:h-[380vh] bg-[#08090c] text-[#f5f5f3]"
    >
      {/* Sticky Full-Viewport 3D Stage */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col justify-between">
        {/* WebGL Canvas Mount */}
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        />

        {/* Static Studio Fallback if WebGL Context Fails */}
        {webglError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-[#08090c]">
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

        {/* INITIAL STUDIO OVERLAY (Dissolves completely at start of scroll) */}
        <div
          className={`relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-6 flex-1 flex flex-col justify-between transition-none ${
            isInitialUiInteractive ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
          style={{
            opacity: initialUiOpacity,
            transform: `translateY(-${initialUiTranslateY}px)`,
          }}
        >
          {/* Short Headline at Top-Left */}
          <div className="max-w-xl">
            <div className="text-[11px] font-mono text-[#e04f26] uppercase tracking-[0.2em] mb-2">
              {SITE_CONFIG.hero.vehicleBadge}
            </div>
            <h1
              className="font-display font-extrabold uppercase tracking-tight text-[#f5f5f3] leading-[0.90] mb-2.5"
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.75rem)' }}
            >
              {SITE_CONFIG.hero.headline}
            </h1>
            <p className="text-xs sm:text-sm text-[#9ca3af] max-w-md leading-relaxed">
              {SITE_CONFIG.hero.russianSubtitle}
            </p>
          </div>

          {/* Bottom Bar: Scroll Prompt & Discreet 3-Color Paint Switcher */}
          <div className="flex flex-row items-center justify-between gap-4 pt-3 border-t border-white/10">
            <div className="inline-flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.2em] text-[#f5f5f3]">
              <span className="w-2 h-2 bg-[#e04f26]" />
              <span>{SITE_CONFIG.hero.scrollPrompt}</span>
              <ArrowDown className="w-3.5 h-3.5 text-[#e04f26]" />
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] font-mono text-[#8e939e] uppercase">
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
          </div>
        </div>
      </div>
    </section>
  );
};
