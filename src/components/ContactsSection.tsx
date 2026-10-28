import React from 'react';
import { SITE_CONFIG } from '../config/siteConfig';
import { Phone } from 'lucide-react';

export const ContactsSection: React.FC = () => {
  return (
    <section
      id="contact"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#08090c] border-t border-[#1e222b]"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 mb-14 border-b border-[#1e222b] items-end">
          <div className="lg:col-span-7">
            <div className="text-xs font-mono text-[#e04f26] uppercase tracking-widest mb-3 tabular-nums">
              04 · Contact — Прямая связь
            </div>
            <h2 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-[#f5f5f3] leading-[0.98]">
              Контактные данные техцентра
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-sm sm:text-base text-[#9ca3af] leading-relaxed">
              Прямой телефон мастера-приёмщика и адрес автосервиса. Никаких форм обратной связи и ожиданий ответа.
            </p>
          </div>
        </div>

        {/* Minimal Architectural Contact Block: ONLY Phone (tel:), Address, and Working Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-l border-[#1e222b] bg-[#0a0c10]">
          {/* Phone Block */}
          <div className="lg:col-span-6 p-8 sm:p-12 border-r border-b border-[#1e222b] flex flex-col justify-between">
            <div>
              <div className="text-xs font-mono text-[#8e939e] uppercase tracking-wider mb-3">
                Телефон автосервиса
              </div>
              <a
                href={SITE_CONFIG.contacts.phoneHref}
                className="inline-block text-3xl sm:text-5xl font-display font-bold tracking-wider text-[#f5f5f3] hover:text-[#e04f26] transition-colors tabular-nums mb-6"
              >
                {SITE_CONFIG.contacts.phoneDisplay}
              </a>
            </div>

            <div>
              <a
                href={SITE_CONFIG.contacts.phoneHref}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#e04f26] hover:bg-[#c9431d] text-white text-xs sm:text-sm font-semibold uppercase tracking-wider transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Позвонить</span>
              </a>
            </div>
          </div>

          {/* Address & Working Hours Block */}
          <div className="lg:col-span-6 p-8 sm:p-12 border-r border-b border-[#1e222b] flex flex-col justify-between gap-8">
            <div>
              <div className="text-xs font-mono text-[#8e939e] uppercase tracking-wider mb-2">
                Адрес автосервиса
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold uppercase text-[#f5f5f3] mb-2">
                {SITE_CONFIG.contacts.address}
              </div>
              <p className="text-xs text-[#6b7280] font-mono">
                {SITE_CONFIG.contacts.addressComment}
              </p>
            </div>

            <div className="pt-6 border-t border-[#1e222b]">
              <div className="text-xs font-mono text-[#8e939e] uppercase tracking-wider mb-1.5">
                Режим работы
              </div>
              <div className="text-base sm:text-lg font-mono text-[#f5f5f3] tabular-nums">
                {SITE_CONFIG.contacts.workingHours}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
