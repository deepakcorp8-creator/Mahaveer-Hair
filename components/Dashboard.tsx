
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, IndianRupee, Activity, ShoppingBag, ArrowUpRight, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, Entry } from '../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, entriesData] = await Promise.all([
          api.getDashboardStats(),
          api.getEntries()
        ]);
        setStats(statsData);
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

  // Process data for charts
  const serviceTypeData = entries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.name === curr.serviceType);
    if (found) {
      found.value++;
    } else {
      acc.push({ name: curr.serviceType, value: 1 });
    }
    return acc;
  }, []);

  // SALES DATA PROCESSING (Fixed Sorting & Formatting)
  const salesMap = new Map<string, number>();

  entries.forEach(entry => {
      if (!entry.date || !entry.amount) return;
      // Aggregate by date
      const currentAmount = salesMap.get(entry.date) || 0;
      salesMap.set(entry.date, currentAmount + Number(entry.amount));
  });

  // Convert to array and Sort by Date Ascending
  const salesData = Array.from(salesMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Limit to last 15 records for cleaner UI (Recent Trend)
  const chartData = salesData.slice(-15);

  const technicianPerformance = entries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.name === curr.technician);
    const amount = Number(curr.amount || 0);
    if (found) {
      found.clients += 1;
      found.revenue += amount;
    } else {
      acc.push({ name: curr.technician, clients: 1, revenue: amount });
    }
    return acc;
  }, []);

  // Updated 3D Card Style - Darker Borders & Stronger Shadows
  const card3D = "bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-200 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]";

  // Date Formatter for X-Axis (DD/MM/YY)
  const formatDateTick = (dateStr: string) => {
      try {
          const date = new Date(dateStr);
          // Format: 1/12/25 (Day/Month/Year)
          return `${date.getDate()}/${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
      } catch (e) {
          return dateStr;
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
        <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center">
                Dashboard
                <Sparkles className="w-6 h-6 text-yellow-500 ml-3 animate-pulse" />
            </h2>
            <p className="text-slate-600 mt-2 font-semibold text-lg">Business Analytics & Overview</p>
        </div>
        <div className="mt-4 md:mt-0 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl shadow-lg text-indigo-700 text-sm font-bold flex items-center">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse mr-3 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards - High Contrast 3D Effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Clients */}
        <div className="relative bg-white rounded-3xl p-6 border-b-4 border-b-blue-500 shadow-[0_15px_30px_-5px_rgba(59,130,246,0.15)] transition-transform hover:-translate-y-2 group overflow-hidden border-x border-t border-slate-100">
          <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
              <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Total Clients</p>
                  <h3 className="text-4xl font-black text-slate-800">{stats?.totalClients}</h3>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner border border-blue-200">
                  <Users className="w-7 h-7" />
              </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md mr-2 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Active
              </span>
              <span>Registered Clients</span>
          </div>
        </div>

        {/* Total Revenue - Dark Card */}
        <div className="relative rounded-3xl p-6 bg-slate-900 text-white shadow-[0_20px_40px_-10px_rgba(15,23,42,0.6)] border border-slate-700 transition-transform hover:-translate-y-2 overflow-hidden">
           {/* Abstract Glow */}
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-emerald-500/20 blur-[50px] rounded-full animate-pulse"></div>
          
          <div className="relative z-10 flex justify-between items-start">
             <div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">Total Revenue</p>
                <h3 className="text-4xl font-black tracking-tight text-white">₹{stats?.totalAmount.toLocaleString()}</h3>
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

        {/* Total Outstanding (Replaces New Clients) */}
        <div className="relative bg-white rounded-3xl p-6 border-b-4 border-b-red-500 shadow-[0_15px_30px_-5px_rgba(239,68,68,0.15)] transition-transform hover:-translate-y-2 group overflow-hidden border-x border-t border-slate-100">
           <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-red-50 rounded-full blur-2xl group-hover:bg-red-100 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
              <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Total Outstanding</p>
                  <h3 className="text-4xl font-black text-slate-800">₹{stats?.totalOutstanding?.toLocaleString() || 0}</h3>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-xl shadow-inner border border-red-200">
                  <AlertCircle className="w-7 h-7" />
              </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md mr-2 flex items-center border border-red-100">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Pending
              </span>
              <span>Dues to Collect</span>
          </div>
        </div>

        {/* Total Services */}
        <div className="relative bg-white rounded-3xl p-6 border-b-4 border-b-orange-500 shadow-[0_15px_30px_-5px_rgba(249,115,22,0.15)] transition-transform hover:-translate-y-2 group overflow-hidden border-x border-t border-slate-100">
           <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-orange-50 rounded-full blur-2xl group-hover:bg-orange-100 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
              <div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Total Services</p>
                  <h3 className="text-4xl font-black text-slate-800">{stats?.serviceCount}</h3>
              </div>
              <div className="p-3 bg-orange-100 text-orange-600 rounded-xl shadow-inner border border-orange-200">
                  <ShoppingBag className="w-7 h-7" />
              </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-400">
              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-md mr-2 flex items-center">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> Volume
              </span>
              <span>Services Performed</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className={`${card3D} lg:col-span-2 p-8 border-t-4 border-t-indigo-500`}>
          <div className="flex justify-between items-center mb-8">
              <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center">
                    <TrendingUp className="w-6 h-6 mr-2 text-indigo-600" />
                    Revenue Analytics
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">Income trends over time</p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 shadow-sm">Recent Trend</span>
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

        {/* Service Type Distribution */}
        <div className={`${card3D} p-8 border-t-4 border-t-purple-500`}>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Service Mix</h3>
          <p className="text-slate-500 text-sm font-medium mb-6">Distribution by Category</p>
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

      {/* Technician Table - 3D Container */}
      <div className={`${card3D} overflow-hidden p-0 border-none`}>
        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
          <div>
              <h3 className="text-xl font-bold text-slate-800">Technician Performance</h3>
              <p className="text-slate-500 text-sm font-medium">Efficiency & Revenue Contribution</p>
          </div>
          <button className="text-sm bg-white border border-slate-300 shadow-sm text-indigo-700 font-bold py-2.5 px-5 rounded-xl hover:bg-indigo-50 transition-colors">View Full Report</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-slate-600 uppercase font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Technician</th>
                <th className="px-8 py-5 text-right">Clients Served</th>
                <th className="px-8 py-5 text-right">Activity</th>
                <th className="px-8 py-5 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicianPerformance.map((tech: any, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-5">
                      <div className="flex items-center">
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white mr-4 shadow-lg shadow-indigo-200 border border-indigo-400">
                              {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 text-base">{tech.name}</span>
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-700">{tech.clients}</td>
                  <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end">
                          <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden mr-2 shadow-inner border border-slate-200">
                              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full shadow-sm" style={{ width: `${Math.min(tech.clients * 10, 100)}%` }}></div>
                          </div>
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 text-base">₹{tech.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
