import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { PackageCheck, Plus, Search, Tag, Users, CheckCircle, Ticket, XCircle, Clock, Pencil, Save, X, Trash2 } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ServicePackages: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  const [newPkg, setNewPkg] = useState<Partial<ServicePackage>>({
    clientName: '',
    contact: '',
    packageName: '',
    totalCost: 0,
    totalServices: 12, // Default
    startDate: new Date().toISOString().split('T')[0],
    status: 'PENDING'
  });

  useEffect(() => {
    // Get current user for permission checks
    const savedUser = localStorage.getItem('mahaveer_user');
    if (savedUser) {
        try {
            setCurrentUser(JSON.parse(savedUser));
        } catch (e) {}
    }
    loadData();
  }, []);

  const loadData = async () => {
    const options = await api.getOptions();
    setClients(options.clients || []);
    
    // Force refresh with timestamp to bypass cache
    const pkgData = await api.getPackages(true);
    setPackages(pkgData);
    
    const entriesData = await api.getEntries();
    setEntries(entriesData);
    
    // Filter pending approvals
    setPendingApprovals(entriesData.filter(e => e.workStatus === 'PENDING_APPROVAL'));
  };

  const handleClientChange = (name: string) => {
      const client = clients.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (client) {
          setNewPkg(prev => ({ ...prev, clientName: client.name, contact: client.contact }));
      } else {
          setNewPkg(prev => ({ ...prev, clientName: name, contact: '' }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if(newPkg.clientName && newPkg.packageName && newPkg.totalServices) {
            await api.addPackage({
                ...newPkg as ServicePackage,
                status: 'PENDING'
            });
            await loadData(); 
            setNewPkg({
                clientName: '',
                contact: '',
                packageName: '',
                totalCost: 0,
                totalServices: 12,
                startDate: new Date().toISOString().split('T')[0],
                status: 'PENDING'
            });
        }
    } catch (e) {
        console.error(e);
        alert("Error creating package. Please check connection.");
    } finally {
        setLoading(false);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPackage) return;
      
      setLoading(true);
      try {
          await api.editPackage(editingPackage);
          await loadData();
          setIsEditModalOpen(false);
          setEditingPackage(null);
      } catch (e) {
          console.error(e);
          alert("Failed to update package.");
      } finally {
          setLoading(false);
      }
  };

  const handleEntryApproval = async (id: string, action: 'APPROVE' | 'REJECT') => {
      if(window.confirm(`Are you sure you want to ${action} this usage request?`)) {
          setLoading(true);
          const newStatus = action === 'APPROVE' ? 'DONE' : 'REJECTED';
          await api.updateEntryStatus(id, newStatus);
          await loadData();
          setLoading(false);
      }
  };
  
  const handlePackageApproval = async (id: string, action: 'APPROVE' | 'REJECT') => {
      const isDelete = action === 'REJECT';
      const msg = isDelete 
          ? `Are you sure you want to REJECT and DELETE this package? This cannot be undone.` 
          : `Are you sure you want to APPROVE this package?`;

      if(window.confirm(msg)) {
          setLoading(true);
          try {
              if (isDelete) {
                  await api.deletePackage(id);
              } else {
                  // HERE: Sending 'APPROVED' as requested
                  await api.updatePackageStatus(id, 'APPROVED');
              }
              // Delay for sheet update propagation
              setTimeout(async () => {
                  await loadData();
                  setLoading(false);
              }, 1200); 
          } catch (e) {
              alert("Operation failed. Please check your internet or redeploy the script.");
              setLoading(false);
          }
      }
  }

  // Helper to calculate used services for a specific package
  const getPackageUsage = (pkg: ServicePackage) => {
      const used = entries.filter(e => 
          e.clientName === pkg.clientName && 
          new Date(e.date) >= new Date(pkg.startDate) &&
          e.serviceType === 'SERVICE' &&
          (e.workStatus === 'DONE')
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
                    {loading ? 'Processing...' : <><Plus className="w-5 h-5 mr-1" /> Create Package</>}
                </button>
            </form>
        </div>
      </div>

      {/* Main Content Area: Approvals & List */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* PENDING APPROVALS SECTION (SERVICE USAGE) */}
        {pendingApprovals.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">
                <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                            <Ticket className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-amber-900">Pending Usage Approvals</h3>
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
                                                onClick={() => handleEntryApproval(entry.id, 'APPROVE')}
                                                className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleEntryApproval(entry.id, 'REJECT')}
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

        {/* PACKAGES LIST */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Packages</h2>
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
                    const isPending = pkg.status === 'PENDING' || !pkg.status;
                    const isApproved = pkg.status === 'APPROVED' || pkg.status === 'ACTIVE';
                    const statusText = pkg.status || 'PENDING';
                    
                    return (
                    <div key={pkg.id} className={`p-5 rounded-2xl shadow-sm border transition-all relative overflow-hidden bg-white flex flex-col justify-between
                        ${isPending 
                            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-100' 
                            : stats.isExpired 
                                ? 'border-red-200' 
                                : 'border-slate-200 hover:border-indigo-300'}`}>
                        
                        {/* Status Badge */}
                        <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-xl shadow-sm z-10
                            ${isPending ? 'bg-amber-400 text-white' 
                            : stats.isExpired ? 'bg-red-100 text-red-700' 
                            : isApproved ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                            {statusText}
                        </div>
                        
                        <div>
                            {/* Header */}
                            <div className="flex items-start mb-3 mt-2 justify-between">
                                <div className="flex items-start">
                                    <div className={`p-2 rounded-lg mr-3 shadow-sm ${isPending ? 'bg-white text-amber-600' : stats.isExpired ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-600'}`}>
                                        <Tag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-800 leading-tight">{pkg.packageName}</h4>
                                        <div className="flex items-center text-sm text-slate-500 mt-1 font-medium">
                                            <Users className="w-3 h-3 mr-1" /> {pkg.clientName}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Edit Button (Visible to Admin always, even if pending) */}
                                {currentUser?.role === Role.ADMIN && (
                                    <button 
                                        onClick={() => {
                                            setEditingPackage(pkg);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                                        title="Edit Package"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            {/* Active Content: Progress Bar */}
                            {!isPending && (
                            <div className="mt-4 mb-4">
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
                            )}
                            
                            {/* Pending Content: Notice */}
                            {isPending && (
                                <div className="mt-2 mb-4 p-2 bg-amber-100/50 rounded-lg text-xs text-amber-800 font-medium">
                                    <p>Waiting for Admin Approval</p>
                                </div>
                            )}
                            
                            {/* Footer Stats */}
                            <div className="grid grid-cols-2 gap-2 text-sm mt-2 border-t border-slate-100 pt-3">
                                <div>
                                    <span className="block text-slate-400 text-xs uppercase font-bold">Total Cost</span>
                                    <span className="font-bold text-slate-800">₹{pkg.totalCost}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-xs uppercase font-bold">Started</span>
                                    <span className="font-medium text-slate-800">{pkg.startDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Approval Actions for ADMIN */}
                        {isPending && currentUser?.role === Role.ADMIN && (
                            <div className="mt-4 pt-3 border-t border-amber-200 flex gap-2">
                                <button
                                    onClick={() => handlePackageApproval(pkg.id, 'APPROVE')}
                                    disabled={loading}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                                </button>
                                <button
                                    onClick={() => handlePackageApproval(pkg.id, 'REJECT')}
                                    disabled={loading}
                                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg font-bold text-sm flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-1.5" /> Reject
                                </button>
                            </div>
                        )}
                        
                        {isPending && currentUser?.role !== Role.ADMIN && (
                             <div className="mt-4 pt-3 border-t border-amber-300 text-center text-xs font-bold text-amber-700 flex items-center justify-center bg-amber-100/50 rounded-b-lg -mx-5 -mb-5 pb-5">
                                 <Clock className="w-3 h-3 mr-1" /> Pending Admin Action
                             </div>
                        )}
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

      {/* EDIT MODAL */}
      {isEditModalOpen && editingPackage && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                      <h3 className="font-bold text-lg flex items-center">
                          <Pencil className="w-5 h-5 mr-2" /> Edit Package
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <form onSubmit={handleUpdatePackage} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Package Name</label>
                          <input 
                              type="text"
                              value={editingPackage.packageName}
                              onChange={e => setEditingPackage({...editingPackage, packageName: e.target.value})}
                              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-300"
                              required
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Total Cost</label>
                              <input 
                                  type="number"
                                  value={editingPackage.totalCost}
                                  onChange={e => setEditingPackage({...editingPackage, totalCost: Number(e.target.value)})}
                                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-300"
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1">Total Services</label>
                              <input 
                                  type="number"
                                  value={editingPackage.totalServices}
                                  onChange={e => setEditingPackage({...editingPackage, totalServices: Number(e.target.value)})}
                                  className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-300"
                                  required
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                          <input 
                              type="date"
                              value={editingPackage.startDate}
                              onChange={e => setEditingPackage({...editingPackage, startDate: e.target.value})}
                              className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none border-slate-300"
                              required
                          />
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button 
                            type="button" 
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center"
                          >
                              {loading ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default ServicePackages;