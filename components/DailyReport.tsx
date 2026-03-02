
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
            if (searchTerm && !entry.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
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

    const paymentStats = useMemo(() => ({
        CASH: dailyEntries
            .filter(e => e.paymentMethod === 'CASH')
            .reduce((s, e) => s + (Number(e.amount || 0) - Number(e.pendingAmount || 0)), 0),
        UPI: dailyEntries
            .filter(e => e.paymentMethod === 'UPI')
            .reduce((s, e) => s + (Number(e.amount || 0) - Number(e.pendingAmount || 0)), 0),
        CARD: dailyEntries
            .filter(e => e.paymentMethod === 'CARD')
            .reduce((s, e) => s + (Number(e.amount || 0) - Number(e.pendingAmount || 0)), 0),
        PENDING: dailyEntries.reduce((s, e) => s + Number(e.pendingAmount || 0), 0),
    }), [dailyEntries]);

    const card3D = "bg-white rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-2 border-slate-200 p-3 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden";

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 animate-in fade-in duration-500 pb-20">

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

            {/* HEADER & CONTROLS */}
            <div className="bg-white rounded-3xl shadow-[0_15px_35px_-10px_rgba(0,0,0,0.08)] border border-slate-200 p-5 relative z-20">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">

                    {/* Title & Refresh */}
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Daily Report</h2>
                            <button onClick={() => loadData(true)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors" title="Refresh Data">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <p className="text-slate-500 font-bold text-sm mt-1">Overview for <span className="text-indigo-600">{formatDateDisplay(selectedDate)}</span></p>
                    </div>

                    {/* KEY CONTEXT CONTROLS (Date & Branch) */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Picker - Premium Pill */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none hover:bg-white transition-all cursor-pointer w-full sm:w-auto shadow-sm"
                            />
                        </div>

                        {/* Branch Selector - Premium Pill */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MapPin className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                            </div>
                            <select
                                value={branchFilter}
                                onChange={e => setBranchFilter(e.target.value)}
                                className="pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none hover:bg-white transition-all cursor-pointer appearance-none shadow-sm min-w-[140px]"
                            >
                                <option value="ALL">All Branches</option>
                                <option value="RPR">Raipur</option>
                                <option value="JDP">Jagdalpur</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* SECONDARY FILTERS TOOLBAR */}
                <div className="mt-5 pt-5 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-center">

                    {/* Search */}
                    <div className="relative w-full md:max-w-xs group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-10 pr-3 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold placeholder:font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none hover:bg-white transition-all"
                            placeholder="Search client name..."
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Filters Row */}
                    <div className="flex overflow-x-auto pb-1 md:pb-0 gap-2 w-full md:w-auto scrollbar-hide">
                        {/* Service Filter */}
                        <div className="relative min-w-[130px]">
                            <select
                                value={serviceFilter}
                                onChange={e => setServiceFilter(e.target.value)}
                                className={`w-full pl-3 pr-8 py-2 border rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer transition-all shadow-sm
                                ${serviceFilter !== 'ALL' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            >
                                <option value="ALL">All Services</option>
                                <option value="NEW">New Patch</option>
                                <option value="SERVICE">Service</option>
                                <option value="WASHING">Washing</option>
                                <option value="DEMO">Demo</option>
                                <option value="MUNDAN">Mundan</option>
                            </select>
                            <Filter className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${serviceFilter !== 'ALL' ? 'text-indigo-500' : 'text-slate-400'}`} />
                        </div>

                        {/* Payment Filter */}
                        <div className="relative min-w-[130px]">
                            <select
                                value={paymentFilter}
                                onChange={e => setPaymentFilter(e.target.value)}
                                className={`w-full pl-3 pr-8 py-2 border rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer transition-all shadow-sm
                                ${paymentFilter !== 'ALL' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            >
                                <option value="ALL">All Payments</option>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">Card</option>
                                <option value="PENDING">Pending</option>
                            </select>
                            <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${paymentFilter !== 'ALL' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </div>

                        {/* Reset */}
                        {(serviceFilter !== 'ALL' || paymentFilter !== 'ALL' || branchFilter !== 'ALL' || searchTerm) && (
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main KPI Row - ULTRA COMPACT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Daily Collection */}
                <div className="rounded-xl p-4 relative overflow-hidden group shadow-md shadow-indigo-500/20 bg-slate-900 border-2 border-indigo-500/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all"></div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Daily Collection</p>
                            <h3 className="text-2xl font-black text-white tracking-tight">₹{totalDailyRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm shadow-inner">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                    </div>
                </div>

                {/* Total Activity */}
                <div className="rounded-xl p-4 bg-white border-2 border-slate-200 shadow-md shadow-slate-200/50 flex items-center justify-between group hover:border-indigo-100 transition-colors">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Total Activity</p>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
                            {totalTxns} <span className="text-xs font-bold text-slate-400">Entries</span>
                        </h3>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Service Breakdown Row - SMALL VERTICAL CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform"><UserPlus className="w-4 h-4" /></div>
                        <span className="text-xs font-bold text-slate-300">01</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{serviceStats.NEW}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Patches</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform"><Scissors className="w-4 h-4" /></div>
                        <span className="text-xs font-bold text-slate-300">02</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{serviceStats.SERVICE}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Only</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform"><Droplets className="w-4 h-4" /></div>
                        <span className="text-xs font-bold text-slate-300">03</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{serviceStats.WASHING}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Washing</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform"><Sparkles className="w-4 h-4" /></div>
                        <span className="text-xs font-bold text-slate-300">04</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{serviceStats.DEMO}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demo Visits</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group col-span-2 md:col-span-1">
                    <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform"><UserCheck className="w-4 h-4" /></div>
                        <span className="text-xs font-bold text-slate-300">05</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{serviceStats.MUNDAN}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mundan</p>
                    </div>
                </div>
            </div>

            {/* Payment Breakdown Row - COMPACT PILLS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white px-4 py-3 rounded-xl border-2 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Cash</p>
                    </div>
                    <p className="font-black text-slate-700">₹{paymentStats.CASH.toLocaleString()}</p>
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border-2 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase">UPI</p>
                    </div>
                    <p className="font-black text-slate-700">₹{paymentStats.UPI.toLocaleString()}</p>
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border-2 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Card</p>
                    </div>
                    <p className="font-black text-slate-700">₹{paymentStats.CARD.toLocaleString()}</p>
                </div>

                <div className="bg-white px-4 py-3 rounded-xl border-2 border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Pending</p>
                    </div>
                    <p className="font-black text-slate-700">₹{paymentStats.PENDING.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-900 text-white uppercase font-bold text-xs border-b border-indigo-500/30">
                            <tr>
                                <th className="px-6 py-5 tracking-wider">Client Name</th>
                                <th className="px-6 py-5 tracking-wider">Contact / Address</th>
                                <th className="px-6 py-5 tracking-wider">Service</th>
                                <th className="px-6 py-5 tracking-wider">Payment</th>
                                <th className="px-6 py-5 text-right tracking-wider">Amount</th>
                                <th className="px-6 py-5 text-center tracking-wider">Actions</th>
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
