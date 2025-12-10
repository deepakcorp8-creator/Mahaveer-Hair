
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { History, Search, UserSearch, RotateCcw, FileDown, Printer, User, Wallet, Calendar } from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';

const ClientHistory: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  // Default to TODAY's date so data shows immediately
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); 
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const allEntries = await api.getEntries(true);
        setEntries(allEntries);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  // Filter Logic
  const filteredData = entries.filter(e => {
      // 1. Date Range Check (Only if dates are selected)
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;

      // 2. Search Term Check (Name OR Number)
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = e.clientName.toLowerCase().includes(term);
          const matchNumber = String(e.contactNo).includes(term);
          return matchName || matchNumber;
      }

      return true;
  });

  // Calculate totals for the CURRENT VIEW
  const totalAmount = filteredData.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalVisits = filteredData.length;

  const setPreset = (type: 'TODAY' | 'ALL' | 'CLIENT_SEARCH') => {
      const today = new Date().toISOString().split('T')[0];
      if (type === 'TODAY') {
          setStartDate(today);
          setEndDate(today);
      } else if (type === 'ALL') {
          setStartDate('');
          setEndDate('');
          setSearchTerm('');
      } else if (type === 'CLIENT_SEARCH') {
          // Clear dates to allow full history search
          setStartDate('');
          setEndDate('');
          // Focus the search input
          setTimeout(() => {
            const input = document.getElementById('history-search-input');
            if (input) input.focus();
          }, 100);
      }
  };
  
  // Strict DD/MM/YYYY formatting helper
  const formatDateDDMMYYYY = (isoDate: string) => {
    if(!isoDate) return '';
    const parts = isoDate.split('-');
    if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoDate;
  };
  
  const getDayName = (isoDate: string) => {
      try {
          return new Date(isoDate).toLocaleDateString('en-US', { weekday: 'short' });
      } catch (e) { return ''; }
  }

  return (
    <div className="flex flex-col space-y-4 animate-in fade-in duration-500 pb-20">
      
      {/* 1. Header & Stats (Scrolls Away) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-2">
           <div className="flex items-center gap-3">
               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm">
                   <History className="w-6 h-6" />
               </div>
               <div>
                   <h2 className="text-2xl font-black text-slate-800 tracking-tight">Client History</h2>
                   <p className="text-slate-500 font-medium text-sm">View transaction records</p>
               </div>
           </div>

           {/* Quick Stats */}
           <div className="flex gap-4 self-end md:self-auto">
               <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue</p>
                   <p className="font-black text-xl text-emerald-600">₹{totalAmount.toLocaleString()}</p>
               </div>
               <div className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Count</p>
                   <p className="font-black text-xl text-indigo-600">{totalVisits}</p>
               </div>
           </div>
      </div>

      {/* 2. Filters & Dates (Scrolls Away to save space) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-end">
           {/* Date Inputs */}
            <div className="flex gap-2 w-full lg:w-auto flex-1">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">From Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-1">To Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full lg:w-auto">
                <button 
                    onClick={() => setPreset('TODAY')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex-1 lg:flex-none uppercase tracking-wide
                    ${startDate === new Date().toISOString().split('T')[0] && endDate === startDate 
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                    Today
                </button>
                <button 
                    onClick={() => setPreset('CLIENT_SEARCH')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex-1 lg:flex-none uppercase tracking-wide flex items-center justify-center whitespace-nowrap
                    ${!startDate && !endDate && searchTerm
                        ? 'bg-violet-600 text-white border-violet-700 shadow-md'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                    <UserSearch className="w-4 h-4 mr-2" />
                    All History
                </button>
                 <button 
                    onClick={() => setPreset('ALL')}
                    className="px-3 py-2.5 rounded-xl text-sm font-bold border border-slate-300 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                    title="Reset All Filters"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            </div>
      </div>

      {/* 3. STICKY Search Bar (Only this stays at top) */}
      <div className="sticky top-0 z-50 -mx-4 px-4 md:-mx-8 md:px-8 bg-slate-50 pt-2 pb-2 shadow-sm">
            <div className="relative group shadow-md rounded-xl">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Search className="w-5 h-5 text-indigo-500" />
                </div>
                <input 
                    id="history-search-input"
                    type="text" 
                    placeholder="Search Client Name or Mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-indigo-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold shadow-sm transition-all placeholder:font-normal placeholder:text-slate-400"
                />
            </div>
      </div>

      {/* 4. Results Table */}
      <div className="bg-white rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative z-0">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-xs border-b border-slate-300">
                     <tr>
                         <th className="px-6 py-5">Date</th>
                         <th className="px-6 py-5">Client Details</th>
                         <th className="px-6 py-5">Service Info</th>
                         <th className="px-6 py-5">Payment</th>
                         <th className="px-6 py-5 text-right">Amount</th>
                         <th className="px-6 py-5 text-center">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-200">
                     {loading ? (
                         <tr><td colSpan={6} className="text-center py-12 font-bold text-slate-400">Loading history...</td></tr>
                     ) : filteredData.length === 0 ? (
                         <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No records found matching your filters.</td></tr>
                     ) : (
                         filteredData.map((entry, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                 <td className="px-6 py-5 whitespace-nowrap">
                                     <div className="font-bold text-slate-800">{formatDateDDMMYYYY(entry.date)}</div>
                                     <div className="text-[10px] font-bold text-slate-400 uppercase">{getDayName(entry.date)}</div>
                                 </td>
                                 <td className="px-6 py-5">
                                     <div className="font-black text-slate-800 text-base">{entry.clientName}</div>
                                     <div className="flex items-center gap-2 mt-1">
                                         <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{entry.contactNo}</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-5">
                                    <div className="flex flex-col items-start gap-1">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border
                                        ${entry.serviceType === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                          entry.serviceType === 'SERVICE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                          'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                            {entry.serviceType}
                                        </span>
                                        <div className="text-xs font-bold text-slate-600 flex items-center">
                                             <User className="w-3 h-3 mr-1 text-slate-400" />
                                             {entry.technician}
                                        </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-5">
                                     <div className="flex items-center gap-2">
                                         <Wallet className="w-4 h-4 text-slate-400" />
                                         <span className="font-bold text-xs uppercase text-slate-600">{entry.paymentMethod}</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-5 text-right">
                                     <div className="font-black text-slate-800 text-lg">₹{entry.amount}</div>
                                 </td>
                                 <td className="px-6 py-5 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                         {entry.invoiceUrl && entry.invoiceUrl.startsWith('http') && (
                                             <a 
                                                href={entry.invoiceUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                title="View Saved Invoice"
                                             >
                                                 <FileDown className="w-4 h-4" />
                                             </a>
                                         )}
                                         <button
                                            onClick={() => generateInvoice(entry)}
                                            className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                                            title="Print Invoice"
                                         >
                                             <Printer className="w-4 h-4" />
                                         </button>
                                     </div>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>

    </div>
  );
};

export default ClientHistory;
