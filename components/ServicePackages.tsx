import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { PackageCheck, Plus, Search, User as UserIcon, CheckCircle, Ticket, Clock, Pencil, Save, X, Trash2, ShieldAlert } from 'lucide-react';
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
    
    // Filter pending approvals (Should be rare now, but kept for legacy)
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
      // Robust comparison to match API logic
      const pkgName = (pkg.clientName || '').trim().toLowerCase();
      const pkgStart = new Date(pkg.startDate);
      pkgStart.setHours(0,0,0,0);

      const used = entries.filter(e => {
          const entryName = (e.clientName || '').trim().toLowerCase();
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          
          return (
              entryName === pkgName && 
              entryDate >= pkgStart && // Date must be greater than or equal to start date
              e.serviceType === 'SERVICE' &&
              e.workStatus === 'DONE'
          );
      }).length;
      
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
        <div className="bg-white rounded-2xl shadow-lg shadow-indigo-100 border border-slate-200 sticky top-6 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
                <div className="flex items-center text-white">
                    <PackageCheck className="w-5 h-5 mr-2" />
                    <h3 className="font-bold text-lg">New Package</h3>
                </div>
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

      {/* Main Content Area: Packages List */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* PACKAGES LIST */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Packages</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search package..." 
                        className="pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredPackages.map(pkg => {
                    const stats = getPackageUsage(pkg);
                    const isPending = pkg.status === 'PENDING' || !pkg.status;
                    const isApproved = pkg.status === 'APPROVED' || pkg.status === 'ACTIVE';
                    const statusText = pkg.status || 'PENDING';
                    
                    return (
                    <div key={pkg.id} className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                      {/* Decorative Background Blob */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>

                      {/* Header Section */}
                      <div className="relative flex justify-between items-start mb-4">
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {isPending ? <Clock className="w-6 h-6" /> : <PackageCheck className="w-6 h-6" />}
                          </div>
                          <div>
                             <h3 className="font-bold text-lg text-slate-800 leading-tight">{pkg.packageName}</h3>
                             <div className="flex items-center text-sm text-slate-500 font-medium mt-1">
                                <UserIcon className="w-3.5 h-3.5 mr-1.5" />
                                {pkg.clientName}
                             </div>
                          </div>
                        </div>
                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm ${
                            isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            stats.isExpired ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                            {statusText}
                        </span>
                      </div>

                      {/* Progress Section (Only if Active/Approved) */}
                      {!isPending && (
                          <div className="mb-6 relative z-10">
                              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                  <span>Progress</span>
                                  <span>{stats.used} / {pkg.totalServices} Services</span>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                 <div 
                                    className={`h-full rounded-full transition-all duration-700 ease-out ${stats.isExpired ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                                    style={{width: `${Math.min((stats.used / pkg.totalServices) * 100, 100)}%`}}
                                 ></div>
                              </div>
                              <div className={`mt-2 text-right text-xs font-bold ${stats.isExpired ? 'text-red-500' : 'text-indigo-600'}`}>
                                  {stats.isExpired ? 'Limit Reached' : `${stats.remaining} Visits Remaining`}
                              </div>
                          </div>
                      )}

                      {/* Pending Actions */}
                      {isPending && (
                          <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 mb-4 relative z-10">
                              <p className="text-xs text-amber-800 font-medium mb-3 flex items-center justify-center">
                                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                                  Admin Approval Required
                              </p>
                              {currentUser?.role === Role.ADMIN ? (
                                 <div className="flex gap-2">
                                     <button className="flex-1 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center" onClick={() => handlePackageApproval(pkg.id, 'APPROVE')}>
                                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                     </button>
                                     <button className="flex-1 bg-white border border-red-200 text-red-700 hover:bg-red-50 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center justify-center" onClick={() => handlePackageApproval(pkg.id, 'REJECT')}>
                                        <Trash2 className="w-3 h-3 mr-1" /> Reject
                                     </button>
                                 </div>
                              ) : (
                                  <div className="text-center text-xs text-slate-400 font-medium italic">
                                      Waiting for administrator action...
                                  </div>
                              )}
                          </div>
                      )}

                      {/* Footer Info */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
                          <div className="flex flex-col">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Total Cost</span>
                              <span className="text-sm font-bold text-slate-700">₹{pkg.totalCost}</span>
                          </div>
                           <div className="flex flex-col text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400">Start Date</span>
                              <span className="text-sm font-bold text-slate-700">{pkg.startDate}</span>
                          </div>
                      </div>
                      
                      {/* Admin Edit Action */}
                      {currentUser?.role === Role.ADMIN && (
                        <button 
                            onClick={() => {
                                setEditingPackage(pkg);
                                setIsEditModalOpen(true);
                            }}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all bg-white p-2 rounded-lg shadow-md text-slate-400 hover:text-indigo-600 hover:scale-110 z-20"
                            title="Edit Package"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
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