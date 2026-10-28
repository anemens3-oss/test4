import React from 'react';
import { SITE_CONFIG, ServiceItem } from '../config/siteConfig';
import {
  DiagnosticsSchematic,
  EngineSchematic,
  BrakesSchematic,
  MaintenanceSchematic,
} from '../three/svgDrawings';

export const ServicesSection: React.FC = () => {
  const renderGraphic = (category: ServiceItem['category']) => {
    switch (category) {
      case 'diagnostics':
        return <DiagnosticsSchematic className="w-full h-44 object-cover" />;
      case 'maintenance':
        return <MaintenanceSchematic className="w-full h-44 object-cover" />;
      case 'brakes':
        return <BrakesSchematic className="w-full h-44 object-cover" />;
      case 'engine':
        return <EngineSchematic className="w-full h-44 object-cover" />;
      default:
        return <DiagnosticsSchematic className="w-full h-44 object-cover" />;
    }
  };

  return (
    <section
      id="expertise"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08090c] border-t border-[#1e222b]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Editorial Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 mb-14 border-b border-[#1e222b] items-end">
          <div className="lg:col-span-7">
            <div className="text-xs font-mono text-[#e04f26] uppercase tracking-widest mb-3 tabular-nums">
              01 · Expertise — Направления работы
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-[#f5f5f3] leading-[0.98]">
              Четыре ключевых направления технического обслуживания
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm sm:text-base text-[#9ca3af] leading-relaxed">
              Каждая процедура выполняется по заводским технологическим картам с инструментальным контролем допусков — от четырёхканальной осциллографии фаз ГРМ до замера биения тормозных роторов.
            </p>
          </div>
        </div>

        {/* 4 Core Expertise Areas in a 2x2 Architectural Hairline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[#1e222b]">
          {SITE_CONFIG.services.map((item) => (
            <article
              key={item.id}
              className="bg-[#0a0c10] border-r border-b border-[#1e222b] p-6 sm:p-9 flex flex-col justify-between"
            >
              <div>
                {/* Top Index & Subtitle */}
                <div className="flex items-center justify-between gap-4 text-xs font-mono mb-6 tabular-nums">
                  <span className="text-[#e04f26] font-semibold">
                    {item.number} · {item.subtitle}
                  </span>
                  <span className="text-[#6b7280] shrink-0">{item.duration}</span>
                </div>

                {/* Technical Diagram */}
                <div className="mb-6 border border-[#1e222b] overflow-hidden bg-[#0b0d12]">
                  {renderGraphic(item.category)}
                </div>

                {/* Title & Concrete Description */}
                <h3 className="text-2xl sm:text-3xl font-display font-bold uppercase text-[#f5f5f3] mb-3">
                  {item.title}
                </h3>

                <p className="text-sm text-[#9ca3af] leading-relaxed mb-6">
                  {item.shortDesc}
                </p>

                {/* Applied Equipment List */}
                <ul className="space-y-2 mb-6 text-xs text-[#d1d5db]">
                  {item.equipment.map((eq, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-[#e04f26] font-mono tabular-nums">
                        {item.number}.{idx + 1}
                      </span>
                      <span>{eq}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Concrete Metrology Spec Footer */}
              <div className="pt-5 border-t border-[#1e222b] flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                <span className="text-[#8e939e] uppercase">Метрология:</span>
                <span className="text-[#f5f5f3]">{item.tolerances}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
