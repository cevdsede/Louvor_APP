
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const inspiringMessages = [
    "Sua música, sua escala, sua adoração. Conectados.",
    "Tecnologia a serviço do Reino.",
    "Organização que potencializa o louvor.",
    "Onde a excelência encontra a adoração."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % inspiringMessages.length);
        setFade(true);
      }, 500); // Meio segundo para o fade-out antes de trocar o texto
    }, 4000); // Troca a cada 4 segundos

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0f172a] flex items-center justify-center overflow-hidden z-[200]">
      {/* Background Decor - Gradiente Suave com Nuvem Abstrata */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand/20 rounded-full blur-[140px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      
      {/* Efeito de Nuvens Abstratas (SVG) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="10" cy="10" r="30" fill="white" className="animate-pulse" />
          <circle cx="90" cy="80" r="40" fill="white" className="animate-pulse delay-700" />
          <circle cx="50" cy="50" r="25" fill="white" className="animate-pulse delay-1500" />
        </svg>
      </div>

      <div className="relative flex flex-col items-center animate-fade-in text-center px-8">
        {/* Logo Animation - "Flutuando" */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-10 transition-transform hover:scale-105 duration-700">
           <div className="absolute inset-0 bg-brand/25 rounded-[2.5rem] border border-brand/40 shadow-2xl shadow-brand/20 animate-bounce transition-all duration-[3000ms]"></div>
           <div className="z-10 flex flex-col items-center scale-[1.7]">
              <i className="fas fa-cloud text-brand text-4xl"></i>
              <div className="flex gap-1.5 mt-2">
                 <div className="w-1.5 h-4 bg-brand-gold rounded-full animate-pulse"></div>
                 <div className="w-1.5 h-8 bg-brand-gold rounded-full animate-pulse delay-150"></div>
                 <div className="w-1.5 h-4 bg-brand-gold rounded-full animate-pulse delay-300"></div>
              </div>
           </div>
        </div>

        <h1 className="text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-lg">
          Cloud <span className="text-brand">Worship</span>
        </h1>
        <p className="text-brand-gold font-bold uppercase tracking-[0.4em] text-[12px] mb-12 drop-shadow">
          Louvor e Adoração
        </p>

        {/* Mensagens Inspiradoras Rotativas */}
        <div className="h-20 flex items-center justify-center mb-16">
          <p className={`text-slate-300 font-medium text-xl max-w-sm leading-relaxed transition-all duration-500 transform ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            "{inspiringMessages[messageIndex]}"
          </p>
        </div>

        {/* Botão de Ação Prominente */}
        <button 
          onClick={onComplete}
          className="group relative px-14 py-5 bg-brand text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[13px] shadow-2xl shadow-brand/40 hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-3">
            Começar <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>

      {/* Indicador de Carregamento Sutil no Rodapé */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce delay-150"></div>
          <div className="w-1.5 h-1.5 bg-brand-gold rounded-full animate-bounce delay-300"></div>
        </div>
        <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
          Sincronizando Propósito
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
