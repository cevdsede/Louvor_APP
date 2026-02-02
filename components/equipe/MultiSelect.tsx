import React, { useState } from 'react';

interface MultiSelectProps {
  options: { id: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder = "Selecione as funções..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter(id => id !== optionId));
    } else {
      onChange([...value, optionId]);
    }
  };

  const removeOption = (optionId: string) => {
    onChange(value.filter(id => id !== optionId));
  };

  return (
    <div className="relative">
      <div 
        className="min-h-[42px] border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 p-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2">
          {value.length === 0 ? (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          ) : (
            value.map(id => {
              const option = options.find(o => o.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-brand text-white rounded-md text-sm"
                >
                  {option?.label}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(id);
                    }}
                    className="hover:bg-brand/80 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </span>
              );
            })
          )}
        </div>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-slate-400 text-xs`}></i>
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Buscar funções..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.map(option => (
              <div
                key={option.id}
                className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 ${
                  value.includes(option.id) ? 'bg-brand/10' : ''
                }`}
                onClick={() => {
                  toggleOption(option.id);
                  setIsOpen(false);
                }}
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.id)}
                  onChange={() => {}}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
