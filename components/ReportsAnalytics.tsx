
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
      // Logic: If NEW, check Patch Size. Else use Service Type
      let key: string = e.serviceType;
      if (e.serviceType === 'NEW' && e.patchSize) {
        key = `${e.patchSize}`;
      }
      map.set(key, (map.get(key) || 0) + 1);
    });
    
    const sorted = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Take top 5 and group rest
    if (sorted.length > 5) {
        const top5 = sorted.slice(0, 5);
        const othersCount = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
        top5.push({ name: 'Others', value: othersCount });
        return top5;
    }
    return sorted;
  }, [filteredData]);

  // --- CALCULATE PERCENTAGES FOR PIE ---
  const totalItems = useMemo(() => productStats.reduce((a, b) => a + b.value, 0), [productStats]);
  
  const pieData = useMemo(() => {
      return productStats.map(item => ({
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
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  const card3D = "bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 transition-all duration-300 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] overflow-hidden";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. HEADER SECTION */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 px-2">
              <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl shadow-lg shadow-indigo-200">
                  <Activity className="w-6 h-6" />
              </div>
              <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Analytics</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Business Intelligence</p>
              </div>
          </div>
      </div>

      {/* 2. FLOATING FILTER BAR (Sticky Icon) */}
      <div className="sticky top-4 z-40 flex justify-end pointer-events-none mb-6">
          <div className="pointer-events-auto">
              <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'w-full max-w-[95vw] sm:max-w-fit' : 'w-auto'}`}>
                  {showFilters ? (
                      <div className="bg-white/90 backdrop-blur-xl p-2 rounded-[2rem] shadow-2xl border border-white/50 flex items-center gap-3 animate-in fade-in zoom-in-95 overflow-x-auto no-scrollbar">
                          
                          {/* FILTER TYPES */}
                          <div className="flex bg-slate-100/80 p-1 rounded-xl flex-shrink-0">
                              {['ALL', 'MONTH', 'YEAR', 'CUSTOM'].map((type) => (
                                  <button 
                                    key={type}
                                    onClick={() => setFilterType(type as any)} 
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider
                                    ${filterType === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                  >
                                      {type}
                                  </button>
                              ))}
                          </div>

                          {/* DYNAMIC INPUTS */}
                          <div className="flex gap-2 flex-shrink-0">
                              {filterType === 'MONTH' && (
                                  <>
                                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border-none bg-slate-50 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-white min-w-[100px]">
                                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                                    </select>
                                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border-none bg-slate-50 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-white">
                                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                  </>
                              )}
                              {filterType === 'YEAR' && (
                                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border-none bg-slate-50 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer hover:bg-white w-24">
                                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                              )}
                              {filterType === 'CUSTOM' && (
                                  <div className="flex items-center gap-2 px-2 bg-slate-50 rounded-xl border border-slate-100 p-1">
                                    <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="px-2 py-1.5 rounded-lg border-none bg-white font-bold text-[10px] shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none w-28" />
                                    <span className="font-black text-slate-300">-</span>
                                    <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="px-2 py-1.5 rounded-lg border-none bg-white font-bold text-[10px] shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none w-28" />
                                  </div>
                              )}
                          </div>

                          <div className="h-6 w-px bg-slate-200 mx-1 flex-shrink-0"></div>

                          <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  ) : (
                      <button 
                          onClick={() => setShowFilters(true)} 
                          className="flex items-center justify-center bg-white/90 backdrop-blur-md text-indigo-600 p-4 rounded-full shadow-xl border border-white/50 hover:scale-110 transition-all font-black group shadow-indigo-500/20"
                          title="Open Filters"
                      >
                          <Filter className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                          {filterType !== 'ALL' && (
                              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                          )}
                      </button>
                  )}
              </div>
          </div>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-100 border-t-indigo-600 mb-6"></div>
              <p className="text-slate-400 font-black uppercase tracking-widest animate-pulse text-xs">Crunching numbers...</p>
          </div>
      ) : (
        <>
            {/* 2. SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#4f46e5] rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/30 relative overflow-hidden group min-h-[200px] flex flex-col justify-between">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 opacity-80">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm"><IndianRupee className="w-4 h-4" /></div>
                            <span className="text-xs font-black uppercase tracking-widest">Total Revenue</span>
                        </div>
                        <h3 className="text-5xl font-black tracking-tighter drop-shadow-sm mb-2">
                            ₹{(totalRevenuePeriod / 100000).toFixed(2)}<span className="text-2xl opacity-60 ml-1">L</span>
                        </h3>
                        <p className="text-sm font-medium opacity-70">₹{totalRevenuePeriod.toLocaleString()} Exact</p>
                    </div>

                    <div className="mt-auto relative z-10">
                        <div className="inline-flex items-center text-[10px] font-bold bg-indigo-900/30 border border-indigo-400/30 px-3 py-1.5 rounded-lg backdrop-blur-md">
                            <TrendingUp className="w-3 h-3 mr-1.5 text-green-300" /> 
                            {filterType === 'ALL' ? 'All Time Earnings' : 'Period Earnings'}
                        </div>
                    </div>
                </div>

                {/* Best Performing Tech (Volume) */}
                <div 
                    className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-lg flex flex-col justify-between group hover:border-emerald-300 transition-all cursor-pointer min-h-[200px]" 
                    onClick={() => bestPerformingTech && handleTechClick(bestPerformingTech.name)}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Crown className="w-4 h-4" /></div>
                                <span className="text-emerald-600 font-black text-xs uppercase tracking-widest">Top Performer</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight mb-1">{bestPerformingTech?.name || 'N/A'}</h3>
                            <p className="text-sm font-bold text-slate-400">Most Visits</p>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm group-hover:scale-110 transition-transform">
                            <Users className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Jobs Completed</span>
                            <span className="text-2xl font-black text-emerald-600">{bestPerformingTech?.count || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Most Visited Client */}
                <div 
                    className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-lg flex flex-col justify-between group hover:border-amber-300 transition-all cursor-pointer min-h-[200px]" 
                    onClick={() => mostVisitedClient && openClientByName(mostVisitedClient.name)}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Trophy className="w-4 h-4" /></div>
                                <span className="text-amber-600 font-black text-xs uppercase tracking-widest">Loyal Client</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 leading-tight mb-1 truncate w-40">{mostVisitedClient?.name || 'N/A'}</h3>
                            <p className="text-sm font-bold text-slate-400">Most Active</p>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-sm group-hover:scale-110 transition-transform">
                            <User className="w-7 h-7" />
                        </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Visits</span>
                            <span className="text-2xl font-black text-amber-600">{mostVisitedClient?.visits || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 3. PRODUCT MIX (PIE) - UPDATED TO SHOW PERCENTAGES */}
                <div className={`${card3D} p-8 lg:col-span-1 flex flex-col`}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><ShoppingBag className="w-4 h-4" /></div>
                                Product Mix
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mt-1 ml-1">Top 5 Items + Others</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-[350px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={95}
                                    paddingAngle={6}
                                    dataKey="value"
                                    nameKey="displayName"
                                    cornerRadius={6}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontWeight: 'bold'}}
                                    itemStyle={{color: '#1e293b'}}
                                    formatter={(value: number) => [`${value} Count`, 'Quantity']}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    layout="horizontal" 
                                    iconType="circle" 
                                    iconSize={8}
                                    wrapperStyle={{fontSize: '11px', fontWeight: '700', color: '#64748b', padding: '20px 0 0 0'}} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                            <span className="text-3xl font-black text-slate-800 block">{totalItems}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Items</span>
                        </div>
                    </div>
                </div>

                {/* 4. TECHNICIAN LEADERBOARD - IMPROVED LIST */}
                <div className={`${card3D} p-0 lg:col-span-2 flex flex-col`}>
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><TrendingUp className="w-4 h-4" /></div>
                                Revenue Leaderboard
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mt-1 ml-1">Top earning technicians for selected period</p>
                        </div>
                        <div className="hidden sm:block text-[10px] font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-500 shadow-sm uppercase tracking-wide">
                            Top 5 Ranked
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {topRevenueTechs.map((tech, idx) => (
                            <div 
                                key={tech.name} 
                                onClick={() => handleTechClick(tech.name)}
                                className="group relative p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-5">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border
                                        ${idx === 0 ? 'bg-amber-100 text-amber-600 border-amber-200' : 
                                          idx === 1 ? 'bg-slate-100 text-slate-600 border-slate-300' : 
                                          idx === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                          'bg-white text-slate-400 border-slate-200'}`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-base">{tech.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-bold text-slate-400">{tech.count} Jobs</span>
                                            {idx === 0 && <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide flex items-center gap-1"><Crown className="w-3 h-3" /> Leader</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-lg text-slate-900 group-hover:text-indigo-700 transition-colors">₹{tech.revenue.toLocaleString()}</p>
                                    <div className="flex items-center justify-end text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 mt-1">
                                        View Details <ArrowRight className="w-3 h-3 ml-1" />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {topRevenueTechs.length === 0 && <div className="p-12 text-center text-slate-400 font-bold">No data available for this period.</div>}
                    </div>
                </div>
            </div>

            {/* 5. TOP 5 CLIENTS (BAR CHART) - Cleaned Up */}
            <div className={`${card3D} p-8`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                            <div className="p-1.5 bg-violet-100 rounded-lg text-violet-600"><Star className="w-4 h-4" /></div>
                            Top 5 High-Value Clients
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">Highest spending customers</p>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topRevenueClients}
                            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                            layout="vertical"
                            onClick={handleClientClick}
                            className="cursor-pointer"
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={140} 
                                tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc', radius: 12}}
                                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Total Revenue']}
                            />
                            <Bar 
                                dataKey="revenue" 
                                radius={[0, 10, 10, 0]} 
                                barSize={40}
                                animationDuration={1000}
                            >
                                {topRevenueClients.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][index]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-center text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest animate-pulse">Click on a bar to view client history</p>
            </div>
        </>
      )}

      {/* SLIDE-OVER MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
              <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 border-l border-white/20">
                  <ModalContent />
              </div>
          </div>
      )}

    </div>
  );
};

export default ReportsAnalytics;
