import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, DollarSign, Activity, ShoppingBag, ArrowUpRight } from 'lucide-react';
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  // Sort entries by date for line chart
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const salesData = sortedEntries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.date === curr.date);
    const amount = Number(curr.amount || 0); // Safe cast to number
    if (found) {
      found.amount += amount;
    } else {
      acc.push({ date: curr.date, amount: amount });
    }
    return acc;
  }, []);

  const technicianPerformance = entries.reduce((acc: any[], curr) => {
    const found = acc.find(item => item.name === curr.technician);
    const amount = Number(curr.amount || 0); // Safe cast to number
    if (found) {
      found.clients += 1;
      found.revenue += amount;
    } else {
      acc.push({ name: curr.technician, clients: 1, revenue: amount });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard Overview</h2>
            <p className="text-slate-500 mt-1 font-medium">Welcome back, here's what's happening today.</p>
        </div>
        <div className="mt-4 md:mt-0 bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-300 text-slate-700 text-sm font-semibold">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-300 group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 h-32 w-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl shadow-sm">
               <Users className="w-6 h-6" />
            </div>
            <span className="flex items-center text-green-600 text-xs font-bold bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                +12% <ArrowUpRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <div className="relative">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Clients</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.totalClients}</h3>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="relative overflow-hidden bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200 text-white border border-slate-700">
          <div className="relative flex items-center justify-between mb-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
               <DollarSign className="w-6 h-6 text-white" />
            </div>
             <span className="flex items-center text-green-300 text-xs font-bold bg-green-900/30 border border-green-500/30 px-2 py-1 rounded-full">
                +5.4% <ArrowUpRight className="w-3 h-3 ml-1" />
            </span>
          </div>
          <div className="relative">
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-3xl font-extrabold mt-1">₹{stats?.totalAmount.toLocaleString()}</h3>
          </div>
        </div>

        {/* New Clients */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-300 group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 h-32 w-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-sm">
               <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="relative">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">New Clients Today</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.newClientsToday}</h3>
          </div>
        </div>

        {/* Total Services */}
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-300 group hover:shadow-md transition-all">
           <div className="absolute right-0 top-0 h-32 w-32 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="relative flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-xl shadow-sm">
               <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <div className="relative">
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Services</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.serviceCount}</h3>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              Revenue Overview
              <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Last 7 Days</span>
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dx={-10} />
                <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-300">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Service Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
           <div className="text-center mt-4">
              <p className="text-sm text-slate-500">Top Service: <span className="font-bold text-slate-800">{serviceTypeData.sort((a,b) => b.value - a.value)[0]?.name || 'N/A'}</span></p>
          </div>
        </div>
      </div>

      {/* Technician Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Technician Performance</h3>
          <button className="text-sm text-indigo-600 font-bold hover:text-indigo-800 transition-colors">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Technician</th>
                <th className="px-6 py-4 text-right">Clients Served</th>
                <th className="px-6 py-4 text-right">Performance Score</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicianPerformance.map((tech: any, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                      <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 mr-3 border border-slate-300">
                              {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{tech.name}</span>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{tech.clients}</td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end">
                          <div className="w-24 h-2.5 bg-slate-200 rounded-full overflow-hidden mr-2">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(tech.clients * 10, 100)}%` }}></div>
                          </div>
                      </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹{tech.revenue.toLocaleString()}</td>
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