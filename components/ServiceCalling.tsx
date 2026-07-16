import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Entry, ServiceCall } from '../types';
import {
    PhoneCall, Phone, Search, X, RefreshCw, Filter, MessageSquare, Clock,
    CheckCircle2, ListFilter, History, CalendarClock, MapPin, Scissors, User,
    Send, AlertTriangle, ChevronDown, Copy, MessageCircle, CalendarCheck, Sparkles
} from 'lucide-react';
import { getInitial } from '../utils/dataUtils';

// A service becomes eligible for a feedback call this many days after it was done.
const CALL_AFTER_DAYS = 21;

// Render cards in batches so a large history doesn't mount thousands of nodes at once
// (which was making the whole page feel slow). Users pull more with "Load More".
const PAGE_SIZE = 24;

// Possible outcomes when we ring the client for feedback.
const CALL_STATUS_OPTIONS = [
    'SATISFIED',
    'NOT SATISFIED',
    'NO RESPONSE',
    'CALL LATER',
    'SERVICE BOOKED',
    'NOT INTERESTED',
    'WRONG NUMBER',
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Local-safe YYYY-MM-DD (avoids the timezone shift toISOString() introduces).
const formatISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const STATUS_STYLES: { [k: string]: string } = {
    'SATISFIED': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    'SERVICE BOOKED': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    'NOT SATISFIED': 'bg-red-100 text-red-700 ring-red-200',
    'NOT INTERESTED': 'bg-rose-100 text-rose-700 ring-rose-200',
    'NO RESPONSE': 'bg-amber-100 text-amber-700 ring-amber-200',
    'CALL LATER': 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    'WRONG NUMBER': 'bg-slate-200 text-slate-600 ring-slate-300',
};

const todayMidnight = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

const daysSince = (isoDate: string): number | null => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return Math.floor((todayMidnight().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
};

const prettyDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const ServiceCalling: React.FC = () => {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'DUE' | 'DONE'>('DUE');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');
    const [technicianFilter, setTechnicianFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // for DONE view (call status)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState<'OLDEST' | 'NEWEST'>('OLDEST');

    // Month / Year quick filter (drives the date range).
    const nowYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
    const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>('ALL');

    const applyMonthYear = (year: number | 'ALL', month: number | 'ALL') => {
        if (year === 'ALL') { setStartDate(''); setEndDate(''); return; }
        if (month === 'ALL') {
            setStartDate(formatISODate(new Date(year, 0, 1)));
            setEndDate(formatISODate(new Date(year, 11, 31)));
        } else {
            setStartDate(formatISODate(new Date(year, month, 1)));
            setEndDate(formatISODate(new Date(year, month + 1, 0))); // last day of month
        }
    };

    const handleYearChange = (val: string) => {
        const y = val === 'ALL' ? 'ALL' : parseInt(val);
        setSelectedYear(y);
        if (y === 'ALL') { setSelectedMonth('ALL'); setStartDate(''); setEndDate(''); return; }
        applyMonthYear(y, selectedMonth);
    };

    const handleMonthChange = (val: string) => {
        const m = val === 'ALL' ? 'ALL' : parseInt(val);
        setSelectedMonth(m);
        let y = selectedYear;
        if (m !== 'ALL' && y === 'ALL') { y = nowYear; setSelectedYear(nowYear); } // month needs a year
        applyMonthYear(y, m);
    };

    // Manual date edits detach from the month/year picker to avoid a stale mismatch.
    const setStartDateManual = (v: string) => { setStartDate(v); setSelectedYear('ALL'); setSelectedMonth('ALL'); };
    const setEndDateManual = (v: string) => { setEndDate(v); setSelectedYear('ALL'); setSelectedMonth('ALL'); };

    // Feedback modal
    const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
    const [callStatus, setCallStatus] = useState('');
    const [remark, setRemark] = useState('');
    const [nextCallDate, setNextCallDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Copy contact feedback
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // How many cards are currently rendered (grows via "Load More").
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    // Any change that reshuffles the list resets it back to the first page.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [viewMode, searchTerm, branchFilter, serviceTypeFilter, technicianFilter, statusFilter, startDate, endDate, sortBy]);

    useEffect(() => {
        loadData();
        // Repaint when fresher entries arrive from the background poller.
        return api.subscribe((key) => {
            if (key === 'entries') api.getEntries().then(setEntries).catch(() => { });
        });
    }, []);

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        setErrorMsg(null);
        try {
            const [allEntries, calls] = await Promise.all([
                api.getEntries(isRefresh),
                api.getServiceCalls().catch(() => [] as ServiceCall[]),
            ]);
            setEntries(allEntries);
            setServiceCalls(calls);
        } catch (e: any) {
            setErrorMsg(e?.message || 'Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Entry ids that already have a logged feedback call.
    const calledIds = useMemo(() => new Set(serviceCalls.map(c => c.entryId).filter(Boolean)), [serviceCalls]);

    // Entries eligible for a feedback call: service done >= 21 days ago and not yet called.
    const dueEntries = useMemo(() => {
        return entries.filter(e => {
            const age = daysSince(e.date);
            return age !== null && age >= CALL_AFTER_DAYS && !calledIds.has(e.id);
        });
    }, [entries, calledIds]);

    // Dropdown option lists (derived from the raw data).
    const branchOptions = useMemo(() => Array.from(new Set(entries.map(e => e.branch).filter(Boolean))), [entries]);
    const serviceTypeOptions = useMemo(() => Array.from(new Set(entries.map(e => e.serviceType).filter(Boolean))), [entries]);
    const technicianOptions = useMemo(() => Array.from(new Set(entries.map(e => e.technician).filter(Boolean))), [entries]);
    const yearOptions = useMemo(() => {
        const years = new Set<number>();
        entries.forEach(e => {
            const y = new Date(e.date).getFullYear();
            if (!isNaN(y)) years.add(y);
        });
        years.add(nowYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [entries]);

    const inDateRange = (iso: string) => {
        if (startDate && (!iso || iso < startDate)) return false;
        if (endDate && (!iso || iso > endDate)) return false;
        return true;
    };

    const filteredDue = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        let list = dueEntries.filter(e => {
            if (term) {
                const hay = `${e.clientName || ''} ${e.contactNo || ''} ${e.address || ''}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            if (branchFilter !== 'ALL' && e.branch !== branchFilter) return false;
            if (serviceTypeFilter !== 'ALL' && e.serviceType !== serviceTypeFilter) return false;
            if (technicianFilter !== 'ALL' && e.technician !== technicianFilter) return false;
            if (!inDateRange(e.date)) return false;
            return true;
        });
        list = list.sort((a, b) => {
            const da = new Date(a.date).getTime();
            const db = new Date(b.date).getTime();
            return sortBy === 'OLDEST' ? da - db : db - da;
        });
        return list;
    }, [dueEntries, searchTerm, branchFilter, serviceTypeFilter, technicianFilter, startDate, endDate, sortBy]);

    const filteredDone = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return serviceCalls.filter(c => {
            if (term) {
                const hay = `${c.clientName || ''} ${c.contact || ''} ${c.address || ''}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            if (serviceTypeFilter !== 'ALL' && c.serviceType !== serviceTypeFilter) return false;
            if (statusFilter !== 'ALL' && c.callStatus !== statusFilter) return false;
            if (!inDateRange(c.serviceDate)) return false;
            return true;
        });
    }, [serviceCalls, searchTerm, serviceTypeFilter, statusFilter, startDate, endDate]);

    // Follow-ups scheduled for the future (next call date set and not passed).
    // Follow-ups scheduled for the future — counted over the currently filtered Called list.
    const scheduledCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return filteredDone.filter(c => c.nextCallDate && c.nextCallDate >= today).length;
    }, [filteredDone]);

    const resetFilters = () => {
        setSearchTerm(''); setBranchFilter('ALL'); setServiceTypeFilter('ALL');
        setTechnicianFilter('ALL'); setStatusFilter('ALL'); setStartDate(''); setEndDate('');
        setSelectedYear('ALL'); setSelectedMonth('ALL');
    };

    const activeFilterCount = [
        branchFilter !== 'ALL', serviceTypeFilter !== 'ALL', technicianFilter !== 'ALL',
        statusFilter !== 'ALL', !!startDate, !!endDate,
    ].filter(Boolean).length;

    const openModal = (entry: Entry) => {
        setSelectedEntry(entry);
        setCallStatus('');
        setRemark('');
        setNextCallDate('');
    };

    const closeModal = () => {
        if (submitting) return;
        setSelectedEntry(null);
    };

    const copyContact = (id: string, contact: string) => {
        navigator.clipboard?.writeText(contact);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1400);
    };

    const submitFeedback = async () => {
        if (!selectedEntry || !callStatus) return;
        setSubmitting(true);
        try {
            const payload = {
                entryId: selectedEntry.id,
                serviceDate: selectedEntry.date,
                clientName: selectedEntry.clientName,
                contact: selectedEntry.contactNo,
                address: selectedEntry.address,
                serviceType: selectedEntry.serviceType,
                callStatus,
                remark,
                nextCallDate,
            };
            await api.addServiceCall(payload);

            // Optimistic: move the entry out of the Due list immediately.
            const optimistic: ServiceCall = {
                id: 'sc_local_' + Date.now(),
                timestamp: new Date().toISOString(),
                serviceDate: selectedEntry.date,
                clientName: selectedEntry.clientName,
                contact: selectedEntry.contactNo,
                address: selectedEntry.address,
                serviceType: selectedEntry.serviceType,
                callStatus,
                remark,
                entryId: selectedEntry.id,
                nextCallDate,
            };
            setServiceCalls(prev => [optimistic, ...prev]);
            setSelectedEntry(null);
            // Pull authoritative data in the background.
            api.getServiceCalls().then(setServiceCalls).catch(() => { });
        } catch (e: any) {
            alert('Could not save feedback: ' + (e?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const ageBadge = (age: number | null) => {
        if (age === null) return null;
        let cls = 'bg-emerald-100 text-emerald-700 ring-emerald-200';
        if (age >= 45) cls = 'bg-red-100 text-red-700 ring-red-200';
        else if (age >= 30) cls = 'bg-amber-100 text-amber-700 ring-amber-200';
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ring-1 ${cls}`}>
                <Clock className="w-3 h-3" /> {age}d ago
            </span>
        );
    };

    const selectCls = "w-full pl-3 pr-8 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:bg-white hover:border-emerald-300 transition-all appearance-none cursor-pointer";

    return (
        <div className="max-w-7xl mx-auto pb-40 animate-in fade-in duration-500 relative min-h-screen -mt-6">

            {/* PAGE MOTION KEYFRAMES */}
            <style>{`
                @keyframes scRise {
                    from { opacity: 0; transform: translateY(18px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes scSlide {
                    from { opacity: 0; transform: translateX(-14px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .sc-rise  { opacity: 0; animation: scRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .sc-slide { opacity: 0; animation: scSlide 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                @media (prefers-reduced-motion: reduce) {
                    .sc-rise, .sc-slide { animation: none; opacity: 1; transform: none; }
                }
            `}</style>

            {/* HEADER */}
            <div className="bg-[#F0F4F8] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 shadow-sm mb-6 md:mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4 sc-slide" style={{ animationDelay: '0ms' }}>
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-300/50 ring-1 ring-white/40 shrink-0">
                            <PhoneCall className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-3xl font-black bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight leading-tight truncate">Service Calling</h1>
                            <p className="text-slate-500 font-medium text-[11px] md:text-sm truncate">Feedback calls for services done {CALL_AFTER_DAYS}+ days ago</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        {/* VIEW TABS */}
                        <div className="flex flex-1 lg:flex-none p-1 bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm">
                            <button
                                onClick={() => setViewMode('DUE')}
                                className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'DUE' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-300/50 ring-1 ring-white/30' : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-50'}`}
                            >
                                <ListFilter className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                                <span className="whitespace-nowrap">Due<span className="hidden sm:inline"> Calls</span></span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${viewMode === 'DUE' ? 'bg-white/25' : 'bg-slate-200 text-slate-600'}`}>{filteredDue.length}</span>
                            </button>
                            <button
                                onClick={() => setViewMode('DONE')}
                                className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'DONE' ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md ring-1 ring-white/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                <History className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                                <span className="whitespace-nowrap">Called</span>
                            </button>
                        </div>
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 shadow-sm transition-all shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* SUMMARY SNAPSHOT */}
                <div className="relative mb-4 rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-4 md:p-5 shadow-[0_20px_50px_-20px_rgba(6,78,59,0.7)] ring-1 ring-white/10 overflow-hidden sc-rise" style={{ animationDelay: '90ms' }}>
                    <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative z-10 flex items-center gap-2 mb-3 md:mb-4">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/80">Calling Snapshot</p>
                    </div>

                    <div className="relative z-10 grid grid-cols-3 gap-2 md:gap-0 md:divide-x md:divide-white/10">
                        <div className="flex items-center gap-2.5 md:gap-3 md:pr-5 min-w-0">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-400/25 to-emerald-600/10 ring-1 ring-emerald-300/30 flex items-center justify-center text-emerald-300 shrink-0">
                                <PhoneCall className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-0.5 truncate">Due for Call</p>
                                <p className="text-xl md:text-[26px] font-black text-white tabular-nums leading-none">{filteredDue.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 md:gap-3 md:px-5 min-w-0">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-teal-400/25 to-teal-600/10 ring-1 ring-teal-300/30 flex items-center justify-center text-teal-300 shrink-0">
                                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-0.5 truncate">Called</p>
                                <p className="text-xl md:text-[26px] font-black text-white tabular-nums leading-none">{filteredDone.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 md:gap-3 md:pl-5 min-w-0">
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-400/25 to-indigo-600/10 ring-1 ring-indigo-300/30 flex items-center justify-center text-indigo-300 shrink-0">
                                <CalendarClock className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-0.5 truncate">Follow-up</p>
                                <p className="text-xl md:text-[26px] font-black text-white tabular-nums leading-none">{scheduledCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEARCH + FILTER BAR */}
                <div className="bg-white/90 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] border border-slate-200/70 relative before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-emerald-500 before:via-teal-500 before:to-emerald-400 before:rounded-t-2xl sc-rise" style={{ animationDelay: '160ms' }}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search name, contact or address…"
                                className="w-full pl-9 pr-8 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${showFilters || activeFilterCount ? 'bg-emerald-500 text-white shadow-md shadow-emerald-300/40' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-emerald-300'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white text-emerald-600 text-[10px] flex items-center justify-center">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            <div className="relative">
                                <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className={selectCls}>
                                    <option value="ALL">All Branches</option>
                                    {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="relative">
                                <select value={serviceTypeFilter} onChange={e => setServiceTypeFilter(e.target.value)} className={selectCls}>
                                    <option value="ALL">All Services</option>
                                    {serviceTypeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="relative">
                                <select value={String(selectedYear)} onChange={e => handleYearChange(e.target.value)} className={selectCls}>
                                    <option value="ALL">All Years</option>
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="relative">
                                <select value={String(selectedMonth)} onChange={e => handleMonthChange(e.target.value)} className={selectCls}>
                                    <option value="ALL">All Months</option>
                                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>
                            {viewMode === 'DUE' ? (
                                <div className="relative">
                                    <select value={technicianFilter} onChange={e => setTechnicianFilter(e.target.value)} className={selectCls}>
                                        <option value="ALL">All Technicians</option>
                                        {technicianOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                </div>
                            ) : (
                                <div className="relative">
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
                                        <option value="ALL">All Outcomes</option>
                                        {CALL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                </div>
                            )}
                            {viewMode === 'DUE' && (
                                <div className="relative">
                                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className={selectCls}>
                                        <option value="OLDEST">Oldest first</option>
                                        <option value="NEWEST">Newest first</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                </div>
                            )}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400 mb-1 ml-1">Service From</label>
                                <input type="date" value={startDate} onChange={e => setStartDateManual(e.target.value)} className={selectCls} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-wide text-slate-400 mb-1 ml-1">Service To</label>
                                <input type="date" value={endDate} onChange={e => setEndDateManual(e.target.value)} className={selectCls} />
                            </div>
                            {activeFilterCount > 0 && (
                                <button onClick={resetFilters} className="col-span-2 md:col-span-1 self-end flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition-all">
                                    <X className="w-3.5 h-3.5" /> Clear
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* BODY */}
            <div className="px-1">
                {errorMsg && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
                        <p className="font-semibold text-sm">Loading service data…</p>
                    </div>
                ) : viewMode === 'DUE' ? (
                    filteredDue.length === 0 ? (
                        <EmptyState
                            icon={<CheckCircle2 className="w-9 h-9" />}
                            title="No calls due"
                            subtitle={`Services older than ${CALL_AFTER_DAYS} days will appear here for feedback calls.`}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                            {filteredDue.slice(0, visibleCount).map((entry, i) => {
                                const age = daysSince(entry.date);
                                return (
                                    <div key={entry.id} className="group bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.15)] hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.35)] hover:border-emerald-300 transition-all overflow-hidden sc-rise" style={{ animationDelay: `${(i % 12) * 40}ms` }}>
                                        <div className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                                                    {getInitial(entry.clientName)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-black text-slate-800 text-sm truncate">{entry.clientName || 'Unknown'}</h3>
                                                        {ageBadge(age)}
                                                    </div>
                                                    <button
                                                        onClick={() => copyContact(entry.id, entry.contactNo)}
                                                        className="flex items-center gap-1 text-xs text-slate-500 font-semibold mt-0.5 hover:text-emerald-600"
                                                    >
                                                        <Phone className="w-3 h-3" /> {entry.contactNo || '—'}
                                                        {copiedId === entry.id ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-40" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                                <InfoChip icon={<Scissors className="w-3 h-3" />} label={entry.serviceType} />
                                                <InfoChip icon={<CalendarCheck className="w-3 h-3" />} label={prettyDate(entry.date)} />
                                                {entry.technician && <InfoChip icon={<User className="w-3 h-3" />} label={entry.technician} />}
                                                {entry.branch && <InfoChip icon={<MapPin className="w-3 h-3" />} label={entry.branch} />}
                                            </div>

                                            {entry.address && (
                                                <p className="mt-2 text-[11px] text-slate-500 flex items-start gap-1 line-clamp-2">
                                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {entry.address}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                                            <a href={`tel:${entry.contactNo}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black text-emerald-600 hover:bg-emerald-50 transition-all">
                                                <Phone className="w-3.5 h-3.5" /> Call
                                            </a>
                                            <a
                                                href={`https://wa.me/91${String(entry.contactNo || '').replace(/\D/g, '').slice(-10)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black text-green-600 hover:bg-green-50 transition-all"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                            </a>
                                            <button onClick={() => openModal(entry)} className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black text-slate-700 hover:bg-slate-50 transition-all">
                                                <MessageSquare className="w-3.5 h-3.5" /> Feedback
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : null}

                {!loading && viewMode === 'DUE' && filteredDue.length > visibleCount && (
                    <div className="flex justify-center mt-5">
                        <button
                            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                            className="px-5 py-2.5 rounded-xl text-sm font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all"
                        >
                            Load More ({filteredDue.length - visibleCount} left)
                        </button>
                    </div>
                )}

                {!loading && viewMode === 'DONE' && (
                    filteredDone.length === 0 ? (
                        <EmptyState
                            icon={<History className="w-9 h-9" />}
                            title="No calls logged yet"
                            subtitle="Feedback you record will show up here."
                        />
                    ) : (
                        <div className="space-y-2.5">
                            {filteredDone.slice(0, visibleCount).map((call, i) => (
                                <div key={call.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 flex items-start gap-3 sc-rise" style={{ animationDelay: `${(i % 12) * 40}ms` }}>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-black shrink-0">
                                        {getInitial(call.clientName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-black text-slate-800 text-sm truncate">{call.clientName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ring-1 ${STATUS_STYLES[call.callStatus] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{call.callStatus || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 font-semibold mt-1">
                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{call.contact || '—'}</span>
                                            <span className="flex items-center gap-1"><Scissors className="w-3 h-3" />{call.serviceType || '—'}</span>
                                            <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" />Svc {prettyDate(call.serviceDate)}</span>
                                            {call.nextCallDate && <span className="flex items-center gap-1 text-indigo-600"><CalendarClock className="w-3 h-3" />Next {prettyDate(call.nextCallDate)}</span>}
                                        </div>
                                        {call.remark && <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">{call.remark}</p>}
                                    </div>
                                    <a href={`tel:${call.contact}`} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 shrink-0" title="Call again">
                                        <Phone className="w-4 h-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {!loading && viewMode === 'DONE' && filteredDone.length > visibleCount && (
                    <div className="flex justify-center mt-5">
                        <button
                            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                            className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all"
                        >
                            Load More ({filteredDone.length - visibleCount} left)
                        </button>
                    </div>
                )}
            </div>

            {/* FEEDBACK MODAL */}
            {selectedEntry && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Log Feedback Call</p>
                            <h3 className="text-xl font-black truncate">{selectedEntry.clientName}</h3>
                            <div className="flex items-center gap-3 text-xs font-semibold text-white/80 mt-1">
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedEntry.contactNo}</span>
                                <span className="flex items-center gap-1"><Scissors className="w-3 h-3" />{selectedEntry.serviceType}</span>
                            </div>
                        </div>

                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2">Call Outcome <span className="text-red-500">*</span></label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CALL_STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setCallStatus(opt)}
                                            className={`px-3 py-2.5 rounded-xl text-xs font-black transition-all ring-1 ${callStatus === opt ? 'bg-emerald-500 text-white ring-emerald-500 shadow-md' : 'bg-slate-50 text-slate-600 ring-slate-200 hover:ring-emerald-300'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2">Remark</label>
                                <textarea
                                    value={remark}
                                    onChange={e => setRemark(e.target.value)}
                                    rows={3}
                                    placeholder="Client feedback, issues, next steps…"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1">
                                    <CalendarClock className="w-3.5 h-3.5 text-indigo-500" /> Next Call Date (optional)
                                </label>
                                <input
                                    type="date"
                                    value={nextCallDate}
                                    onChange={e => setNextCallDate(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex gap-2">
                            <button onClick={closeModal} disabled={submitting} className="px-4 py-3 rounded-xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50">
                                Cancel
                            </button>
                            <button
                                onClick={submitFeedback}
                                disabled={!callStatus || submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-300/40 hover:shadow-emerald-400/50 transition-all disabled:opacity-40 disabled:shadow-none"
                            >
                                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {submitting ? 'Saving…' : 'Save Feedback'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoChip: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-600 font-bold truncate">
        <span className="text-slate-400 shrink-0">{icon}</span>
        <span className="truncate">{label || '—'}</span>
    </span>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-black text-slate-700 mb-1">{title}</h3>
        <p className="text-sm text-slate-400 font-medium max-w-xs">{subtitle}</p>
    </div>
);

export default ServiceCalling;
