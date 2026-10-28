import React, { useState, useEffect } from 'react';
import { SITE_CONFIG } from '../config/siteConfig';
import { Menu, X, Phone } from 'lucide-react';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 32);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { index: '01', label: 'Компетенции', href: '#expertise' },
    { index: '02', label: 'Техцентр', href: '#workshop' },
    { index: '03', label: 'Процесс', href: '#process' },
    { index: '04', label: 'Контакты', href: '#contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b ${
          isScrolled
            ? 'bg-[#08090c]/92 border-[#1e222b] py-3'
            : 'bg-transparent border-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#hero"
            className="font-display font-bold text-lg sm:text-2xl tracking-[0.08em] text-[#f5f5f3] uppercase whitespace-nowrap shrink-0"
          >
            {SITE_CONFIG.brandName}
          </a>

          {/* Zone 2: 4 Clean Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-[#9ca3af]">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-[#f5f5f3] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="text-[#e04f26] mr-1.5 tabular-nums">{item.index}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Zone 3: Direct Phone Call Action (tel:) */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={SITE_CONFIG.contacts.phoneHref}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-mono font-medium text-[#f5f5f3] border border-[#262b36] bg-[#101217]/90 hover:border-[#e04f26] hover:text-white transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              <Phone className="w-3.5 h-3.5 text-[#e04f26]" />
              <span>{SITE_CONFIG.contacts.phoneDisplay}</span>
            </a>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#d1d5db] hover:text-white border border-[#1e222b] bg-[#101217]"
              aria-label="Меню навигации"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#08090c] flex flex-col justify-between pt-24 pb-10 px-6 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex flex-col border-t border-[#1e222b]">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-4 border-b border-[#1e222b] text-2xl font-display uppercase tracking-wide text-[#f5f5f3]"
              >
                <span>{item.label}</span>
                <span className="text-xs font-mono text-[#e04f26] tabular-nums">
                  {item.index}
                </span>
              </a>
            ))}
          </div>

          <div className="space-y-4">
            <div className="text-xs font-mono text-[#8e939e] tabular-nums">
              {SITE_CONFIG.contacts.workingHours} · {SITE_CONFIG.contacts.address}
            </div>
            <a
              href={SITE_CONFIG.contacts.phoneHref}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 bg-[#e04f26] text-white font-mono font-semibold text-sm uppercase tracking-wider tabular-nums"
            >
              <Phone className="w-4 h-4" />
              <span>{SITE_CONFIG.contacts.phoneDisplay}</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
};
