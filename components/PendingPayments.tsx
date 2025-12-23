
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { 
  Wallet, CheckCircle2, Search, X, RefreshCw, Calendar, Phone, UploadCloud, 
  Check, ArrowRight, Clock, AlertTriangle, UserCheck, IndianRupee, Megaphone, 
  MapPin, Scissors, User, MessageCircle, Filter, ChevronDown, Copy, CheckSquare, 
  Trash2, Send, MessageSquare
} from 'lucide-react';

const PendingPayments: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>(''); 
  const [sortBy, setSortBy] = useState<'AMOUNT_DESC' | 'DATE_ASC' | 'DATE_DESC'>('DATE_ASC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [modalMode, setModalMode] = useState<'BOTH' | 'PAY' | 'FOLLOWUP'>('BOTH');
  const [amountToPay, setAmountToPay] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [nextCallDate, setNextCallDate] = useState('');
  const [remark, setRemark] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionCollected, setSessionCollected] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const allEntries = await api.getEntries(true);
        const pending = allEntries.filter(e => {
             const due = e.paymentMethod === 'PENDING' ? (e.amount || 0) : (e.pendingAmount || 0);
             return due > 0;
        });
        setEntries(pending);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const processedEntries = useMemo(() => {
      let data = entries.filter(e => {
          const matchSearch = e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || String(e.contactNo).includes(searchTerm);
          const matchDate = filterDate ? e.nextCallDate === filterDate : true;
          return matchSearch && matchDate;
      });
      data.sort((a, b) => {
          const dueA = a.paymentMethod === 'PENDING' ? a.amount : (a.pendingAmount || 0);
          const dueB = b.paymentMethod === 'PENDING' ? b.amount : (b.pendingAmount || 0);
          if (sortBy === 'AMOUNT_DESC') return dueB - dueA;
          const dateA = a.nextCallDate || '9999-99-99';
          const dateB = b.nextCallDate || '9999-99-99';
          if (sortBy === 'DATE_ASC') return dateA.localeCompare(dateB);
          if (sortBy === 'DATE_DESC') return dateB.localeCompare(dateA);
          return 0;
      });
      return data;
  }, [entries, searchTerm, filterDate, sortBy]);

  const stats = useMemo(() => {
      let totalOutstanding = 0;
      let overdueCount = 0;
      let criticalAmount = 0;
      let dueTodayCount = 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      entries.forEach(e => {
          const due = e.paymentMethod === 'PENDING' ? (e.amount || 0) : (e.pendingAmount || 0);
          totalOutstanding += due;
          if (e.nextCallDate === todayStr) dueTodayCount++;
          if (e.nextCallDate && e.nextCallDate < todayStr) {
              overdueCount++;
              if (e.nextCallDate < sevenDaysAgoStr) criticalAmount += due;
          }
      });
      return { totalOutstanding, overdueCount, criticalAmount, dueTodayCount };
  }, [entries, todayStr]);

  const handleSelectAll = () => {
      if (selectedIds.size === processedEntries.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(processedEntries.map(e => e.id)));
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const openFollowUpModal = (entry: Entry, mode: 'BOTH' | 'PAY' | 'FOLLOWUP' = 'BOTH') => {
      setSelectedEntry(entry);
      setModalMode(mode);
      setAmountToPay(entry.paymentMethod === 'PENDING' ? (entry.amount || '') : (entry.pendingAmount || ''));
      setNextCallDate(todayStr); 
      setRemark('');
      setScreenshotBase64(null);
      setIsModalOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              let width = img.width; let height = img.height;
              if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
              canvas.width = width; canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              setScreenshotBase64(canvas.toDataURL('image/jpeg', 0.7));
          };
      };
  };

  const handleUpdate = async (e: React.FormEvent, isPayment: boolean) => {
      e.preventDefault();
      if (!selectedEntry) return;
      setSubmitting(true);
      try {
          const currentPending = selectedEntry.paymentMethod === 'PENDING' ? (selectedEntry.amount || 0) : (selectedEntry.pendingAmount || 0);
          const paid = isPayment ? Number(amountToPay) : 0;
          let newPending = currentPending;
          if (paid > 0) {
              newPending = Math.max(0, currentPending - paid);
              setSessionCollected(prev => prev + paid);
          }
          await api.updatePaymentFollowUp({
              id: selectedEntry.id, clientName: selectedEntry.clientName, contactNo: selectedEntry.contactNo, address: selectedEntry.address,
              paymentMethod: paid > 0 ? paymentMethod : selectedEntry.paymentMethod, paidAmount: paid, pendingAmount: newPending,
              nextCallDate: nextCallDate, remark: remark, screenshotBase64: screenshotBase64 || undefined, existingScreenshotUrl: selectedEntry.paymentScreenshotUrl
          });
          await loadData();
          setIsModalOpen(false);
          setSelectedEntry(null);
      } catch (err) { alert("Failed to update."); } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-7xl mx-auto pb-40 animate-in fade-in duration-500 relative min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-3xl p-6 border-l-8 border-l-red-500 shadow-lg shadow-red-100 flex items-center justify-between group hover:-translate-y-1 transition-transform"><div><div className="flex items-center gap-2 mb-2"><span className="bg-red-100 text-red-600 p-1.5 rounded-lg"><AlertTriangle className="w-4 h-4" /></span><p className="text-slate-500 text-xs font-black uppercase tracking-widest">Total Outstanding</p></div><h3 className="text-3xl font-black text-slate-800">₹{stats.totalOutstanding.toLocaleString()}</h3><p className="text-xs font-bold text-red-500 mt-1">{entries.length} Clients Pending</p></div></div>
            <div className="bg-white rounded-3xl p-6 border-l-8 border-l-amber-500 shadow-lg shadow-amber-100 flex items-center justify-between group hover:-translate-y-1 transition-transform"><div><div className="flex items-center gap-2 mb-2"><span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Clock className="w-4 h-4" /></span><p className="text-slate-500 text-xs font-black uppercase tracking-widest">Today's Follow-ups</p></div><h3 className="text-3xl font-black text-slate-800">{stats.dueTodayCount}</h3><p className="text-xs font-bold text-amber-600 mt-1">Calls Scheduled Today</p></div></div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 flex items-center justify-between group hover:-translate-y-1 transition-transform"><div><div className="flex items-center gap-2 mb-2"><span className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><IndianRupee className="w-4 h-4 text-white" /></span><p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Today Collection</p></div><h3 className="text-3xl font-black">₹{sessionCollected.toLocaleString()}</h3><p className="text-xs font-bold text-emerald-100 mt-1 opacity-80">Session Total</p></div></div>
        </div>

        {/* FIXED FILTER BAR: Adjusted sticky top for mobile and added z-index for visibility */}
        <div className="sticky top-[70px] lg:top-4 z-[40] mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-xl border-2 border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search Client Name, Phone..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm" 
                    />
                </div>
                <div className="flex flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)} 
                            className="w-full pl-4 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-600" 
                        />
                    </div>
                    <div className="relative flex-1 sm:flex-none group">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value as any)} 
                            className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-600 cursor-pointer"
                        >
                            <option value="DATE_ASC">📅 Due (Old)</option>
                            <option value="DATE_DESC">📅 Due (New)</option>
                            <option value="AMOUNT_DESC">💰 Amount</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20"><RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" /><p className="text-slate-400 font-bold">Loading payments...</p></div>
            ) : processedEntries.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-12 text-center"><h3 className="text-2xl font-black text-slate-800 mb-2">All Caught Up!</h3><p className="text-slate-500 font-medium">No pending payments.</p></div>
            ) : (
                processedEntries.map(entry => {
                    const dueAmount = entry.paymentMethod === 'PENDING' ? entry.amount : entry.pendingAmount;
                    const isToday = entry.nextCallDate === todayStr;
                    const isOverdue = entry.nextCallDate && entry.nextCallDate < todayStr;
                    const isSelected = selectedIds.has(entry.id);
                    return (
                        <div key={entry.id} className={`group relative bg-white rounded-2xl p-4 border-2 transition-all duration-300 flex flex-col md:flex-row items-center gap-4 ${isSelected ? 'border-indigo-500 bg-indigo-50/10' : isToday ? 'border-amber-300 shadow-amber-50' : isOverdue ? 'border-red-300 shadow-red-50' : 'border-slate-100 shadow-sm'}`}>
                            <div className="flex items-center gap-4 w-full md:w-[25%]">
                                <button onClick={() => toggleSelection(entry.id)} className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>{isSelected && <Check className="w-4 h-4" />}</button>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 border ${isToday ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{entry.clientName.charAt(0)}</div>
                                <div className="min-w-0 flex-1"><h4 className="font-black text-slate-800 text-base truncate">{entry.clientName}</h4><p className="text-xs font-bold text-slate-400 truncate">{entry.contactNo}</p></div>
                            </div>
                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Service Date</span><span className="text-xs font-bold text-slate-700 flex items-center"><Calendar className="w-3 h-3 mr-1.5" />{formatDateDisplay(entry.date)}</span></div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Next Follow-up</span><span className={`text-xs font-bold flex items-center ${isOverdue ? 'text-red-600' : isToday ? 'text-amber-600' : 'text-slate-700'}`}><Clock className="w-3 h-3 mr-1.5" />{entry.nextCallDate ? formatDateDisplay(entry.nextCallDate) : 'Not Scheduled'}</span></div>
                                
                                {/* REMARK BOX - ENHANCED WITH POPOVER REVEAL */}
                                <div 
                                    className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex flex-col justify-center transition-all duration-300 hover:border-amber-400 group/rem relative cursor-help"
                                    title={entry.remark || 'No remarks'}
                                >
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-0.5">Last Remark</span>
                                    <span className="text-xs font-bold text-slate-700 truncate block">
                                        {entry.remark || 'No remarks'}
                                    </span>
                                    
                                    {/* FULL REMARK POPOVER ON HOVER */}
                                    {entry.remark && entry.remark.length > 20 && (
                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover/rem:block z-[100] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                                            <div className="bg-slate-900 text-white text-xs font-medium p-4 rounded-2xl shadow-2xl min-w-[200px] max-w-[300px] border border-slate-700 leading-relaxed whitespace-normal break-words">
                                                <div className="text-[9px] font-black uppercase text-indigo-400 mb-1 border-b border-white/10 pb-1">Full Remark</div>
                                                {entry.remark}
                                                <div className="absolute top-full left-6 -mt-1 w-3 h-3 bg-slate-900 transform rotate-45 border-r border-b border-slate-700"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between w-full md:w-auto gap-6 pl-2 border-l border-slate-200">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending</p>
                                    <p className="text-xl font-black text-slate-800">₹{dueAmount}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openFollowUpModal(entry, 'FOLLOWUP')} className="px-4 py-2.5 rounded-xl bg-white text-indigo-600 font-bold text-sm border border-indigo-200 flex items-center hover:bg-indigo-50 transition-colors">Follow Up</button>
                                    <button onClick={() => openFollowUpModal(entry, 'PAY')} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg flex items-center hover:bg-emerald-700 transition-all active:scale-95">Paid</button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        {isModalOpen && selectedEntry && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 border border-white/20 flex flex-col max-h-[90vh]">
                    <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white"><div><h3 className="font-black text-xl tracking-tight">{selectedEntry.clientName}</h3><p className="text-slate-400 text-xs font-bold">Due: ₹{selectedEntry.paymentMethod === 'PENDING' ? selectedEntry.amount : selectedEntry.pendingAmount}</p></div><button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full"><X className="w-6 h-6" /></button></div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className={`flex-1 space-y-5 ${modalMode === 'PAY' ? 'opacity-50 pointer-events-none' : ''}`}><h4 className="font-black text-slate-800 text-lg">Follow-up Update</h4><div><label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Next Date</label><input type="date" value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" /></div><div><label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Remark</label><textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" /></div><button onClick={(e) => handleUpdate(e, false)} disabled={submitting} className="w-full py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl">{submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Save Update Only'}</button></div>
                            <div className={`flex-1 space-y-5 ${modalMode === 'FOLLOWUP' ? 'opacity-50 pointer-events-none' : ''}`}><h4 className="font-black text-slate-800 text-lg">Record Payment</h4><div><label className="block text-[10px] font-black uppercase text-emerald-600 mb-2">Amount Received</label><input type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} className="w-full px-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-slate-800" /></div><div><label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Mode</label><div className="grid grid-cols-3 gap-2">{['CASH', 'UPI', 'CARD'].map(m => (<button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2 rounded-lg text-xs font-black border ${paymentMethod === m ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`}>{m}</button>))}</div></div><div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-2 border-dashed rounded-xl p-3 flex items-center justify-center text-slate-400">{screenshotBase64 ? 'Proof Added' : 'Upload Proof'}<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} /></div><button onClick={(e) => handleUpdate(e, true)} disabled={submitting || !amountToPay} className="w-full py-4 text-white font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-lg">{submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}</button></div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PendingPayments;
