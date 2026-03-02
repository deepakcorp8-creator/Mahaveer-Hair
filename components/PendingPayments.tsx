
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { Entry, PaymentHistory } from '../types';
import {
    Wallet, CheckCircle2, Search, X, RefreshCw, Calendar, Phone, UploadCloud,
    Check, ArrowRight, Clock, AlertTriangle, UserCheck, IndianRupee, Megaphone,
    MapPin, Scissors, User, MessageCircle, Filter, ChevronDown, Copy, CheckSquare,
    Trash2, Send, MessageSquare, SlidersHorizontal, ArrowUpRight, History, CalendarCheck, RotateCcw, ListFilter
} from 'lucide-react';

const PendingPayments: React.FC = () => {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [historyList, setHistoryList] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // View Mode
    const [viewMode, setViewMode] = useState<'PENDING' | 'HISTORY'>('PENDING');

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
            const matchSearch = e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || String(e.contactNo).includes(searchTerm);

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
            const matchSearch = h.clientName.toLowerCase().includes(searchTerm.toLowerCase());
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

            {/* HEADER SECTION - SCROLLABLE
            Removed sticky positioning to allow full page scrolling as requested.
        */}
            <div className="bg-[#F0F4F8] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 shadow-sm mb-12 transition-all">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Payment Follow-Up</h1>
                        <p className="text-slate-500 font-medium">Track overdue payments & history</p>
                    </div>

                    {/* VIEW TABS */}
                    <div className="flex p-1 bg-slate-200/50 rounded-xl">
                        <button
                            onClick={() => setViewMode('PENDING')}
                            className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${viewMode === 'PENDING' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pending List
                        </button>
                        <button
                            onClick={() => setViewMode('HISTORY')}
                            className={`px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2 ${viewMode === 'HISTORY' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <History className="w-4 h-4" />
                            Collection History
                        </button>
                    </div>
                </div>

                {/* FILTER COMMAND CENTER - COMPACT S */}
                <div className="bg-white p-3 md:p-4 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 space-y-3 relative overflow-visible group mb-6 z-40">
                    {/* Year/Month & Date Range */}
                    <div className="grid grid-cols-2 md:grid-cols-12 gap-3 relative z-10">
                        {/* Year Selection */}
                        <div className="col-span-1 md:col-span-2 relative group">
                            <select
                                value={selectedYear}
                                onChange={handleYearChange}
                                className="w-full pl-3 pr-8 py-2 md:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                            <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-black text-slate-400 uppercase tracking-wider rounded-sm border border-slate-100/50">Year</label>
                        </div>

                        {/* Month Selection */}
                        <div className="col-span-1 md:col-span-2 relative group">
                            <select
                                value={selectedMonth}
                                onChange={handleMonthChange}
                                className="w-full pl-3 pr-8 py-2 md:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <ChevronDown className="w-3 h-3" />
                            </div>
                            <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-black text-slate-400 uppercase tracking-wider rounded-sm border border-slate-100/50">Month</label>
                        </div>

                        {/* Manual Range */}
                        <div className="col-span-2 md:col-span-3 relative group">
                            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pl-9 pr-2 py-2 md:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                            <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-black text-slate-400 uppercase tracking-wider rounded-sm border border-slate-100/50">From</label>
                        </div>

                        <div className="col-span-2 md:col-span-3 relative group">
                            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pl-9 pr-2 py-2 md:py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all" />
                            <label className="absolute -top-2 left-2 px-1 bg-white text-[9px] font-black text-slate-400 uppercase tracking-wider rounded-sm border border-slate-100/50">To</label>
                        </div>
                    </div>

                    {/* Bottom Row / Search & Filters */}
                    <div className="flex flex-col lg:flex-row items-center gap-3 relative z-10 pt-2 border-t border-slate-100/50">

                        {/* Status & Sort */}
                        {viewMode === 'PENDING' && (
                            <div className="flex w-full lg:w-auto gap-3">
                                <div className="relative group flex-1">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 shadow-sm appearance-none cursor-pointer hover:border-indigo-300"
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
                                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 shadow-sm appearance-none cursor-pointer hover:border-indigo-300"
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
                        <div className="relative group w-full lg:max-w-[200px]">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs text-slate-700 outline-none focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-400"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* SUMMARY CARDS (ONLY IN PENDING MODE) */}
            {/* SUMMARY STATS BAR (COMPACT) */}
            {viewMode === 'PENDING' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</p>
                            <p className="text-xl font-black text-slate-800">₹{stats.totalOutstanding.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Due Today</p>
                            <p className="text-xl font-black text-slate-800">₹{stats.dueTodayAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected Today</p>
                            <p className="text-xl font-black text-slate-800">₹{sessionCollected.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

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
                        {processedEntries.map(entry => {
                            const dueAmount = entry.paymentMethod === 'PENDING' ? entry.amount : entry.pendingAmount;
                            const isToday = entry.nextCallDate === todayStr;
                            const isOverdue = entry.nextCallDate && entry.nextCallDate < todayStr;

                            return (
                                <div key={entry.id} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-4 group">
                                    {/* Client Info - Compact */}
                                    <div className="flex items-center gap-3 w-full md:w-[25%] shrink-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black shrink-0 ${isToday ? 'bg-amber-100 text-amber-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {entry.clientName.charAt(0)}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">{entry.clientName}</h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                <span className="text-[10px] font-bold text-slate-500">{entry.contactNo}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Data Grid - Horizontal */}
                                    <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-2 items-center">
                                        {/* Service Date */}
                                        <div className="text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-slate-600">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                {formatDateDisplay(entry.date)}
                                            </div>
                                        </div>

                                        {/* Follow Up Badge */}
                                        <div>
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' :
                                                isToday ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    entry.nextCallDate ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                                                {isToday && <Clock className="w-3 h-3" />}
                                                {entry.nextCallDate ? formatDateDisplay(entry.nextCallDate) : 'Not Set'}
                                            </div>
                                        </div>

                                        {/* Remark - Truncated */}
                                        <div className="relative group/tooltip">
                                            <p className="text-xs text-slate-500 truncate max-w-[120px]">
                                                {entry.remark || '-'}
                                            </p>
                                            {entry.remark && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block z-[60] w-40 p-1.5 bg-slate-800 text-white text-[10px] rounded shadow-lg">
                                                    {entry.remark}
                                                </div>
                                            )}
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right md:text-left">
                                            <span className="text-sm font-black text-indigo-600">₹{dueAmount}</span>
                                        </div>
                                    </div>

                                    {/* Actions - Compact */}
                                    <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 pt-2 md:pt-0 mt-2 md:mt-0">
                                        <button
                                            onClick={() => openFollowUpModal(entry, 'FOLLOWUP')}
                                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                            title="Follow Up"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openFollowUpModal(entry, 'PAY')}
                                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200"
                                        >
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
                            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-6">
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
