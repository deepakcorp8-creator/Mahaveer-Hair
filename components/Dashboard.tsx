import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, IndianRupee, Activity, ShoppingBag, ArrowUpRight, Sparkles, TrendingUp } from 'lucide-react';
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

  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const salesData = sortedEntries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.date === curr.date);
    const amount = Number(curr.amount || 0);
    if (found) {
      found.amount += amount;
    } else {
      acc.push({ date: curr.date, amount: amount });
    }
    return acc;
  }, []);

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

  // 3D Card Style Helper - Updated border color
  const card3D = "bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.15)]";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
        <div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center">
                Dashboard
                <Sparkles className="w-6 h-6 text-yellow-500 ml-3 animate-pulse" />
            </h2>
            <p className="text-slate-500 mt-2 font-medium text-lg">Business Analytics & Overview</p>
        </div>
        <div className="mt-4 md:mt-0 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-slate-200 text-indigo-700 text-sm font-bold flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-3"></div>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards - 3D Effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Clients */}
        <div className={`${card3D} p-6 group relative overflow-hidden bg-gradient-to-br from-white to-blue-50`}>
          <div className="absolute right-0 top-0 h-32 w-32 bg-blue-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-between mb-6">
            <div className="p-4 bg-white shadow-lg shadow-blue-200 rounded-2xl text-blue-600 border border-blue-100">
               <Users className="w-7 h-7" />
            </div>
            <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-100/50 border border-emerald-300 px-3 py-1 rounded-full">
                +12% <ArrowUpRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <div className="relative">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Clients</p>
            <h3 className="text-4xl font-black text-slate-800 mt-2">{stats?.totalClients}</h3>
          </div>
        </div>

        {/* Total Revenue - Dark Card */}
        <div className="rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.5)] transform hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_25px_60px_-12px_rgba(15,23,42,0.6)] border border-slate-600">
           {/* Abstract Glow */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/20 blur-[60px] rounded-full"></div>
          
          <div className="relative flex items-center justify-between mb-6">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
               <IndianRupee className="w-7 h-7 text-indigo-300" />
            </div>
             <span className="flex items-center text-emerald-300 text-xs font-bold bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
                +5.4% <ArrowUpRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <div className="relative">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Revenue</p>
            <h3 className="text-4xl font-black mt-2 tracking-tight">₹{stats?.totalAmount.toLocaleString()}</h3>
          </div>
        </div>

        {/* New Clients */}
        <div className={`${card3D} p-6 group relative overflow-hidden bg-gradient-to-br from-white to-purple-50`}>
           <div className="absolute right-0 top-0 h-32 w-32 bg-purple-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-between mb-6">
            <div className="p-4 bg-white shadow-lg shadow-purple-200 rounded-2xl text-purple-600 border border-purple-100">
               <Activity className="w-7 h-7" />
            </div>
          </div>
          <div className="relative">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">New Clients Today</p>
            <h3 className="text-4xl font-black text-slate-800 mt-2">{stats?.newClientsToday}</h3>
          </div>
        </div>

        {/* Total Services */}
        <div className={`${card3D} p-6 group relative overflow-hidden bg-gradient-to-br from-white to-orange-50`}>
           <div className="absolute right-0 top-0 h-32 w-32 bg-orange-500/10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-between mb-6">
            <div className="p-4 bg-white shadow-lg shadow-orange-200 rounded-2xl text-orange-600 border border-orange-100">
               <ShoppingBag className="w-7 h-7" />
            </div>
          </div>
          <div className="relative">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Services</p>
            <h3 className="text-4xl font-black text-slate-800 mt-2">{stats?.serviceCount}</h3>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className={`${card3D} lg:col-span-2 p-8`}>
          <div className="flex justify-between items-center mb-8">
              <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
                    Revenue Analytics
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Income trends over time</p>
              </div>
              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200">Last 7 Days</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} dy={15} />
                <YAxis tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} dx={-10} />
                <RechartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className={`${card3D} p-8`}>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Service Mix</h3>
          <p className="text-slate-400 text-sm font-medium mb-6">Distribution by Category</p>
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
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}/>
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
           <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Top Performing Service</p>
              <p className="text-lg font-black text-slate-800">{serviceTypeData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Technician Table - 3D Container */}
      <div className={`${card3D} overflow-hidden p-0`}>
        <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
          <div>
              <h3 className="text-xl font-bold text-slate-800">Technician Performance</h3>
              <p className="text-slate-400 text-sm font-medium">Efficiency & Revenue Contribution</p>
          </div>
          <button className="text-sm bg-white border border-slate-300 shadow-sm text-indigo-600 font-bold py-2 px-4 rounded-xl hover:bg-indigo-50 transition-colors">View Full Report</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-slate-500 uppercase font-bold text-xs border-b border-slate-200">
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
                          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white mr-4 shadow-md shadow-indigo-200">
                              {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 text-base">{tech.name}</span>
                      </div>
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-slate-600">{tech.clients}</td>
                  <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end">
                          <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden mr-2 shadow-inner border border-slate-200">
                              <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm" style={{ width: `${Math.min(tech.clients * 10, 100)}%` }}></div>
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
