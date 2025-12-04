import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { Calendar, Filter, FileText, UserPlus, Scissors, CreditCard, Search, Wallet, Smartphone, Landmark, AlertCircle } from 'lucide-react';

const DailyReport: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  // Filter Logic
  const filteredData = entries.filter(entry => {
    // 1. Date Filter
    if (entry.date !== selectedDate) return false;

    // 2. Service Type Filter
    if (serviceFilter !== 'ALL' && entry.serviceType !== serviceFilter) return false;

    // 3. Payment Filter
    if (paymentFilter !== 'ALL' && entry.paymentMethod !== paymentFilter) return false;

    // 4. Search Filter (Client Name)
    if (searchTerm && !entry.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;

    return true;
  });

  // Statistics Calculation (Based on filtered data or just the Date)
  // Calculating stats specifically for the Selected Date (ignoring other dropdowns for the top cards to keep them as "Daily Totals")
  const dailyEntries = entries.filter(e => e.date === selectedDate);
  const totalDailyRevenue = dailyEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const newClientsCount = dailyEntries.filter(e => e.serviceType === 'NEW').length;
  const serviceCount = dailyEntries.filter(e => e.serviceType === 'SERVICE').length;
  const totalTxns = dailyEntries.length;

  // Payment Breakdown Stats
  const paymentStats = {
    CASH: dailyEntries.filter(e => e.paymentMethod === 'CASH').reduce((s, e) => s + Number(e.amount), 0),
    UPI: dailyEntries.filter(e => e.paymentMethod === 'UPI').reduce((s, e) => s + Number(e.amount), 0),
    CARD: dailyEntries.filter(e => e.paymentMethod === 'CARD').reduce((s, e) => s + Number(e.amount), 0),
    PENDING: dailyEntries.filter(e => e.paymentMethod === 'PENDING').reduce((s, e) => s + Number(e.amount), 0),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Date Picker */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Daily Report</h2>
           <p className="text-slate-500 text-sm">Overview of transactions and services.</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
            <div className="px-3 py-2 text-slate-500">
                <Calendar className="w-5 h-5" />
            </div>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-slate-800 font-bold text-sm"
            />
        </div>
      </div>

      {/* Stats Cards (For Selected Date) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-indigo-600 rounded-xl p-5 text-white shadow-lg shadow-indigo-200">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Total Collection</p>
                      <h3 className="text-2xl font-black mt-1">₹{totalDailyRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <CreditCard className="w-5 h-5" />
                  </div>
              </div>
          </div>
          
           <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">New Patches</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{newClientsCount}</h3>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <UserPlus className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Services Done</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{serviceCount}</h3>
                  </div>
                  <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                      <Scissors className="w-5 h-5" />
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Entries</p>
                      <h3 className="text-2xl font-black text-slate-800 mt-1">{totalTxns}</h3>
                  </div>
                  <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
                      <FileText className="w-5 h-5" />
                  </div>
              </div>
          </div>
      </div>

      {/* Payment Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><Wallet className="w-4 h-4"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Cash</p>
                  <p className="font-bold text-slate-800">₹{paymentStats.CASH.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-50 text-blue-600"><Smartphone className="w-4 h-4"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">UPI</p>
                  <p className="font-bold text-slate-800">₹{paymentStats.UPI.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-50 text-purple-600"><CreditCard className="w-4 h-4"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Card</p>
                  <p className="font-bold text-slate-800">₹{paymentStats.CARD.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-50 text-red-600"><AlertCircle className="w-4 h-4"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Pending</p>
                  <p className="font-bold text-slate-800">₹{paymentStats.PENDING.toLocaleString()}</p>
              </div>
          </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Filters:</span>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search Client Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 w-full"
                  />
              </div>

              {/* Service Type Dropdown */}
              <select 
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 bg-white"
              >
                  <option value="ALL">All Service Types</option>
                  <option value="NEW">New Patch</option>
                  <option value="SERVICE">Service</option>
                  <option value="DEMO">Demo</option>
                  <option value="MUNDAN">Mundan</option>
              </select>

              {/* Payment Method Dropdown */}
              <select 
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 bg-white"
              >
                  <option value="ALL">All Payments</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="PENDING">Pending</option>
              </select>
          </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs border-b border-slate-200">
                     <tr>
                         <th className="px-6 py-4">Client Name</th>
                         <th className="px-6 py-4">Contact / Address</th>
                         <th className="px-6 py-4">Service</th>
                         <th className="px-6 py-4">Tech & Method</th>
                         <th className="px-6 py-4">Payment</th>
                         <th className="px-6 py-4 text-right">Amount</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {loading ? (
                         <tr><td colSpan={6} className="text-center py-10">Loading data...</td></tr>
                     ) : filteredData.length === 0 ? (
                         <tr><td colSpan={6} className="text-center py-10 text-slate-400">No records found for selected filters.</td></tr>
                     ) : (
                         filteredData.map((entry, idx) => (
                             <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                 <td className="px-6 py-4">
                                     <div className="font-bold text-slate-800">{entry.clientName}</div>
                                     <div className="text-xs text-slate-400">{entry.date}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="text-slate-700">{entry.contactNo}</div>
                                     <div className="text-xs text-slate-400 truncate max-w-[150px]">{entry.address}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className={`px-2 py-1 rounded text-xs font-bold 
                                        ${entry.serviceType === 'NEW' ? 'bg-blue-100 text-blue-700' : 
                                          entry.serviceType === 'SERVICE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                         {entry.serviceType}
                                     </span>
                                     {entry.serviceType === 'NEW' && <div className="text-xs text-slate-500 mt-1">{entry.remark || 'New Patch'}</div>}
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="font-medium">{entry.technician}</div>
                                     <div className="text-xs text-slate-500">{entry.patchMethod}</div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <div className="font-semibold text-xs">{entry.paymentMethod}</div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <div className="font-black text-slate-800">₹{entry.amount}</div>
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
         <div className="bg-slate-50 p-3 border-t border-slate-200 text-right text-xs text-slate-500">
             Showing {filteredData.length} records
         </div>
      </div>

    </div>
  );
};

export default DailyReport;