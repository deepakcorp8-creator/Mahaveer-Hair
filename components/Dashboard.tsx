
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, IndianRupee, Activity, ShoppingBag, ArrowUpRight, Sparkles, TrendingUp, AlertCircle, Calendar, ChevronDown, Filter } from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Entry } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const MONTHS = [
  "All Time", "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const Dashboard: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('All Time');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const entriesData = await api.getEntries();
        setEntries(entriesData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
        </div>
    );
  }

  // Filter entries based on selected month
  const filteredEntries = entries.filter(entry => {
    if (selectedMonth === 'All Time') return true;
    if (!entry.date) return false;
    const date = new Date(entry.date);
    const monthName = MONTHS[date.getMonth() + 1];
    return monthName === selectedMonth;
  });

  // KPI Calculations based on filtered data
  const totalRevenue = filteredEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalOutstanding = filteredEntries.reduce((sum, e) => sum + Number(e.pendingAmount || 0), 0);
  const newClientsToday = filteredEntries.filter(e => {
    const today = new Date().toISOString().split('T')[0];
    return e.date === today && e.serviceType === 'NEW';
  }).length;
  const totalClients = new Set(filteredEntries.map(e => e.clientName)).size;

  // Process data for charts
  const serviceTypeData = filteredEntries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.name === curr.serviceType);
    if (found) {
      found.value++;
    } else {
      acc.push({ name: curr.serviceType, value: 1 });
    }
    return acc;
  }, []);

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

  // TECHNICIAN PERFORMANCE PROCESSING (Updated with NEW Patch counting)
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

  const card3D = "bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]";

  const formatDateTick = (dateStr: string) => {
      try {
          const date = new Date(dateStr);
          return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
      } catch (e) {
          return dateStr;
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 gap-4">
        <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center">
                Dashboard
                <Sparkles className="w-6 h-6 text-yellow-500 ml-3 animate-pulse" />
            </h2>
            <p className="text-slate-600 mt-2 font-semibold text-lg">Business Analytics & Overview</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Month Filter Dropdown */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 z-10">
              <Calendar className="w-4 h-4" />
            </div>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-white border-2 border-indigo-100 pl-11 pr-10 py-3 rounded-2xl shadow-lg shadow-indigo-50 text-indigo-700 text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-500/10 cursor-pointer hover:border-indigo-400 transition-all"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          <div className="hidden sm:flex bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl shadow-lg text-indigo-700 text-sm font-bold items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse mr-3 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative bg-white rounded-3xl p-6 border-b-4 border-b-blue-500 shadow-[0_15px_30px_-5px_rgba(59,130,246,0.15)] transition-transform hover:-translate-y-2 group overflow-hidden border-x border-t border-slate-100">
          <div className="relative z-10 flex justify-between items-start">
              <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Total Clients</p>
                  <h3 className="text-4xl font-black text-slate-800">{totalClients}</h3>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner border border-blue-200">
                  <Users className="w-7 h-7" />
              </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md mr-2 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Active
              </span>
              <span>In {selectedMonth}</span>
          </div>
        </div>

        <div className="relative rounded-3xl p-6 bg-slate-900 text-white shadow-[0_20px_40px_-10px_rgba(15,23,42,0.6)] border border-slate-700 transition-transform hover:-translate-y-2 overflow-hidden">
          <div className="relative z-10 flex justify-between items-start">
             <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Revenue</p>
                <h3 className="text-4xl font-black tracking-tight text-white">₹{totalRevenue.toLocaleString()}</h3>
             </div>
             <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
                 <IndianRupee className="w-7 h-7 text-emerald-400" />
             </div>
          </div>
           <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-md mr-2 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Verified
              </span>
              <span>Total Earnings</span>
          </div>
        </div>

        <div className="relative bg-white rounded-3xl p-6 border-b-4 border-b-red-500 shadow-[0_15px_30px_-5px_rgba(239,68,68,0.15)] transition-transform hover:-translate-y-2 group overflow-hidden border-x border-t border-slate-100">
          <div className="relative z-10 flex justify-between items-start">
              <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Total Outstanding</p>
                  <h3 className="text-4xl font-black text-slate-800">₹{totalOutstanding.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-xl shadow-inner border border-red-200">
                  <AlertCircle className="w-7 h-7" />
              </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md mr-2 flex items-center border border-red-100">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Pending
              </span>
              <span>Unpaid Amount</span>
          </div>
        </div>

        <div className="relative bg-white rounded-3xl p-6 border-b-4 border-b-orange-500 shadow-[0_15px_30px_-5px_rgba(249,115,22,0.15)] transition-transform hover:-translate-y-2 group overflow-hidden border-x border-t border-slate-100">
          <div className="relative z-10 flex justify-between items-start">
              <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Total Services</p>
                  <h3 className="text-4xl font-black text-slate-800">{filteredEntries.length}</h3>
              </div>
              <div className="p-3 bg-orange-100 text-orange-600 rounded-xl shadow-inner border border-orange-200">
                  <ShoppingBag className="w-7 h-7" />
              </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-md mr-2 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Volume
              </span>
              <span>Services Done</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${card3D} lg:col-span-2 p-8 border-t-4 border-t-indigo-500`}>
          <div className="flex justify-between items-center mb-8">
              <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
                    Revenue Trend: {selectedMonth}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">Daily income patterns</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 shadow-sm">{selectedMonth}</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 11, fill: '#475569', fontWeight: 700}} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10} 
                    tickFormatter={formatDateTick}
                    interval="preserveStartEnd"
                />
                <YAxis 
                    tick={{fontSize: 12, fill: '#475569', fontWeight: 700}} 
                    axisLine={false} 
                    tickLine={false} 
                    dx={-10} 
                />
                <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', background: 'rgba(255, 255, 255, 0.95)', fontWeight: 'bold' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#4f46e5" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                    animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${card3D} p-8 border-t-4 border-t-purple-500`}>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Service Mix</h3>
          <p className="text-slate-500 text-sm font-medium mb-6">Type distribution for {selectedMonth}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={6}
                  dataKey="value"
                  cornerRadius={8}
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }}/>
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
           <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center shadow-inner">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Top Performing Service</p>
              <p className="text-xl font-black text-slate-800">{serviceTypeData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Technician Table */}
      <div className={`${card3D} overflow-hidden p-0 border-none mb-10`}>
        <div className="px-8 py-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gradient-to-r from-white to-slate-50 gap-4">
          <div>
              <h3 className="text-xl font-bold text-slate-800">Technician Performance</h3>
              <p className="text-slate-500 text-sm font-medium">Monthly Stats: {selectedMonth}</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-black text-indigo-700">{selectedMonth}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 uppercase font-black text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Technician</th>
                <th className="px-8 py-5 text-center">New Patches</th>
                <th className="px-8 py-5 text-center">Total Visits</th>
                <th className="px-8 py-5 text-center">Activity Status</th>
                <th className="px-8 py-5 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicianPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold italic">No data available for {selectedMonth}</td>
                </tr>
              ) : (
                technicianPerformance.map((tech: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5">
                        <div className="flex items-center">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white mr-4 shadow-lg shadow-indigo-200 border border-indigo-400">
                                {tech.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800 text-base">{tech.name}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 font-black rounded-xl border border-emerald-100 shadow-sm text-base">
                        {tech.newPatches}
                        <Sparkles className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-slate-700 text-base">{tech.clients}</td>
                    <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center">
                            <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                                <div className={`h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full shadow-sm`} style={{ width: `${Math.min(tech.clients * 5, 100)}%` }}></div>
                            </div>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-slate-900 text-base">₹{tech.revenue.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
