import React from 'react';
import { MessageSquare, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

export type ViewMode = 'plain' | 'technical';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const options: Array<{ key: ViewMode; label: string; icon: React.ReactNode }> = [
  {
    key: 'plain',
    label: 'Plain English',
    icon: <MessageSquare className="h-4 w-5" />,
  },
  {
    key: 'technical',
    label: 'Technical View',
    icon: <SlidersHorizontal className="h-4 w-5" />,
  },
];

const ViewToggle: React.FC<ViewToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="flex justify-center">
      <div
        className="inline-grid grid-cols-2 rounded-full border px-1 py-1"
        style={{
          backgroundColor: '#F8FAFC',
          borderColor: '#E2E8F0',
          borderWidth: '1.5px',
        }}
      >
        {options.map((option) => {
          const isActive = mode === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className="relative flex h-10 w-[130px] items-center justify-center gap-2 rounded-full text-sm transition-colors duration-200"
              style={{
                color: isActive ? '#0F172A' : '#94A3B8',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {isActive ? (
                <motion.div
                  layoutId="toggle-indicator"
                  className="absolute inset-0 rounded-full bg-white"
                  style={{
                    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              ) : null}
              <span className="relative z-10">{option.icon}</span>
              <span className="relative z-10">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewToggle;
