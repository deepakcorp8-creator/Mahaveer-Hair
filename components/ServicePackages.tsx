
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { PackageCheck, Plus, Search, User as UserIcon, Clock, Pencil, X, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, CalendarRange, IndianRupee, Layers } from 'lucide-react';
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
    totalServices: 12,
    startDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    packageType: 'NEW',
    oldServiceNumber: 0
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
    if (loading) return; 

    setLoading(true);
    try {
        if(newPkg.clientName && newPkg.packageName && newPkg.totalServices) {
            await api.addPackage({
                ...newPkg as ServicePackage,
                status: 'PENDING',
                oldServiceNumber: newPkg.packageType === 'OLD' ? (newPkg.oldServiceNumber || 0) : 0
            });
            await loadData(); 
            setNewPkg({
                clientName: '',
                contact: '',
                packageName: '',
                totalCost: 0,
                totalServices: 12,
                startDate: new Date().toISOString().split('T')[0],
                status: 'PENDING',
                packageType: 'NEW',
                oldServiceNumber: 0
            });
        }
    } catch (e) {
        console.error(e);
        alert("Error creating package.");
    } finally {
        setLoading(false);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPackage || loading) return; 
      
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
      e.preventDefault(); 
      if (loading) return;
      
      const isDelete = action === 'REJECT';
      if(window.confirm(isDelete ? "REJECT and DELETE this package?" : "APPROVE this package?")) {
          setLoading(true);
          try {
              if (isDelete) await api.deletePackage(id);
              else await api.updatePackageStatus(id, 'APPROVED');
              setTimeout(async () => {
                  await loadData();
                  setLoading(false);
              }, 1200); 
          } catch (e) {
              setLoading(false);
          }
      }
  }

  const getPackageUsage = (pkg: ServicePackage) => {
      const pkgName = (pkg.clientName || '').trim().toLowerCase();
      const pkgStart = new Date(pkg.startDate);
      pkgStart.setHours(0,0,0,0);

      // Total Used = Old Starting Count + Database 'DONE' records since pkg start date
      const dbUsedCount = entries.filter(e => {
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
      
      const totalUsed = (pkg.oldServiceNumber || 0) + dbUsedCount;
      const remaining = Math.max(0, pkg.totalServices - totalUsed);
      const isExpired = totalUsed >= pkg.totalServices;
      return { totalUsed, remaining, isExpired };
  };

  const filteredPackages = packages.filter(p => 
    (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.packageName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPackages = filteredPackages.filter(p => p.status === 'PENDING' || !p.status);
  const activePackages = filteredPackages.filter(p => p.status !== 'PENDING' && !!p.status);

  const renderCard = (pkg: ServicePackage) => {
    const stats = getPackageUsage(pkg);
    const isPending = pkg.status === 'PENDING' || !pkg.status;
    
    return (
        <div key={pkg.id} className={`
            relative overflow-hidden rounded-[1.5rem] border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group bg-white
            ${isPending 
                ? 'border-amber-200' 
                : 'border-slate-100 hover:border-indigo-200'}
        `}>
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-20 pointer-events-none transition-colors
                ${isPending ? 'bg-amber-400' : 'bg-indigo-400'}
            `}></div>

            <div className="p-6 h-full flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-4 w-full">
                        <div className={`
                            w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform
                            ${isPending 
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200' 
                                : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200'}
                        `}>
                            {isPending ? <Clock className="w-6 h-6" /> : <PackageCheck className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-black text-slate-800 text-lg leading-tight tracking-tight mb-1 truncate">
                                {pkg.clientName}
                            </h3>
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm
                                ${isPending 
                                    ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-100'}
                            `}>
                                {pkg.packageName}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    {isPending ? (
                        <div className="bg-white/80 rounded-xl p-3 border border-amber-100 text-center mb-4">
                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider mb-2 flex items-center justify-center">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Awaiting Approval
                            </p>
                            {currentUser?.role === Role.ADMIN ? (
                                <div className="flex gap-2">
                                    <button onClick={(e) => handlePackageApproval(e, pkg.id, 'APPROVE')} className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">Approve</button>
                                    <button onClick={(e) => handlePackageApproval(e, pkg.id, 'REJECT')} className="flex-1 py-2 rounded-lg bg-white border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors">Reject</button>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Pending admin review</p>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    {pkg.packageType === 'OLD' && <Layers className="w-2.5 h-2.5" />} Service Usage
                                </span>
                                <span className={`text-sm font-black ${stats.isExpired ? 'text-red-500' : 'text-slate-700'}`}>
                                    {stats.totalUsed} <span className="text-slate-400 text-xs font-bold">/ {pkg.totalServices}</span>
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-sm ${stats.isExpired ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{width: `${Math.min((stats.totalUsed / pkg.totalServices) * 100, 100)}%`}}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-1">
                    <div className="flex items-center gap-1.5 text-slate-600">
                        <div className="bg-slate-100 p-1 rounded-md text-slate-500"><IndianRupee className="w-3 h-3" /></div>
                        <div>
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider leading-none mb-0.5">Cost</span>
                            <span className="text-xs font-black text-slate-800 leading-none">₹{pkg.totalCost}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                        <div className="text-right">
                            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider leading-none mb-0.5">Started</span>
                            <span className="text-xs font-bold text-slate-600 leading-none">{pkg.startDate}</span>
                        </div>
                        <div className="bg-slate-100 p-1 rounded-md text-slate-500"><CalendarRange className="w-3 h-3" /></div>
                    </div>
                </div>

                {currentUser?.role === Role.ADMIN && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setEditingPackage(pkg); setIsEditModalOpen(true); }}
                    className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 transition-colors p-1.5 hover:bg-slate-50 rounded-full"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 sticky top-6 overflow-hidden backdrop-blur-md">
            <div className="px-8 py-8 bg-gradient-to-br from-slate-900 to-indigo-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                <div className="relative z-10 flex items-center text-white">
                    <div className="p-3 bg-white/10 rounded-2xl mr-4 border border-white/10 backdrop-blur-sm shadow-inner"><PackageCheck className="w-6 h-6 text-indigo-200" /></div>
                    <div><h3 className="font-black text-2xl tracking-tight">New Package</h3><p className="text-indigo-200 text-sm font-medium opacity-80">Create service plan</p></div>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="relative z-20"> 
                     <SearchableSelect label="Select Client" options={clients ? clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact })) : []} value={newPkg.clientName || ''} onChange={handleClientChange} placeholder="Search Client..." required />
                </div>
                
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Package Type</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                        {['NEW', 'OLD'].map(type => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setNewPkg(prev => ({ ...prev, packageType: type as any }))}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border
                                ${newPkg.packageType === type 
                                    ? 'bg-white text-indigo-700 shadow-sm border-indigo-200' 
                                    : 'text-slate-400 hover:text-slate-600 border-transparent'}
                                `}
                            >
                                {type} PACKAGE
                            </button>
                        ))}
                    </div>
                </div>

                {newPkg.packageType === 'OLD' && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Old Services Completed</label>
                        <input 
                            type="number" 
                            className="w-full rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 px-4 py-4 text-indigo-800 shadow-sm font-black focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                            placeholder="Enter previous count (e.g. 5)"
                            value={newPkg.oldServiceNumber || ''}
                            onChange={e => setNewPkg({...newPkg, oldServiceNumber: Number(e.target.value)})}
                        />
                        <p className="text-[10px] text-indigo-400 font-bold mt-2 ml-1 italic">* Progress will start from this number</p>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Package Name</label>
                    <input type="text" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold focus:bg-white transition-colors" placeholder="e.g. Yearly Gold Plan" value={newPkg.packageName} onChange={e => setNewPkg({...newPkg, packageName: e.target.value})} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Total Cost (₹)</label>
                        <input type="number" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" placeholder="5999" value={newPkg.totalCost || ''} onChange={e => setNewPkg({...newPkg, totalCost: Number(e.target.value)})} required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Total Services</label>
                        <input type="number" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" placeholder="12" value={newPkg.totalServices || ''} onChange={e => setNewPkg({...newPkg, totalServices: Number(e.target.value)})} required />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Start Date</label>
                    <input type="date" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" value={newPkg.startDate} onChange={e => setNewPkg({...newPkg, startDate: e.target.value})} required />
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-400/40 transition-all transform hover:-translate-y-1 hover:shadow-2xl flex justify-center items-center active:scale-95 border border-slate-700">{loading ? 'Processing...' : <><Plus className="w-5 h-5 mr-2" /> Create Package</>}</button>
            </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><h2 className="text-3xl font-black text-slate-800 tracking-tight">Packages</h2><p className="text-slate-500 font-medium">Manage memberships & progress</p></div>
            <div className="relative group w-full md:w-auto"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /><input type="text" placeholder="Search package..." className="w-full md:w-72 pl-10 pr-6 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-700" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        </div>
        
        {pendingPackages.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-4"><div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><ShieldAlert className="w-4 h-4" /></div><h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Pending Approvals ({pendingPackages.length})</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{pendingPackages.map(pkg => renderCard(pkg))}</div>
            </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-4"><div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><CheckCircle2 className="w-4 h-4" /></div><h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Active Memberships ({activePackages.length})</h3></div>
            {activePackages.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-5">{activePackages.map(pkg => renderCard(pkg))}</div>) : (<div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200"><PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-400 font-bold text-sm">No active packages found.</p></div>)}
        </div>
      </div>

      {isEditModalOpen && editingPackage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                  <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white"><h3 className="font-black text-lg flex items-center tracking-tight"><Pencil className="w-5 h-5 mr-3 text-indigo-400" /> Edit Package</h3><button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button></div>
                  <form onSubmit={handleUpdatePackage} className="p-8 space-y-6">
                      <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Package Name</label><input type="text" value={editingPackage.packageName} onChange={e => setEditingPackage({...editingPackage, packageName: e.target.value})} className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                      <div className="grid grid-cols-2 gap-6">
                          <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cost</label><input type="number" value={editingPackage.totalCost} onChange={e => setEditingPackage({...editingPackage, totalCost: Number(e.target.value)})} className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                          <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Services</label><input type="number" value={editingPackage.totalServices} onChange={e => setEditingPackage({...editingPackage, totalServices: Number(e.target.value)})} className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div><label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Old Usage Count</label><input type="number" value={editingPackage.oldServiceNumber || 0} onChange={e => setEditingPackage({...editingPackage, oldServiceNumber: Number(e.target.value)})} className="w-full rounded-xl border-indigo-100 border bg-indigo-50 px-4 py-3 font-black text-indigo-800 outline-none" /></div>
                          <div><label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label><input type="date" value={editingPackage.startDate} onChange={e => setEditingPackage({...editingPackage, startDate: e.target.value})} className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" required /></div>
                      </div>
                      <div className="pt-4 flex gap-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button><button type="submit" disabled={loading} className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-300 transition-all flex items-center justify-center border border-indigo-700">{loading ? 'Saving...' : 'Save Changes'}</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ServicePackages;
