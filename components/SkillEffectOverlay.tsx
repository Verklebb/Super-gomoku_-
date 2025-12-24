import React from 'react';
import { SkillType } from '../types';
import { SKILLS } from '../constants';

interface SkillEffectOverlayProps {
  skillType: SkillType | null;
  onAnimationEnd: () => void;
}

const SkillEffectOverlay: React.FC<SkillEffectOverlayProps> = ({ skillType, onAnimationEnd }) => {
  if (!skillType) return null;

  const skill = SKILLS.find(s => s.id === skillType);
  if (!skill) return null;

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
      onAnimationEnd={onAnimationEnd}
    >
        {/* Backdrop flash */}
        <div className="absolute inset-0 bg-black/40 animate-[fadeOut_1s_ease-in-out_forwards]"></div>
        
        {/* Dynamic Skill Text */}
        <div className="relative flex flex-col items-center justify-center animate-[zoomInFadeOut_2.5s_cubic-bezier(0.22,1,0.36,1)_forwards] p-8 text-center">
            {/* Energy Burst Background */}
            <div className={`absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-60 bg-gradient-to-tr ${skill.color}`}></div>
            
            {/* Icon Box */}
            <div className={`mb-4 p-6 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/20 shadow-2xl`}>
                 <div className="text-6xl text-white font-bold">⚔️</div>
            </div>

            {/* Text */}
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] italic uppercase mb-2">
                {skill.name}
            </h1>
             {/* Added Description to Effect */}
            <p className="text-xl md:text-2xl text-white/90 font-medium tracking-wide max-w-lg drop-shadow-md">
                {skill.description}
            </p>
        </div>
        
        <style>{`
            @keyframes fadeOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; }
            }
            @keyframes zoomInFadeOut {
                0% { transform: scale(0.5); opacity: 0; }
                10% { transform: scale(1.1); opacity: 1; }
                20% { transform: scale(1.0); opacity: 1; }
                80% { transform: scale(1.05); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }
        `}</style>
    </div>
  );
};

export default SkillEffectOverlay;