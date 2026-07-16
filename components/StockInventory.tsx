import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { InventoryItem, StockInEntry } from '../types';
import {
    Package, Boxes, Search, X, RefreshCw, Filter, ChevronDown, Plus, Layers, LayoutGrid,
    History, Send, AlertTriangle, TrendingUp, PackagePlus, Boxes as BoxesIcon, Save, Gauge
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const PAGE_SIZE = 24;

type StockStatus = 'EXCESS' | 'NORMAL' | 'ORDER' | 'BELOW';

// IMS pattern: percentage = LIVE STOCK / MAX STOCK.
//  > 100%  -> EXCESS  (purple)
//  66-100% -> NORMAL  (green)
//  33-66%  -> TO ORDER (yellow)
//  0-33%   -> BELOW   (red)
const getStatus = (live: number, max: number): StockStatus => {
    const pct = max > 0 ? (live / max) * 100 : 0;
    if (pct > 100) return 'EXCESS';
    if (pct >= 66) return 'NORMAL';
    if (pct >= 33) return 'ORDER';
    return 'BELOW';
};

const pctOf = (live: number, max: number) => (max > 0 ? (live / max) * 100 : 0);

// Board (dashboard) view — one coloured column per status, left-to-right like the sheet.
const STATUS_ORDER: StockStatus[] = ['BELOW', 'ORDER', 'NORMAL', 'EXCESS'];
const BOARD_CFG: Record<StockStatus, { title: string; sub: string; head: string; stockCell: string; ring: string }> = {
    BELOW: { title: 'Below 33%', sub: '0-33%', head: 'bg-red-600 text-white', stockCell: 'bg-red-500 text-white', ring: 'border-red-200' },
    ORDER: { title: '66-33% To Order', sub: '33-66%', head: 'bg-yellow-400 text-yellow-950', stockCell: 'bg-yellow-300 text-yellow-950', ring: 'border-yellow-200' },
    NORMAL: { title: 'Normal Stock', sub: '66-100%', head: 'bg-emerald-600 text-white', stockCell: 'bg-emerald-500 text-white', ring: 'border-emerald-200' },
    EXCESS: { title: 'Excess Stock', sub: '>100%', head: 'bg-purple-700 text-white', stockCell: 'bg-purple-500 text-white', ring: 'border-purple-200' },
};

const STATUS_CFG: Record<StockStatus, { label: string; short: string; badge: string; bar: string; dot: string; ring: string }> = {
    EXCESS: { label: 'Excess Stock (>100%)', short: 'Excess', badge: 'bg-purple-100 text-purple-700 ring-purple-200', bar: 'bg-purple-500', dot: 'bg-purple-500', ring: 'ring-purple-200' },
    NORMAL: { label: 'Normal Stock (66-100%)', short: 'Normal', badge: 'bg-emerald-100 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500', dot: 'bg-emerald-500', ring: 'ring-emerald-200' },
    ORDER: { label: 'To Order (33-66%)', short: 'To Order', badge: 'bg-yellow-100 text-yellow-700 ring-yellow-200', bar: 'bg-yellow-400', dot: 'bg-yellow-400', ring: 'ring-yellow-200' },
    BELOW: { label: 'Below Stock (0-33%)', short: 'Below', badge: 'bg-red-100 text-red-700 ring-red-200', bar: 'bg-red-500', dot: 'bg-red-500', ring: 'ring-red-200' },
};

const StockInventory: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [stockIns, setStockIns] = useState<StockInEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'STOCK' | 'HISTORY'>('STOCK');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | StockStatus>('ALL');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [stockView, setStockView] = useState<'CARDS' | 'BOARD'>('CARDS');

    // Add-stock modal
    const [modalOpen, setModalOpen] = useState(false);
    const [itemQuery, setItemQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState<number | string>('');
    const [remark, setRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Item detail modal (history + max level editor)
    const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
    const [maxEdit, setMaxEdit] = useState<number | string>('');
    const [savingMax, setSavingMax] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [viewMode, searchTerm, categoryFilter, statusFilter]);

    const loadData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        setErrorMsg(null);
        try {
            const [inv, si] = await Promise.all([
                api.getInventory(),
                api.getStockIn().catch(() => [] as StockInEntry[]),
            ]);
            setItems(inv);
            setStockIns(si);
        } catch (e: any) {
            setErrorMsg(e?.message || 'Failed to load inventory');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const categoryOptions = useMemo(
        () => Array.from(new Set(items.map(i => i.itemCategory).filter(Boolean))).sort(),
        [items]
    );

    const stats = useMemo(() => {
        const s = { total: items.length, EXCESS: 0, NORMAL: 0, ORDER: 0, BELOW: 0 };
        items.forEach(i => { s[getStatus(i.liveStock, i.maxStock)]++; });
        return s;
    }, [items]);

    const filteredItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return items.filter(i => {
            if (term) {
                const hay = `${i.itemName || ''} ${i.itemCode || ''} ${i.itemCategory || ''}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            if (categoryFilter !== 'ALL' && i.itemCategory !== categoryFilter) return false;
            if (statusFilter !== 'ALL' && getStatus(i.liveStock, i.maxStock) !== statusFilter) return false;
            return true;
        });
    }, [items, searchTerm, categoryFilter, statusFilter]);

    const filteredHistory = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return stockIns.filter(s => {
            if (term) {
                const hay = `${s.itemName || ''} ${s.itemCode || ''} ${s.itemCategory || ''} ${s.remark || ''}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            if (categoryFilter !== 'ALL' && s.itemCategory !== categoryFilter) return false;
            return true;
        });
    }, [stockIns, searchTerm, categoryFilter]);

    // Board view groups the (search/category) filtered items by IMS status.
    const grouped = useMemo(() => {
        const g: Record<StockStatus, InventoryItem[]> = { EXCESS: [], NORMAL: [], ORDER: [], BELOW: [] };
        filteredItems.forEach(it => { g[getStatus(it.liveStock, it.maxStock)].push(it); });
        return g;
    }, [filteredItems]);

    const activeFilterCount = [categoryFilter !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length;

    const resetFilters = () => { setSearchTerm(''); setCategoryFilter('ALL'); setStatusFilter('ALL'); };

    const openModal = (item?: InventoryItem) => {
        setSelectedItem(item || null);
        setItemQuery(item ? item.itemName : '');
        setQuantity('');
        setRemark('');
        setModalOpen(true);
    };

    const closeModal = () => { if (!submitting) setModalOpen(false); };

    const openDetail = (item: InventoryItem) => {
        setDetailItem(item);
        setMaxEdit(item.maxStock);
    };
    const closeDetail = () => { if (!savingMax) setDetailItem(null); };

    const saveMax = async () => {
        if (!detailItem) return;
        const val = Number(maxEdit);
        if (isNaN(val) || val < 0) return;
        setSavingMax(true);
        try {
            await api.updateInventoryMax(detailItem.itemCode, val);
            setItems(prev => prev.map(it => it.itemCode === detailItem.itemCode ? { ...it, maxStock: val } : it));
            setDetailItem(prev => prev ? { ...prev, maxStock: val } : prev);
            setTimeout(() => loadData(true), 500);
        } catch (e: any) {
            alert('Could not update max level: ' + (e?.message || 'Unknown error'));
        } finally {
            setSavingMax(false);
        }
    };

    const detailHistory = useMemo(
        () => (detailItem ? stockIns.filter(s => s.itemCode === detailItem.itemCode) : []),
        [detailItem, stockIns]
    );

    const itemSelectOptions = useMemo(
        () => items.map(i => ({ label: i.itemName, value: i.itemCode, subtext: `${i.itemCode} • ${i.itemCategory}` })),
        [items]
    );

    const submitStockIn = async () => {
        if (!selectedItem || !quantity || Number(quantity) <= 0) return;
        setSubmitting(true);
        try {
            const payload = {
                itemCode: selectedItem.itemCode,
                itemName: selectedItem.itemName,
                itemCategory: selectedItem.itemCategory,
                quantity: Number(quantity),
                remark,
            };
            await api.addStockIn(payload);

            // Optimistic history entry.
            setStockIns(prev => [{ id: 'si_local_' + Date.now(), ...payload } as StockInEntry, ...prev]);
            setModalOpen(false);
            // Pull authoritative data (INVENTORY sheet formulas recompute live stock).
            setTimeout(() => loadData(true), 600);
        } catch (e: any) {
            alert('Could not add stock: ' + (e?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const selectCls = "w-full pl-3 pr-8 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white hover:border-indigo-300 transition-all appearance-none cursor-pointer";

    return (
        <div className="max-w-7xl mx-auto pb-40 animate-in fade-in duration-500 relative min-h-screen -mt-6">

            {/* PAGE MOTION KEYFRAMES */}
            <style>{`
                @keyframes invRise {
                    from { opacity: 0; transform: translateY(18px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes invSlide {
                    from { opacity: 0; transform: translateX(-14px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes invBar { from { width: 0; } }
                .inv-rise  { opacity: 0; animation: invRise 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .inv-slide { opacity: 0; animation: invSlide 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .inv-bar   { animation: invBar 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
                @media (prefers-reduced-motion: reduce) {
                    .inv-rise, .inv-slide, .inv-bar { animation: none; opacity: 1; transform: none; }
                }
            `}</style>

            {/* HEADER */}
            <div className="bg-[#F0F4F8] pt-2 pb-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-slate-200 shadow-sm mb-6 md:mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4 inv-slide" style={{ animationDelay: '0ms' }}>
                    <div className="flex items-center gap-2.5 md:gap-3">
                        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-300/50 ring-1 ring-white/40 shrink-0">
                            <Boxes className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl md:text-3xl font-black bg-gradient-to-br from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight leading-tight truncate">Stock Inventory</h1>
                            <p className="text-slate-500 font-medium text-[11px] md:text-sm truncate">Live stock levels &amp; stock-in management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="flex flex-1 lg:flex-none p-1 bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl border border-slate-200/80 shadow-sm">
                            <button
                                onClick={() => setViewMode('STOCK')}
                                className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'STOCK' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-300/50 ring-1 ring-white/30' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'}`}
                            >
                                <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                                <span className="whitespace-nowrap">Inventory</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${viewMode === 'STOCK' ? 'bg-white/25' : 'bg-slate-200 text-slate-600'}`}>{filteredItems.length}</span>
                            </button>
                            <button
                                onClick={() => setViewMode('HISTORY')}
                                className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'HISTORY' ? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md ring-1 ring-white/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                            >
                                <History className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                                <span className="whitespace-nowrap">Stock In</span>
                            </button>
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-1.5 px-3 md:px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs md:text-sm font-black shadow-md shadow-indigo-300/40 hover:shadow-indigo-400/50 transition-all shrink-0"
                        >
                            <PackagePlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Stock</span>
                        </button>
                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-all shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* IMS SNAPSHOT */}
                <div className="relative mb-4 rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-4 md:p-5 shadow-[0_20px_50px_-20px_rgba(30,27,75,0.7)] ring-1 ring-white/10 overflow-hidden inv-rise" style={{ animationDelay: '90ms' }}>
                    <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                    <div className="relative z-10 flex items-center gap-2 mb-3 md:mb-4">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/80">Stock Status &nbsp;·&nbsp; {stats.total} Items</p>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-0 md:divide-x md:divide-white/10">
                        <StatCell color="bg-purple-500" label="Excess" value={stats.EXCESS} sub=">100%" onClick={() => { setStatusFilter('EXCESS'); setViewMode('STOCK'); setShowFilters(true); }} />
                        <StatCell color="bg-emerald-500" label="Normal" value={stats.NORMAL} sub="66-100%" onClick={() => { setStatusFilter('NORMAL'); setViewMode('STOCK'); setShowFilters(true); }} />
                        <StatCell color="bg-yellow-400" label="To Order" value={stats.ORDER} sub="33-66%" onClick={() => { setStatusFilter('ORDER'); setViewMode('STOCK'); setShowFilters(true); }} />
                        <StatCell color="bg-red-500" label="Below" value={stats.BELOW} sub="0-33%" onClick={() => { setStatusFilter('BELOW'); setViewMode('STOCK'); setShowFilters(true); }} />
                    </div>
                </div>

                {/* SEARCH + FILTER BAR */}
                <div className="bg-white/90 backdrop-blur-sm p-3 md:p-4 rounded-2xl shadow-[0_8px_30px_-12px_rgba(15,23,42,0.18)] border border-slate-200/70 relative before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-indigo-500 before:via-purple-500 before:to-indigo-400 before:rounded-t-2xl inv-rise" style={{ animationDelay: '160ms' }}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search item, code or category…"
                                className="w-full pl-9 pr-8 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${showFilters || activeFilterCount ? 'bg-indigo-500 text-white shadow-md shadow-indigo-300/40' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-indigo-300'}`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-white text-indigo-600 text-[10px] flex items-center justify-center">{activeFilterCount}</span>
                            )}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            <div className="relative">
                                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={selectCls}>
                                    <option value="ALL">All Categories</option>
                                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            </div>
                            {viewMode === 'STOCK' && (
                                <div className="relative">
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className={selectCls}>
                                        <option value="ALL">All Status</option>
                                        <option value="EXCESS">Excess (&gt;100%)</option>
                                        <option value="NORMAL">Normal (66-100%)</option>
                                        <option value="ORDER">To Order (33-66%)</option>
                                        <option value="BELOW">Below (0-33%)</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                </div>
                            )}
                            {activeFilterCount > 0 && (
                                <button onClick={resetFilters} className="col-span-2 md:col-span-1 self-center flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black text-red-600 bg-red-50 hover:bg-red-100 transition-all">
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
                        <p className="font-semibold text-sm">Loading inventory…</p>
                    </div>
                ) : viewMode === 'STOCK' ? (
                    filteredItems.length === 0 ? (
                        <EmptyState icon={<BoxesIcon className="w-9 h-9" />} title="No items found" subtitle="Try clearing filters or adjusting your search." />
                    ) : (
                        <>
                        {/* CARDS / BOARD VIEW TOGGLE */}
                        <div className="flex justify-end mb-4">
                            <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <button onClick={() => setStockView('CARDS')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${stockView === 'CARDS' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}><Layers className="w-3.5 h-3.5" /> Cards</button>
                                <button onClick={() => setStockView('BOARD')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${stockView === 'BOARD' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}><LayoutGrid className="w-3.5 h-3.5" /> Board</button>
                            </div>
                        </div>

                        {stockView === 'CARDS' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                            {filteredItems.slice(0, visibleCount).map((item, i) => {
                                const status = getStatus(item.liveStock, item.maxStock);
                                const cfg = STATUS_CFG[status];
                                const pct = pctOf(item.liveStock, item.maxStock);
                                return (
                                    <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.15)] hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)] hover:border-indigo-300 transition-all overflow-hidden inv-rise" style={{ animationDelay: `${(i % 12) * 40}ms` }}>
                                        <div className="p-4 cursor-pointer" onClick={() => openDetail(item)}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-slate-800 text-sm truncate">{item.itemName || item.itemCode}</h3>
                                                    <p className="text-[11px] text-slate-400 font-bold truncate">{item.itemCode} · {item.itemCategory}</p>
                                                </div>
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ring-1 ${cfg.badge}`}>{cfg.short}</span>
                                            </div>

                                            <div className="mt-3 flex items-end justify-between">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Live Stock</p>
                                                    <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">
                                                        {item.liveStock}<span className="text-sm text-slate-400 font-bold"> / {item.maxStock}</span>
                                                    </p>
                                                </div>
                                                <p className="text-lg font-black tabular-nums" style={{ color: 'inherit' }}>
                                                    <span className={status === 'EXCESS' ? 'text-purple-600' : status === 'NORMAL' ? 'text-emerald-600' : status === 'ORDER' ? 'text-yellow-600' : 'text-red-600'}>{Math.round(pct)}%</span>
                                                </p>
                                            </div>

                                            {/* IMS PROGRESS BAR */}
                                            <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full inv-bar ${cfg.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                            </div>

                                            <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                                                <Metric label="Opening" value={item.openingStock} />
                                                <Metric label="In Hand" value={item.inHandStock} />
                                                <Metric label="Current" value={item.currentStock} />
                                                <Metric label="Total In" value={item.totalInStock} />
                                            </div>
                                        </div>

                                        <button onClick={() => openModal(item)} className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-100 text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-all">
                                            <Plus className="w-3.5 h-3.5" /> Add Stock
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        ) : (
                        /* BOARD VIEW — status columns like the sheet dashboard */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                            {STATUS_ORDER.map(st => {
                                const list = grouped[st];
                                const b = BOARD_CFG[st];
                                return (
                                    <div key={st} className={`bg-white rounded-2xl border ${b.ring} shadow-[0_4px_20px_-8px_rgba(15,23,42,0.15)] overflow-hidden inv-rise`}>
                                        <div className={`px-3 py-2.5 flex items-center justify-between ${b.head}`}>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wide truncate">{b.title}</p>
                                                <p className="text-[9px] font-bold uppercase tracking-wider opacity-80">{b.sub}</p>
                                            </div>
                                            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-black/15 shrink-0">{list.length}</span>
                                        </div>
                                        <div className="grid grid-cols-[26px_1fr_34px_44px] text-[9px] font-black uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-100">
                                            <div className="px-1 py-1.5 text-center">#</div>
                                            <div className="px-2 py-1.5">Item Name</div>
                                            <div className="px-1 py-1.5 text-center">Max</div>
                                            <div className="px-1 py-1.5 text-center leading-tight">Live<br/>Stock</div>
                                        </div>
                                        <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
                                            {list.length === 0 ? (
                                                <p className="text-center text-[11px] text-slate-400 font-semibold py-6">No items</p>
                                            ) : list.map((it, idx) => (
                                                <div key={it.id} onClick={() => openDetail(it)} className="grid grid-cols-[26px_1fr_34px_44px] items-center text-xs hover:bg-slate-50 transition-colors cursor-pointer">
                                                    <div className="px-1 py-2 text-center text-slate-400 font-bold tabular-nums">{idx + 1}</div>
                                                    <div className="px-2 py-2 min-w-0">
                                                        <p className="font-bold text-slate-700 truncate leading-tight">{it.itemName || it.itemCode}</p>
                                                        <p className="text-[9px] text-slate-400 truncate">{it.itemCode}</p>
                                                    </div>
                                                    <div className="px-1 py-2 text-center font-black text-slate-600 tabular-nums">{it.maxStock}</div>
                                                    <div className="px-1 py-2 flex justify-center">
                                                        <span className={`min-w-[30px] text-center px-1.5 py-0.5 rounded-md text-[11px] font-black tabular-nums ${b.stockCell}`}>{it.liveStock}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => { setStatusFilter(st); setStockView('CARDS'); }} className="w-full text-[10px] font-black text-slate-500 hover:text-indigo-600 hover:bg-slate-50 py-2 border-t border-slate-100 transition-all">View as cards →</button>
                                    </div>
                                );
                            })}
                        </div>
                        )}
                        </>
                    )
                ) : null}

                {!loading && viewMode === 'STOCK' && stockView === 'CARDS' && filteredItems.length > visibleCount && (
                    <div className="flex justify-center mt-5">
                        <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="px-5 py-2.5 rounded-xl text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all">
                            Load More ({filteredItems.length - visibleCount} left)
                        </button>
                    </div>
                )}

                {!loading && viewMode === 'HISTORY' && (
                    filteredHistory.length === 0 ? (
                        <EmptyState icon={<History className="w-9 h-9" />} title="No stock-in yet" subtitle="Stock you add will appear here." />
                    ) : (
                        <div className="space-y-2.5">
                            {filteredHistory.slice(0, visibleCount).map((s, i) => (
                                <div key={s.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5 flex items-center gap-3 inv-rise" style={{ animationDelay: `${(i % 12) * 40}ms` }}>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-slate-800 text-sm truncate">{s.itemName || s.itemCode}</h3>
                                        <p className="text-[11px] text-slate-400 font-bold truncate">{s.itemCode} · {s.itemCategory}</p>
                                        {s.remark && <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1 inline-block">{s.remark}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Qty In</p>
                                        <p className="text-xl font-black text-emerald-600 tabular-nums leading-none">+{s.quantity}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {!loading && viewMode === 'HISTORY' && filteredHistory.length > visibleCount && (
                    <div className="flex justify-center mt-5">
                        <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="px-5 py-2.5 rounded-xl text-sm font-black text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all">
                            Load More ({filteredHistory.length - visibleCount} left)
                        </button>
                    </div>
                )}
            </div>

            {/* ITEM DETAIL MODAL — history + max level editor */}
            {detailItem && (() => {
                const status = getStatus(detailItem.liveStock, detailItem.maxStock);
                const cfg = STATUS_CFG[status];
                const pct = pctOf(detailItem.liveStock, detailItem.maxStock);
                return (
                    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeDetail} />
                        <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[92vh]">
                            <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative shrink-0">
                                <button onClick={closeDetail} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Item Detail</p>
                                <h3 className="text-xl font-black truncate pr-8">{detailItem.itemName || detailItem.itemCode}</h3>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                    <span className="text-xs font-semibold text-white/80">{detailItem.itemCode} · {detailItem.itemCategory}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ring-1 ${cfg.badge}`}>{cfg.short}</span>
                                </div>
                            </div>

                            <div className="p-5 space-y-5 overflow-y-auto">
                                {/* STOCK SUMMARY */}
                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Live Stock</p>
                                            <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">{detailItem.liveStock}<span className="text-sm text-slate-400 font-bold"> / {detailItem.maxStock}</span></p>
                                        </div>
                                        <span className={status === 'EXCESS' ? 'text-purple-600 text-lg font-black' : status === 'NORMAL' ? 'text-emerald-600 text-lg font-black' : status === 'ORDER' ? 'text-yellow-600 text-lg font-black' : 'text-red-600 text-lg font-black'}>{Math.round(pct)}%</span>
                                    </div>
                                    <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                    </div>
                                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                                        <Metric label="Opening" value={detailItem.openingStock} />
                                        <Metric label="In Hand" value={detailItem.inHandStock} />
                                        <Metric label="Current" value={detailItem.currentStock} />
                                        <Metric label="Total In" value={detailItem.totalInStock} />
                                    </div>
                                </div>

                                {/* MAX LEVEL EDITOR */}
                                <div className="rounded-2xl border border-slate-200 p-4">
                                    <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 mb-2">
                                        <Gauge className="w-3.5 h-3.5 text-indigo-500" /> Set Max Level
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            value={maxEdit}
                                            onChange={e => setMaxEdit(e.target.value)}
                                            className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
                                        />
                                        <button
                                            onClick={saveMax}
                                            disabled={savingMax || maxEdit === '' || Number(maxEdit) === detailItem.maxStock}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-300/40 transition-all disabled:opacity-40 disabled:shadow-none"
                                        >
                                            {savingMax ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-400 font-medium">Updates MAX STOCK in the INVENTORY sheet. Stock % recalculates automatically.</p>
                                </div>

                                {/* STOCK IN HISTORY */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="flex items-center gap-1.5 text-xs font-black text-slate-700"><History className="w-3.5 h-3.5 text-indigo-500" /> Stock In History</p>
                                        <span className="text-[10px] font-black text-slate-400">{detailHistory.length} entries</span>
                                    </div>
                                    {detailHistory.length === 0 ? (
                                        <p className="text-center text-[12px] text-slate-400 font-semibold py-6 bg-slate-50 rounded-xl">No stock-in recorded for this item.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-52 overflow-y-auto">
                                            {detailHistory.map(s => (
                                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-500 shrink-0"><Package className="w-4 h-4" /></div>
                                                    <div className="min-w-0 flex-1">
                                                        {s.remark ? <p className="text-xs font-semibold text-slate-600 truncate">{s.remark}</p> : <p className="text-xs text-slate-400 italic">No remark</p>}
                                                    </div>
                                                    <span className="text-sm font-black text-emerald-600 tabular-nums shrink-0">+{s.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 shrink-0">
                                <button
                                    onClick={() => { const it = detailItem; setDetailItem(null); if (it) openModal(it); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-300/40 hover:shadow-indigo-400/50 transition-all"
                                >
                                    <PackagePlus className="w-4 h-4" /> Add Stock
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ADD STOCK MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300 overflow-visible">
                        <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative rounded-t-3xl">
                            <button onClick={closeModal} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Stock In</p>
                            <h3 className="text-xl font-black">Add Stock Quantity</h3>
                            <p className="text-xs font-semibold text-white/70 mt-0.5">Saved to the STOCK IN sheet</p>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2">Item <span className="text-red-500">*</span></label>
                                <SearchableSelect
                                    options={itemSelectOptions}
                                    value={itemQuery}
                                    placeholder="Search item by name or code…"
                                    onChange={(text, opt) => {
                                        setItemQuery(text);
                                        if (opt) setSelectedItem(items.find(it => it.itemCode === opt.value) || null);
                                        else setSelectedItem(null);
                                    }}
                                />
                                {selectedItem && (
                                    <p className="mt-1.5 text-[11px] font-bold text-slate-500">
                                        {selectedItem.itemCode} · {selectedItem.itemCategory} · Live: <span className="text-slate-800">{selectedItem.liveStock}</span> / {selectedItem.maxStock}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2">Stock In Quantity <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2">Remark</label>
                                <input
                                    type="text"
                                    value={remark}
                                    onChange={e => setRemark(e.target.value)}
                                    placeholder="Optional note…"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex gap-2">
                            <button onClick={closeModal} disabled={submitting} className="px-4 py-3 rounded-xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50">
                                Cancel
                            </button>
                            <button
                                onClick={submitStockIn}
                                disabled={!selectedItem || !quantity || Number(quantity) <= 0 || submitting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-300/40 hover:shadow-indigo-400/50 transition-all disabled:opacity-40 disabled:shadow-none"
                            >
                                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {submitting ? 'Saving…' : 'Add Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCell: React.FC<{ color: string; label: string; value: number; sub: string; onClick: () => void }> = ({ color, label, value, sub, onClick }) => (
    <button onClick={onClick} className="flex items-center gap-2.5 md:gap-3 md:px-4 py-1 min-w-0 text-left hover:opacity-80 transition-opacity">
        <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl ${color}/20 ring-1 ring-white/10 flex items-center justify-center shrink-0`}>
            <span className={`w-3 h-3 rounded-full ${color}`} />
        </div>
        <div className="overflow-hidden">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 mb-0.5 truncate">{label} <span className="text-slate-500">{sub}</span></p>
            <p className="text-xl md:text-[26px] font-black text-white tabular-nums leading-none">{value}</p>
        </div>
    </button>
);

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="bg-slate-50 rounded-lg py-1.5">
        <p className="text-[8px] font-black uppercase tracking-wide text-slate-400 leading-none mb-1">{label}</p>
        <p className="text-sm font-black text-slate-700 tabular-nums leading-none">{value}</p>
    </div>
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

export default StockInventory;
