import React from 'react';
import { Skill } from '../types';
import { Wind, Waves, Mountain, Hand } from 'lucide-react';

interface SkillCardProps {
  skill: Skill;
  isAvailable: boolean;
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, isAvailable, isActive, onClick, disabled }) => {
  const Icon = () => {
    switch (skill.icon) {
      case 'Wind': return <Wind className="w-5 h-5 lg:w-6 lg:h-6" />;
      case 'Waves': return <Waves className="w-5 h-5 lg:w-6 lg:h-6" />;
      case 'Mountain': return <Mountain className="w-5 h-5 lg:w-6 lg:h-6" />;
      case 'Hand': return <Hand className="w-5 h-5 lg:w-6 lg:h-6" />;
      default: return null;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || !isAvailable}
      className={`
        relative group flex lg:flex-row flex-col items-center lg:items-center justify-center lg:justify-start 
        p-2 lg:p-3 rounded-xl border-2 transition-all duration-200 w-full lg:w-auto
        ${isActive 
            ? 'border-yellow-400 bg-yellow-50 shadow-lg lg:scale-105 -translate-y-1 lg:translate-y-0' 
            : 'border-transparent'
        }
        ${!isAvailable 
            ? 'opacity-40 grayscale cursor-not-allowed bg-gray-100' 
            : 'bg-white hover:bg-orange-50/50 shadow-md hover:shadow-lg cursor-pointer active:scale-95'
        }
      `}
    >
      {/* Icon Container */}
      <div className={`p-2 lg:p-2.5 rounded-full text-white shadow-sm mb-1 lg:mb-0 lg:mr-3 transition-transform group-hover:scale-110 ${skill.color}`}>
        <Icon />
      </div>

      {/* Text Container */}
      <div className="text-center lg:text-left flex-1">
        <h3 className="font-bold text-[10px] lg:text-sm text-gray-800 leading-tight whitespace-nowrap">{skill.name}</h3>
        <p className="hidden lg:block text-[10px] text-gray-500 leading-tight mt-0.5">{skill.description}</p>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
      )}
    </button>
  );
};

export default SkillCard;