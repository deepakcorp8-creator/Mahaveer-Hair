import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../services/api";
import { Entry } from "../types";
import {
  History,
  Search,
  UserSearch,
  RotateCcw,
  FileDown,
  Printer,
  User,
  Wallet,
  Calendar,
  ArrowUpRight,
  Filter,
  ArrowRight,
  ChevronDown,
  CalendarCheck,
  ListFilter,
  X,
  RefreshCw,
  Pencil,
  Save,
} from "lucide-react";
import { generateInvoice } from "../utils/invoiceGenerator";

const ClientHistory: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<Partial<Entry>>({});
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (entry: Entry) => {
    setEditEntry(entry);
    setEditForm({
      amount: entry.amount,
      paymentMethod: entry.paymentMethod,
      remark: entry.remark,
      technician: entry.technician,
      serviceType: entry.serviceType,
      branch: entry.branch,
      workStatus: entry.workStatus,
      pendingAmount: entry.pendingAmount ?? 0,
    });
  };

  const closeEdit = () => {
    setEditEntry(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    setEditSaving(true);
    try {
      const updated: Entry = { ...editEntry, ...editForm } as Entry;
      await api.updateEntry(updated);
      setEntries((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
      closeEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to save. Please try again.");
    } finally {
      setEditSaving(false);
    }
  };

  // Copy Contact Logic
  const [showStats, setShowStatsLocal] = useState(() => localStorage.getItem('showStats') === 'true');

  // Sync with localStorage changes (e.g. toggled in Dashboard)
  useEffect(() => {
    const onStorage = () => setShowStatsLocal(localStorage.getItem('showStats') === 'true');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

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

  // Filters
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    loadData(false);
  }, []);

  const loadData = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const allEntries = await api.getEntries(forceRefresh);
      setEntries(allEntries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "N/A";
    // If it's standard ISO YYYY-MM-DD
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        // Check if year is first
        if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        // If DD-MM-YYYY
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
    return dateStr;
  };

  const getSafeDayName = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      // If DD/MM/YYYY, fix for constructor
      let isoDate = dateStr;
      if (dateStr.includes("/")) {
        const p = dateStr.split("/");
        isoDate = `${p[2]}-${p[1]}-${p[0]}`;
      }
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", { weekday: "short" });
    } catch (e) {
      return "";
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, branchFilter, serviceTypeFilter, searchTerm]);

  // Filter Logic
  const filteredData = useMemo(() => {
    return entries.filter((e) => {
      if (branchFilter !== "ALL" && e.branch !== branchFilter) return false;
      if (serviceTypeFilter !== "ALL" && e.serviceType !== serviceTypeFilter)
        return false;

      const entryDate = e.date;
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      if (searchTerm) {
        const term = String(searchTerm || '').toLowerCase();
        const matchName = String(e.clientName || '').toLowerCase().includes(term);
        const matchNumber = String(e.contactNo).includes(term);
        return matchName || matchNumber;
      }
      return true;
    });
  }, [
    entries,
    branchFilter,
    serviceTypeFilter,
    startDate,
    endDate,
    searchTerm,
  ]);

  const totalAmount = useMemo(
    () => filteredData.reduce((sum, e) => sum + Number(e.amount), 0),
    [filteredData],
  );

  const uniqueServiceTypes = useMemo(() => {
    const types = new Set(entries.map((e) => e.serviceType).filter(Boolean));
    return Array.from(types).sort();
  }, [entries]);
  const totalVisits = filteredData.length;

  const totalPages = Math.ceil(totalVisits / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const setPreset = (type: "TODAY" | "ALL" | "CLIENT_SEARCH") => {
    const today = new Date().toISOString().split("T")[0];
    if (type === "TODAY") {
      setStartDate(today);
      setEndDate(today);
    } else if (type === "ALL") {
      setStartDate("");
      setEndDate("");
      setSearchTerm("");
      setServiceTypeFilter("ALL");
    } else if (type === "CLIENT_SEARCH") {
      setStartDate("");
      setEndDate("");
      setTimeout(() => {
        const input = document.getElementById("history-search-input");
        if (input) input.focus();
      }, 100);
    }
  };

  const card3D =
    "relative bg-white rounded-[2rem] p-6 border border-slate-200 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.08)] hover:shadow-xl transition-all duration-300 group overflow-hidden";
  const glow =
    "absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 transition-all group-hover:opacity-40 pointer-events-none";

  return (
    <>
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl shadow-xl shadow-indigo-300/50">
            <History className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                Client History
              </h2>
              <button
                onClick={() => loadData(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            <p className="text-slate-500 font-medium text-base">
              Track transactions & service records
            </p>
          </div>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <div
            className={`${card3D} flex-1 lg:w-48 !p-5 border-b-4 border-b-emerald-500`}
          >
            <div className={`${glow} bg-emerald-500 -mr-10 -mt-10`}></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Total Revenue
            </p>
            <p className="font-black text-2xl text-slate-800 flex items-center">
              <span className="text-emerald-500 mr-1">₹</span>
              {showStats ? totalAmount.toLocaleString() : '••••'}
            </p>
          </div>
          <div
            className={`${card3D} flex-1 lg:w-48 !p-5 border-b-4 border-b-indigo-500`}
          >
            <div className={`${glow} bg-indigo-500 -mr-10 -mt-10`}></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Records Found
            </p>
            <p className="font-black text-2xl text-slate-800 flex items-center">
              {totalVisits}{" "}
              <ArrowUpRight className="w-4 h-4 text-indigo-400 ml-1" />
            </p>
          </div>
        </div>
      </div>

      {/* ADVANCED FILTER COMMAND CENTER */}
      <div className="bg-white p-5 rounded-[2rem] shadow-xl shadow-slate-200/60 border border-slate-200 space-y-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
          <Filter className="w-24 h-24 text-indigo-500" />
        </div>

        {/* Top Row: Core Filters (Date & Branch & Service) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
          {/* Date From */}
          <div className="md:col-span-3 relative group">
            <div className="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm group-focus-within:text-indigo-500 group-focus-within:border-indigo-200 transition-all">
              <Calendar className="w-5 h-5" />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-16 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
            />
            <label className="absolute -top-2.5 left-5 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-100">
              From Date
            </label>
          </div>

          {/* Date To */}
          <div className="md:col-span-3 relative group">
            <div className="absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm group-focus-within:text-indigo-500 group-focus-within:border-indigo-200 transition-all">
              <Calendar className="w-5 h-5" />
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-16 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
            />
            <label className="absolute -top-2.5 left-5 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-100">
              To Date
            </label>
          </div>

          {/* Branch Select */}
          <div className="md:col-span-3 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm pointer-events-none group-focus-within:text-indigo-500 group-focus-within:border-indigo-200 transition-all">
              <Filter className="w-5 h-5" />
            </div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full pl-16 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              <option value="RPR">Raipur</option>
              <option value="JDP">Jagdalpur</option>
              <option value="RPR-MOWA">Mowa</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronDown className="w-4 h-4" />
            </div>
            <label className="absolute -top-2.5 left-5 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-100">
              Filter Branch
            </label>
          </div>

          {/* Service Type Select */}
          <div className="md:col-span-3 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-white text-slate-400 flex items-center justify-center border border-slate-200 shadow-sm pointer-events-none group-focus-within:text-indigo-500 group-focus-within:border-indigo-200 transition-all">
              <Filter className="w-5 h-5" />
            </div>
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="w-full pl-16 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
            >
              <option value="ALL">All Services</option>
              {uniqueServiceTypes.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronDown className="w-4 h-4" />
            </div>
            <label className="absolute -top-2.5 left-5 px-2 bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest rounded-full border border-slate-100">
              Filter Service
            </label>
          </div>
        </div>

        {/* Bottom Row: Controls & Search */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 relative z-10 pt-2 border-t border-slate-100/50">
          {/* Intelligent Presets */}
          <div className="flex p-1.5 bg-slate-100 rounded-[1.2rem] border border-slate-200 w-full lg:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setPreset("TODAY")}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all border shadow-sm font-bold text-xs uppercase tracking-wider flex-1 lg:flex-none whitespace-nowrap ${startDate === new Date().toISOString().split("T")[0] && endDate === startDate ? "bg-white text-indigo-600 border-indigo-100 shadow-indigo-100" : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
            >
              <CalendarCheck className="w-4 h-4" />
              Today
            </button>
            <div className="w-px bg-slate-200 my-2 mx-1"></div>
            <button
              onClick={() => setPreset("CLIENT_SEARCH")}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all border shadow-sm font-bold text-xs uppercase tracking-wider flex-1 lg:flex-none whitespace-nowrap ${!startDate && !endDate && searchTerm ? "bg-white text-violet-600 border-violet-100 shadow-violet-100" : "bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
            >
              <ListFilter className="w-4 h-4" />
              All Data
            </button>
            <div className="w-px bg-slate-200 my-2 mx-1"></div>
            <button
              onClick={() => setPreset("ALL")}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all border border-transparent font-bold text-xs uppercase tracking-wider text-slate-400 hover:text-red-500 hover:bg-red-50 flex-1 lg:flex-none whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Advanced Search */}
          <div className="relative group w-full lg:max-w-md">
            <div className="absolute left-1 top-1/2 -translate-y-1/2 p-2 bg-indigo-500/10 rounded-xl text-indigo-500 pointer-events-none transition-transform group-focus-within:scale-110 group-focus-within:bg-indigo-500 group-focus-within:text-white">
              <Search className="w-5 h-5" />
            </div>
            <input
              id="history-search-input"
              type="text"
              placeholder="Search client name, mobile, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 hover:border-slate-300"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative z-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-900 text-white uppercase font-bold text-xs border-b border-indigo-500/30">
              <tr>
                <th className="px-8 py-6 tracking-wider">Date</th>
                <th className="px-8 py-6 tracking-wider">Client</th>
                <th className="px-8 py-6 tracking-wider">Service</th>
                <th className="px-8 py-6 tracking-wider">Payment</th>
                <th className="px-8 py-6 text-right tracking-wider">Amount</th>
                <th className="px-8 py-6 text-center tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-24 font-bold text-slate-400 animate-pulse"
                  >
                    Loading history records...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-24 text-slate-400 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-4 bg-slate-100 rounded-full mb-3">
                        <Filter className="w-8 h-8 text-slate-300" />
                      </div>
                      <p>No records found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((entry, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="font-bold text-slate-700">
                        {formatDateDisplay(entry.date)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">
                        {getSafeDayName(entry.date)}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="font-black text-slate-800 text-base">
                        {entry.clientName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span 
                          onTouchStart={() => startContactLongPress(entry.id || String(idx), String(entry.contactNo))}
                          onTouchEnd={cancelContactLongPress}
                          onTouchMove={cancelContactLongPress}
                          onMouseDown={() => startContactLongPress(entry.id || String(idx), String(entry.contactNo))}
                          onMouseUp={cancelContactLongPress}
                          onMouseLeave={cancelContactLongPress}
                          onContextMenu={(e) => e.preventDefault()}
                          className={`text-[11px] font-bold select-none cursor-pointer tracking-wider tabular-nums shadow-sm px-2 py-0.5 rounded border transition-colors ${copiedContactId === (entry.id || String(idx)) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200'}`}
                          title="Long press to copy"
                        >
                          {copiedContactId === (entry.id || String(idx)) ? 'Copied!' : entry.contactNo}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${entry.serviceType === "NEW" ? "bg-blue-50 text-blue-700 border-blue-200" : entry.serviceType === "SERVICE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : entry.serviceType === "DEMO" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}
                        >
                          {entry.serviceType}
                        </span>
                        <div className="text-xs font-bold text-slate-500 flex items-center pl-1">
                          <User className="w-3 h-3 mr-1.5 text-slate-400" />
                          {entry.technician}
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] uppercase">
                            {entry.branch}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs uppercase text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                          {entry.paymentMethod}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="font-black text-slate-900 text-lg">
                        ₹{entry.amount}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {entry.invoiceUrl &&
                          entry.invoiceUrl.startsWith("http") && (
                            <a
                              href={entry.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition-all shadow-sm"
                              title="View Saved Invoice"
                            >
                              <FileDown className="w-4 h-4" />
                            </a>
                          )}
                        <button
                          onClick={() => generateInvoice(entry)}
                          className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-800 hover:text-white border border-slate-200 transition-all shadow-sm"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 transition-all shadow-sm"
                          title="Edit Entry"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4 mt-6">
          <div className="text-sm font-bold text-slate-500 order-2 md:order-1">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalVisits)} of {totalVisits}{" "}
            entries
          </div>
          <div className="flex gap-2 order-1 md:order-2 w-full md:w-auto justify-between md:justify-end">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="px-4 py-2 bg-indigo-50 text-indigo-700 font-black rounded-xl border border-indigo-100 flex items-center justify-center min-w-[100px]">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>

      {/* EDIT MODAL */}
      {editEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-500 to-orange-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg leading-tight">Edit Entry</h3>
                  <p className="text-amber-100 text-xs font-medium">{editEntry.clientName} &bull; {editEntry.date}</p>
                </div>
              </div>
              <button
                onClick={closeEdit}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Amount (₹)</label>
                <input
                  type="number"
                  value={editForm.amount ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                />
              </div>

              {/* Pending Amount */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pending Amount (₹)</label>
                <input
                  type="number"
                  value={editForm.pendingAmount ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, pendingAmount: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Payment Method</label>
                <select
                  value={editForm.paymentMethod ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, paymentMethod: e.target.value as Entry["paymentMethod"] }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">CARD</option>
                  <option value="PENDING">PENDING</option>
                  <option value="MIXED">MIXED</option>
                  <option value="MIXED (CASH+UPI)">MIXED (CASH+UPI)</option>
                </select>
              </div>

              {/* Service Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Service Type</label>
                <select
                  value={editForm.serviceType ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, serviceType: e.target.value as Entry["serviceType"] }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                >
                  <option value="SERVICE">SERVICE</option>
                  <option value="NEW">NEW</option>
                  <option value="DEMO">DEMO</option>
                  <option value="MUNDAN">MUNDAN</option>
                  <option value="WASHING">WASHING</option>
                </select>
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Branch</label>
                <select
                  value={editForm.branch ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, branch: e.target.value as Entry["branch"] }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                >
                  <option value="RPR">Raipur (RPR)</option>
                  <option value="JDP">Jagdalpur (JDP)</option>
                  <option value="RPR-MOWA">Mowa (RPR-MOWA)</option>
                </select>
              </div>

              {/* Work Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Work Status</label>
                <select
                  value={editForm.workStatus ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, workStatus: e.target.value as Entry["workStatus"] }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                >
                  <option value="DONE">DONE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FOLLOWUP">FOLLOWUP</option>
                  <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              {/* Technician */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Technician</label>
                <input
                  type="text"
                  value={editForm.technician ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, technician: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all"
                />
              </div>

              {/* Remark */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Remark</label>
                <textarea
                  rows={3}
                  value={editForm.remark ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, remark: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-slate-100 bg-slate-50">
              <button
                onClick={closeEdit}
                className="px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-lg shadow-amber-300/40 hover:shadow-amber-400/50 hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                <Save className="w-4 h-4" />
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientHistory;
