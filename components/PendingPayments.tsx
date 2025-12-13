
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry } from '../types';
import { Wallet, AlertTriangle, CheckCircle2, Search, X, RefreshCw, Calendar } from 'lucide-react';

const PendingPayments: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const allEntries = await api.getEntries(true);
        // Filter only those with pending dues
        const pending = allEntries.filter(e => e.paymentMethod === 'PENDING' || (e.pendingAmount && e.pendingAmount > 0));
        setEntries(pending);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => 
      e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.contactNo).includes(searchTerm)
  );

  const openPaymentModal = (entry: Entry) => {
      setSelectedEntry(entry);
      // Default payment amount to the total due
      const due = entry.paymentMethod === 'PENDING' 
          ? (entry.amount || 0) // If purely pending, total is due
          : (entry.pendingAmount || 0); // If partial, pending is due
      
      setPaymentAmount(due);
      setIsModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEntry) return;
      
      setSubmitting(true);
      try {
          const paid = Number(paymentAmount);
          const currentPending = selectedEntry.paymentMethod === 'PENDING' ? selectedEntry.amount : (selectedEntry.pendingAmount || 0);
          
          // Logic:
          // If paying full amount -> status becomes Paid (Method updates to what was used)
          // If paying partial -> status remains partial/pending but pending amount reduces
          
          const newPending = Math.max(0, currentPending - paid);
          
          // If clearing entire due, update method from PENDING to actual method
          // If it was already partial (method e.g. CASH) and we pay more, method might stay same or we just track amounts.
          // For simplicity in this app: The latest payment method overwrites if it was PENDING.
          
          let newMethod = selectedEntry.paymentMethod;
          if (newMethod === 'PENDING') {
              newMethod = paymentMethod;
          }
          
          const updatedEntry = {
              ...selectedEntry,
              paymentMethod: newMethod,
              pendingAmount: newPending,
              // If previously amount was 0 (unspecified) and user is now paying X, update total amount to at least X?
              // Or user enters total bill?
              // The modal here is strictly for PAYING DUE.
              // If entry was created with Amount=0, this flow assumes amount was updated or is being updated?
              // Actually, if amount=0 and pending, it's just a placeholder.
              // Let's assume Amount is fixed from Entry. If 0, maybe allow editing total?
              // For now, sticking to reducing pending.
          };

          await api.updateEntry(updatedEntry);
          await loadData();
          setIsModalOpen(false);
          setSelectedEntry(null);
      } catch (err) {
          console.error(err);
          alert("Failed to update payment.");
      } finally {
          setSubmitting(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h2 className="text-3xl font-black text-slate-800 flex items-center">
                    <Wallet className="w-8 h-8 mr-3 text-red-500" />
                    Pending Dues
                </h2>
                <p className="text-slate-500 font-medium">Manage outstanding payments and credits</p>
            </div>
            
            <div className="relative w-full md:w-72 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                <input 
                    type="text" 
                    placeholder="Search client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                />
            </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loading ? (
                <div className="col-span-full text-center py-12 text-slate-400 font-bold">Loading pending records...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
                    <div className="inline-flex p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">All Clear!</h3>
                    <p className="text-slate-500 font-medium">No pending payments found.</p>
                </div>
            ) : (
                filteredEntries.map(entry => {
                    const dueAmount = entry.paymentMethod === 'PENDING' ? entry.amount : entry.pendingAmount;
                    
                    return (
                        <div key={entry.id} className="bg-white rounded-2xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-slate-200 hover:border-red-200 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <AlertTriangle className="w-24 h-24 text-red-500 transform rotate-12" />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-black text-lg text-slate-800">{entry.clientName}</h3>
                                        <p className="text-sm font-bold text-slate-400 flex items-center mt-1">
                                            <Calendar className="w-3.5 h-3.5 mr-1.5" /> {entry.date}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md border border-red-100">
                                            Due Amount
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 mt-1">₹{dueAmount}</div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100 text-xs font-medium text-slate-600">
                                    <div className="flex justify-between mb-1">
                                        <span>Service:</span>
                                        <span className="font-bold">{entry.serviceType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Bill:</span>
                                        <span className="font-bold">₹{entry.amount}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => openPaymentModal(entry)}
                                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-300 transition-all flex items-center justify-center"
                                >
                                    <Wallet className="w-4 h-4 mr-2" />
                                    Clear Due
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        {/* Payment Modal */}
        {isModalOpen && selectedEntry && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                    <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white">
                        <div>
                            <h3 className="font-black text-lg">Record Payment</h3>
                            <p className="text-xs text-slate-400 font-bold">{selectedEntry.clientName}</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Outstanding</p>
                            <p className="text-3xl font-black text-red-600">
                                ₹{selectedEntry.paymentMethod === 'PENDING' ? selectedEntry.amount : selectedEntry.pendingAmount}
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Payment Received</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₹</span>
                                <input 
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-xl font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-inner"
                                    placeholder="Enter Amount"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Payment Method</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['CASH', 'UPI', 'CARD'].map(m => (
                                    <button
                                        type="button"
                                        key={m}
                                        onClick={() => setPaymentMethod(m as any)}
                                        className={`py-2.5 rounded-xl text-xs font-black border transition-all
                                            ${paymentMethod === m 
                                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                        `}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center border border-emerald-700 text-lg"
                        >
                            {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Update Balance'}
                        </button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default PendingPayments;
