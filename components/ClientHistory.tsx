
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { History, Search, UserSearch, RotateCcw, FileDown, Printer, User, Wallet, Calendar, ArrowUpRight, Filter, ArrowRight } from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';

const ClientHistory: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Filter Logic
  const filteredData = entries.filter(e => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = e.clientName.toLowerCase().includes(term);
          const matchNumber = String(e.contactNo).includes(term);
          return matchName || matchNumber;
      }
      return true;
  });

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
          setStartDate('');
          setEndDate('');
          setTimeout(() => {
            const input = document.getElementById('history-search-input');
            if (input) input.focus();
          }, 100);
      }
  };

  const card3D = "relative bg-white rounded-[2rem] p-6 border border-slate-200 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.08)] hover:shadow-xl transition-all duration-300 group overflow-hidden";
  const glow = "absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-all group-hover:opacity-40 pointer-events-none";

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
           <div className="flex items-center gap-5">
               <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl shadow-xl shadow-indigo-300/50">
                   <History className="w-8 h-8" />
               </div>
               <div>
                   <h2 className="text-3xl font-black text-slate-800 tracking-tight">Client History</h2>
                   <p className="text-slate-500 font-medium text-base">Track transactions & service records</p>
               </div>
           </div>

           <div className="flex gap-4 w-full lg:w-auto">
               <div className={`${card3D} flex-1 lg:w-48 !p-5 border-b-4 border-b-emerald-500`}>
                   <div className={`${glow} bg-emerald-500 -mr-10 -mt-10`}></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                   <p className="font-black text-2xl text-slate-800 flex items-center">
                      <span className="text-emerald-500 mr-1">₹</span>{totalAmount.toLocaleString()}
                   </p>
               </div>
               <div className={`${card3D} flex-1 lg:w-48 !p-5 border-b-4 border-b-indigo-500`}>
                   <div className={`${glow} bg-indigo-500 -mr-10 -mt-10`}></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Records Found</p>
                   <p className="font-black text-2xl text-slate-800 flex items-center">
                       {totalVisits} <ArrowUpRight className="w-4 h-4 text-indigo-400 ml-1" />
                   </p>
               </div>
           </div>
      </div>

      <div className="bg-white p-3 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 flex flex-col xl:flex-row gap-4 items-center">
           <div className="w-full xl:w-auto flex-1 bg-slate-50 rounded-3xl border border-slate-200 p-2 flex flex-col md:flex-row items-center gap-2 relative">
                <div className="relative w-full group">
                    <div className="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-focus-within:text-indigo-500 transition-all">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-16 pr-4 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-black text-slate-700 outline-none" />
                    <label className="absolute -top-2.5 left-6 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-100">From Date</label>
                </div>
                <div className="text-slate-300 px-2 flex justify-center"><ArrowRight className="w-6 h-6 rotate-90 md:rotate-0" /></div>
                <div className="relative w-full group">
                    <div className="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-focus-within:text-indigo-500 transition-all">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-16 pr-4 py-4 bg-white border-2 border-transparent rounded-2xl text-sm font-black text-slate-700 outline-none" />
                    <label className="absolute -top-2.5 left-6 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-100">To Date</label>
                </div>
           </div>

            <div className="flex w-full xl:w-auto items-center gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] border border-slate-200 overflow-x-auto">
                <button onClick={() => setPreset('TODAY')} className={`px-6 py-3.5 rounded-2xl text-xs font-black transition-all flex-shrink-0 uppercase tracking-wide border shadow-sm ${startDate === new Date().toISOString().split('T')[0] && endDate === startDate ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-300' : 'bg-white text-slate-500 border-slate-200 hover:text-indigo-600'}`}>Today</button>
                <button onClick={() => setPreset('CLIENT_SEARCH')} className={`px-6 py-3.5 rounded-2xl text-xs font-black transition-all flex-shrink-0 uppercase tracking-wide border shadow-sm flex items-center justify-center whitespace-nowrap ${!startDate && !endDate && searchTerm ? 'bg-violet-600 text-white border-violet-700' : 'bg-white text-slate-500 border-slate-200 hover:text-violet-600'}`}><UserSearch className="w-4 h-4 mr-2" />All Data</button>
                 <button onClick={() => setPreset('ALL')} className="p-3.5 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-red-500 transition-colors shadow-sm flex-shrink-0"><RotateCcw className="w-4 h-4" /></button>
            </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 px-4 md:-mx-8 md:px-8 bg-[#F8FAFC]/90 backdrop-blur-md py-4">
            <div className="relative group shadow-xl shadow-indigo-900/5 rounded-[1.5rem]">
                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 pointer-events-none p-2 bg-indigo-50 rounded-xl"><Search className="w-5 h-5 text-indigo-600 transition-transform group-hover:scale-110" /></div>
                <input id="history-search-input" type="text" placeholder="Search Client Name or Contact Number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-6 py-4 bg-white border-2 border-white focus:border-indigo-500 rounded-[1.5rem] text-base focus:ring-4 focus:ring-indigo-100 font-bold shadow-sm transition-all text-slate-800" />
            </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative z-0">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50/80 text-slate-400 uppercase font-black text-[11px] tracking-wider border-b border-slate-200">
                     <tr>
                         <th className="px-8 py-6">Date</th>
                         <th className="px-8 py-6">Client</th>
                         <th className="px-8 py-6">Service</th>
                         <th className="px-8 py-6">Payment</th>
                         <th className="px-8 py-6 text-right">Amount</th>
                         <th className="px-8 py-6 text-center">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {loading ? (
                         <tr><td colSpan={6} className="text-center py-24 font-bold text-slate-400 animate-pulse">Loading history records...</td></tr>
                     ) : filteredData.length === 0 ? (
                         <tr><td colSpan={6} className="text-center py-24 text-slate-400 font-medium"><div className="flex flex-col items-center justify-center"><div className="p-4 bg-slate-100 rounded-full mb-3"><Filter className="w-8 h-8 text-slate-300" /></div><p>No records found matching your filters.</p></div></td></tr>
                     ) : (
                         filteredData.map((entry, idx) => (
                             <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                 <td className="px-8 py-5 whitespace-nowrap">
                                     <div className="font-bold text-slate-700">{formatDateDisplay(entry.date)}</div>
                                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                 </td>
                                 <td className="px-8 py-5">
                                     <div className="font-black text-slate-800 text-base">{entry.clientName}</div>
                                     <div className="flex items-center gap-2 mt-1"><span className="text-[11px] font-bold text-slate-500 bg-white shadow-sm px-2 py-0.5 rounded border border-slate-200">{entry.contactNo}</span></div>
                                 </td>
                                 <td className="px-8 py-5">
                                    <div className="flex flex-col items-start gap-1.5"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${entry.serviceType === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200' : entry.serviceType === 'SERVICE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{entry.serviceType}</span><div className="text-xs font-bold text-slate-500 flex items-center pl-1"><User className="w-3 h-3 mr-1.5 text-slate-400" />{entry.technician}</div></div>
                                 </td>
                                 <td className="px-8 py-5"><div className="flex items-center gap-2"><span className="font-bold text-xs uppercase text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">{entry.paymentMethod}</span></div></td>
                                 <td className="px-8 py-5 text-right"><div className="font-black text-slate-900 text-lg">₹{entry.amount}</div></td>
                                 <td className="px-8 py-5 text-center"><div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">{entry.invoiceUrl && entry.invoiceUrl.startsWith('http') && (<a href={entry.invoiceUrl} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition-all shadow-sm" title="View Saved Invoice"><FileDown className="w-4 h-4" /></a>)}<button onClick={() => generateInvoice(entry)} className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-800 hover:text-white border border-slate-200 transition-all shadow-sm" title="Print Invoice"><Printer className="w-4 h-4" /></button></div></td>
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
