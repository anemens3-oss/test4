import React from 'react';
import { SITE_CONFIG } from '../config/siteConfig';
import { ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#06070a] border-t border-[#1e222b] py-12 px-4 sm:px-6 lg:px-8 text-[#8e939e] text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="font-display font-bold text-lg text-[#f5f5f3] tracking-[0.08em] uppercase">
            {SITE_CONFIG.brandName}
          </span>
          <span className="hidden sm:inline text-[#343a46]">·</span>
          <span>{SITE_CONFIG.tagline}</span>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <a href="#expertise" className="hover:text-[#f5f5f3] transition-colors">
            01 Компетенции
          </a>
          <a href="#workshop" className="hover:text-[#f5f5f3] transition-colors">
            02 Техцентр
          </a>
          <a href="#process" className="hover:text-[#f5f5f3] transition-colors">
            03 Процесс
          </a>
          <a href="#contact" className="hover:text-[#f5f5f3] transition-colors">
            04 Контакты
          </a>

          <button
            onClick={scrollToTop}
            className="p-2 bg-[#101217] hover:bg-[#171b24] text-[#d1d5db] hover:text-white border border-[#1e222b] transition-colors cursor-pointer"
            aria-label="Наверх страницы"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-[#14171f] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-[#6b7280]">
        <div>
          © {new Date().getFullYear()} {SITE_CONFIG.brandName}. Инженерный сервис и обслуживание автомобилей.
        </div>
        <div className="font-mono">
          3D Asset: &ldquo;Dodge Challenger&rdquo; by OneSteven (Sketchfab · CC BY-NC 4.0)
        </div>
      </div>
    </footer>
  );
};
