
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Entry, Technician } from '../types';
import {
    Calendar, Filter, FileText, UserPlus, Scissors, CreditCard, Search, Wallet,
    Smartphone, Landmark, AlertCircle, RefreshCw, Eye, FileDown, Printer, User,
    Ruler, Sparkles, Layers, Pencil, X, Save, Droplets, Zap, UserCheck, Trash2,
    AlertTriangle, SlidersHorizontal, ChevronDown, RotateCcw, MapPin
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
    const [branchFilter, setBranchFilter] = useState('ALL'); // NEW: Branch Filter
    const [searchTerm, setSearchTerm] = useState('');

    // UI States for Toolbar
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
    const [editForm, setEditForm] = useState<Partial<Entry>>({});

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadData(false);
        loadOptions();

        // Live updates: swap in fresher rows without flashing the loading state.
        return api.subscribe(async () => {
            try {
                setEntries(await api.getEntries());
            } catch (e) { /* keep showing what we have */ }
        });
    }, []);

    const loadData = async (forceRefresh: boolean = false) => {
        setLoading(true);
        try {
            const data = await api.getEntries(forceRefresh);
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
            pendingAmount: entry.pendingAmount || 0,
            date: entry.date
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

    const handleDeleteConfirm = async () => {
        if (!deletingId) return;
        setSubmitting(true);
        try {
            await api.deleteEntry(deletingId);
            await loadData();
            setDeletingId(null);
        } catch (e) {
            alert("Failed to delete record.");
        } finally {
            setSubmitting(false);
        }
    };

    const resetFilters = () => {
        setServiceFilter('ALL');
        setPaymentFilter('ALL');
        setBranchFilter('ALL');
        setShowFilters(false);
    };

    const filteredData = useMemo(() => {
        return entries.filter(entry => {
            if (entry.date !== selectedDate) return false;
            if (branchFilter !== 'ALL' && entry.branch !== branchFilter) return false; // Filter Logic
            if (serviceFilter !== 'ALL' && entry.serviceType !== serviceFilter) return false;
            if (paymentFilter !== 'ALL' && entry.paymentMethod !== paymentFilter) return false;
            if (searchTerm && !String(entry.clientName || '').toLowerCase().includes(String(searchTerm).toLowerCase())) return false;
            return true;
        });
    }, [entries, selectedDate, branchFilter, serviceFilter, paymentFilter, searchTerm]);

    const dailyEntries = filteredData; // Use filtered data for summary to reflect branch selection

    const totalDailyRevenue = useMemo(() => dailyEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0), [dailyEntries]);
    const totalTxns = dailyEntries.length;

    // Detailed Counts based on filtered data
    const serviceStats = useMemo(() => ({
        NEW: dailyEntries.filter(e => e.serviceType === 'NEW').length,
        SERVICE: dailyEntries.filter(e => e.serviceType === 'SERVICE').length,
        WASHING: dailyEntries.filter(e => e.serviceType === 'WASHING').length,
        DEMO: dailyEntries.filter(e => e.serviceType === 'DEMO').length,
        MUNDAN: dailyEntries.filter(e => e.serviceType === 'MUNDAN').length,
    }), [dailyEntries]);

    const paymentStats = useMemo(() => {
        let cash = 0;
        let upi = 0;
        let card = 0;
        let pending = 0;

        dailyEntries.forEach(e => {
            const bill = Number(e.amount || 0);
            const due = Number(e.pendingAmount || 0);
            const paid = bill - due;
            const method = String(e.paymentMethod || '').toUpperCase();

            // Handle dedicated methods
            if (method === 'CASH') {
                cash += paid;
            } else if (method === 'UPI') {
                upi += paid;
            } else if (method === 'CARD') {
                card += paid;
            } 
            // Handle Mixed / Split payments
            else if (method.includes('MIXED')) {
                const cashMatch = e.remark?.match(/Cash:\s*(\d+)/);
                const upiMatch = e.remark?.match(/UPI:\s*(\d+)/);
                if (cashMatch) cash += Number(cashMatch[1]);
                if (upiMatch) upi += Number(upiMatch[1]);
            }

            // Always track pending components
            pending += due;
        });

        return { CASH: cash, UPI: upi, CARD: card, PENDING: pending };
    }, [dailyEntries]);

    const card3D = "bg-white rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-2 border-slate-200 p-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden";

    // --- COCKPIT BOARD DATA ---
    const paymentTotal = paymentStats.CASH + paymentStats.UPI + paymentStats.CARD + paymentStats.PENDING;
    const payShare = (v: number) => (paymentTotal > 0 ? (v / paymentTotal) * 100 : 0);

    const serviceCells = [
        { key: 'NEW', label: 'New Patch', value: serviceStats.NEW, bar: 'bg-blue-400' },
        { key: 'SERVICE', label: 'Service', value: serviceStats.SERVICE, bar: 'bg-emerald-400' },
        { key: 'WASHING', label: 'Washing', value: serviceStats.WASHING, bar: 'bg-indigo-400' },
        { key: 'DEMO', label: 'Demo', value: serviceStats.DEMO, bar: 'bg-amber-400' },
        { key: 'MUNDAN', label: 'Mundan', value: serviceStats.MUNDAN, bar: 'bg-purple-400' },
    ];
    const serviceMax = Math.max(1, ...serviceCells.map(c => c.value));

    const paymentCells = [
        { label: 'Cash', value: paymentStats.CASH, dot: 'bg-emerald-400', bar: 'bg-emerald-400' },
        { label: 'UPI', value: paymentStats.UPI, dot: 'bg-blue-400', bar: 'bg-blue-400' },
        { label: 'Card', value: paymentStats.CARD, dot: 'bg-purple-400', bar: 'bg-purple-400' },
        { label: 'Pending', value: paymentStats.PENDING, dot: 'bg-rose-400', bar: 'bg-rose-400' },
    ];

    return (
        <div className="max-w-7xl mx-auto w-full space-y-3 pb-20">

            {/* PAGE MOTION KEYFRAMES */}
            <style>{`
                @keyframes drRise {
                    from { opacity: 0; transform: translateY(14px) scale(0.985); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .dr-rise {
                    opacity: 0;
                    animation: drRise 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                @media (prefers-reduced-motion: reduce) {
                    .dr-rise { animation: none; opacity: 1; transform: none; }
                }
            `}</style>


            {/* DELETE CONFIRMATION MODAL */}
            {deletingId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border-2 border-red-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Confirm Deletion</h3>
                            <p className="text-sm text-slate-500 font-medium mb-6">
                                Are you sure you want to remove this record? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeletingId(null)}
                                    className="flex-1 py-3.5 rounded-xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={submitting}
                                    className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-200/50 transition-all active:scale-95 flex items-center justify-center"
                                >
                                    {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COCKPIT BOARD — title, filters, collection, service counts & payment split in one dark board */}
            <div className="relative rounded-2xl overflow-hidden p-3.5 md:p-4 z-20 dr-rise bg-[radial-gradient(120%_120%_at_100%_0%,#312e81_0%,#0f172a_55%,#020617_100%)] shadow-[0_20px_44px_-22px_rgba(2,6,23,0.9)] ring-1 ring-white/10" style={{ animationDelay: '0ms' }}>
                {/* Faint grid texture */}
                <div className="pointer-events-none absolute inset-0 opacity-50 bg-[linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:34px_100%]" />

                {/* TOP: title + controls */}
                <div className="relative z-10 flex flex-wrap items-center gap-2 mb-3.5">
                    <h2 className="text-sm md:text-base font-black text-white tracking-tight mr-auto">Daily Report</h2>

                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20" />
                        Live
                    </span>

                    <button
                        onClick={() => loadData(true)}
                        title="Refresh Data"
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Date */}
                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-300 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="pl-8 pr-2 py-1.5 bg-white/5 border border-white/15 backdrop-blur-sm text-slate-100 text-[11px] font-bold tabular-nums rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 hover:bg-white/10 transition-all cursor-pointer [color-scheme:dark]"
                        />
                    </div>

                    {/* Branch */}
                    <div className="relative">
                        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300 pointer-events-none z-10" />
                        <select
                            value={branchFilter}
                            onChange={e => setBranchFilter(e.target.value)}
                            className="pl-8 pr-7 py-1.5 bg-white/5 border border-white/15 backdrop-blur-sm text-slate-100 text-[11px] font-bold rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 hover:bg-white/10 transition-all cursor-pointer appearance-none"
                        >
                            <option value="ALL" className="text-slate-800">All Branches</option>
                            <option value="RPR" className="text-slate-800">Raipur</option>
                            <option value="JDP" className="text-slate-800">Jagdalpur</option>
                            <option value="RPR-MOWA" className="text-slate-800">Mowa</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* BODY: collection + service counts */}
                <div className="relative z-10 flex flex-col md:flex-row md:items-stretch gap-3 md:gap-4">
                    {/* Hero */}
                    <div className="flex md:block items-end justify-between shrink-0 md:min-w-[150px]">
                        <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Daily Collection</p>
                            <h3 className="text-[26px] md:text-[30px] font-black text-white tracking-tight tabular-nums leading-none">₹{totalDailyRevenue.toLocaleString()}</h3>
                        </div>
                        <p className="md:mt-1.5 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                            <span className="text-slate-200">{totalTxns}</span> entries today
                        </p>
                    </div>

                    <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0" />

                    {/* Service counts */}
                    <div className="flex-1 grid grid-cols-5 gap-0 self-center border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                        {serviceCells.map((c, i) => (
                            <div key={c.key} className={`px-1 md:px-2 min-w-0 text-center md:text-left ${i > 0 ? 'border-l border-white/[0.07]' : ''}`}>
                                <p className={`text-base md:text-[17px] font-black tabular-nums leading-none ${c.value > 0 ? 'text-white' : 'text-slate-600'}`}>{c.value}</p>
                                <p className="mt-1 text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-[0.08em] text-slate-500 truncate">{c.label}</p>
                                <div className="mt-1.5 h-0.5 rounded-full bg-white/[0.08] overflow-hidden">
                                    <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${(c.value / serviceMax) * 100}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PAYMENT SPLIT */}
                <div className="relative z-10 mt-4 pt-3.5 border-t border-white/10 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2.5 sm:gap-y-3">
                    {paymentCells.map(p => (
                        <span key={p.label} className="flex items-center gap-2 text-[11px] font-bold text-slate-400 whitespace-nowrap min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                            <span className="tracking-wide">{p.label}</span>
                            <b className="text-white font-black text-sm tabular-nums tracking-tight truncate">₹{p.value.toLocaleString()}</b>
                        </span>
                    ))}
                    <span className="col-span-2 w-full sm:w-auto sm:ml-auto sm:max-w-[180px] sm:flex-1 sm:min-w-[110px] h-1.5 rounded-full bg-white/[0.08] flex overflow-hidden">
                        {paymentCells.map(p => (
                            <i key={p.label} className={`h-full ${p.bar}`} style={{ width: `${payShare(p.value)}%` }} />
                        ))}
                    </span>
                </div>

                {/* SEARCH & FILTERS */}
                <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1 md:max-w-xs group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-300 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search client name..."
                            className="w-full pl-8 pr-7 py-1.5 bg-white/5 border border-white/15 backdrop-blur-sm rounded-lg text-[11px] font-bold text-slate-100 placeholder:text-slate-500 placeholder:font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 hover:bg-white/10 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 text-slate-300 flex items-center justify-center hover:bg-rose-500/30 hover:text-rose-200 transition-colors"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {/* Service Filter */}
                        <div className="relative min-w-[120px] flex-1 md:flex-none">
                            <select
                                value={serviceFilter}
                                onChange={e => setServiceFilter(e.target.value)}
                                className={`w-full pl-2.5 pr-7 py-1.5 rounded-lg text-[11px] font-bold outline-none appearance-none cursor-pointer transition-all backdrop-blur-sm border
                                ${serviceFilter !== 'ALL' ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-100' : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'}`}
                            >
                                <option value="ALL" className="text-slate-800">All Services</option>
                                <option value="NEW" className="text-slate-800">New Patch</option>
                                <option value="SERVICE" className="text-slate-800">Service</option>
                                <option value="WASHING" className="text-slate-800">Washing</option>
                                <option value="DEMO" className="text-slate-800">Demo</option>
                                <option value="MUNDAN" className="text-slate-800">Mundan</option>
                            </select>
                            <Filter className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${serviceFilter !== 'ALL' ? 'text-indigo-300' : 'text-slate-500'}`} />
                        </div>

                        {/* Payment Filter */}
                        <div className="relative min-w-[120px] flex-1 md:flex-none">
                            <select
                                value={paymentFilter}
                                onChange={e => setPaymentFilter(e.target.value)}
                                className={`w-full pl-2.5 pr-7 py-1.5 rounded-lg text-[11px] font-bold outline-none appearance-none cursor-pointer transition-all backdrop-blur-sm border
                                ${paymentFilter !== 'ALL' ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100' : 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10'}`}
                            >
                                <option value="ALL" className="text-slate-800">All Payments</option>
                                <option value="CASH" className="text-slate-800">Cash</option>
                                <option value="UPI" className="text-slate-800">UPI</option>
                                <option value="CARD" className="text-slate-800">Card</option>
                                <option value="PENDING" className="text-slate-800">Pending</option>
                            </select>
                            <span className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${paymentFilter !== 'ALL' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        </div>

                        {/* Reset */}
                        {(serviceFilter !== 'ALL' || paymentFilter !== 'ALL' || branchFilter !== 'ALL' || searchTerm) && (
                            <button
                                onClick={resetFilters}
                                className="px-2.5 py-1.5 bg-white/5 border border-white/15 text-slate-300 hover:bg-rose-500/20 hover:border-rose-400/40 hover:text-rose-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap active:scale-95"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>


            <div className="bg-white rounded-2xl shadow-[0_8px_30px_-14px_rgba(15,23,42,0.22)] border border-slate-200/70 overflow-hidden dr-rise" style={{ animationDelay: '90ms' }}>
                {/* MOBILE CARD LIST */}
                <div className="md:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="text-center py-12 font-bold text-slate-400 text-sm">Loading data...</div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium text-sm px-4">No records found for selected filters.</div>
                    ) : (
                        filteredData.map((entry, idx) => (
                            <div key={idx} className="p-3.5">
                                {/* Row 1: name + amount */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{entry.clientName}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 tabular-nums">{formatDateDisplay(entry.date)}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Amount</p>
                                        <p className="font-black text-slate-900 text-base tabular-nums leading-none">₹{entry.amount}</p>
                                    </div>
                                </div>

                                {/* Row 2: contact */}
                                <div className="flex items-center gap-2 mt-2">
                                    <a
                                        href={`tel:${entry.contactNo}`}
                                        className="text-xs font-bold text-slate-600 tabular-nums bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                                    >
                                        {entry.contactNo}
                                    </a>
                                    {entry.address && (
                                        <span className="text-[11px] text-slate-400 font-medium truncate">{entry.address}</span>
                                    )}
                                </div>

                                {/* Row 3: service + chips */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border
                                        ${entry.serviceType === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            entry.serviceType === 'SERVICE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                entry.serviceType === 'DEMO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    entry.serviceType === 'WASHING' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                        {entry.serviceType === 'NEW' && <Sparkles className="w-2.5 h-2.5" />}
                                        {entry.serviceType === 'SERVICE' && <Scissors className="w-2.5 h-2.5" />}
                                        {entry.serviceType === 'DEMO' && <Layers className="w-2.5 h-2.5" />}
                                        {entry.serviceType}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-md px-1.5 py-0.5">
                                        <User className="w-2.5 h-2.5 text-slate-400" />
                                        {entry.technician}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-1.5 py-0.5 uppercase">
                                        {entry.patchMethod || 'N/A'}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-500 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 uppercase">
                                        {entry.branch}
                                    </span>
                                    {entry.patchSize && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5">
                                            <Ruler className="w-2.5 h-2.5" />
                                            {entry.patchSize}
                                        </span>
                                    )}
                                </div>

                                {/* Row 4: payment + actions */}
                                <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-dashed border-slate-100">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                        {entry.paymentMethod}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => openEditModal(entry)}
                                            className="p-2 rounded-lg bg-white text-indigo-600 border border-indigo-200 active:scale-90 transition-transform"
                                            title="Edit Transaction"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(entry.id)}
                                            className="p-2 rounded-lg bg-white text-red-500 border border-red-200 active:scale-90 transition-transform"
                                            title="Delete Record"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        {entry.invoiceUrl && entry.invoiceUrl.startsWith('http') && (
                                            <a
                                                href={entry.invoiceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 active:scale-90 transition-transform"
                                                title="Download Saved PDF"
                                            >
                                                <FileDown className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => generateInvoice(entry)}
                                            className="p-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 active:scale-90 transition-transform"
                                            title="Print / Generate Invoice"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-900 text-white uppercase font-black text-[10px] border-b border-indigo-500/30">
                            <tr>
                                <th className="px-5 py-3.5 tracking-[0.12em]">Client Name</th>
                                <th className="px-5 py-3.5 tracking-[0.12em]">Contact / Address</th>
                                <th className="px-5 py-3.5 tracking-[0.12em]">Service</th>
                                <th className="px-5 py-3.5 tracking-[0.12em]">Payment</th>
                                <th className="px-5 py-3.5 text-right tracking-[0.12em]">Amount</th>
                                <th className="px-5 py-3.5 text-center tracking-[0.12em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12 font-bold text-slate-400">Loading data...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No records found for selected filters.</td></tr>
                            ) : (
                                filteredData.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="font-black text-slate-800 text-base">{entry.clientName}</div>
                                            <div className="text-xs font-bold text-slate-400 mt-1">{formatDateDisplay(entry.date)}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-700">{entry.contactNo}</div>
                                            <div className="text-xs text-slate-400 truncate max-w-[150px] font-medium">{entry.address}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col items-start gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm
                                        ${entry.serviceType === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        entry.serviceType === 'SERVICE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            entry.serviceType === 'DEMO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                entry.serviceType === 'WASHING' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                                    'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                    {entry.serviceType === 'NEW' && <Sparkles className="w-3 h-3" />}
                                                    {entry.serviceType === 'SERVICE' && <Scissors className="w-3 h-3" />}
                                                    {entry.serviceType === 'DEMO' && <Layers className="w-3 h-3" />}
                                                    {entry.serviceType}
                                                </span>

                                                <div className="space-y-1 pl-1">
                                                    <div className="flex items-center text-sm font-bold text-slate-700 cursor-help" title={`Technician: ${entry.technician}`}>
                                                        <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                        {entry.technician}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase cursor-help"
                                                            title={`Method: ${entry.patchMethod || 'N/A'}`}
                                                        >
                                                            {entry.patchMethod || 'N/A'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                            {entry.branch}
                                                        </span>
                                                    </div>

                                                    {entry.patchSize && (
                                                        <div className="flex items-center text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 w-fit mt-1.5">
                                                            <Ruler className="w-3 h-3 mr-1.5" />
                                                            {entry.patchSize}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-xs uppercase bg-white shadow-sm px-3 py-1.5 rounded-lg inline-block text-slate-700 border border-slate-200">{entry.paymentMethod}</div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="font-black text-slate-900 text-lg">₹{entry.amount}</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => openEditModal(entry)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors shadow-sm"
                                                    title="Edit Transaction"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={() => setDeletingId(entry.id)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-white text-red-500 hover:bg-red-50 border border-red-200 transition-colors shadow-sm"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>

                                                {entry.invoiceUrl && entry.invoiceUrl.startsWith('http') && (
                                                    <a
                                                        href={entry.invoiceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm"
                                                        title="Download Saved PDF"
                                                    >
                                                        <FileDown className="w-4 h-4" />
                                                    </a>
                                                )}

                                                <button
                                                    onClick={() => generateInvoice(entry)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors shadow-sm"
                                                    title="Print / Generate Invoice"
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
                <div className="bg-slate-50 p-4 border-t border-slate-200 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Showing {filteredData.length} records
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && editingEntry && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black text-xl flex items-center tracking-tight uppercase">
                                    <Pencil className="w-6 h-6 mr-3 text-indigo-400" /> Edit Transaction
                                </h3>
                                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Client: {editingEntry.clientName}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Date</label>
                                    <input
                                        type="date"
                                        value={editForm.date || ''}
                                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-[13px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Assigned Technician</label>
                                    <select
                                        value={editForm.technician || ''}
                                        onChange={e => setEditForm({ ...editForm, technician: e.target.value })}
                                        className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    >
                                        {technicians.map(t => (<option key={t.name} value={t.name}>{t.name}</option>))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Type</label>
                                        <select
                                            value={editForm.serviceType || ''}
                                            onChange={e => setEditForm({ ...editForm, serviceType: e.target.value as any })}
                                            className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        >
                                            <option value="SERVICE">SERVICE</option>
                                            <option value="NEW">NEW</option>
                                            <option value="WASHING">WASHING</option>
                                            <option value="DEMO">DEMO</option>
                                            <option value="MUNDAN">MUNDAN</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Method</label>
                                        <select
                                            value={editForm.patchMethod || ''}
                                            onChange={e => setEditForm({ ...editForm, patchMethod: e.target.value as any })}
                                            className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        >
                                            <option value="TAPING">TAPING</option>
                                            <option value="BONDING">BONDING</option>
                                            <option value="CLIPPING">CLIPPING</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Bill Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={editForm.amount}
                                        onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                                        className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-black text-slate-800 text-lg outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Payment Method</label>
                                    <select
                                        value={editForm.paymentMethod || ''}
                                        onChange={e => setEditForm({ ...editForm, paymentMethod: e.target.value as any })}
                                        className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    >
                                        <option value="CASH">CASH</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CARD">CARD</option>
                                        <option value="PENDING">PENDING</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Notes / Remarks</label>
                                    <textarea
                                        value={editForm.remark || ''}
                                        onChange={e => setEditForm({ ...editForm, remark: e.target.value })}
                                        rows={3}
                                        className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                                        placeholder="Enter any update remarks..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-4 border-2 border-slate-200 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-colors uppercase tracking-widest text-sm"
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 uppercase tracking-widest"
                                >
                                    {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-3" /> Update Record</>}
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
