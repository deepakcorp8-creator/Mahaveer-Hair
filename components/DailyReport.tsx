
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry, Technician } from '../types';
import { 
  Calendar, Filter, FileText, UserPlus, Scissors, CreditCard, Search, Wallet, 
  Smartphone, Landmark, AlertCircle, RefreshCw, Eye, FileDown, Printer, User, 
  Ruler, Sparkles, Layers, Pencil, X, Save, Droplets, Zap, UserCheck, Trash2,
  ChevronDown, RotateCcw
} from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';

const DailyReport: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<Partial<Entry>>({});

  useEffect(() => {
    loadData();
    loadOptions();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getEntries(true);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
      try {
          const options = await api.getOptions();
          setTechnicians(options.technicians);
      } catch (e) { console.error(e); }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const openEditModal = (entry: Entry) => {
      setEditingEntry(entry);
      setEditForm({
          technician: entry.technician,
          serviceType: entry.serviceType,
          patchMethod: entry.patchMethod,
          amount: entry.amount,
          paymentMethod: entry.paymentMethod,
          remark: entry.remark,
          pendingAmount: entry.pendingAmount || 0
      });
      setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingEntry || submitting) return;
      
      setSubmitting(true);
      try {
          const updated = { ...editingEntry, ...editForm } as Entry;
          await api.updateEntry(updated);
          await loadData();
          setIsEditModalOpen(false);
          setEditingEntry(null);
      } catch (err) {
          alert("Failed to update entry.");
      } finally {
          setSubmitting(false);
      }
  };

  const handleDelete = async (id: string, name: string) => {
      if (window.confirm(`Are you sure you want to DELETE the entry for "${name}"? This action cannot be undone.`)) {
          setLoading(true);
          try {
              const success = await api.deleteEntry(id);
              if (success) {
                  await loadData();
              }
          } catch (err: any) {
              alert(`❌ Error: ${err.message || "Failed to delete entry from sheet."}`);
              setLoading(false);
          }
      }
  };

  const filteredData = entries.filter(entry => {
    if (entry.date !== selectedDate) return false;
    if (serviceFilter !== 'ALL' && entry.serviceType !== serviceFilter) return false;
    if (paymentFilter !== 'ALL' && entry.paymentMethod !== paymentFilter) return false;
    if (searchTerm && !entry.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const dailyEntries = entries.filter(e => e.date === selectedDate);
  const totalDailyRevenue = dailyEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalTxns = dailyEntries.length;

  const resetFilters = () => {
      setServiceFilter('ALL');
      setPaymentFilter('ALL');
      setSearchTerm('');
      setIsSearchExpanded(false);
  };

  const isFilterActive = serviceFilter !== 'ALL' || paymentFilter !== 'ALL';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-[0_15px_35px_-10px_rgba(0,0,0,0.08)] border border-slate-200 backdrop-blur-sm">
        <div>
           <div className="flex items-center gap-2">
               <h2 className="text-3xl font-black text-slate-800">Daily Report</h2>
               <button onClick={loadData} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Refresh Data">
                   <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
               </button>
           </div>
           <p className="text-slate-500 font-bold mt-1">Transactions for {formatDateDisplay(selectedDate)}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center bg-white border-2 border-slate-200 rounded-xl p-1.5 shadow-sm">
            <div className="px-3 py-2 text-indigo-600 bg-indigo-50 rounded-lg mr-2">
                <Calendar className="w-5 h-5" />
            </div>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-slate-800 font-black text-sm"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/20 bg-gradient-to-br from-indigo-600 to-indigo-800 transform hover:scale-[1.01] transition-all duration-300 relative overflow-hidden border border-indigo-700 flex justify-between items-center">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="relative z-10">
                  <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-2 border-b border-indigo-400/30 pb-1 inline-block">Daily Collection</p>
                  <h3 className="text-5xl font-black tracking-tight">₹{totalDailyRevenue.toLocaleString()}</h3>
                  <p className="text-indigo-300 text-xs font-bold mt-2 flex items-center"><Zap className="w-3 h-3 mr-1" /> Real-time tracking active</p>
              </div>
              <div className="p-5 bg-white/20 rounded-[2rem] backdrop-blur-md border border-white/20 shadow-inner">
                  <CreditCard className="w-10 h-10" />
              </div>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] flex justify-between items-center group hover:border-indigo-200 transition-colors">
              <div>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2">Total Activity</p>
                  <h3 className="text-5xl font-black text-slate-800 tracking-tight">{totalTxns} <span className="text-lg text-slate-300 font-bold ml-1 uppercase">Entries</span></h3>
              </div>
              <div className="p-5 bg-slate-100 text-slate-600 rounded-[2rem] shadow-inner border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                  <FileText className="w-10 h-10" />
              </div>
          </div>
      </div>

      {/* ULTRA-MINIMAL FLOATING ACTION ICONS - LEFT ALIGNED & NO WHITE BAR */}
      <div className="sticky top-[70px] lg:top-4 z-[40] mb-6 flex justify-start items-center gap-3 px-1 h-14">
          {/* SEARCH TRIGGER */}
          <div className={`flex items-center transition-all duration-500 ease-in-out ${isSearchExpanded ? 'w-full md:w-80' : 'w-auto'}`}>
              <button 
                  onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-all shadow-xl active:scale-95
                      ${searchTerm || isSearchExpanded ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'}`}
                  title="Search Transaction"
              >
                  {isSearchExpanded && !searchTerm ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
              
              {isSearchExpanded && (
                  <div className="ml-2 w-full animate-in slide-in-from-left-4 fade-in duration-300">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Type to find..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full bg-white/95 backdrop-blur-md border-2 border-indigo-500 rounded-2xl px-5 py-3 font-black text-sm shadow-2xl focus:ring-4 focus:ring-indigo-500/20 focus:outline-none" 
                    />
                  </div>
              )}
          </div>
          
          {/* FILTER TRIGGER (Always Visible next to Search) */}
          <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-4 rounded-2xl border-2 transition-all flex items-center justify-center shadow-xl active:scale-95 shrink-0
                  ${showFilters || isFilterActive ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200'}`}
              title="Filter Categories"
          >
              <Filter className="w-5 h-5" />
              {isFilterActive && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
          </button>

          {/* EXPANDABLE FILTER PANEL */}
          {showFilters && (
              <div className="absolute top-full left-0 mt-4 p-8 bg-white rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] border-2 border-indigo-100 animate-in zoom-in-95 duration-300 z-[50] w-full md:w-[450px]">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                      <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Filter Options</h3>
                      <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Service Category</label>
                          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full appearance-none pl-5 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-black outline-none">
                              <option value="ALL">All Services</option>
                              <option value="NEW">New Patch</option>
                              <option value="SERVICE">Service</option>
                              <option value="WASHING">Washing</option>
                              <option value="DEMO">Demo</option>
                              <option value="MUNDAN">Mundan</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Payment Status</label>
                          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="w-full appearance-none pl-5 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-black outline-none">
                              <option value="ALL">All Payments</option>
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="CARD">Card</option>
                              <option value="PENDING">Pending</option>
                          </select>
                      </div>
                      <div className="pt-4 flex gap-3">
                          <button onClick={resetFilters} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest">Reset</button>
                          <button onClick={() => setShowFilters(false)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200">Apply</button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-[0.2em] border-b border-slate-200">
                     <tr>
                         <th className="px-8 py-6">Client Identity</th>
                         <th className="px-8 py-6">Contact / Area</th>
                         <th className="px-8 py-6">Service Type</th>
                         <th className="px-8 py-6">Payment</th>
                         <th className="px-8 py-6 text-right">Amount</th>
                         <th className="px-8 py-6 text-center">Action</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {loading ? (
                         <tr><td colSpan={6} className="text-center py-16 font-bold text-slate-400 italic animate-pulse tracking-widest">Syncing with database...</td></tr>
                     ) : filteredData.length === 0 ? (
                         <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-black italic opacity-60 uppercase text-xs">No matching records found</td></tr>
                     ) : (
                         filteredData.map((entry, idx) => (
                             <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                 <td className="px-8 py-6">
                                     <div className="font-black text-slate-800 text-base uppercase leading-none mb-1.5">{entry.clientName}</div>
                                     <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{formatDateDisplay(entry.date)}</div>
                                 </td>
                                 <td className="px-8 py-6">
                                     <div className="font-bold text-slate-700">{entry.contactNo}</div>
                                     <div className="text-[11px] text-slate-400 truncate max-w-[150px] font-bold uppercase tracking-tight">{entry.address}</div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <div className="flex flex-col items-start gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm
                                        ${entry.serviceType === 'NEW' ? 'bg-blue-600 text-white border-blue-700' : 
                                          entry.serviceType === 'SERVICE' ? 'bg-emerald-600 text-white border-emerald-700' : 
                                          entry.serviceType === 'DEMO' ? 'bg-amber-500 text-white border-amber-600' :
                                          entry.serviceType === 'WASHING' ? 'bg-indigo-600 text-white border-indigo-700' :
                                          'bg-slate-600 text-white border-slate-700'}`}>
                                            {entry.serviceType}
                                        </span>
                                        <div className="flex items-center text-xs font-black text-slate-500 uppercase tracking-tight">
                                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                            {entry.technician}
                                        </div>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                     <div className="font-black text-[10px] uppercase bg-white shadow-sm px-3 py-1.5 rounded-lg inline-block text-slate-600 border border-slate-200 tracking-widest">{entry.paymentMethod}</div>
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                     <div className="font-black text-slate-900 text-xl tracking-tight">₹{entry.amount.toLocaleString()}</div>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                         <button onClick={() => openEditModal(entry)} className="p-2.5 rounded-xl bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white border-2 border-indigo-50 shadow-md transition-all active:scale-90"><Pencil className="w-4 h-4" /></button>
                                         <button onClick={() => handleDelete(entry.id, entry.clientName)} className="p-2.5 rounded-xl bg-white text-red-600 hover:bg-red-600 hover:text-white border-2 border-red-50 shadow-md transition-all active:scale-90"><Trash2 className="w-4 h-4" /></button>
                                         <button onClick={() => generateInvoice(entry)} className="p-2.5 rounded-xl bg-white text-slate-600 hover:bg-slate-800 hover:text-white border-2 border-slate-50 shadow-md transition-all active:scale-90"><Printer className="w-4 h-4" /></button>
                                     </div>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && editingEntry && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20">
                  <div className="bg-slate-900 px-10 py-8 flex justify-between items-center text-white">
                      <div>
                          <h3 className="font-black text-2xl flex items-center tracking-tight uppercase">
                              <Pencil className="w-7 h-7 mr-4 text-indigo-400" /> Edit Entry
                          </h3>
                          <p className="text-indigo-400 text-xs font-black mt-1 uppercase tracking-[0.3em]">{editingEntry.clientName}</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-3 rounded-full transition-colors"><X className="w-7 h-7" /></button>
                  </div>
                  
                  <form onSubmit={handleEditSubmit} className="p-10 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Staff Member</label>
                              <select 
                                  value={editForm.technician || ''} 
                                  onChange={e => setEditForm({...editForm, technician: e.target.value})} 
                                  className="w-full rounded-2xl border-slate-200 border-2 bg-slate-50 px-5 py-4 font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                              >
                                  {technicians.map(t => (<option key={t.name} value={t.name}>{t.name}</option>))}
                              </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Work</label>
                                  <select 
                                      value={editForm.serviceType || ''} 
                                      onChange={e => setEditForm({...editForm, serviceType: e.target.value as any})} 
                                      className="w-full rounded-2xl border-slate-200 border-2 bg-slate-50 px-4 py-4 font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                  >
                                      <option value="SERVICE">SERVICE</option>
                                      <option value="NEW">NEW</option>
                                      <option value="WASHING">WASHING</option>
                                      <option value="DEMO">DEMO</option>
                                      <option value="MUNDAN">MUNDAN</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Style</label>
                                  <select 
                                      value={editForm.patchMethod || ''} 
                                      onChange={e => setEditForm({...editForm, patchMethod: e.target.value as any})} 
                                      className="w-full rounded-2xl border-slate-200 border-2 bg-slate-50 px-4 py-4 font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                  >
                                      <option value="TAPING">TAPING</option>
                                      <option value="BONDING">BONDING</option>
                                      <option value="CLIPPING">CLIPPING</option>
                                  </select>
                              </div>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Total Bill (₹)</label>
                              <input 
                                  type="number" 
                                  value={editForm.amount} 
                                  onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})}
                                  className="w-full rounded-2xl border-slate-200 border-2 bg-slate-50 px-5 py-4 font-black text-slate-800 text-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" 
                              />
                          </div>

                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Revenue Mode</label>
                              <select 
                                  value={editForm.paymentMethod || ''} 
                                  onChange={e => setEditForm({...editForm, paymentMethod: e.target.value as any})} 
                                  className="w-full rounded-2xl border-slate-200 border-2 bg-slate-50 px-5 py-4 font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                              >
                                  <option value="CASH">CASH</option>
                                  <option value="UPI">UPI</option>
                                  <option value="CARD">CARD</option>
                                  <option value="PENDING">PENDING</option>
                              </select>
                          </div>

                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Observation Remarks</label>
                              <textarea 
                                  value={editForm.remark || ''} 
                                  onChange={e => setEditForm({...editForm, remark: e.target.value})} 
                                  rows={2} 
                                  className="w-full rounded-2xl border-slate-200 border-2 bg-slate-50 px-5 py-4 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner" 
                                  placeholder="Update any service observations..."
                              />
                          </div>
                      </div>

                      <div className="flex gap-4 pt-6">
                          <button 
                            type="button" 
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 py-5 border-2 border-slate-100 text-slate-400 font-black rounded-[1.5rem] hover:bg-slate-50 transition-colors uppercase tracking-[0.2em] text-xs"
                          >
                              Discard
                          </button>
                          <button 
                            type="submit"
                            disabled={submitting}
                            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-indigo-700 shadow-2xl shadow-indigo-300 transition-all flex items-center justify-center border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 uppercase tracking-[0.2em] text-sm"
                          >
                              {submitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-3" /> Commit Changes</>}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default DailyReport;
