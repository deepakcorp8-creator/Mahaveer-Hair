
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Crown } from 'lucide-react';

interface Option {
  label: string;
  value: string;
  subtext?: string;
  isHighlight?: boolean; // NEW PROP
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  label,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options based on current input value
  const filteredOptions = useMemo(() => {
    const searchTerm = String(value || '').toLowerCase().trim();
    // Always return options to allow browsing, filtered if typed
    if (!options) return [];
    
    // Split into high priority (highlighted) and normal
    let result = options.filter(opt => {
      const labelSafe = String(opt.label || '').toLowerCase();
      const subtextSafe = String(opt.subtext || '').toLowerCase();
      
      if (!searchTerm) return true;
      return labelSafe.includes(searchTerm) || subtextSafe.includes(searchTerm);
    });

    // Sort: Highlighted first
    result.sort((a, b) => {
        if (a.isHighlight && !b.isHighlight) return -1;
        if (!a.isHighlight && b.isHighlight) return 1;
        return 0;
    });

    return result.slice(0, 50); // Performance limit
  }, [options, value]);

  const handleSelect = (optValue: string) => {
      onChange(optValue);
      setIsOpen(false);
      // Optional: keep focus or blur? Blur usually feels cleaner after selection
      inputRef.current?.blur();
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative group">
        {/* Left Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
        </div>
        
        {/* Main Input - Acts as both Search and Value entry */}
        <input
            ref={inputRef}
            type="text"
            className={`w-full pl-9 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-gray-900 shadow-sm transition-all duration-200 
                placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold
                ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white' : ''}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
                onChange(e.target.value);
                if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            required={required}
            autoComplete="off"
        />

        {/* Right Action Icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             {value && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange('');
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Clear"
                >
                    <X className="w-3 h-3" />
                </button>
             )}
             <div 
                className="p-1 cursor-pointer text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) inputRef.current?.focus();
                }}
            >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
             </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 animate-in fade-in zoom-in-95 duration-100">
            {filteredOptions.length > 0 ? (
                <div className="p-1">
                    {filteredOptions.map((opt, idx) => (
                        <div
                            key={`${opt.value}-${idx}`}
                            className={`px-3 py-2.5 text-sm cursor-pointer rounded-lg flex items-center justify-between transition-colors mb-0.5
                                ${opt.value === value 
                                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                                    : 'text-gray-700 hover:bg-gray-50 border border-transparent'}
                                ${opt.isHighlight ? 'bg-amber-50 hover:bg-amber-100 border-amber-100' : ''}
                            `}
                            onClick={() => handleSelect(opt.label)}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                {opt.isHighlight && (
                                    <div className="bg-gradient-to-br from-amber-300 to-amber-500 text-white p-1 rounded-md shadow-sm">
                                        <Crown className="w-3.5 h-3.5" />
                                    </div>
                                )}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate flex items-center gap-2">
                                        {opt.label}
                                        {opt.isHighlight && <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">Package</span>}
                                    </span>
                                    {opt.subtext && <span className="text-[10px] text-gray-400 font-medium truncate">{opt.subtext}</span>}
                                </div>
                            </div>
                            {opt.value === value && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                    {value ? (
                        <div className="flex flex-col items-center">
                             <p>No existing match.</p>
                             <p className="text-xs mt-1 text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                Creating new: "{value}"
                             </p>
                        </div>
                    ) : (
                        "Type to search..."
                    )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};
