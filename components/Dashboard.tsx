
import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, IndianRupee, Activity, ShoppingBag, ArrowUpRight, Sparkles, TrendingUp, AlertCircle, Calendar, ChevronDown, Filter, MapPin, SlidersHorizontal, Calculator, Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Entry } from '../types';
import { getInitial } from '../utils/dataUtils';
import { INDIA_STATES, INDIA_VIEWBOX, resolveState } from '../utils/indiaMap';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const MONTHS = [
  "All Time", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Dashboard: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [totalRegisteredClients, setTotalRegisteredClients] = useState(0);
  const [loading, setLoading] = useState(true);
  // Default to the month we are in — that is what people open the dashboard to check.
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth() + 1]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [showStats, setShowStats] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // --- INCENTIVE STATE ---
  const [showIncentiveSettings, setShowIncentiveSettings] = useState(false);
  const [incentiveDetailTech, setIncentiveDetailTech] = useState<string | null>(null);

  // Default Configuration
  const [incentiveConfig, setIncentiveConfig] = useState({
    newPatchTier1Limit: 12000,
    newPatchTier1Amount: 200,
    newPatchTier2Limit: 24000,
    newPatchTier2Amount: 250,
    newPatchTier3Amount: 500,
    demoAmount: 200,
    packageAmount: 0 // Amount for creating a package
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both transactions and client master options
        const [entriesData, optionsData] = await Promise.all([
          api.getEntries(),
          api.getOptions()
        ]);

        setEntries(entriesData);
        // FIX: Count only from CLIENT MASTER list
        if (optionsData && optionsData.clients) {
          setTotalRegisteredClients(optionsData.clients.length);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Repaint whenever the live data engine pulls in fresher numbers.
    return api.subscribe(() => fetchData());
  }, []);

  // Calculate available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear()); // Always include current year

    entries.forEach(entry => {
      if (entry.date) {
        years.add(new Date(entry.date).getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  // Filter entries based on selected month AND branch
  const filteredEntries = entries.filter(entry => {
    // Branch Filter
    if (selectedBranch !== 'ALL' && entry.branch !== selectedBranch) return false;

    // Year Filter
    if (!entry.date) return false;
    const date = new Date(entry.date);
    if (date.getFullYear() !== selectedYear) return false;

    // Month Filter
    if (selectedMonth === 'All Time') return true;
    const monthName = MONTHS[date.getMonth() + 1];
    return monthName === selectedMonth;
  });

  // KPI Calculations based on filtered data
  const totalRevenue = filteredEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalOutstanding = filteredEntries.reduce((sum, e) => sum + Number(e.pendingAmount || 0), 0);

  // Logic for "Active Clients" in the specific period
  const activeInPeriod = new Set(filteredEntries.map(e => e.clientName)).size;

  // --- STATE MAP: unique customers per state (a client visiting 5 times is 1 customer) ---
  const stateCounts = useMemo(() => {
    const perState = new Map<string, Set<string>>();
    filteredEntries.forEach(e => {
      const state = resolveState(e.address, e.branch);
      if (!state) return;
      if (!perState.has(state)) perState.set(state, new Set());
      perState.get(state)!.add(String(e.clientName || '').trim().toLowerCase());
    });

    const counts: { [state: string]: number } = {};
    perState.forEach((clients, state) => { counts[state] = clients.size; });
    return counts;
  }, [filteredEntries]);

  const maxStateCount = Math.max(1, ...Object.values(stateCounts));
  const mappedCustomers = Object.values(stateCounts).reduce((a, b) => a + b, 0);
  const statesCovered = Object.keys(stateCounts).length;

  const rankedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);

  // Colour scale: 6 steps of indigo, deeper = more customers.
  // States with no customers at all show soft red — untapped territory.
  const stateFill = (count: number) => {
    if (!count) return '#fecaca';
    const t = count / maxStateCount;
    if (t > 0.8) return '#3730a3';
    if (t > 0.6) return '#4338ca';
    if (t > 0.4) return '#4f46e5';
    if (t > 0.2) return '#6366f1';
    if (t > 0.08) return '#818cf8';
    return '#c7d2fe';
  };

  const selectedCount = selectedState ? (stateCounts[selectedState] || 0) : 0;

  // Process data for charts
  const rawServiceData = filteredEntries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.name === curr.serviceType);
    if (found) {
      found.value++;
    } else {
      acc.push({ name: curr.serviceType, value: 1 });
    }
    return acc;
  }, []);

  // Calculate Total for Percentages
  const totalServicesCount = rawServiceData.reduce((sum: number, item: any) => sum + item.value, 0);

  // Add Percentage to Name for Legend Display
  const serviceTypeData = rawServiceData.map((item: any) => ({
    ...item,
    name: `${item.name} (${totalServicesCount > 0 ? ((item.value / totalServicesCount) * 100).toFixed(0) : 0}%)`
  })).sort((a: any, b: any) => b.value - a.value);

  // SALES DATA PROCESSING
  const salesMap = new Map<string, number>();
  filteredEntries.forEach(entry => {
    if (!entry.date || !entry.amount) return;
    const currentAmount = salesMap.get(entry.date) || 0;
    salesMap.set(entry.date, currentAmount + Number(entry.amount));
  });

  const salesData = Array.from(salesMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const chartData = salesData.slice(-15);

  // TECHNICIAN PERFORMANCE PROCESSING
  const technicianPerformance = filteredEntries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.name === curr.technician);
    const amount = Number(curr.amount || 0);
    const isNewPatch = curr.serviceType === 'NEW';

    if (found) {
      found.clients += 1;
      found.revenue += amount;
      if (isNewPatch) found.newPatches += 1;
    } else {
      acc.push({
        name: curr.technician,
        clients: 1,
        revenue: amount,
        newPatches: isNewPatch ? 1 : 0
      });
    }
    return acc;
  }, []).sort((a, b) => b.revenue - a.revenue);

  // --- INCENTIVE CALCULATION LOGIC ---
  const calculateSingleIncentive = (entry: Entry) => {
    let amount = 0;
    let reason = '';

    const billAmount = Number(entry.amount || 0);

    // Logic: Service Package (If remark contains package or type is NEW)
    // Since "Package Sale" isn't a strict type, we look for indicators or treat high value NEW as potentially a package if configured.
    // Current Logic per prompt: "Service package create karne pe"
    // We will look for 'Package' in remark for explicit package bonus, OR fall back to the New Patch Tiers.
    const isPackage = String(entry.remark || '').toLowerCase().includes('package');

    if (entry.serviceType === 'DEMO') {
      amount = incentiveConfig.demoAmount;
      reason = 'Demo Incentive';
    } else if (entry.serviceType === 'NEW') {
      // If it's explicitly a package and we have a package rate, use that? 
      // Or just use the tiered price logic. The prompt implies price wise incentive for new patch.
      // Let's stick to Price Wise for NEW entries.

      if (billAmount <= incentiveConfig.newPatchTier1Limit) {
        amount = incentiveConfig.newPatchTier1Amount;
        reason = `New Patch (≤${incentiveConfig.newPatchTier1Limit})`;
      } else if (billAmount <= incentiveConfig.newPatchTier2Limit) {
        amount = incentiveConfig.newPatchTier2Amount;
        reason = `New Patch (${incentiveConfig.newPatchTier1Limit}-${incentiveConfig.newPatchTier2Limit})`;
      } else {
        amount = incentiveConfig.newPatchTier3Amount;
        reason = `New Patch (> ${incentiveConfig.newPatchTier2Limit})`;
      }

      // ADDON: If specifically a package creation bonus is needed ON TOP or INSTEAD
      if (isPackage && incentiveConfig.packageAmount > 0) {
        amount += incentiveConfig.packageAmount; // Add on top? Or replace? Let's add on top for now or make it a separate line item.
        reason += ' + Package Bonus';
      }
    }

    return { amount, reason };
  };

  const incentiveData = useMemo(() => {
    const stats: Record<string, { name: string, totalIncentive: number, breakdown: any[], newPatchCount: number, demoCount: number, packageCount: number }> = {};

    filteredEntries.forEach(entry => {
      if (!entry.technician) return;
      if (!stats[entry.technician]) {
        stats[entry.technician] = {
          name: entry.technician,
          totalIncentive: 0,
          breakdown: [],
          newPatchCount: 0,
          demoCount: 0,
          packageCount: 0
        };
      }

      const { amount, reason } = calculateSingleIncentive(entry);

      if (amount > 0) {
        stats[entry.technician].totalIncentive += amount;
        stats[entry.technician].breakdown.push({
          date: entry.date,
          client: entry.clientName,
          type: entry.serviceType,
          bill: entry.amount,
          incentive: amount,
          reason: reason
        });

        if (entry.serviceType === 'NEW') stats[entry.technician].newPatchCount++;
        if (entry.serviceType === 'DEMO') stats[entry.technician].demoCount++;
        if (String(entry.remark || '').toLowerCase().includes('package')) stats[entry.technician].packageCount++;
      }
    });

    return Object.values(stats).sort((a, b) => b.totalIncentive - a.totalIncentive);
  }, [filteredEntries, incentiveConfig]);


  const card3D = "bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]";

  const formatDateTick = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
            Dashboard
            <Sparkles className="w-5 h-5 text-yellow-500 ml-2 animate-pulse" />
          </h2>
          <p className="text-slate-600 mt-1 font-semibold text-sm">Business Analytics & Overview</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 z-10 pointer-events-none">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="appearance-none bg-white border border-indigo-100 pl-9 pr-8 py-2.5 rounded-xl shadow-sm shadow-indigo-50 text-indigo-700 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer hover:border-indigo-400 transition-all"
            >
              <option value="ALL">All Branches</option>
              <option value="RPR">Raipur (RPR)</option>
              <option value="JDP">Jagdalpur (JDP)</option>
              <option value="RPR-MOWA">Mowa (RPR-MOWA)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Year Filter */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 z-10 pointer-events-none">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-white border border-indigo-100 pl-9 pr-8 py-2.5 rounded-xl shadow-sm shadow-indigo-50 text-indigo-700 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer hover:border-indigo-400 transition-all"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 z-10 pointer-events-none">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-white border border-indigo-100 pl-9 pr-8 py-2.5 rounded-xl shadow-sm shadow-indigo-50 text-indigo-700 text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer hover:border-indigo-400 transition-all"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Show/Hide Stats Toggle */}
          <button
            onClick={() => setShowStats(prev => !prev)}
            title={showStats ? 'Hide Stats' : 'Show Stats'}
            className="bg-white border border-indigo-100 p-2.5 rounded-xl shadow-sm shadow-indigo-50 text-indigo-500 hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer transition-all"
          >
            {showStats ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* KPI Cards - Mobile 2x2 Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full">
        {/* Total Registered Clients Card (FROM CLIENT MASTER) */}
        <div className="relative bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border-b-4 border-b-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.15)] transition-transform hover:-translate-y-1 group overflow-hidden border border-slate-100">
          <div className="relative z-10 flex justify-between items-start">
            <div className="overflow-hidden">
              <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1 truncate">Clients</p>
              <h3 className="text-xl md:text-3xl font-black text-slate-800 truncate">{showStats ? totalRegisteredClients : '••••'}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-blue-100 text-blue-600 rounded-lg shadow-inner border border-blue-200 shrink-0">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div className="mt-2 md:mt-3 flex items-center text-[8px] md:text-[10px] font-bold text-slate-400 flex-wrap gap-1">
            <span className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">Verified</span>
            <span className="truncate hidden sm:inline">In Master</span>
          </div>
        </div>

        <div className="relative rounded-xl md:rounded-2xl p-3 md:p-4 bg-slate-900 text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.6)] border border-slate-700 transition-transform hover:-translate-y-1 overflow-hidden">
          <div className="relative z-10 flex justify-between items-start">
            <div className="overflow-hidden">
              <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1 truncate">Revenue</p>
              <h3 className="text-[17px] sm:text-xl md:text-3xl font-black tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">{showStats ? `₹${totalRevenue.toLocaleString()}` : '₹••••'}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 shadow-inner shrink-0">
              <IndianRupee className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 md:mt-3 flex items-center text-[8px] md:text-[10px] font-bold text-slate-400 flex-wrap gap-1">
            <span className="text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1 py-0.5 rounded flex items-center whitespace-nowrap">
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> Active
            </span>
          </div>
        </div>

        <div className="relative bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border-b-4 border-b-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.15)] transition-transform hover:-translate-y-1 group overflow-hidden border border-slate-100">
          <div className="relative z-10 flex justify-between items-start">
            <div className="overflow-hidden">
              <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1 truncate">Outstanding</p>
              <h3 className="text-[17px] sm:text-xl md:text-3xl font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{showStats ? `₹${totalOutstanding.toLocaleString()}` : '₹••••'}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-red-100 text-red-600 rounded-lg shadow-inner border border-red-200 shrink-0">
              <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div className="mt-2 md:mt-3 flex items-center text-[8px] md:text-[10px] font-bold text-slate-400 flex-wrap gap-1">
            <span className="text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100">Pending</span>
          </div>
        </div>

        <div className="relative bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border-b-4 border-b-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.15)] transition-transform hover:-translate-y-1 group overflow-hidden border border-slate-100">
          <div className="relative z-10 flex justify-between items-start">
            <div className="overflow-hidden">
              <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5 md:mb-1 truncate">Services</p>
              <h3 className="text-[17px] sm:text-xl md:text-3xl font-black text-slate-800 truncate">{showStats ? filteredEntries.length : '••••'}</h3>
            </div>
            <div className="p-1.5 md:p-2 bg-orange-100 text-orange-600 rounded-lg shadow-inner border border-orange-200 shrink-0">
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
            </div>
          </div>
          <div className="mt-2 md:mt-3 flex items-center text-[8px] md:text-[10px] font-bold text-slate-400 flex-wrap gap-1">
            <span className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded">Volume</span>
          </div>
        </div>
      </div>

      {/* CUSTOMER MAP — 3D India choropleth */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] overflow-hidden">
        {/* Map entrance motion */}
        <style>{`
          @keyframes mapRise {
            from { opacity: 0; transform: rotateX(72deg) rotateZ(-14deg) translateY(46px) scale(0.9); }
            to   { opacity: 1; transform: rotateX(26deg) rotateZ(-4deg) translateY(0) scale(1); }
          }
          @keyframes mapStateIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .map-3d {
            transform: rotateX(26deg) rotateZ(-4deg);
            transform-style: preserve-3d;
            animation: mapRise 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .map-state {
            opacity: 0;
            animation: mapStateIn 0.45s ease-out forwards;
          }
          @media (prefers-reduced-motion: reduce) {
            .map-3d { animation: none; opacity: 1; }
            .map-state { animation: none; opacity: 1; }
          }
        `}</style>

        <div className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3.5 border-b border-slate-100">
          <div className="mr-auto">
            <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Customers Across India
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              Tap a state to see its customer count
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">States</p>
              <p className="text-lg font-black text-slate-800 tabular-nums leading-none">{showStats ? statesCovered : '••'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mapped</p>
              <p className="text-lg font-black text-indigo-600 tabular-nums leading-none">{showStats ? mappedCustomers : '••••'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2 relative bg-gradient-to-b from-slate-50 to-indigo-50/40 px-2 py-4 md:py-6 overflow-hidden">
            <div style={{ perspective: '1400px' }}>
              <svg
                viewBox={INDIA_VIEWBOX}
                className="map-3d w-full h-[320px] md:h-[460px] mx-auto select-none"
                role="img"
                aria-label="Customer count by state"
              >
                <defs>
                  <filter id="mapDrop" x="-20%" y="-20%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#312e81" floodOpacity="0.28" />
                  </filter>
                </defs>

                {/* Extruded side walls: the same outlines stacked underneath, darkening with depth */}
                <g filter="url(#mapDrop)">
                  {Array.from({ length: 9 }).map((_, layer) => (
                    <g key={layer} transform={`translate(0 ${(9 - layer) * 2.6})`}>
                      {INDIA_STATES.map(s => {
                        const count = stateCounts[s.name] || 0;
                        return (
                          <path
                            key={s.name}
                            d={s.d}
                            fill={count ? '#1e1b4b' : '#991b1b'}
                            opacity={0.5}
                          />
                        );
                      })}
                    </g>
                  ))}
                </g>

                {/* Top face — states fade in one after another, busiest first */}
                <g>
                  {INDIA_STATES.map((s, i) => {
                    const count = stateCounts[s.name] || 0;
                    const isSelected = selectedState === s.name;
                    // States with customers lead the reveal; empty ones trail behind.
                    const delay = (count > 0 ? 300 : 620) + i * 16;
                    return (
                      <path
                        key={s.name}
                        d={s.d}
                        fill={isSelected ? '#f59e0b' : stateFill(count)}
                        stroke={isSelected ? '#b45309' : '#ffffff'}
                        strokeWidth={isSelected ? 3 : 1.2}
                        strokeLinejoin="round"
                        onClick={() => setSelectedState(prev => (prev === s.name ? null : s.name))}
                        className="map-state cursor-pointer transition-[fill,stroke,opacity] duration-150 hover:opacity-80"
                        style={{
                          animationDelay: `${delay}ms`,
                          ...(isSelected ? { filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.8))' } : {})
                        }}
                      >
                        <title>{`${s.name}: ${count} customer${count === 1 ? '' : 's'}`}</title>
                      </path>
                    );
                  })}
                </g>
              </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-1 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2 rounded-sm ring-1 ring-red-200" style={{ background: '#fecaca' }} />
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400">No Customers</span>
              </span>

              <span className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Low</span>
                <span className="flex rounded-full overflow-hidden ring-1 ring-slate-200">
                  {['#c7d2fe', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'].map(c => (
                    <span key={c} className="w-6 h-2" style={{ background: c }} />
                  ))}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">High</span>
              </span>
            </div>
          </div>

          {/* Side panel */}
          <div className="border-t lg:border-t-0 lg:border-l border-slate-100 p-4 md:p-5 flex flex-col">
            {selectedState ? (
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-4 text-white shadow-lg mb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1">Selected State</p>
                    <h4 className="text-base font-black tracking-tight truncate">{selectedState}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedState(null)}
                    className="p-1 rounded-lg bg-white/10 border border-white/15 text-slate-300 hover:text-white shrink-0"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black tabular-nums leading-none">{showStats ? selectedCount : '••'}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      customer{selectedCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <p className="text-[11px] font-black text-emerald-300 tabular-nums">
                    {mappedCustomers > 0 ? ((selectedCount / mappedCustomers) * 100).toFixed(1) : '0.0'}% of all
                  </p>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                    style={{ width: `${maxStateCount > 0 ? (selectedCount / maxStateCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400 mb-3">
                Top states by customer count
              </p>
            )}

            <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
              {rankedStates.length === 0 && (
                <p className="text-xs text-slate-400 font-medium">No location data in this period.</p>
              )}
              {rankedStates.map(([state, count]) => (
                <button
                  key={state}
                  onClick={() => setSelectedState(prev => (prev === state ? null : state))}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all text-left ${selectedState === state
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40'
                    }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0 ring-1 ring-black/5"
                    style={{ background: selectedState === state ? '#f59e0b' : stateFill(count) }}
                  />
                  <span className="text-xs font-bold text-slate-700 truncate mr-auto">{state}</span>
                  <span className="text-xs font-black text-slate-900 tabular-nums shrink-0">{showStats ? count : '••'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${card3D} lg:col-span-2 p-6 border-t-4 border-t-indigo-500`}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
                Revenue Trend: {selectedMonth}
              </h3>
              <p className="text-slate-500 text-xs font-medium">Daily income patterns</p>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-sm">{selectedMonth}</span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  tickFormatter={formatDateTick}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', background: 'rgba(255, 255, 255, 0.95)', fontWeight: 'bold', fontSize: '12px' }}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${card3D} p-6 border-t-4 border-t-purple-500`}>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Service Mix</h3>
          <p className="text-slate-500 text-xs font-medium mb-4">Type distribution for {selectedMonth}</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={6}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center shadow-inner">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Top Performing Service</p>
            <p className="text-lg font-black text-slate-800">{serviceTypeData[0]?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Technician Table */}
      <div className={`${card3D} overflow-hidden p-0 border-none`}>
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-white to-slate-50 gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Technician Performance</h3>
            <p className="text-slate-500 text-xs font-medium">Monthly Stats: {selectedMonth}</p>
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-black text-indigo-700">{selectedMonth}</span>
          </div>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 uppercase font-black text-[9px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Technician</th>
                <th className="px-6 py-3 text-center">New Patches</th>
                <th className="px-6 py-3 text-center">Total Visits</th>
                <th className="px-6 py-3 text-center">Activity Status</th>
                <th className="px-6 py-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicianPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic">No data available for {selectedMonth}</td>
                </tr>
              ) : (
                technicianPerformance.map((tech: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white mr-3 shadow-md shadow-indigo-200 border border-indigo-400">
                          {getInitial(tech.name)}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{tech.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-100 shadow-sm text-sm">
                        {tech.newPatches}
                        <Sparkles className="w-3 h-3 ml-1 text-emerald-400" />
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center font-bold text-slate-700 text-sm">{tech.clients}</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                          <div className={`h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full shadow-sm`} style={{ width: `${Math.min(tech.clients * 5, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-black text-slate-900 text-sm">₹{tech.revenue.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View for Technicians */}
        <div className="md:hidden p-4 space-y-4">
          {technicianPerformance.length === 0 ? (
             <div className="text-center text-slate-400 font-bold italic py-6">No data available for {selectedMonth}</div>
          ) : (
            technicianPerformance.map((tech: any, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-50 to-purple-600 text-white font-black text-xs rounded-xl flex justify-center items-center mr-3 shadow-md shadow-indigo-200">
                       {getInitial(tech.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base leading-tight">{tech.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Visits: {tech.clients}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Revenue</p>
                    <p className="font-black text-slate-900 text-lg leading-none">₹{tech.revenue.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                      <span className="font-black">{tech.newPatches}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">Patches</span>
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                   </div>
                   <div className="w-[100px]">
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest text-right mb-1">Activity Load</p>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                         <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 shadow-sm" style={{ width: `${Math.min(tech.clients * 5, 100)}%` }}></div>
                      </div>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* NEW: INCENTIVE CALCULATION SECTION */}
      <div className={`${card3D} overflow-hidden p-0 border-none mb-8`}>
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Incentive Calculation
            </h3>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Based on New Patches, Demos & Packages</p>
          </div>
          <button
            onClick={() => setShowIncentiveSettings(!showIncentiveSettings)}
            className={`p-2 rounded-lg border transition-all ${showIncentiveSettings ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-500 border-slate-200 hover:text-emerald-600'}`}
            title="Configure Incentive Rates"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {showIncentiveSettings && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Patch - Tier 1</h4>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Up to Amount</label>
                  <input type="number" value={incentiveConfig.newPatchTier1Limit} onChange={e => setIncentiveConfig({ ...incentiveConfig, newPatchTier1Limit: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black focus:outline-none focus:border-emerald-500 py-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Incentive (₹)</label>
                  <input type="number" value={incentiveConfig.newPatchTier1Amount} onChange={e => setIncentiveConfig({ ...incentiveConfig, newPatchTier1Amount: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black text-emerald-600 focus:outline-none focus:border-emerald-500 py-1" />
                </div>
              </div>

              <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Patch - Tier 2</h4>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Up to Amount</label>
                  <input type="number" value={incentiveConfig.newPatchTier2Limit} onChange={e => setIncentiveConfig({ ...incentiveConfig, newPatchTier2Limit: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black focus:outline-none focus:border-emerald-500 py-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Incentive (₹)</label>
                  <input type="number" value={incentiveConfig.newPatchTier2Amount} onChange={e => setIncentiveConfig({ ...incentiveConfig, newPatchTier2Amount: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black text-emerald-600 focus:outline-none focus:border-emerald-500 py-1" />
                </div>
              </div>

              <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">High Value (Tier 3)</h4>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Above Tier 2 Limit</label>
                  <div className="py-1 text-xs font-bold text-slate-400 italic">Automatic ({'>'} {incentiveConfig.newPatchTier2Limit})</div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Incentive (₹)</label>
                  <input type="number" value={incentiveConfig.newPatchTier3Amount} onChange={e => setIncentiveConfig({ ...incentiveConfig, newPatchTier3Amount: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black text-emerald-600 focus:outline-none focus:border-emerald-500 py-1" />
                </div>
              </div>

              <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Other Incentives</h4>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Demo Incentive (₹)</label>
                  <input type="number" value={incentiveConfig.demoAmount} onChange={e => setIncentiveConfig({ ...incentiveConfig, demoAmount: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black text-emerald-600 focus:outline-none focus:border-emerald-500 py-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 block">Package Bonus (₹)</label>
                  <input type="number" value={incentiveConfig.packageAmount} onChange={e => setIncentiveConfig({ ...incentiveConfig, packageAmount: Number(e.target.value) })} className="w-full border-b border-slate-200 text-xs font-black text-emerald-600 focus:outline-none focus:border-emerald-500 py-1" placeholder="Optional" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 uppercase font-black text-[9px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Technician</th>
                <th className="px-6 py-3 text-center">New Patches</th>
                <th className="px-6 py-3 text-center">Demos</th>
                <th className="px-6 py-3 text-center">Packages</th>
                <th className="px-6 py-3 text-right text-emerald-600">Total Incentive</th>
                <th className="px-6 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incentiveData.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-bold italic">No incentive data for selected filters.</td></tr>
              ) : (
                incentiveData.map((data: any, idx: number) => (
                  <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-6 py-3 font-bold text-slate-800">{data.name}</td>
                    <td className="px-6 py-3 text-center font-bold">{data.newPatchCount}</td>
                    <td className="px-6 py-3 text-center font-bold">{data.demoCount}</td>
                    <td className="px-6 py-3 text-center font-bold">{data.packageCount > 0 ? data.packageCount : '-'}</td>
                    <td className="px-6 py-3 text-right font-black text-base text-emerald-600">₹{data.totalIncentive.toLocaleString()}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => setIncentiveDetailTech(data.name)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View for Incentives */}
        <div className="md:hidden p-4 space-y-4">
          {incentiveData.length === 0 ? (
             <div className="text-center text-slate-400 font-bold italic py-6">No incentive data for selected filters.</div>
          ) : (
            incentiveData.map((data: any, idx: number) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col gap-3">
                 <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <h4 className="font-bold text-slate-800 text-base">{data.name}</h4>
                    <button
                        onClick={() => setIncentiveDetailTech(data.name)}
                        className="flex items-center gap-1.5 p-1.5 px-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold text-[10px] uppercase shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                    </button>
                 </div>
                 <div className="flex justify-between items-end">
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase text-slate-500 tracking-widest w-[55%]">
                      <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between">
                        <span>New:</span> <span className="text-slate-800">{data.newPatchCount}</span>
                      </div>
                      <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex justify-between">
                        <span>Demo:</span> <span className="text-slate-800">{data.demoCount}</span>
                      </div>
                      <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 col-span-2 flex justify-between">
                        <span>Packages:</span> <span className="text-slate-800">{data.packageCount}</span>
                      </div>
                    </div>
                    <div className="text-right pb-1">
                       <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Earnings</p>
                       <p className="font-black text-emerald-600 text-xl leading-none">₹{data.totalIncentive.toLocaleString()}</p>
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Incentive Breakdown Modal */}
      {incentiveDetailTech && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">{incentiveDetailTech}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Incentive Breakdown</p>
              </div>
              <button onClick={() => setIncentiveDetailTech(null)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Client / Type</th>
                    <th className="px-5 py-3">Bill Amount</th>
                    <th className="px-5 py-3">Logic Applied</th>
                    <th className="px-5 py-3 text-right">Incentive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incentiveData.find((d: any) => d.name === incentiveDetailTech)?.breakdown.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-600">{formatDateTick(item.date)}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800">{item.client}</div>
                        <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{item.type}</div>
                      </td>
                      <td className="px-5 py-3 font-medium">₹{item.bill}</td>
                      <td className="px-5 py-3 text-[10px] font-medium text-slate-500">{item.reason}</td>
                      <td className="px-5 py-3 text-right font-black text-emerald-600">+ ₹{item.incentive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-3">Total Earned</span>
              <span className="text-xl font-black text-slate-800">₹{incentiveData.find((d: any) => d.name === incentiveDetailTech)?.totalIncentive.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
