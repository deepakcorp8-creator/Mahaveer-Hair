import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry } from '../types';
import { PackageCheck, Plus, Search, Tag, Users, CheckCircle, Ticket, XCircle } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ServicePackages: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newPkg, setNewPkg] = useState<Partial<ServicePackage>>({
    clientName: '',
    contact: '',
    packageName: '',
    totalCost: 0,
    totalServices: 12, // Default
    startDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Removed dependency on fetch completion for options to speed up render
    const options = await api.getOptions();
    setClients(options.clients || []);
    
    const pkgData = await api.getPackages();
    setPackages(pkgData);
    
    const entriesData = await api.getEntries();
    setEntries(entriesData);
    
    // Filter pending approvals
    setPendingApprovals(entriesData.filter(e => e.workStatus === 'PENDING_APPROVAL'));
  };

  const handleClientChange = (name: string) => {
      const client = clients.find(c => c.name === name);
      if (client) {
          setNewPkg(prev => ({ ...prev, clientName: client.name, contact: client.contact }));
      } else {
          setNewPkg(prev => ({ ...prev, clientName: '', contact: '' }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if(newPkg.clientName && newPkg.packageName && newPkg.totalServices) {
            await api.addPackage(newPkg as ServicePackage);
            // Don't wait for loadData here, just reset. api.addPackage updates local state.
            await loadData(); 
            // Reset form
            setNewPkg({
                clientName: '',
                contact: '',
                packageName: '',
                totalCost: 0,
                totalServices: 12,
                startDate: new Date().toISOString().split('T')[0],
                status: 'ACTIVE'
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleApproval = async (id: string, action: 'APPROVE' | 'REJECT') => {
      if(window.confirm(`Are you sure you want to ${action} this package usage?`)) {
          setLoading(true);
          const newStatus = action === 'APPROVE' ? 'DONE' : 'REJECTED';
          await api.updateEntryStatus(id, newStatus);
          await loadData();
          setLoading(false);
      }
  };

  // Helper to calculate used services for a specific package
  const getPackageUsage = (pkg: ServicePackage) => {
      // Find entries for this client after package start date that are SERVICES
      const used = entries.filter(e => 
          e.clientName === pkg.clientName && 
          new Date(e.date) >= new Date(pkg.startDate) &&
          e.serviceType === 'SERVICE' &&
          (e.workStatus === 'DONE') // Only approved counts towards usage
      ).length;
      
      const remaining = Math.max(0, pkg.totalServices - used);
      const isExpired = used >= pkg.totalServices;

      return { used, remaining, isExpired };
  };

  const filteredPackages = packages.filter(p => 
    (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.packageName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20">
      {/* Create Package Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center rounded-t-2xl">
                <PackageCheck className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="font-bold text-indigo-900">Create New Package</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="relative z-20"> 
                     <SearchableSelect 
                        label="Select Client"
                        options={clients ? clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact })) : []}
                        value={newPkg.clientName || ''}
                        onChange={handleClientChange}
                        placeholder="Search Client..."
                        required
                    />
                </div>
                
                {newPkg.clientName && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm text-slate-600">
                        <span className="font-bold">Contact:</span> {newPkg.contact}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Package Name</label>
                    <input 
                        type="text" 
                        className="w-full rounded-lg border-slate-300 border px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="e.g. Yearly Silver Plan"
                        value={newPkg.packageName}
                        onChange={e => setNewPkg({...newPkg, packageName: e.target.value})}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Total Cost (₹)</label>
                        <input 
                            type="number" 
                            className="w-full rounded-lg border-slate-300 border px-3 py-2 font-bold text-slate-900"
                            placeholder="5999"
                            value={newPkg.totalCost || ''}
                            onChange={e => setNewPkg({...newPkg, totalCost: Number(e.target.value)})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Total Services</label>
                        <input 
                            type="number" 
                            className="w-full rounded-lg border-slate-300 border px-3 py-2"
                            placeholder="12"
                            value={newPkg.totalServices || ''}
                            onChange={e => setNewPkg({...newPkg, totalServices: Number(e.target.value)})}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                    <input 
                        type="date" 
                        className="w-full rounded-lg border-slate-300 border px-3 py-2"
                        value={newPkg.startDate}
                        onChange={e => setNewPkg({...newPkg, startDate: e.target.value})}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex justify-center items-center"
                >
                    {loading ? 'Creating...' : <><Plus className="w-5 h-5 mr-1" /> Create Package</>}
                </button>
            </form>
        </div>
      </div>

      {/* Main Content Area: Approvals & List */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* PENDING APPROVALS SECTION */}
        {pendingApprovals.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-amber-900">Pending Approvals</h3>
                            <p className="text-xs text-amber-700">Service requests requiring authorization</p>
                        </div>
                    </div>
                    <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {pendingApprovals.length} Request(s)
                    </span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-amber-50/50 text-amber-800 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Client</th>
                                <th className="px-6 py-3">Details</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                            {pendingApprovals.map((entry) => (
                                <tr key={entry.id} className="hover:bg-amber-50/30 transition-colors">
                                    <td className="px-6 py-4 font-medium">{entry.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{entry.clientName}</div>
                                        <div className="text-xs text-gray-500">Service #{entry.numberOfService}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>{entry.technician}</div>
                                        <div className="text-xs text-gray-500">{entry.branch} • {entry.patchMethod}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleApproval(entry.id, 'APPROVE')}
                                                className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleApproval(entry.id, 'REJECT')}
                                                className="flex items-center px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-bold text-xs border border-red-200 transition-colors"
                                            >
                                                <XCircle className="w-4 h-4 mr-1.5" /> Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ACTIVE PACKAGES LIST */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Active Packages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search package..." 
                        className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPackages.map(pkg => {
                    const stats = getPackageUsage(pkg);
                    return (
                    <div key={pkg.id} className={`p-5 rounded-2xl shadow-sm border border-slate-200 transition-all relative overflow-hidden bg-white
                        ${stats.isExpired ? 'border-red-200' : 'hover:border-indigo-300'}`}>
                        
                        <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl
                            ${stats.isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {stats.isExpired ? 'EXPIRED' : 'ACTIVE'}
                        </div>
                        
                        <div className="flex items-start mb-3">
                            <div className={`p-2 rounded-lg mr-3 ${stats.isExpired ? 'bg-red-50' : 'bg-indigo-50'}`}>
                                <Tag className={`w-6 h-6 ${stats.isExpired ? 'text-red-500' : 'text-indigo-600'}`} />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg text-slate-800">{pkg.packageName}</h4>
                                <div className="flex items-center text-sm text-slate-500 mt-1">
                                    <Users className="w-3 h-3 mr-1" /> {pkg.clientName}
                                </div>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-2 mb-4">
                            <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-slate-500">Usage: {stats.used} / {pkg.totalServices}</span>
                                <span className={stats.isExpired ? 'text-red-500' : 'text-indigo-600'}>
                                    {stats.remaining} Remaining
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className={`h-2.5 rounded-full ${stats.isExpired ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${Math.min((stats.used / pkg.totalServices) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mt-4 border-t border-slate-100 pt-4">
                            <div>
                                <span className="block text-slate-400 text-xs">Total Cost</span>
                                <span className="font-bold text-slate-800">₹{pkg.totalCost}</span>
                            </div>
                             <div>
                                <span className="block text-slate-400 text-xs">Started</span>
                                <span className="font-medium text-slate-800">{pkg.startDate}</span>
                            </div>
                        </div>
                    </div>
                )})}
                
                {filteredPackages.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                        No packages found matching your search.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePackages;