import { Layout, Zap, BookOpen, Minus, Sparkles, Briefcase } from 'lucide-react';
import { getContextMetadata } from '../utils/smartHarmony';

const CONTEXT_ICONS = {
  ui: Layout,
  brand: Zap,
  editorial: BookOpen,
  minimalist: Minus,
  vibrant: Sparkles,
  professional: Briefcase
};

export default function ContextSelector({ selectedContext, onContextSelect }) {
  const contexts = getContextMetadata();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
          Design Context
        </h3>
        <span className="text-[10px] text-text-muted">
          {contexts[selectedContext]?.colorCount || 5} colors
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(contexts).map(([id, meta]) => {
          const Icon = CONTEXT_ICONS[id];
          const isSelected = selectedContext === id;

          return (
            <button
              key={id}
              onClick={() => onContextSelect(id)}
              className={`
                group relative p-3 rounded-xl border transition-all text-left
                ${isSelected 
                  ? 'bg-accent/10 border-accent/40' 
                  : 'bg-bg-elevated border-[#1a1a24] hover:border-[#252530]'
                }
              `}
            >
              <div className="flex items-start gap-2 mb-2">
                <Icon 
                  size={16} 
                  className={isSelected ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}
                />
                <h4 className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                  {meta.name}
                </h4>
              </div>
              
              <p className="text-[10px] text-text-muted mb-2 line-clamp-2">
                {meta.description}
              </p>

              <div className="flex flex-wrap gap-1">
                {meta.characteristics.slice(0, 2).map((char, i) => (
                  <span 
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-bg-deep text-text-muted"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Context info */}
      <div className="bg-bg-elevated rounded-lg p-3 border border-[#1a1a24]">
        <p className="text-xs text-text-secondary">
          {contexts[selectedContext]?.description}
        </p>
      </div>
    </div>
  );
}
