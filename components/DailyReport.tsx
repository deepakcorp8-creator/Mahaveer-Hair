
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { Calendar, Filter, FileText, UserPlus, Scissors, CreditCard, Search, Wallet, Smartphone, Landmark, AlertCircle, RefreshCw, Eye, FileDown, Printer, User, Ruler, Sparkles, Layers } from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';

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
      const data = await api.getEntries(true);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = entries.filter(entry => {
    if (entry.date !== selectedDate) return false;
    if (serviceFilter !== 'ALL' && entry.serviceType !== serviceFilter) return false;
    if (paymentFilter !== 'ALL' && entry.paymentMethod !== paymentFilter) return false;
    if (searchTerm && !entry.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const dailyEntries = entries.filter(e => e.date === selectedDate);
  const totalDailyRevenue = dailyEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const newClientsCount = dailyEntries.filter(e => e.serviceType === 'NEW').length;
  const serviceCount = dailyEntries.filter(e => e.serviceType === 'SERVICE').length;
  const totalTxns = dailyEntries.length;

  const paymentStats = {
    CASH: dailyEntries.filter(e => e.paymentMethod === 'CASH').reduce((s, e) => s + Number(e.amount), 0),
    UPI: dailyEntries.filter(e => e.paymentMethod === 'UPI').reduce((s, e) => s + Number(e.amount), 0),
    CARD: dailyEntries.filter(e => e.paymentMethod === 'CARD').reduce((s, e) => s + Number(e.amount), 0),
    PENDING: dailyEntries.filter(e => e.paymentMethod === 'PENDING').reduce((s, e) => s + Number(e.amount), 0),
  };

  // Base 3D Card Style
  const card3D = "bg-white rounded-2xl shadow-[0_8px_30px_-5px_rgba(0,0,0,0.1)] border border-slate-200 p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header & Date Picker (3D) */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-[0_15px_35px_-10px_rgba(0,0,0,0.08)] border border-slate-200 backdrop-blur-sm">
        <div>
           <div className="flex items-center gap-2">
               <h2 className="text-3xl font-black text-slate-800">Daily Report</h2>
               <button onClick={loadData} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Refresh Data">
                   <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
               </button>
           </div>
           <p className="text-slate-500 font-bold mt-1">Transactions for {new Date(selectedDate).toDateString()}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center bg-white border-2 border-slate-200 rounded-xl p-1.5 shadow-sm">
            <div className="px-3 py-2 text-indigo-600 bg-indigo-50 rounded-lg mr-2">
                <Calendar className="w-5 h-5" />
            </div>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-slate-800 font-black text-sm"
            />
        </div>
      </div>

      {/* Stats Cards - Distinct & Visible 3D Pop */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Collection */}
          <div className="rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 bg-gradient-to-br from-indigo-600 to-indigo-800 transform hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden border border-indigo-700">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex justify-between items-start relative z-10">
                  <div>
                      <p className="text-indigo-200 text-xs font-black uppercase tracking-widest border-b border-indigo-400/30 pb-1 mb-2 inline-block">Total Collection</p>
                      <h3 className="text-3xl font-black mt-1">₹{totalDailyRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/20">
                      <CreditCard className="w-6 h-6" />
                  </div>
              </div>
          </div>
          
          {/* New Patches - Blue */}
           <div className={`${card3D} border-l-8 border-l-blue-500`}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">New Patches</p>
                      <h3 className="text-3xl font-black text-slate-800">{newClientsCount}</h3>
                  </div>
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner border border-blue-200">
                      <UserPlus className="w-6 h-6" />
                  </div>
              </div>
          </div>

          {/* Services Done - Violet */}
          <div className={`${card3D} border-l-8 border-l-violet-500`}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Services Done</p>
                      <h3 className="text-3xl font-black text-slate-800">{serviceCount}</h3>
                  </div>
                  <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-inner border border-violet-200">
                      <Scissors className="w-6 h-6" />
                  </div>
              </div>
          </div>

          {/* Total Entries - Slate */}
          <div className={`${card3D} border-l-8 border-l-slate-500`}>
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Total Entries</p>
                      <h3 className="text-3xl font-black text-slate-800">{totalTxns}</h3>
                  </div>
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shadow-inner border border-slate-200">
                      <FileText className="w-6 h-6" />
                  </div>
              </div>
          </div>
      </div>

      {/* Payment Breakdown Cards - Floating Pills with Stronger Colors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow hover:border-emerald-200">
              <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200"><Wallet className="w-5 h-5"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cash</p>
                  <p className="font-black text-slate-800 text-lg">₹{paymentStats.CASH.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow hover:border-blue-200">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 shadow-sm border border-blue-200"><Smartphone className="w-5 h-5"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">UPI</p>
                  <p className="font-black text-slate-800 text-lg">₹{paymentStats.UPI.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow hover:border-purple-200">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600 shadow-sm border border-purple-200"><CreditCard className="w-5 h-5"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Card</p>
                  <p className="font-black text-slate-800 text-lg">₹{paymentStats.CARD.toLocaleString()}</p>
              </div>
          </div>
          <div className="bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow hover:border-red-200">
              <div className="p-3 rounded-full bg-red-100 text-red-600 shadow-sm border border-red-200"><AlertCircle className="w-5 h-5"/></div>
              <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending</p>
                  <p className="font-black text-slate-800 text-lg">₹{paymentStats.PENDING.toLocaleString()}</p>
              </div>
          </div>
      </div>

      {/* Filters Bar - Floating */}
      <div className="bg-white p-5 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between sticky top-4 z-20">
          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100"><Filter className="w-4 h-4 text-indigo-600" /></div>
              <span className="text-sm font-bold text-slate-700">Filter Records:</span>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search Client Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-full shadow-inner font-semibold placeholder:font-normal"
                  />
              </div>

              <select 
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-bold text-slate-600 shadow-sm cursor-pointer"
              >
                  <option value="ALL">All Services</option>
                  <option value="NEW">New Patch</option>
                  <option value="SERVICE">Service</option>
                  <option value="DEMO">Demo</option>
                  <option value="MUNDAN">Mundan</option>
              </select>

              <select 
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-bold text-slate-600 shadow-sm cursor-pointer"
              >
                  <option value="ALL">All Payments</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="PENDING">Pending</option>
              </select>
          </div>
      </div>

      {/* Detailed Table - 3D Container */}
      <div className="bg-white rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-600">
                 <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-xs border-b border-slate-200">
                     <tr>
                         <th className="px-6 py-5">Client Name</th>
                         <th className="px-6 py-5">Contact / Address</th>
                         <th className="px-6 py-5">Service</th>
                         <th className="px-6 py-5">Payment</th>
                         <th className="px-6 py-5 text-right">Amount</th>
                         <th className="px-6 py-5 text-center">Invoice</th>
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
                                     <div className="text-xs font-bold text-slate-400 mt-1">{entry.date}</div>
                                 </td>
                                 <td className="px-6 py-5">
                                     <div className="font-bold text-slate-700">{entry.contactNo}</div>
                                     <div className="text-xs text-slate-400 truncate max-w-[150px] font-medium">{entry.address}</div>
                                 </td>
                                 <td className="px-6 py-5">
                                    <div className="flex flex-col items-start gap-2">
                                        {/* Service Badge */}
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm
                                        ${entry.serviceType === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                          entry.serviceType === 'SERVICE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                          entry.serviceType === 'DEMO' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                          'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                            {entry.serviceType === 'NEW' && <Sparkles className="w-3 h-3" />}
                                            {entry.serviceType === 'SERVICE' && <Scissors className="w-3 h-3" />}
                                            {entry.serviceType === 'DEMO' && <Layers className="w-3 h-3" />}
                                            {entry.serviceType}
                                        </span>

                                        {/* Technician & Method */}
                                        <div className="space-y-1 pl-1">
                                            <div className="flex items-center text-sm font-bold text-slate-700">
                                                <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                                {entry.technician}
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                    {entry.patchMethod || 'N/A'}
                                                </span>
                                            </div>

                                            {/* Patch Size (if exists) */}
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
                                         {/* Cloud PDF (if exists) */}
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
                                         
                                         {/* Instant Print (Local) */}
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

    </div>
  );
};

export default DailyReport;
