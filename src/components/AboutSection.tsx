import React from 'react';
import { SITE_CONFIG } from '../config/siteConfig';

export const AboutSection: React.FC = () => {
  return (
    <section
      id="workshop"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08090c] border-t border-[#1e222b]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 mb-14 border-b border-[#1e222b] items-end">
          <div className="lg:col-span-7">
            <div className="text-xs font-mono text-[#e04f26] uppercase tracking-widest mb-3 tabular-nums">
              02 · Workshop — Оснащение и рабочая среда
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-[#f5f5f3] leading-[0.98]">
              {SITE_CONFIG.workshop.heading}
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm sm:text-base text-[#9ca3af] leading-relaxed">
              {SITE_CONFIG.workshop.subheading}
            </p>
          </div>
        </div>

        {/* 3 Specialized Workshop Bays */}
        <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[#1e222b] mb-14">
          {SITE_CONFIG.workshop.zones.map((zone, idx) => (
            <div
              key={zone.code}
              className="bg-[#0a0c10] border-r border-b border-[#1e222b] p-6 sm:p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#e04f26] mb-5 tabular-nums">
                  <span>{zone.code}</span>
                  <span className="text-[#6b7280]">СЕКТОР 0{idx + 1}</span>
                </div>

                {/* Architectural Bay Elevation Graphic */}
                <div className="mb-6 border border-[#1e222b] bg-[#08090c] p-4">
                  {idx === 0 && (
                    <svg viewBox="0 0 320 130" fill="none" className="w-full h-28">
                      <line x1="0" y1="115" x2="320" y2="115" stroke="#262b36" strokeWidth="1.5" />
                      <rect x="24" y="26" width="120" height="89" stroke="#343a46" strokeWidth="1.2" fill="#0d1017" />
                      <path d="M36 68 L54 68 L62 44 L72 88 L82 68 L130 68" stroke="#e04f26" strokeWidth="1.6" />
                      <rect x="168" y="42" width="124" height="73" stroke="#262b36" strokeWidth="1.2" fill="#0d1017" />
                      <text x="36" y="42" fill="#8e939e" fontSize="8" fontFamily="JetBrains Mono">OSC · 250 MS/s</text>
                      <text x="180" y="64" fill="#d1d5db" fontSize="8" fontFamily="JetBrains Mono">PSU 14.4V · 100A</text>
                      <text x="180" y="82" fill="#6b7280" fontSize="8" fontFamily="JetBrains Mono">CAN / LIN GATEWAY</text>
                    </svg>
                  )}
                  {idx === 1 && (
                    <svg viewBox="0 0 320 130" fill="none" className="w-full h-28">
                      <line x1="0" y1="115" x2="320" y2="115" stroke="#262b36" strokeWidth="1.5" />
                      <rect x="30" y="48" width="140" height="67" stroke="#343a46" strokeWidth="1.2" fill="#0d1017" />
                      <line x1="30" y1="74" x2="170" y2="74" stroke="#262b36" strokeWidth="1" />
                      <circle cx="240" cy="68" r="28" stroke="#e04f26" strokeWidth="1.5" fill="#0d1017" />
                      <path d="M240 96 V115 M218 115 H262" stroke="#9ca3af" strokeWidth="1.5" />
                      <text x="42" y="64" fill="#d1d5db" fontSize="8" fontFamily="JetBrains Mono">STAHLWILLE TORQUE</text>
                      <text x="42" y="96" fill="#8e939e" fontSize="8" fontFamily="JetBrains Mono">TOLERANCE ±0.001 mm</text>
                    </svg>
                  )}
                  {idx === 2 && (
                    <svg viewBox="0 0 320 130" fill="none" className="w-full h-28">
                      <line x1="0" y1="115" x2="320" y2="115" stroke="#262b36" strokeWidth="1.5" />
                      <rect x="44" y="18" width="14" height="97" stroke="#9ca3af" strokeWidth="1.2" fill="#10131a" />
                      <rect x="262" y="18" width="14" height="97" stroke="#9ca3af" strokeWidth="1.2" fill="#10131a" />
                      <line x1="58" y1="72" x2="262" y2="72" stroke="#e04f26" strokeWidth="2" />
                      <rect x="92" y="44" width="136" height="26" stroke="#d1d5db" strokeWidth="1.2" fill="#0d1017" />
                      <text x="108" y="60" fill="#8e939e" fontSize="8" fontFamily="JetBrains Mono">HUNTER 3D HAWKEYE</text>
                    </svg>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-display font-bold uppercase text-[#f5f5f3] mb-3">
                  {zone.title}
                </h3>

                <p className="text-sm text-[#9ca3af] leading-relaxed mb-6">
                  {zone.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#1e222b] text-xs font-mono text-[#d1d5db] tabular-nums">
                {zone.equipmentList}
              </div>
            </div>
          ))}
        </div>

        {/* 4 Concrete Service Standards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-[#1e222b]">
          {SITE_CONFIG.workshop.standards.map((std, i) => (
            <div
              key={std.title}
              className="p-6 bg-[#090b0f] border-r border-b border-[#1e222b]"
            >
              <div className="text-xs font-mono text-[#6b7280] mb-3 tabular-nums">
                СТАНДАРТ 0{i + 1}
              </div>
              <h4 className="text-lg font-display font-bold uppercase text-[#f5f5f3] mb-2">
                {std.title}
              </h4>
              <p className="text-xs sm:text-sm text-[#9ca3af] leading-relaxed">
                {std.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
