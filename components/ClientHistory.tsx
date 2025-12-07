import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Entry, Client } from '../types';
import { History, Calendar, CreditCard, User, FileText, CheckCircle2, Clock, XCircle, Shield, Filter, RotateCcw } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ClientHistory: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [allEntries, options] = await Promise.all([
      api.getEntries(),
      api.getOptions()
    ]);
    setEntries(allEntries);
    setClients(options.clients);
    setLoading(false);
  };

  // Filter entries for the selected client AND date range
  const clientHistory = entries
    .filter(e => e.clientName.toLowerCase() === selectedClient.toLowerCase())
    .filter(e => {
        // String comparison works for YYYY-MM-DD
        if (startDate && e.date < startDate) return false;
        if (endDate && e.date > endDate) return false;
        return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first

  // Calculate Stats based on FILTERED history
  const totalVisits = clientHistory.length;
  const totalSpend = clientHistory
    .filter(e => e.workStatus !== 'REJECTED')
    .reduce((sum, e) => sum + Number(e.amount), 0);
    
  const matchedClientInfo = clients.find(c => c.name.toLowerCase() === selectedClient.toLowerCase());

  const clearDates = () => {
      setStartDate('');
      setEndDate('');
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'DONE': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1"/> DONE</span>;
          case 'PENDING': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1"/> PENDING</span>;
          case 'PENDING_APPROVAL': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700"><Shield className="w-3 h-3 mr-1"/> APPROVAL</span>;
          case 'REJECTED': return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1"/> REJECTED</span>;
          default: return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
      }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                    <History className="w-6 h-6 mr-2 text-indigo-600" />
                    Client History
                </h2>
                <p className="text-slate-500 text-sm">View complete service timeline and records.</p>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-end">
            <div className="w-full lg:flex-1">
                 <SearchableSelect 
                    label="Search Client by Name"
                    options={clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact }))}
                    value={selectedClient}
                    onChange={setSelectedClient}
                    placeholder="Type client name..."
                />
            </div>
            
            {/* Date Filters */}
            <div className="w-full lg:w-auto flex flex-col md:flex-row gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">From Date</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full md:w-40 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">To Date</label>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full md:w-40 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex items-end">
                    {(startDate || endDate) && (
                        <button 
                            onClick={clearDates}
                            className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear Dates"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {selectedClient && (
        <>
            {/* Client Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full mr-4">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Client Profile</p>
                        <h3 className="text-lg font-bold text-slate-900">{matchedClientInfo?.name || selectedClient}</h3>
                        <p className="text-sm text-slate-500">{matchedClientInfo?.contact || 'No contact found'}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mr-4">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">
                            {startDate || endDate ? 'Visits in Period' : 'Total Visits'}
                        </p>
                        <h3 className="text-2xl font-black text-slate-900">{totalVisits}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full mr-4">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">
                            {startDate || endDate ? 'Revenue in Period' : 'Lifetime Value'}
                        </p>
                        <h3 className="text-2xl font-black text-slate-900">₹{totalSpend.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Timeline / History List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700">Service Timeline</h3>
                    {(startDate || endDate) && (
                         <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200">
                             Filtered View
                         </span>
                    )}
                </div>
                
                {clientHistory.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {clientHistory.map((entry, index) => (
                            <div key={index} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4">
                                {/* Date Column */}
                                <div className="md:w-48 flex-shrink-0">
                                    <div className="flex items-center text-slate-800 font-bold mb-1">
                                        <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                                        {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="text-xs text-slate-500 ml-6">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide
                                            ${entry.serviceType === 'NEW' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}
                                        `}>
                                            {entry.serviceType}
                                        </span>
                                        {getStatusBadge(entry.workStatus)}
                                    </div>
                                    
                                    <h4 className="font-bold text-slate-800 text-lg mb-1">
                                        {entry.serviceType === 'NEW' ? entry.patchSize || 'New System' : 'Maintenance Service'}
                                    </h4>
                                    
                                    <div className="text-sm text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                        <div><span className="font-semibold text-slate-400">Technician:</span> {entry.technician}</div>
                                        <div><span className="font-semibold text-slate-400">Method:</span> {entry.patchMethod}</div>
                                        <div><span className="font-semibold text-slate-400">Branch:</span> {entry.branch}</div>
                                        <div><span className="font-semibold text-slate-400">Service #:</span> {entry.numberOfService}</div>
                                    </div>
                                    
                                    {entry.remark && (
                                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic border border-slate-100">
                                            "{entry.remark}"
                                        </div>
                                    )}
                                </div>

                                {/* Amount Column */}
                                <div className="md:w-32 flex-shrink-0 text-left md:text-right">
                                    <div className="font-black text-xl text-slate-800">₹{entry.amount}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase">{entry.paymentMethod}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-400">
                        <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No records found for this period.</p>
                        {(startDate || endDate) && (
                            <button onClick={clearDates} className="mt-2 text-indigo-600 text-sm font-bold hover:underline">
                                Clear Filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};

export default ClientHistory;