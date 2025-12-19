import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function FilterDropdown({ value, onChange, options }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group flex items-center gap-2 px-3 py-1.5 
          bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50
          rounded-md transition-all duration-200 ease-out
          text-xs font-medium text-zinc-300 hover:text-zinc-100
          focus:outline-none focus:ring-2 focus:ring-zinc-700/50
          ${isOpen ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : ''}
        `}
      >
        <span className="truncate max-w-[120px]">{selectedOption?.label}</span>
        <ChevronDown 
          className={`
            w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400 transition-transform duration-300
            ${isOpen ? 'rotate-180' : ''}
          `} 
        />
      </button>

      <div 
        className={`
          absolute right-0 mt-2 w-48
          bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 
          rounded-lg shadow-xl shadow-black/40 ring-1 ring-black/10
          origin-top-right transition-all duration-200 ease-out
          ${isOpen 
            ? 'opacity-100 transform translate-y-0 scale-100 visible' 
            : 'opacity-0 transform -translate-y-2 scale-95 invisible pointer-events-none'}
        `}
      >
        <div className="p-1">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2
                  rounded-md text-xs font-medium transition-colors duration-150
                  ${isSelected 
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}
                `}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
