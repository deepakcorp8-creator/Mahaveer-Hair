import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { 
  Wallet, CheckCircle2, Search, X, RefreshCw, Calendar, Phone, UploadCloud, 
  Check, Clock, AlertTriangle, IndianRupee, MessageCircle, CheckSquare,
  ChevronDown, User
} from 'lucide-react';

// Helper Icon for Empty State (Defined at top to avoid ReferenceError)
const PartyPopperIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01" /><path d="M22 8h.01" /><path d="M15 2h.01" /><path d="M22 20h.01" /><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" /><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" /><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
    </svg>
);

const PendingPayments: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>(''); 
  const [sortBy, setSortBy] = useState<'AMOUNT_DESC' | 'DATE_ASC' | 'DATE_DESC'>('DATE_ASC');
  
  // Selection for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [modalMode, setModalMode] = useState<'BOTH' | 'PAY' | 'FOLLOWUP'>('BOTH');
  
  // Form State
  const [amountToPay, setAmountToPay] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [nextCallDate, setNextCallDate] = useState('');
  const [remark, setRemark] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session Stats
  const [sessionCollected, setSessionCollected] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const allEntries = await api.getEntries(true);
        // Filter only those with actual pending dues > 0
        const pending = allEntries.filter(e => {
             const due = e.paymentMethod === 'PENDING' ? (e.amount || 0) : (e.pendingAmount || 0);
             return due > 0;
        });
        setEntries(pending);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // --- DERIVED DATA ---
  
  const processedEntries = useMemo(() => {
      let data = entries.filter(e => {
          const matchSearch = e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || String(e.contactNo).includes(searchTerm);
          const matchDate = filterDate ? e.nextCallDate === filterDate : true;
          return matchSearch && matchDate;
      });

      // Sorting
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

  // KPI Calculations
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
          
          // Critical Overdue logic
          if (e.nextCallDate && e.nextCallDate < todayStr) {
              overdueCount++;
              if (e.nextCallDate < sevenDaysAgoStr) {
                  criticalAmount += due;
              }
          }
      });

      return { totalOutstanding, overdueCount, criticalAmount, dueTodayCount };
  }, [entries, todayStr]);


  // --- HANDLERS ---

  const handleSelectAll = () => {
      if (selectedIds.size === processedEntries.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(processedEntries.map(e => e.id)));
      }
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkAction = async (action: 'MARK_REVIEWED') => {
      if (!window.confirm(`Mark ${selectedIds.size} clients as reviewed (Next call +3 days)?`)) return;
      
      setLoading(true);
      try {
          // In a real app, use a bulk API. Here we loop (not ideal but works for small lists)
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 3);
          const dateStr = nextDate.toISOString().split('T')[0];

          for (const id of selectedIds) {
              const entry = entries.find(e => e.id === id);
              if (entry) {
                  await api.updatePaymentFollowUp({
                      id: entry.id,
                      clientName: entry.clientName,
                      remark: "Bulk update: Reviewed",
                      nextCallDate: dateStr,
                      pendingAmount: entry.pendingAmount // No change to money
                  });
              }
          }
          setSelectedIds(new Set());
          await loadData();
      } catch(e) {
          alert("Some updates failed.");
      } finally {
          setLoading(false);
      }
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

  const getWhatsAppLink = (entry: Entry) => {
      const due = entry.paymentMethod === 'PENDING' ? entry.amount : entry.pendingAmount;
      const msg = `Hello ${entry.clientName}, this is a gentle reminder from Mahaveer Hair Solution regarding your pending due of ₹${due}. Please clear it at your earliest convenience. Thank you!`;
      return `https://wa.me/91${String(entry.contactNo).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { alert("Please upload an image file."); return; }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              let width = img.width; let height = img.height;
              if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
              else { if (height > 800) { width *= 800 / height; height = 800; } }
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

          const newMethod = paid > 0 ? paymentMethod : selectedEntry.paymentMethod;
          const dateToSend = nextCallDate ? nextCallDate : '';

          await api.updatePaymentFollowUp({
              id: selectedEntry.id,
              clientName: selectedEntry.clientName,
              contactNo: selectedEntry.contactNo,
              address: selectedEntry.address,
              paymentMethod: newMethod,
              paidAmount: paid,
              pendingAmount: newPending,
              nextCallDate: dateToSend,
              remark: remark,
              screenshotBase64: screenshotBase64 || undefined,
              existingScreenshotUrl: selectedEntry.paymentScreenshotUrl
          });

          await loadData();
          setIsModalOpen(false);
          setSelectedEntry(null);
      } catch (err) {
          console.error(err);
          alert("Failed to update follow-up.");
      } finally {
          setSubmitting(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-40 animate-in fade-in duration-500 relative min-h-screen">
        
        {/* KPI CARDS - Redesigned for Risk/Action/Success */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            
            {/* 1. Total Outstanding (Red) */}
            <div className="bg-white rounded-3xl p-6 border-l-8 border-l-red-500 shadow-lg shadow-red-100 flex items-center justify-between group hover:-translate-y-1 transition-transform">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-100 text-red-600 p-1.5 rounded-lg"><AlertTriangle className="w-4 h-4" /></span>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Total Outstanding</p>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">₹{stats.totalOutstanding.toLocaleString()}</h3>
                    <p className="text-xs font-bold text-red-500 mt-1">{entries.length} Clients Pending</p>
                </div>
            </div>

            {/* 2. Today's Follow Up (Orange) */}
            <div className="bg-white rounded-3xl p-6 border-l-8 border-l-amber-500 shadow-lg shadow-amber-100 flex items-center justify-between group hover:-translate-y-1 transition-transform">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Clock className="w-4 h-4" /></span>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Today's Follow-ups</p>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.dueTodayCount}</h3>
                    <p className="text-xs font-bold text-amber-600 mt-1">Calls Scheduled Today</p>
                </div>
            </div>

            {/* 3. Today's Collection (Green) */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 flex items-center justify-between group hover:-translate-y-1 transition-transform">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><IndianRupee className="w-4 h-4 text-white" /></span>
                        <p className="text-emerald-100 text-xs font-black uppercase tracking-widest">Today Collection</p>
                    </div>
                    <h3 className="text-3xl font-black">₹{sessionCollected.toLocaleString()}</h3>
                    <p className="text-xs font-bold text-emerald-100 mt-1 opacity-80">Session Total</p>
                </div>
            </div>
        </div>

        {/* TOOLBAR: Search, Sort, Filter */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-slate-200 mb-6 sticky top-4 z-20 flex flex-col md:flex-row gap-4 items-center">
            
            {/* Search */}
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

            {/* Date Filter */}
            <div className="relative w-full md:w-auto">
                <input 
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full pl-4 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-600"
                />
            </div>

            {/* Sort Dropdown */}
            <div className="relative w-full md:w-auto group">
                <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-600 cursor-pointer"
                >
                    <option value="DATE_ASC">📅 Due Date (Earliest)</option>
                    <option value="DATE_DESC">📅 Due Date (Latest)</option>
                    <option value="AMOUNT_DESC">💰 Amount (High to Low)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
        </div>

        {/* SELECT ALL HEADER */}
        <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedIds.size === processedEntries.length && processedEntries.length > 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {selectedIds.size === processedEntries.length && processedEntries.length > 0 && <Check className="w-3.5 h-3.5" />}
                    </div>
                    Select All
                </button>
                <span className="text-xs font-semibold text-slate-400">
                    {processedEntries.length} Records Found
                </span>
            </div>
        </div>

        {/* MAIN LIST - Action First */}
        <div className="space-y-4">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                    <p className="text-slate-400 font-bold">Loading payments...</p>
                </div>
            ) : processedEntries.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-12 text-center">
                    <div className="inline-flex p-6 bg-emerald-50 rounded-full mb-6 shadow-sm animate-bounce">
                        <PartyPopperIcon className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">All Caught Up!</h3>
                    <p className="text-slate-500 font-medium">No pending payments matching your criteria.</p>
                </div>
            ) : (
                processedEntries.map(entry => {
                    const dueAmount = entry.paymentMethod === 'PENDING' ? entry.amount : entry.pendingAmount;
                    const isToday = entry.nextCallDate === todayStr;
                    const isOverdue = entry.nextCallDate && entry.nextCallDate < todayStr;
                    const isSelected = selectedIds.has(entry.id);
                    
                    return (
                        <div 
                            key={entry.id} 
                            className={`
                                group relative bg-white rounded-2xl p-4 border-2 transition-all duration-300 hover:shadow-lg flex flex-col md:flex-row items-center gap-4
                                ${isSelected ? 'border-indigo-500 bg-indigo-50/10' : isToday ? 'border-amber-300' : isOverdue ? 'border-red-300' : 'border-slate-300 hover:border-indigo-300'}
                            `}
                        >
                            {/* LEFT: Checkbox & Avatar */}
                            <div className="flex items-center gap-4 w-full md:w-[25%]">
                                <button onClick={() => toggleSelection(entry.id)} className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 hover:border-indigo-400 bg-white'}`}>
                                    {isSelected && <Check className="w-4 h-4" />}
                                </button>
                                
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 border ${isToday ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {entry.clientName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-black text-slate-800 text-base truncate">{entry.clientName}</h4>
                                    <p className="text-xs font-bold text-slate-400 truncate">{entry.contactNo}</p>
                                </div>
                            </div>

                            {/* MIDDLE: Info & Details (Replaced Status with Date/Remark) */}
                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Service Date */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Service Date</span>
                                    <span className="text-xs font-bold text-slate-700 flex items-center">
                                        <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                                        {new Date(entry.date).toLocaleDateString('en-GB')}
                                    </span>
                                </div>

                                {/* Technician */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Technician</span>
                                    <span className="text-xs font-bold text-slate-700 flex items-center truncate">
                                        <User className="w-3 h-3 mr-1.5 text-slate-400" />
                                        {entry.technician}
                                    </span>
                                </div>

                                {/* Last Remark */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex flex-col justify-center relative group/remark">
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-0.5">Last Remark</span>
                                    <span className="text-xs font-bold text-slate-700 truncate block w-full" title={entry.remark}>
                                        {entry.remark || 'No remarks'}
                                    </span>
                                </div>
                            </div>

                            {/* RIGHT: Financials & Action Buttons */}
                            <div className="flex items-center justify-between w-full md:w-auto gap-6 pl-2 border-l border-slate-200">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending</p>
                                    <p className="text-xl font-black text-slate-800">₹{dueAmount}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a 
                                        href={getWhatsAppLink(entry)}
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        title="WhatsApp Reminder"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </a>
                                    <a 
                                        href={`tel:${entry.contactNo}`}
                                        className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        title="Call Client"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </a>
                                    
                                    {/* FOLLOW UP BUTTON */}
                                    <button 
                                        onClick={() => openFollowUpModal(entry, 'FOLLOWUP')}
                                        className="px-4 py-2.5 rounded-xl bg-white text-indigo-600 font-bold text-sm shadow-sm border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center whitespace-nowrap"
                                    >
                                        <Clock className="w-4 h-4 mr-1.5" /> Follow Up
                                    </button>

                                    {/* PAID BUTTON (Renamed from Collect) */}
                                    <button 
                                        onClick={() => openFollowUpModal(entry, 'PAY')}
                                        className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center border border-emerald-700 whitespace-nowrap"
                                    >
                                        Paid <CheckCircle2 className="w-4 h-4 ml-1.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        {/* STICKY BOTTOM ACTION BAR (Bulk Actions) */}
        {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 w-full max-w-md px-4">
                <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-2 pl-6 pr-2 flex items-center justify-between gap-4 border border-slate-700 ring-4 ring-black/10">
                    <span className="font-bold text-sm whitespace-nowrap flex items-center">
                        <span className="bg-indigo-600 px-2 py-0.5 rounded text-xs mr-2 border border-indigo-500">{selectedIds.size}</span>
                        Selected
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handleBulkAction('MARK_REVIEWED')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-colors flex items-center whitespace-nowrap"
                        >
                            <CheckSquare className="w-4 h-4 mr-2" /> Mark Followed Up
                        </button>
                        <button 
                            onClick={() => setSelectedIds(new Set())}
                            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Update / Payment Modal */}
        {isModalOpen && selectedEntry && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 border border-white/20 flex flex-col max-h-[90vh]">
                    
                    <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white shrink-0">
                        <div>
                            <h3 className="font-black text-xl tracking-tight">{selectedEntry.clientName}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-slate-400 text-xs font-bold mt-1">
                                <span className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {selectedEntry.contactNo}</span>
                                <span className="hidden md:inline w-1 h-1 bg-slate-600 rounded-full"></span>
                                <span>Due: ₹{selectedEntry.paymentMethod === 'PENDING' ? selectedEntry.amount : selectedEntry.pendingAmount}</span>
                            </div>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors bg-slate-800/50"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Left: Quick Actions */}
                            <div className={`flex-1 space-y-5 transition-opacity duration-300 ${modalMode === 'PAY' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Phone className="w-5 h-5" /></div>
                                    <h4 className="font-black text-slate-800 text-lg">Follow-up & Update</h4>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Next Date</label>
                                    <input type="date" value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">New Remark</label>
                                    <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none resize-none focus:ring-2 focus:ring-indigo-500" placeholder="Client response..." />
                                </div>
                                <button onClick={(e) => handleUpdate(e, false)} disabled={submitting} className="w-full py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center">
                                    {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Save Update Only'}
                                </button>
                            </div>

                            <div className="hidden md:block w-px bg-slate-100"></div>

                            {/* Right: Payment */}
                            <div className={`flex-1 space-y-5 transition-opacity duration-300 ${modalMode === 'FOLLOWUP' ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet className="w-5 h-5" /></div>
                                    <h4 className="font-black text-slate-800 text-lg">Record Payment</h4>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Amount Received</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-300">₹</span>
                                        <input type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} className="w-full pl-9 pr-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-lg" placeholder="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Payment Mode</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['CASH', 'UPI', 'CARD'].map(m => (
                                            <button key={m} type="button" onClick={() => setPaymentMethod(m as any)} className={`py-2 rounded-lg text-xs font-black border transition-all ${paymentMethod === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{m}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <div className={`border-2 border-dashed rounded-xl p-3 flex items-center justify-center transition-colors ${screenshotBase64 ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-400'}`}>
                                        {screenshotBase64 ? <><Check className="w-4 h-4 mr-2" /> Proof Added</> : <><UploadCloud className="w-4 h-4 mr-2" /> Upload Proof</>}
                                    </div>
                                </div>
                                <button onClick={(e) => handleUpdate(e, true)} disabled={submitting || !amountToPay} className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center text-base ${!amountToPay ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-emerald-200'}`}>
                                    {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PendingPayments;