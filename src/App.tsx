import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ServicesSection } from './components/ServicesSection';
import { AboutSection } from './components/AboutSection';
import { ProcessSection } from './components/ProcessSection';
import { ContactsSection } from './components/ContactsSection';
import { Footer } from './components/Footer';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090c] text-[#f5f5f3] flex flex-col font-sans selection:bg-[#e04f26] selection:text-white">
      {/* Minimal Top Navigation */}
      <Header />

      {/* Continuous 7-Scene 3D Experience + 4 Concise Editorial Sections */}
      <main className="flex-1 w-full">
        {/* 7-Scene Continuous Dodge Challenger SRT Hellcat & Supercharged V8 Experience */}
        <Hero />

        {/* Section 01: Expertise (Diagnostics, Maintenance, Brakes, Engine Service) */}
        <ServicesSection />

        {/* Section 02: Workshop (Equipment, Specialized Bays & Standards) */}
        <AboutSection />

        {/* Section 03: Process (Осмотр, Согласование работ, Обслуживание) */}
        <ProcessSection />

        {/* Section 04: Contact (Address & Direct tel: Phone Link Only) */}
        <ContactsSection />
      </main>

      {/* Quiet Editorial Footer with 3D Asset Attribution */}
      <Footer />
    </div>
  );
}
