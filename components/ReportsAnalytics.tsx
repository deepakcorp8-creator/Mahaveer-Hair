
import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Calendar, Filter, ChevronDown, Trophy, TrendingUp, Users, ShoppingBag,
    ArrowRight, X, User, MapPin, IndianRupee, Activity, Crown, Search, Star,
    RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { Entry } from '../types';

// Constants
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const ReportsAnalytics: React.FC = () => {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filterType, setFilterType] = useState<'ALL' | 'MONTH' | 'YEAR' | 'CUSTOM'>('ALL');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Drill Down States
    const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'TECH' | 'CLIENT'>('TECH');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await api.getEntries();
            setEntries(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- FILTERING LOGIC ---
    const filteredData = useMemo(() => {
        return entries.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date);

            if (filterType === 'ALL') return true;

            if (filterType === 'MONTH') {
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            }

            if (filterType === 'YEAR') {
                return d.getFullYear() === selectedYear;
            }

            if (filterType === 'CUSTOM' && customStart && customEnd) {
                return e.date >= customStart && e.date <= customEnd;
            }

            return true;
        });
    }, [entries, filterType, selectedMonth, selectedYear, customStart, customEnd]);

    // --- AGGREGATION LOGIC ---

    // 1. Technician Stats (Revenue & Count)
    const techStats = useMemo(() => {
        const map = new Map<string, { revenue: number; count: number; name: string }>();
        filteredData.forEach(e => {
            if (!e.technician) return;
            const curr = map.get(e.technician) || { revenue: 0, count: 0, name: e.technician };
            curr.revenue += Number(e.amount || 0);
            curr.count += 1;
            map.set(e.technician, curr);
        });
        return Array.from(map.values());
    }, [filteredData]);

    // 2. Client Stats (Revenue & Visits)
    const clientStats = useMemo(() => {
        const map = new Map<string, { revenue: number; visits: number; name: string; contact: string }>();
        filteredData.forEach(e => {
            const curr = map.get(e.clientName) || { revenue: 0, visits: 0, name: e.clientName, contact: e.contactNo };
            curr.revenue += Number(e.amount || 0);
            curr.visits += 1;
            map.set(e.clientName, curr);
        });
        return Array.from(map.values());
    }, [filteredData]);

    // 3. Product/Service Stats - GROUPED (Top 5 + Others)
    const productStats = useMemo(() => {
        const map = new Map<string, number>();
        filteredData.forEach(e => {
            // Logic: Only use Patch Size data and Group by Product Name (Remove Size like 9x6)
            if (e.patchSize) {
                // Remove dimensions (digits x digits), trim whitespace, and uppercase for consistent grouping
                let key = e.patchSize.replace(/\s*\d+[\s]*[xX*][\s]*\d+\s*/gi, '').trim().toUpperCase();
                if (!key) key = "UNKNOWN"; // Fallback if only size was present
                map.set(key, (map.get(key) || 0) + 1);
            }
        });

        const sorted = Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Show ALL products (No Grouping)
        return sorted;
    }, [filteredData]);

    // --- CALCULATE PERCENTAGES FOR PIE ---
    const totalItems = useMemo(() => productStats.reduce((a, b) => a + b.value, 0), [productStats]);

    const pieData = useMemo(() => {
        return productStats
            .filter(item => Math.round((item.value / totalItems) * 100) > 0)
            .map(item => ({
                ...item,
                displayName: `${item.name} (${((item.value / totalItems) * 100).toFixed(0)}%)`
            }));
    }, [productStats, totalItems]);

    // --- DERIVED METRICS ---

    const topRevenueTechs = [...techStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5); // Increased to 5
    const bestPerformingTech = [...techStats].sort((a, b) => b.count - a.count)[0];

    const topRevenueClients = [...clientStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const mostVisitedClient = [...clientStats].sort((a, b) => b.visits - a.visits)[0];

    const totalRevenuePeriod = filteredData.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // --- HANDLERS ---

    const handleTechClick = (name: string) => {
        setSelectedTechnician(name);
        setModalType('TECH');
        setIsModalOpen(true);
    };

    const handleClientClick = (data: any) => {
        if (data && data.activePayload && data.activePayload[0]) {
            const clientName = data.activePayload[0].payload.name;
            setSelectedClient(clientName);
            setModalType('CLIENT');
            setIsModalOpen(true);
        }
    };

    const openClientByName = (name: string) => {
        setSelectedClient(name);
        setModalType('CLIENT');
        setIsModalOpen(true);
    }

    // --- SUB-COMPONENTS ---

    const ModalContent = () => {
        const isTech = modalType === 'TECH';
        const targetName = isTech ? selectedTechnician : selectedClient;

        // Filter data specifically for this person within the selected date range
        const logs = filteredData.filter(e =>
            isTech ? e.technician === targetName : e.clientName === targetName
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalVal = logs.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        return (
            <div className="flex flex-col h-full bg-slate-50">
                <div className="bg-[#0f172a] text-white p-8 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className={`p-3 rounded-2xl ${isTech ? 'bg-indigo-600' : 'bg-emerald-600'} shadow-lg`}>
                                {isTech ? <User className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{isTech ? 'Technician Profile' : 'Client History'}</p>
                                <h3 className="text-2xl font-black tracking-tight">{targetName}</h3>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <div className="bg-white/10 px-5 py-2.5 rounded-xl backdrop-blur-md border border-white/10">
                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider mb-0.5">Total Revenue</p>
                                <p className="text-xl font-black text-emerald-400">₹{totalVal.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/10 px-5 py-2.5 rounded-xl backdrop-blur-md border border-white/10">
                                <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider mb-0.5">Transactions</p>
                                <p className="text-xl font-black">{logs.length}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {logs.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 font-medium">No records found in this period.</div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow group">
                                    <div className="mb-2 sm:mb-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="font-black text-slate-800 text-lg">{isTech ? log.clientName : log.serviceType}</span>
                                            {isTech && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold tracking-wide uppercase">{log.serviceType}</span>}
                                            {!isTech && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold uppercase">{log.technician}</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 font-bold flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-300" /> {log.date}
                                            {log.remark && <span className="ml-2 text-slate-500 italic font-medium">— {log.remark}</span>}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex flex-row sm:flex-col justify-between items-center sm:items-end">
                                        <p className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">₹{log.amount}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">{log.paymentMethod}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const card3D = "bg-white rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 transition-all duration-500 hover:shadow-[0_25px_60px_-15px_rgba(99,102,241,0.15)] hover:border-indigo-100 overflow-hidden backdrop-blur-sm";

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 relative">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-40 left-0 -ml-20 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* 1. HEADER SECTION */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-sm border border-white/50 relative z-10 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-500 hover:shadow-md">
                <div className="flex items-center gap-5 px-2">
                    <div className="p-4 bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg shadow-indigo-200 ring-4 ring-indigo-50">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Analytics</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Business Intelligence</p>
                    </div>
                </div>
            </div>

            {/* 2. FLOATING FILTER BAR (Sticky Icon) */}
            <div className="sticky top-4 z-40 flex justify-end pointer-events-none mb-6">
                <div className="pointer-events-auto">
                    <div className={`transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${showFilters ? 'translate-y-0 opacity-100' : 'translate-y-0'}`}>
                        <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'w-full max-w-[95vw] sm:max-w-fit' : 'w-auto'}`}>
                            {showFilters ? (
                                <div className="bg-white/90 backdrop-blur-xl p-2.5 rounded-[2rem] shadow-2xl border border-white/50 flex items-center gap-3 animate-in fade-in zoom-in-95 overflow-x-auto no-scrollbar ring-1 ring-slate-900/5">

                                    {/* FILTER TYPES */}
                                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl flex-shrink-0">
                                        {['ALL', 'MONTH', 'YEAR', 'CUSTOM'].map((type) => (
                                            <button
                                                key={type}
                                                onClick={() => setFilterType(type as any)}
                                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider
                                                ${filterType === type ? 'bg-white text-indigo-700 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {/* DYNAMIC INPUTS */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        {filterType === 'MONTH' && (
                                            <>
                                                <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border-none bg-slate-50 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-white min-w-[120px] transition-colors">
                                                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                                </select>
                                                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border-none bg-slate-50 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-white transition-colors">
                                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </>
                                        )}
                                        {filterType === 'YEAR' && (
                                            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border-none bg-slate-50 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-white w-28 transition-colors">
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        )}
                                        {filterType === 'CUSTOM' && (
                                            <div className="flex items-center gap-2 px-3 bg-slate-50 rounded-xl border border-slate-100 p-1.5">
                                                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-3 py-1.5 rounded-lg border-none bg-white font-bold text-[10px] shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-32" />
                                                <span className="font-black text-slate-300">-</span>
                                                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-3 py-1.5 rounded-lg border-none bg-white font-bold text-[10px] shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-32" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="h-8 w-px bg-slate-200 mx-2 flex-shrink-0"></div>

                                    <button onClick={() => setShowFilters(false)} className="p-3 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 group">
                                        <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowFilters(true)}
                                    className="flex items-center justify-center bg-white/80 backdrop-blur-md text-indigo-600 p-4 rounded-2xl shadow-xl border border-white/60 hover:scale-110 transition-all font-black group shadow-indigo-500/20 ring-1 ring-white"
                                    title="Open Filters"
                                >
                                    <Filter className="w-6 h-6 group-hover:rotate-180 transition-transform duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)" />
                                    {filterType !== 'ALL' && (
                                        <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm"></span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-96">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-indigo-100 rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                    <p className="mt-8 text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">Crunching numbers...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* 2. SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Revenue Card */}
                        <div className="bg-gradient-to-br from-[#4f46e5] to-[#4338ca] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden group min-h-[240px] flex flex-col justify-between hover:scale-[1.02] transition-transform duration-500">
                            {/* Animated Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-[1.5s] ease-out"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl -ml-10 -mb-10 group-hover:scale-125 transition-transform duration-[1.5s]"></div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6 opacity-90">
                                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10 shadow-inner"><IndianRupee className="w-4 h-4" /></div>
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100">Total Revenue</span>
                                </div>
                                <h3 className="text-6xl font-black tracking-tighter drop-shadow-lg mb-2">
                                    ₹{(totalRevenuePeriod / 100000).toFixed(2)}<span className="text-3xl opacity-60 ml-2 font-bold">L</span>
                                </h3>
                                <div className="h-1 w-24 bg-gradient-to-r from-indigo-300 to-transparent rounded-full mb-4"></div>
                                <p className="text-sm font-bold text-indigo-200">₹{totalRevenuePeriod.toLocaleString()} <span className="opacity-60 font-normal">Precise amount</span></p>
                            </div>

                            <div className="mt-auto relative z-10">
                                <div className="inline-flex items-center text-[10px] font-bold bg-indigo-900/30 border border-indigo-400/30 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg">
                                    <TrendingUp className="w-3.5 h-3.5 mr-2 text-emerald-300" />
                                    {filterType === 'ALL' ? 'Lifetime Earnings' : 'Period Earnings'}
                                </div>
                            </div>
                        </div>

                        {/* Best Performing Tech (Volume) */}
                        <div
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:border-emerald-200 hover:shadow-[0_30px_60px_-15px_rgba(16,185,129,0.15)] transition-all duration-500 cursor-pointer min-h-[240px] hover:-translate-y-1 relative overflow-hidden"
                            onClick={() => bestPerformingTech && handleTechClick(bestPerformingTech.name)}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700"></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm"><Crown className="w-4 h-4" /></div>
                                        <span className="text-emerald-600 font-black text-xs uppercase tracking-widest">Top Performer</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-800 leading-tight mb-2 tracking-tight">{bestPerformingTech?.name || 'N/A'}</h3>
                                    <p className="text-sm font-bold text-slate-400">Most Services Done</p>
                                </div>
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                    <Users className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="mt-auto pt-6 border-t border-slate-50 relative z-10">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jobs Completed</span>
                                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">{bestPerformingTech?.count || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Most Visited Client */}
                        <div
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-between group hover:border-amber-200 hover:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.15)] transition-all duration-500 cursor-pointer min-h-[240px] hover:-translate-y-1 relative overflow-hidden"
                            onClick={() => mostVisitedClient && openClientByName(mostVisitedClient.name)}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700"></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shadow-sm"><Trophy className="w-4 h-4" /></div>
                                        <span className="text-amber-600 font-black text-xs uppercase tracking-widest">Loyal Client</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-800 leading-tight mb-2 tracking-tight truncate w-44">{mostVisitedClient?.name || 'N/A'}</h3>
                                    <p className="text-sm font-bold text-slate-400">Most Active Customer</p>
                                </div>
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                    <User className="w-8 h-8" />
                                </div>
                            </div>
                            <div className="mt-auto pt-6 border-t border-slate-50 relative z-10">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Visits</span>
                                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500">{mostVisitedClient?.visits || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* 3. PRODUCT MIX (PIE) - UPDATED TO SHOW PERCENTAGES */}
                        <div className={`${card3D} p-8 lg:col-span-1 flex flex-col group`}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500"><ShoppingBag className="w-5 h-5" /></div>
                                        Product Mix
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1.5 ml-1 uppercase tracking-wide">Breakdown by Product</p>
                                </div>
                            </div>

                            <div className="flex-1 min-h-[400px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={90}
                                            outerRadius={125}
                                            paddingAngle={3}
                                            dataKey="value"
                                            nameKey="displayName"
                                            cornerRadius={8}
                                            isAnimationActive={true}
                                            animationBegin={0}
                                            animationDuration={1500}
                                            animationEasing="ease-out"
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = outerRadius + 25;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                return (
                                                    <text
                                                        x={x}
                                                        y={y}
                                                        fill={COLORS[index % COLORS.length]}
                                                        textAnchor={x > cx ? 'start' : 'end'}
                                                        dominantBaseline="central"
                                                        className="text-xs font-bold"
                                                        style={{ fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}
                                                    >
                                                        {`${(percent * 100).toFixed(0)}%`}
                                                    </text>
                                                );
                                            }}
                                            labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                    stroke="rgba(255,255,255,0.2)"
                                                    strokeWidth={2}
                                                    className="hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', fontWeight: 'bold', padding: '12px 20px' }}
                                            itemStyle={{ color: '#1e293b', fontSize: '12px' }}
                                            formatter={(value: number, name: string, props: any) => {
                                                // Extract percentage from payload if available, or calc it
                                                const total = totalItems;
                                                const percent = ((value / total) * 100).toFixed(1);
                                                return [`${value} Units (${percent}%)`, 'Quantity'];
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            layout="horizontal"
                                            iconType="circle"
                                            iconSize={10}
                                            wrapperStyle={{
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: '#64748b',
                                                paddingTop: '20px',
                                                maxHeight: '120px',
                                                overflowY: 'auto',
                                                bottom: 0
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-in fade-in zoom-in duration-1000 delay-500 fill-mode-backwards">
                                    <span className="text-4xl font-black text-slate-800 block tracking-tighter drop-shadow-sm">{totalItems}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Units</span>
                                </div>
                            </div>
                        </div>

                        {/* 4. TECHNICIAN LEADERBOARD - IMPROVED LIST */}
                        <div className={`${card3D} p-0 lg:col-span-2 flex flex-col group`}>
                            <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center backdrop-blur-sm">
                                <div>
                                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500"><TrendingUp className="w-5 h-5" /></div>
                                        Revenue Leaderboard
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1.5 ml-1 uppercase tracking-wide">Top earning technicians</p>
                                </div>
                                <div className="hidden sm:inline-flex items-center text-[10px] font-black bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-500 shadow-sm uppercase tracking-wider gap-2">
                                    <Crown className="w-3 h-3 text-amber-500" /> Top 5 Ranked
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {topRevenueTechs.map((tech, idx) => (
                                    <div
                                        key={tech.name}
                                        onClick={() => handleTechClick(tech.name)}
                                        className="group/item relative p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:bg-slate-50/50 transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-x-1"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border-2 transform transition-transform group-hover/item:scale-110 duration-300
                                                ${idx === 0 ? 'bg-amber-100/50 text-amber-600 border-amber-100 ring-4 ring-amber-50' :
                                                    idx === 1 ? 'bg-slate-100/50 text-slate-600 border-slate-200' :
                                                        idx === 2 ? 'bg-orange-100/50 text-orange-700 border-orange-100' :
                                                            'bg-white text-slate-300 border-slate-100'}`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg group-hover/item:text-indigo-700 transition-colors">{tech.name}</h4>
                                                <div className="flex items-center gap-4 mt-1.5">
                                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                        {tech.count} Service Jobs
                                                    </span>
                                                    {idx === 0 && <span className="text-[9px] font-black bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200/50 uppercase tracking-wide flex items-center gap-1.5"><Crown className="w-3 h-3" /> Market Leader</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-xl text-slate-900 group-hover/item:text-indigo-600 transition-colors tracking-tight">₹{tech.revenue.toLocaleString()}</p>
                                            <div className="flex items-center justify-end text-[10px] font-bold text-indigo-500 opacity-0 group-hover/item:opacity-100 transition-all transform translate-x-4 group-hover/item:translate-x-0 mt-2 gap-1">
                                                View Profile <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {topRevenueTechs.length === 0 && <div className="p-12 text-center text-slate-400 font-bold opacity-50">No data available for this period.</div>}
                            </div>
                        </div>
                    </div>

                    {/* 5. TOP 5 CLIENTS (BAR CHART) - Cleaned Up */}
                    <div className={`${card3D} p-8 group`}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
                                    <div className="p-2 bg-violet-50 rounded-xl text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-500"><Star className="w-5 h-5" /></div>
                                    Top 5 High-Value Clients
                                </h3>
                                <p className="text-xs text-slate-400 font-bold mt-1.5 ml-1 uppercase tracking-wide">Highest spending customers</p>
                            </div>
                        </div>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={topRevenueClients}
                                    margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                                    layout="vertical"
                                    onClick={handleClientClick}
                                    className="cursor-pointer"
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={150}
                                        tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={10}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc', radius: 12 }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: 'bold', padding: '12px 20px' }}
                                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Revenue']}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        radius={[0, 12, 12, 0]}
                                        barSize={45}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {topRevenueClients.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][index]}
                                                className="hover:opacity-80 transition-opacity"
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-center text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-[0.2em] animate-pulse flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block"></span> Click on a bar to view client history
                        </p>
                    </div>
                </div>
            )}

            {/* SLIDE-OVER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 ease-out border-l border-white/20">
                        <ModalContent />
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportsAnalytics;
