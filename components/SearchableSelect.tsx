import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface Option {
  label: string;
  value: string;
  subtext?: string;
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
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  required
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Performance: Limit rendered options to top 50 to prevent lag on mobile
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    (opt.subtext && opt.subtext.includes(search))
  ).slice(0, 50);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">{label} {required && <span className="text-red-500">*</span>}</label>}
      
      {/* Trigger Box */}
      <div
        className={`relative w-full cursor-pointer bg-gray-50/50 border rounded-xl transition-all duration-200 
        ${isOpen 
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg bg-white' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-white shadow-sm'
        }`}
        onClick={() => {
            setIsOpen(!isOpen);
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 min-h-[48px]">
            <div className="flex flex-col overflow-hidden">
                <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900 font-bold'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                {selectedOption && selectedOption.subtext && (
                    <span className="text-[10px] text-gray-500 font-medium truncate">{selectedOption.subtext}</span>
                )}
            </div>
            
            <div className="flex items-center gap-2 pl-2">
                 {selectedOption && (
                     <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                        }}
                        className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full cursor-pointer transition-colors"
                        title="Clear selection"
                     >
                         <X className="w-4 h-4" />
                     </div>
                 )}
                <div className={`p-1 rounded-md transition-colors ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400'}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
                </div>
            </div>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 origin-top">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-50 bg-white sticky top-0">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-800 placeholder-gray-400 transition-all font-medium"
                        placeholder="Search name or number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            </div>
            
            {/* Options List */}
            <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent p-1">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt) => (
                    <div
                        key={opt.value}
                        className={`px-3 py-2.5 text-sm cursor-pointer rounded-lg flex items-center justify-between transition-colors mb-0.5 border border-transparent
                        ${opt.value === value 
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-50'}`}
                        onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                            setSearch('');
                        }}
                    >
                        <div className="flex flex-col">
                             <span className={`text-sm ${opt.value === value ? 'font-bold' : 'font-semibold'}`}>{opt.label}</span>
                             {opt.subtext && <span className="text-xs text-gray-500 mt-0.5">{opt.subtext}</span>}
                        </div>
                        {opt.value === value && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    ))
                ) : (
                    <div className="px-4 py-8 text-sm text-gray-400 text-center flex flex-col items-center">
                        <Search className="w-8 h-8 text-gray-200 mb-2" />
                        <span className="font-medium">No results found</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
