import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { PackageCheck, Plus, Search, User as UserIcon, CheckCircle, Ticket, Clock, Pencil, Save, X, Trash2, ShieldAlert } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ServicePackages: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
    const pkgData = await api.getPackages(true);
    setPackages(pkgData);
    const entriesData = await api.getEntries();
    setEntries(entriesData);
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
  
  const handlePackageApproval = async (e: React.MouseEvent, id: string, action: 'APPROVE' | 'REJECT') => {
      e.stopPropagation();
      e.preventDefault(); // Ensure button click doesn't trigger anything else
      
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

  const getPackageUsage = (pkg: ServicePackage) => {
      const pkgName = (pkg.clientName || '').trim().toLowerCase();
      const pkgStart = new Date(pkg.startDate);
      pkgStart.setHours(0,0,0,0);

      const used = entries.filter(e => {
          const entryName = (e.clientName || '').trim().toLowerCase();
          const entryDate = new Date(e.date);
          entryDate.setHours(0,0,0,0);
          
          return (
              entryName === pkgName && 
              entryDate >= pkgStart && 
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
      
      {/* Create Package Form - 3D Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white/60 sticky top-6 overflow-hidden backdrop-blur-md">
            <div className="px-6 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
                <div className="flex items-center text-white">
                    <PackageCheck className="w-6 h-6 mr-3" />
                    <h3 className="font-black text-xl tracking-tight">New Package</h3>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-700 font-medium">
                        <span className="font-bold">Contact:</span> {newPkg.contact}
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Package Name</label>
                    <input 
                        type="text" 
                        className="w-full rounded-2xl border-none bg-slate-100/50 px-4 py-3.5 text-gray-900 shadow-inner ring-1 ring-slate-900/5 focus:ring-2 focus:ring-indigo-500 font-semibold"
                        placeholder="e.g. Yearly Silver Plan"
                        value={newPkg.packageName}
                        onChange={e => setNewPkg({...newPkg, packageName: e.target.value})}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Total Cost (₹)</label>
                        <input 
                            type="number" 
                            className="w-full rounded-2xl border-none bg-slate-100/50 px-4 py-3.5 text-gray-900 shadow-inner ring-1 ring-slate-900/5 font-bold"
                            placeholder="5999"
                            value={newPkg.totalCost || ''}
                            onChange={e => setNewPkg({...newPkg, totalCost: Number(e.target.value)})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Total Services</label>
                        <input 
                            type="number" 
                            className="w-full rounded-2xl border-none bg-slate-100/50 px-4 py-3.5 text-gray-900 shadow-inner ring-1 ring-slate-900/5"
                            placeholder="12"
                            value={newPkg.totalServices || ''}
                            onChange={e => setNewPkg({...newPkg, totalServices: Number(e.target.value)})}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Start Date</label>
                    <input 
                        type="date" 
                        className="w-full rounded-2xl border-none bg-slate-100/50 px-4 py-3.5 text-gray-900 shadow-inner ring-1 ring-slate-900/5"
                        value={newPkg.startDate}
                        onChange={e => setNewPkg({...newPkg, startDate: e.target.value})}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-300 transition-all transform hover:-translate-y-1 hover:shadow-2xl flex justify-center items-center"
                >
                    {loading ? 'Processing...' : <><Plus className="w-5 h-5 mr-2" /> Create Package</>}
                </button>
            </form>
        </div>
      </div>

      {/* Main Content Area: Packages List */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* PACKAGES LIST */}
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Active Packages</h2>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search package..." 
                        className="pl-10 pr-6 py-3 rounded-2xl border-none bg-white shadow-lg shadow-slate-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPackages.map(pkg => {
                    const stats = getPackageUsage(pkg);
                    const isPending = pkg.status === 'PENDING' || !pkg.status;
                    const isApproved = pkg.status === 'APPROVED' || pkg.status === 'ACTIVE';
                    const statusText = pkg.status || 'PENDING';
                    
                    return (
                    <div key={pkg.id} className="group relative bg-white rounded-3xl p-6 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.08)] border border-slate-100 hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.2)] transition-shadow duration-300 overflow-hidden isolate">
                      
                      {/* Premium Card Glow - Pointer Events None to allow clicks through */}
                      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] -mr-10 -mt-10 opacity-40 transition-opacity pointer-events-none
                        ${isPending ? 'bg-amber-400' : stats.isExpired ? 'bg-red-500' : 'bg-indigo-500'}`}></div>

                      {/* Header Section */}
                      <div className="relative flex justify-between items-start mb-6 z-10">
                        <div className="flex gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300
                            ${isPending ? 'bg-amber-100 text-amber-600' : stats.isExpired ? 'bg-red-100 text-red-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`}>
                            {isPending ? <Clock className="w-7 h-7" /> : <PackageCheck className="w-7 h-7" />}
                          </div>
                          <div>
                             <h3 className="font-black text-lg text-slate-800 leading-tight">{pkg.packageName}</h3>
                             <div className="flex items-center text-sm text-slate-500 font-bold mt-1">
                                <UserIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                {pkg.clientName}
                             </div>
                          </div>
                        </div>
                        {/* Status Badge */}
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm
                            ${isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            stats.isExpired ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                            {statusText}
                        </span>
                      </div>

                      {/* Progress Section (Only if Active/Approved) */}
                      {!isPending && (
                          <div className="mb-6 relative z-10 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                              <div className="flex justify-between text-xs font-bold text-slate-500 mb-3">
                                  <span>Usage Progress</span>
                                  <span><span className="text-slate-900 text-sm">{stats.used}</span> / {pkg.totalServices}</span>
                              </div>
                              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                 <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${stats.isExpired ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                                    style={{width: `${Math.min((stats.used / pkg.totalServices) * 100, 100)}%`}}
                                 ></div>
                              </div>
                              <div className={`mt-3 text-right text-xs font-black uppercase tracking-wide ${stats.isExpired ? 'text-red-500' : 'text-indigo-600'}`}>
                                  {stats.isExpired ? 'Limit Reached' : `${stats.remaining} Visits Remaining`}
                              </div>
                          </div>
                      )}

                      {/* Pending Actions - High Z-Index for Clicks */}
                      {isPending && (
                          <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-100 mb-6 relative z-50 backdrop-blur-md shadow-sm">
                              <p className="text-xs text-amber-800 font-bold uppercase tracking-wide mb-4 flex items-center justify-center">
                                  <ShieldAlert className="w-4 h-4 mr-2" />
                                  Action Required
                              </p>
                              {currentUser?.role === Role.ADMIN ? (
                                 <div className="flex gap-3">
                                     <button 
                                        type="button"
                                        className="flex-1 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-500 hover:text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shadow-sm transition-all hover:shadow-emerald-200 hover:-translate-y-0.5 relative cursor-pointer z-50" 
                                        onClick={(e) => handlePackageApproval(e, pkg.id, 'APPROVE')}
                                     >
                                        Approve
                                     </button>
                                     <button 
                                        type="button"
                                        className="flex-1 bg-white border border-red-200 text-red-700 hover:bg-red-500 hover:text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wide shadow-sm transition-all hover:shadow-red-200 hover:-translate-y-0.5 relative cursor-pointer z-50" 
                                        onClick={(e) => handlePackageApproval(e, pkg.id, 'REJECT')}
                                     >
                                        Reject
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
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Cost</span>
                              <span className="text-lg font-black text-slate-800">₹{pkg.totalCost}</span>
                          </div>
                           <div className="flex flex-col text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Start Date</span>
                              <span className="text-sm font-bold text-slate-700">{pkg.startDate}</span>
                          </div>
                      </div>
                      
                      {/* Admin Edit Action - Only show for PENDING packages */}
                      {currentUser?.role === Role.ADMIN && isPending && (
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setEditingPackage(pkg);
                                setIsEditModalOpen(true);
                            }}
                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all bg-white p-2.5 rounded-xl shadow-lg text-slate-400 hover:text-indigo-600 hover:scale-110 z-[60] cursor-pointer"
                            title="Edit Package"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                      )}

                    </div>
                )})}
                
                {filteredPackages.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                        <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">No packages found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* EDIT MODAL - 3D Pop-up */}
      {isEditModalOpen && editingPackage && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 border border-white/50">
                  <div className="bg-indigo-600 px-8 py-5 flex justify-between items-center text-white shadow-lg">
                      <h3 className="font-black text-lg flex items-center">
                          <Pencil className="w-5 h-5 mr-3" /> Edit Package
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <form onSubmit={handleUpdatePackage} className="p-8 space-y-6">
                      <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Package Name</label>
                          <input 
                              type="text"
                              value={editingPackage.packageName}
                              onChange={e => setEditingPackage({...editingPackage, packageName: e.target.value})}
                              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                              required
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Total Cost</label>
                              <input 
                                  type="number"
                                  value={editingPackage.totalCost}
                                  onChange={e => setEditingPackage({...editingPackage, totalCost: Number(e.target.value)})}
                                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Services</label>
                              <input 
                                  type="number"
                                  value={editingPackage.totalServices}
                                  onChange={e => setEditingPackage({...editingPackage, totalServices: Number(e.target.value)})}
                                  className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Start Date</label>
                          <input 
                              type="date"
                              value={editingPackage.startDate}
                              onChange={e => setEditingPackage({...editingPackage, startDate: e.target.value})}
                              className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                              required
                          />
                      </div>

                      <div className="pt-4 flex gap-4">
                          <button 
                            type="button" 
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 py-3.5 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-300 transition-all flex items-center justify-center"
                          >
                              {loading ? 'Saving...' : 'Save Changes'}
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