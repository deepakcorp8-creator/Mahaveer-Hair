
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { Entry, PaymentHistory } from '../types';
import {
    Wallet, CheckCircle2, Search, X, RefreshCw, Calendar, Phone, PhoneCall, UploadCloud,
    Check, ArrowRight, Clock, AlertTriangle, UserCheck, IndianRupee, Megaphone,
    MapPin, Scissors, User, MessageCircle, Filter, ChevronDown, Copy, CheckSquare,
    Trash2, Send, MessageSquare, SlidersHorizontal, ArrowUpRight, History, CalendarCheck, RotateCcw, ListFilter, Sparkles
} from 'lucide-react';
import { getInitial } from '../utils/dataUtils';

const PendingPayments: React.FC = () => {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [historyList, setHistoryList] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // View Mode
    const [viewMode, setViewMode] = useState<'PENDING' | 'HISTORY'>('PENDING');

    // Contact number: long-press to copy
    const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startContactLongPress = (id: string, contactNo: string) => {
        longPressTimer.current = setTimeout(() => {
            navigator.clipboard?.writeText(contactNo);
            setCopiedContactId(id);
            setTimeout(() => setCopiedContactId(null), 1500);
        }, 600);
    };

    const cancelContactLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING'>('ALL');
    const [sortBy, setSortBy] = useState<'AMOUNT_DESC' | 'DATE_ASC' | 'DATE_DESC'>('DATE_ASC');

    // New Year/Month Filters
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const year = parseInt(e.target.value);
        setSelectedYear(year);
        const start = new Date(year, selectedMonth, 1);
        // Last day of month: day 0 of next month
        const end = new Date(year, selectedMonth + 1, 0);
        // Fix timezone offset issue by using manual formatting
        setStartDate(formatISODate(start));
        setEndDate(formatISODate(end));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const month = parseInt(e.target.value);
        setSelectedMonth(month);
        const start = new Date(selectedYear, month, 1);
        const end = new Date(selectedYear, month + 1, 0);
        setStartDate(formatISODate(start));
        setEndDate(formatISODate(end));
    };

    const formatISODate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // UI States for Toolbar
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

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

        // Live updates: refresh the pending list in place when newer entries arrive.
        return api.subscribe(async (key) => {
            if (key !== 'entries' || viewMode !== 'PENDING') return;
            try {
                const allEntries = await api.getEntries();
                setEntries(allEntries.filter(e => {
                    const due = e.paymentMethod === 'PENDING' ? (e.amount || 0) : (e.pendingAmount || 0);
                    return due > 0;
                }));
            } catch (e) { /* keep showing what we have */ }
        });
    }, [viewMode]);

    const loadData = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            if (viewMode === 'PENDING') {
                const allEntries = await api.getEntries();
                const pending = allEntries.filter(e => {
                    const due = e.paymentMethod === 'PENDING' ? (e.amount || 0) : (e.pendingAmount || 0);
                    return due > 0;
                });
                setEntries(pending);
            } else {
                const history = await api.getPaymentHistory();
                setHistoryList(history);
            }
        } catch (e: any) {
            console.error(e);
            setErrorMsg(e.message || "Failed to load data. Please check your internet connection.");
        } finally { setLoading(false); }
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr || !dateStr.includes('-')) return dateStr;
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const processedEntries = useMemo(() => {
        let data = entries.filter(e => {
            const matchSearch = String(e.clientName || '').toLowerCase().includes(String(searchTerm || '').toLowerCase()) || String(e.contactNo).includes(searchTerm);

            let matchDate = true;
            if (startDate && e.nextCallDate && e.nextCallDate < startDate) matchDate = false;
            if (endDate && e.nextCallDate && e.nextCallDate > endDate) matchDate = false;

            let matchStatus = true;
            if (statusFilter === 'OVERDUE') matchStatus = e.nextCallDate ? e.nextCallDate < todayStr : false;
            else if (statusFilter === 'TODAY') matchStatus = e.nextCallDate === todayStr;
            else if (statusFilter === 'UPCOMING') matchStatus = e.nextCallDate ? e.nextCallDate > todayStr : false;

            return matchSearch && matchDate && matchStatus;
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
    }, [entries, searchTerm, startDate, endDate, statusFilter, sortBy, todayStr]);

    const processedHistory = useMemo(() => {
        return historyList.filter(h => {
            const matchSearch = String(h.clientName || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
            let matchDate = true;
            if (startDate && h.date && h.date < startDate) matchDate = false;
            if (endDate && h.date && h.date > endDate) matchDate = false;
            return matchSearch && matchDate;
        }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [historyList, searchTerm, startDate, endDate]);

    const stats = useMemo(() => {
        let totalOutstanding = 0;
        let overdueCount = 0;
        let criticalAmount = 0;
        let dueTodayAmount = 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        entries.forEach(e => {
            const due = e.paymentMethod === 'PENDING' ? (e.amount || 0) : (e.pendingAmount || 0);
            totalOutstanding += due;
            if (e.nextCallDate === todayStr) dueTodayAmount += due;
            if (e.nextCallDate && e.nextCallDate < todayStr) {
                overdueCount++;
                if (e.nextCallDate < sevenDaysAgoStr) criticalAmount += due;
            }
        });
        return { totalOutstanding, overdueCount, criticalAmount, dueTodayAmount };
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
        <div className="max-w-7xl mx-auto pb-40 animate-in fade-in duration-500 relative min-h-screen -mt-6">

            {/* PAGE MOTION KEYFRAMES */}
            <style>{`
                @keyframes pfuRise {
                    from { opacity: 0; transform: translateY(18px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pfuSlideIn {
                    from { opacity: 0; transform: translateX(-14px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .pfu-rise {
                    opacity: 0;
                    animation: pfuRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                .pfu-slide {
                    opacity: 0;
                    animation: pfuSlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                @media (prefers-reduced-motion: reduce) {
                    .pfu-rise, .pfu-slide { animation: none; opacity: 1; transform: none; }
                }
            `}</style>

            {/* HEADER SECTION - SCROLLABLE
            Removed sticky positioning to allow full page scrolling as requested.
        */}
            <div className="bg-[#F0F4F8] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 shadow-sm mb-6 md:mb-12 transition-all">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 md:gap-4 mb-4 pfu-slide" style={{ animationDelay: '0ms' }}>
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-300/50 ring-1 ring-white/40 shrink-0">
                            <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-3xl font-black bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight leading-tight truncate">Payment Follow-Up</h1>
                            <p className="text-slate-500 font-medium text-[11px] md:text-sm truncate">Track overdue payments &amp; history</p>
                        </div>
                    </div>

                    {/* VIEW TABS */}
                    <div className="flex w-full lg:w-auto p-1 bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm">
                        <button
                            onClick={() => setViewMode('PENDING')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'PENDING' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-300/50 ring-1 ring-white/30' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}
                        >
                            <ListFilter className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                            <span className="whitespace-nowrap">Pending<span className="hidden sm:inline"> List</span></span>
                        </button>
                        <button
                            onClick={() => setViewMode('HISTORY')}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'HISTORY' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-300/50 ring-1 ring-white/30' : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-50'}`}
                        >
                            <History className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                            <span className="whitespace-nowrap"><span className="hidden sm:inline">Collection </span>History</span>
                        </button>
                    </div>
                </div>

                {/* PREMIUM SUMMARY CARD (ONLY IN PENDING MODE) */}
                {viewMode === 'PENDING' && (
                    <div className="relative mb-4 md:mb-6 rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-4 md:p-6 shadow-[0_20px_50px_-20px_rgba(30,27,75,0.7)] ring-1 ring-white/10 overflow-hidden pfu-rise" style={{ animationDelay: '90ms' }}>
                        {/* Glow Accents */}
                        <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                        <div className="relative z-10 flex items-center gap-2 mb-3 md:mb-5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/80">Collection Snapshot</p>
                        </div>

                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-3 md:gap-0 md:divide-x md:divide-white/10">
                            {/* Outstanding */}
                            <div className="col-span-2 md:col-span-1 flex items-center gap-3 md:pr-5">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-red-500/25 to-red-600/10 ring-1 ring-red-400/30 backdrop-blur-sm flex items-center justify-center text-red-300 shrink-0 shadow-lg shadow-red-900/30">
                                    <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5 md:mb-1">Outstanding</p>
                                    <p className="text-2xl md:text-[26px] font-black text-white tabular-nums tracking-tight truncate leading-none">₹{stats.totalOutstanding.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Due Today */}
                            <div className="flex items-center gap-2.5 md:gap-3 md:px-5 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-400/25 to-amber-500/10 ring-1 ring-amber-300/30 backdrop-blur-sm flex items-center justify-center text-amber-300 shrink-0 shadow-lg shadow-amber-900/30">
                                    <Clock className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5 md:mb-1 truncate">Due Today</p>
                                    <p className="text-lg md:text-[26px] font-black text-white tabular-nums tracking-tight truncate leading-none">₹{stats.dueTodayAmount.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Collected Today */}
                            <div className="flex items-center gap-2.5 md:gap-3 pl-3 md:pl-5 pt-3 md:pt-0 border-t border-l md:border-t-0 md:border-l border-white/10 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-400/25 to-emerald-600/10 ring-1 ring-emerald-300/30 backdrop-blur-sm flex items-center justify-center text-emerald-300 shrink-0 shadow-lg shadow-emerald-900/30">
                                    <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5 md:mb-1 truncate">Collected<span className="hidden md:inline"> Today</span></p>
                                    <p className="text-lg md:text-[26px] font-black bg-gradient-to-r from-emerald-300 to-emerald-100 bg-clip-text text-transparent tabular-nums tracking-tight truncate leading-none">₹{sessionCollected.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* FILTER COMMAND CENTER - COMPACT S */}
                <div className="bg-white/90 backdrop-blur-sm p-3.5 pt-5 md:p-5 rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] border border-slate-200/70 space-y-3.5 md:space-y-3 relative overflow-visible group mb-4 md:mb-6 z-40 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-indigo-500 before:via-violet-500 before:to-emerald-400 before:rounded-t-2xl pfu-rise" style={{ animationDelay: '160ms' }}>
                    {/* Year/Month & Date Range */}
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-3 gap-y-4 relative z-10">
                        {/* Year Selection */}
                        <div className="col-span-1 md:col-span-2 relative group">
                            <select
                                value={selectedYear}
                                onChange={handleYearChange}
                                className="w-full pl-3 pr-8 py-2.5 md:py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white hover:border-indigo-300 transition-all appearance-none cursor-pointer"
                            >
                                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                            <label className="absolute -top-2 left-2 px-1.5 bg-white text-[9px] font-black text-indigo-400 uppercase tracking-widest rounded-md border border-slate-100 shadow-sm">Year</label>
                        </div>

                        {/* Month Selection */}
                        <div className="col-span-1 md:col-span-2 relative group">
                            <select
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="w-full pl-3 pr-8 py-2.5 md:py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white hover:border-indigo-300 transition-all appearance-none cursor-pointer"
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                            <label className="absolute -top-2 left-2 px-1.5 bg-white text-[9px] font-black text-indigo-400 uppercase tracking-widest rounded-md border border-slate-100 shadow-sm">Month</label>
                        </div>

                        {/* Manual Range */}
                        <div className="col-span-2 md:col-span-3 relative group">
                            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-indigo-400 pointer-events-none z-10">
                                <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-9 pr-2 py-2.5 md:py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white hover:border-indigo-300 transition-all tabular-nums" />
                            <label className="absolute -top-2 left-2 px-1.5 bg-white text-[9px] font-black text-indigo-400 uppercase tracking-widest rounded-md border border-slate-100 shadow-sm">From</label>
                        </div>

                        <div className="col-span-2 md:col-span-3 relative group">
                            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-indigo-400 pointer-events-none z-10">
                                <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-9 pr-2 py-2.5 md:py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white hover:border-indigo-300 transition-all tabular-nums" />
                            <label className="absolute -top-2 left-2 px-1.5 bg-white text-[9px] font-black text-indigo-400 uppercase tracking-widest rounded-md border border-slate-100 shadow-sm">To</label>
                        </div>
                    </div>

                    {/* Bottom Row / Search & Filters */}
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 relative z-10 pt-3 md:pt-2 border-t border-slate-100">

                        {/* Status & Sort */}
                        {viewMode === 'PENDING' && (
                            <div className="flex w-full lg:w-auto gap-3">
                                <div className="relative group flex-1">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-sm appearance-none cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                                    >
                                        <option value="ALL">Status: All</option>
                                        <option value="OVERDUE">⚠️ Overdue</option>
                                        <option value="TODAY">📅 Today</option>
                                        <option value="UPCOMING">🔜 Upcoming</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>
                                <div className="relative group flex-1">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-sm appearance-none cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                                    >
                                        <option value="DATE_ASC">Sort: Oldest</option>
                                        <option value="DATE_DESC">Sort: Newest</option>
                                        <option value="AMOUNT_DESC">Sort: Amount</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 hidden lg:block"></div>

                        {/* Compact Search */}
                        <div className="relative group w-full lg:max-w-[240px]">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search name or number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 hover:border-indigo-300 transition-all placeholder:text-slate-400 placeholder:font-medium"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LOADING & EMPTY STATES */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20"><RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" /><p className="text-slate-400 font-bold">Loading payment records...</p></div>
            ) : viewMode === 'PENDING' ? (
                processedEntries.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-slate-300" /></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">All Caught Up!</h3>
                        <p className="text-slate-500 font-medium">No pending payments match your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {processedEntries.map((entry, idx) => {
                            const dueAmount = entry.paymentMethod === 'PENDING' ? entry.amount : entry.pendingAmount;
                            const isToday = entry.nextCallDate === todayStr;
                            const isOverdue = entry.nextCallDate && entry.nextCallDate < todayStr;

                            return (
                                <div key={entry.id} style={{ animationDelay: `${240 + Math.min(idx, 12) * 55}ms` }} className={`pfu-rise relative bg-white rounded-2xl p-3.5 md:p-4 pl-4 md:pl-5 border border-slate-200/70 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] hover:shadow-[0_10px_28px_-10px_rgba(79,70,229,0.28)] hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 group overflow-hidden`}>
                                    {/* Status Accent Bar */}
                                    <span className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full ${isOverdue ? 'bg-gradient-to-b from-red-400 to-red-600' :
                                        isToday ? 'bg-gradient-to-b from-amber-300 to-amber-500' :
                                            'bg-gradient-to-b from-slate-200 to-slate-300'
                                        }`} />

                                    {/* Client Info - Compact */}
                                    <div className="flex items-center gap-3 w-full md:w-[25%] shrink-0">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ring-1 shadow-inner ${isToday ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-amber-200' : isOverdue ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 ring-red-200' : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 ring-slate-200'}`}>
                                            {getInitial(entry.clientName)}
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <h4 className="font-black text-slate-800 text-sm truncate leading-tight tracking-tight">{entry.clientName}</h4>
                                            <div className={`inline-flex items-center gap-1.5 mt-1 rounded-full p-0.5 pr-2.5 border transition-colors ${copiedContactId === String(entry.id)
                                                ? 'bg-emerald-50 border-emerald-200'
                                                : 'bg-slate-50 border-slate-200/80 hover:border-emerald-200 hover:bg-emerald-50/40'
                                                }`}>
                                                <a
                                                    href={`tel:${entry.contactNo}`}
                                                    title="Call"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-300/60 ring-1 ring-white/40 hover:from-emerald-500 hover:to-emerald-700 hover:scale-105 active:scale-95 transition-all shrink-0"
                                                >
                                                    <PhoneCall className="w-3 h-3" />
                                                </a>
                                                <span
                                                    onTouchStart={() => startContactLongPress(String(entry.id), String(entry.contactNo))}
                                                    onTouchEnd={cancelContactLongPress}
                                                    onTouchMove={cancelContactLongPress}
                                                    onMouseDown={() => startContactLongPress(String(entry.id), String(entry.contactNo))}
                                                    onMouseUp={cancelContactLongPress}
                                                    onMouseLeave={cancelContactLongPress}
                                                    onContextMenu={(e) => e.preventDefault()}
                                                    className={`text-[11px] font-bold select-none cursor-pointer tracking-wider tabular-nums ${copiedContactId === String(entry.id) ? 'text-emerald-700' : 'text-slate-600'}`}
                                                    title="Long press to copy"
                                                >
                                                    {copiedContactId === String(entry.id) ? 'Copied!' : entry.contactNo}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Amount - Mobile only (aligned right of name) */}
                                        <div className="md:hidden text-right shrink-0">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Due</p>
                                            <span className="text-base font-black text-indigo-600 tabular-nums">₹{dueAmount}</span>
                                        </div>
                                    </div>

                                    {/* Data Grid - Horizontal */}
                                    <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-2 items-center border-t md:border-t-0 border-dashed border-slate-100 pt-3 md:pt-0">
                                        {/* Service Date */}
                                        <div className="text-xs">
                                            <p className="md:hidden text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Service Date</p>
                                            <div className="flex items-center gap-1.5 font-bold text-slate-600">
                                                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="tabular-nums">{formatDateDisplay(entry.date)}</span>
                                            </div>
                                        </div>

                                        {/* Follow Up Badge */}
                                        <div>
                                            <p className="md:hidden text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Follow Up</p>
                                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border shadow-sm ${isOverdue ? 'bg-red-50 text-red-600 border-red-200 shadow-red-100' :
                                                isToday ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100' :
                                                    entry.nextCallDate ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200 border-dashed'
                                                }`}>
                                                {isOverdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
                                                {isToday && <Clock className="w-3 h-3 shrink-0" />}
                                                <span className="tabular-nums">{entry.nextCallDate ? formatDateDisplay(entry.nextCallDate) : 'Not Set'}</span>
                                            </div>
                                        </div>

                                        {/* Remark - Truncated */}
                                        <div className="relative group/tooltip col-span-2 md:col-span-1">
                                            <p className="md:hidden text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Remark</p>
                                            <p className="text-xs text-slate-500 font-medium truncate md:max-w-[120px] italic">
                                                {entry.remark || '—'}
                                            </p>
                                            {entry.remark && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden md:group-hover/tooltip:block z-[60] w-40 p-1.5 bg-slate-800 text-white text-[10px] rounded shadow-lg">
                                                    {entry.remark}
                                                </div>
                                            )}
                                        </div>

                                        {/* Amount - Desktop only */}
                                        <div className="hidden md:block">
                                            <span className="text-base font-black text-indigo-600 tabular-nums">₹{dueAmount}</span>
                                        </div>
                                    </div>

                                    {/* Actions - Compact */}
                                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 shrink-0">
                                        <button
                                            onClick={() => openFollowUpModal(entry, 'FOLLOWUP')}
                                            className="flex items-center justify-center gap-1.5 flex-1 md:flex-none px-3 py-2 md:p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 active:scale-95 transition-all"
                                            title="Follow Up"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span className="md:hidden text-xs font-black">Follow Up</span>
                                        </button>
                                        <button
                                            onClick={() => openFollowUpModal(entry, 'PAY')}
                                            className="flex items-center justify-center gap-1.5 flex-1 md:flex-none px-4 py-2 md:py-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-black text-xs hover:from-emerald-500 hover:to-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200 ring-1 ring-white/30"
                                        >
                                            <CheckCircle2 className="w-4 h-4 md:hidden" />
                                            Paid
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                // HISTORY VIEW LIST
                processedHistory.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><History className="w-8 h-8 text-slate-300" /></div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">No History</h3>
                        <p className="text-slate-500 font-medium">No payment collection history found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {processedHistory.map((h, i) => (
                            <div key={i} style={{ animationDelay: `${240 + Math.min(i, 12) * 55}ms` }} className="pfu-rise bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6">
                                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                    <IndianRupee className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-black text-slate-800 text-lg">{h.clientName}</h4>
                                        <span className="text-sm font-bold text-slate-400">{formatDateDisplay(h.date)}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md uppercase">{h.paymentMethod}</span>
                                        {h.remark && <span>{h.remark}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Collected</p>
                                    <p className="text-2xl font-black text-slate-800">₹{h.paidAmount}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {isModalOpen && selectedEntry && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 border border-white/20 flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white">
                            <div>
                                <h3 className="font-black text-xl tracking-tight">{selectedEntry.clientName}</h3>
                                <p className="text-slate-400 text-xs font-bold">Due: ₹{selectedEntry.paymentMethod === 'PENDING' ? selectedEntry.amount : selectedEntry.pendingAmount}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Follow Up Section */}
                                <div className={`space-y-5 ${modalMode === 'PAY' ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                                        Follow-up Update
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-2">Next Date</label>
                                        <input type="date" value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-100 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-2">Remark</label>
                                        <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} placeholder="Add a note..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-100 outline-none" />
                                    </div>
                                    <button onClick={(e) => handleUpdate(e, false)} disabled={submitting} className="w-full py-3.5 bg-white border-2 border-indigo-100 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                                        {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Save Update Only'}
                                    </button>
                                </div>

                                {/* Payment Section */}
                                <div className={`space-y-5 ${modalMode === 'FOLLOWUP' ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-emerald-500" />
                                        Record Payment
                                    </h4>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-emerald-600 mb-2">Amount Received</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-700">₹</span>
                                            <input type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} className="w-full pl-8 pr-4 py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl font-black text-slate-800 focus:ring-2 focus:ring-emerald-100 outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-2">Mode</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['CASH', 'UPI', 'CARD'].map(m => (
                                                <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2 rounded-xl text-xs font-black border transition-all ${paymentMethod === m ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'}`}>{m}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 transition-colors">
                                        {screenshotBase64 ? (
                                            <div className="flex flex-col items-center text-emerald-600">
                                                <CheckCircle2 className="w-8 h-8 mb-2" />
                                                <span className="text-xs font-bold">Proof Attached</span>
                                            </div>
                                        ) : (
                                            <>
                                                <UploadCloud className="w-8 h-8 mb-2 text-slate-300" />
                                                <span className="text-xs font-bold">Upload Proof</span>
                                            </>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    <button onClick={(e) => handleUpdate(e, true)} disabled={submitting || !amountToPay} className="w-full py-4 text-white font-bold rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1">
                                        {submitting ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Payment'}
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
