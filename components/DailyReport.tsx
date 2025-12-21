
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry, Technician } from '../types';
import { 
  Calendar, Filter, FileText, UserPlus, Scissors, CreditCard, Search, Wallet, 
  Smartphone, Landmark, AlertCircle, RefreshCw, Eye, FileDown, Printer, User, 
  Ruler, Sparkles, Layers, Pencil, X, Save 
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
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState<Partial<Entry>>({});

  useEffect(() => {
    loadData();
    loadOptions();
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
          pendingAmount: entry.pendingAmount || 0
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

  const filteredData = entries.filter(entry => {
    if (entry.date !== selectedDate) return false;
    if (serviceFilter !== 'ALL' && entry.serviceType !== serviceFilter) return false;
    if (paymentFilter !== 'ALL' && entry.paymentMethod !== paymentFilter) return false;
    if (searchTerm && !entry.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const dailyEntries = entries.filter(e => e.date === selectedDate);
  const totalDailyRevenue = dailyEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const newClientsCount = dailyEntries.filter(e => e.serviceType === 'NEW').length;
  const serviceCount = dailyEntries.filter(e => e.serviceType === 'SERVICE' || e.serviceType === 'WASHING').length;
  const totalTxns = dailyEntries.length;

  const paymentStats = {
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
  };

  const card3D = "bg-white rounded-2xl shadow-[0_8px_30px_-5px_rgba(0,0,0,0.1)] border border-slate-200 p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-[0_15px_35px_-10px_rgba(0,0,0,0.08)] border border-slate-200 backdrop-blur-sm">
        <div>
           <div className="flex items-center gap-2">
               <h2 className="text-3xl font-black text-slate-800">Daily Report</h2>
               <button onClick={loadData} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Refresh Data">
                   <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
               </button>
           </div>
           <p className="text-slate-500 font-bold mt-1">Transactions for {formatDateDisplay(selectedDate)}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <option value="WASHING">Washing</option>
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
                         <th className="px-6 py-5 text-center">Actions</th>
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
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Assigned Technician</label>
                              <select 
                                  value={editForm.technician || ''} 
                                  onChange={e => setEditForm({...editForm, technician: e.target.value})} 
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
                                      onChange={e => setEditForm({...editForm, serviceType: e.target.value as any})} 
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
                                      onChange={e => setEditForm({...editForm, patchMethod: e.target.value as any})} 
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
                                  onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})}
                                  className="w-full rounded-xl border-slate-200 border-2 bg-slate-50 px-4 py-3.5 font-black text-slate-800 text-lg outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                              />
                          </div>

                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Payment Method</label>
                              <select 
                                  value={editForm.paymentMethod || ''} 
                                  onChange={e => setEditForm({...editForm, paymentMethod: e.target.value as any})} 
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
                                  onChange={e => setEditForm({...editForm, remark: e.target.value})} 
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
