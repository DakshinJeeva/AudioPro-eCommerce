import React from "react";

export default function LiquidTextLogo({ text = "AUDIOPRO", className = "" }) {
  return (
    <div className={`select-none ${className}`}>
      <span className="liquid-logo text-2xl md:text-3xl font-extrabold tracking-tight">
        {text}
      </span>
      <style jsx>{`
        .liquid-logo {
          background: radial-gradient(120% 120% at 10% 10%, #ffffff 0%, #bbbbbb 35%, #666666 60%, #111111 85%),
                      conic-gradient(from 0deg at 50% 50%, #ffffff, #e0e0e0, #9aa0a6, #6b7280, #374151, #111827, #6b7280, #e5e7eb, #ffffff);
          background-blend-mode: screen, overlay;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 2px 12px rgba(0,0,0,0.15));
          background-size: 200% 200%, 300% 300%;
          animation: liquidShift 6s ease-in-out infinite;
        }
        @keyframes liquidShift {
          0% { background-position: 0% 0%, 0% 50%; }
          50% { background-position: 100% 100%, 100% 50%; }
          100% { background-position: 0% 0%, 0% 50%; }
        }
      `}</style>
    </div>
  );
}
