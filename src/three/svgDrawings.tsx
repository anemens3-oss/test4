import React from 'react';

export const DiagnosticsSchematic: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 420 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="420" height="240" fill="#0b0d12" />
    <path d="M0 60H420M0 120H420M0 180H420M84 0V240M168 0V240M252 0V240M336 0V240" stroke="#1e222b" strokeWidth="1" />

    {/* ECU Module Frame */}
    <rect x="28" y="38" width="136" height="164" fill="#10131a" stroke="#2e3442" strokeWidth="1.2" />
    <text x="42" y="62" fill="#e04f26" fontSize="10" fontFamily="JetBrains Mono">PCM · CAN-FD BUS</text>
    <rect x="42" y="76" width="108" height="54" fill="#0b0d12" stroke="#222733" strokeWidth="1" />
    <text x="52" y="98" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">CAM_SYNC:  +0.2°</text>
    <text x="52" y="114" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">AFR BANK1: 14.7</text>
    <text x="42" y="156" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">KNOCK RETARD: 0.0°</text>
    <text x="42" y="174" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">FUEL RAIL: 4.2 BAR</text>

    {/* 4-Channel Oscilloscope Waveform */}
    <rect x="188" y="38" width="204" height="164" fill="#090b0f" stroke="#2e3442" strokeWidth="1.2" />
    <line x1="188" y1="120" x2="392" y2="120" stroke="#222733" strokeDasharray="3 3" />
    <path
      d="M198 142 L214 142 L214 84 L230 84 L230 142 L248 142 L248 84 L264 84 L264 142 L284 142 L284 68 L298 68 L298 142 L322 142 L322 84 L340 84 L340 142 L360 142 L360 84 L378 84"
      stroke="#e04f26"
      strokeWidth="1.8"
    />
    <path
      d="M198 168 Q226 172 244 150 T290 150 T336 172 T380 156"
      stroke="#9ca3af"
      strokeWidth="1.2"
      strokeDasharray="2 2"
    />
    <text x="202" y="58" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">CH1: CRANKSHAFT HALL 58X</text>
    <text x="202" y="190" fill="#6b7280" fontSize="9" fontFamily="JetBrains Mono">250 MS/s · Δt 0.004 ms</text>
  </svg>
);

export const MaintenanceSchematic: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 420 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="420" height="240" fill="#0b0d12" />
    <path d="M0 60H420M0 120H420M0 180H420M84 0V240M168 0V240M252 0V240M336 0V240" stroke="#1e222b" strokeWidth="1" />

    {/* Lubrication & Torque Matrix */}
    <rect x="140" y="36" width="140" height="168" fill="#10131a" stroke="#2e3442" strokeWidth="1.2" />
    <path
      d="M162 64 L174 166 L186 64 L198 166 L210 64 L222 166 L234 64 L246 166 L258 64"
      stroke="#e04f26"
      strokeWidth="1.6"
      fill="none"
    />
    <circle cx="210" cy="184" r="7" stroke="#d1d5db" strokeWidth="1.5" fill="#0b0d12" />

    <text x="30" y="72" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">SPEC: 0W-40 SYNTHETIC</text>
    <text x="30" y="90" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">ZF 8HP ATF TEMP: 40°C</text>
    <text x="30" y="108" fill="#e04f26" fontSize="9" fontFamily="JetBrains Mono">TORQUE: 25.0 N·m</text>

    <text x="296" y="72" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">DOT 4 CLASS 6</text>
    <text x="296" y="90" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">BOILING: &gt; 265°C</text>
    <text x="296" y="108" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">H2O CONTENT: &lt; 0.8%</text>
  </svg>
);

export const BrakesSchematic: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 420 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="420" height="240" fill="#0b0d12" />
    <path d="M0 60H420M0 120H420M0 180H420M84 0V240M168 0V240M252 0V240M336 0V240" stroke="#1e222b" strokeWidth="1" />

    {/* Two-piece 390mm Slotted Rotor */}
    <circle cx="176" cy="120" r="82" stroke="#9ca3af" strokeWidth="10" fill="#10131a" strokeDasharray="14 4" />
    <circle cx="176" cy="120" r="58" stroke="#2e3442" strokeWidth="1.5" fill="none" />
    <circle cx="176" cy="120" r="38" stroke="#e04f26" strokeWidth="1.5" fill="#0b0d12" />
    <circle cx="176" cy="120" r="14" stroke="#6b7280" strokeWidth="1" fill="#08090c" />

    {/* 6-Piston Brembo Monobloc Caliper */}
    <path d="M224 54 C252 72 268 106 258 158 L224 142 Z" fill="#e04f26" />
    <rect x="228" y="76" width="22" height="14" fill="#10131a" />
    <rect x="228" y="98" width="22" height="14" fill="#10131a" />
    <rect x="228" y="120" width="22" height="14" fill="#10131a" />

    <text x="28" y="54" fill="#e04f26" fontSize="9" fontFamily="JetBrains Mono">RUNOUT: ≤ 0.015 mm</text>
    <text x="28" y="72" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">ROTOR: Ø 390 × 34 mm</text>
    <text x="284" y="182" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">6-PISTON MONOBLOC</text>
  </svg>
);

export const EngineSchematic: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 420 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="420" height="240" fill="#0b0d12" />
    <path d="M0 60H420M0 120H420M0 180H420M84 0V240M168 0V240M252 0V240M336 0V240" stroke="#1e222b" strokeWidth="1" />

    {/* V8 Cylinder & Forged Piston Cross-section */}
    <rect x="142" y="52" width="136" height="148" stroke="#2e3442" strokeWidth="1.5" fill="#10131a" />
    <rect x="156" y="84" width="108" height="42" fill="#161a24" stroke="#d1d5db" strokeWidth="1.5" />
    <line x1="160" y1="94" x2="260" y2="94" stroke="#e04f26" strokeWidth="1.2" />
    <line x1="160" y1="102" x2="260" y2="102" stroke="#8e939e" strokeWidth="1" />

    <path d="M202 126 L196 178 L224 178 L218 126 Z" fill="#1e2330" stroke="#9ca3af" strokeWidth="1.2" />
    <circle cx="210" cy="178" r="13" fill="#0b0d12" stroke="#e04f26" strokeWidth="2" />

    <text x="28" y="88" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">BORE: 103.9 mm</text>
    <text x="28" y="106" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">STROKE: 90.9 mm</text>
    <text x="292" y="88" fill="#e04f26" fontSize="9" fontFamily="JetBrains Mono">CLEARANCE: ±0.002 mm</text>
    <text x="292" y="106" fill="#8e939e" fontSize="9" fontFamily="JetBrains Mono">BOOST: 0.80 BAR</text>
  </svg>
);

export const SuspensionSchematic: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 420 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="420" height="240" fill="#0b0d12" />
    <path d="M0 60H420M0 120H420M0 180H420M84 0V240M168 0V240M252 0V240M336 0V240" stroke="#1e222b" strokeWidth="1" />

    <rect x="198" y="42" width="24" height="140" fill="#10131a" stroke="#9ca3af" strokeWidth="1.5" />
    <path
      d="M190 70 L230 82 L190 94 L230 106 L190 118 L230 130 L190 142"
      stroke="#e04f26"
      strokeWidth="2.2"
      fill="none"
    />
    <path d="M198 158 L116 196 M222 158 L304 196" stroke="#d1d5db" strokeWidth="2" />
    <circle cx="116" cy="196" r="5" fill="#e04f26" />
    <circle cx="304" cy="196" r="5" fill="#e04f26" />

    <text x="32" y="72" fill="#e04f26" fontSize="9" fontFamily="JetBrains Mono">CAMBER: -1°15′</text>
    <text x="32" y="90" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">CASTER: +6°45′</text>
    <text x="294" y="72" fill="#d1d5db" fontSize="9" fontFamily="JetBrains Mono">TOE: ±0°02′</text>
  </svg>
);

export const ElectricSchematic: React.FC<{ className?: string }> = DiagnosticsSchematic;
