
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { 
  PackageCheck, Plus, Search, User as UserIcon, Clock, Pencil, X, 
  ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, CalendarRange, 
  IndianRupee, Layers, Info, Trash2, Check, ArrowRightCircle, Target,
  RefreshCw
} from 'lucide-react';
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
    try {
        setLoading(true);
        const [options, pkgData, entriesData] = await Promise.all([
            api.getOptions(true),
            api.getPackages(true),
            api.getEntries(true)
        ]);
        setClients(options.clients || []);
        setPackages(pkgData);
        setEntries(entriesData);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
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
            const oldNum = newPkg.packageType === 'OLD' ? Number(newPkg.oldServiceNumber || 0) : 0;
            await api.addPackage({
                ...newPkg as ServicePackage,
                status: 'PENDING',
                oldServiceNumber: oldNum,
                packageType: newPkg.packageType || 'NEW'
            });
            
            alert("✅ Package request sent to admin.");
            
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
            
            await loadData();
        }
    } catch (e) {
        console.error(e);
        alert("Sync error. Please try again.");
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
          alert("Update failed.");
      } finally {
          setLoading(false);
      }
  };
  
  const handlePackageApproval = async (e: React.MouseEvent, id: string, action: 'APPROVE' | 'REJECT') => {
      e.stopPropagation();
      e.preventDefault(); 
      if (loading) return;
      
      const isDelete = action === 'REJECT';
      const msg = isDelete ? "DELETE this request permanently?" : "ACTIVATE this membership plan?";
      
      if(window.confirm(msg)) {
          setLoading(true);
          try {
              if (isDelete) {
                  await api.deletePackage(id);
              } else {
                  await api.updatePackageStatus(id, 'APPROVED');
              }
              
              // Force clear and reload
              setTimeout(async () => {
                  await loadData();
              }, 1200);
          } catch (e) {
              alert("Server connection error.");
              setLoading(false);
          }
      }
  }

  const getPackageUsage = (pkg: ServicePackage) => {
      const pkgName = (pkg.clientName || '').trim().toLowerCase();
      const pkgStart = new Date(pkg.startDate);
      pkgStart.setHours(0,0,0,0);

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
      
      const totalUsed = (Number(pkg.oldServiceNumber) || 0) + dbUsedCount;
      const remaining = Math.max(0, Number(pkg.totalServices) - totalUsed);
      const isExpired = totalUsed >= Number(pkg.totalServices);
      
      // LOGIC: OLD shows the entered number, NEW shows #1
      const startDisplay = pkg.packageType === 'OLD' ? pkg.oldServiceNumber : 1;
      
      return { totalUsed, remaining, isExpired, startDisplay };
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
    const isOldType = pkg.packageType === 'OLD';
    
    return (
        <div key={pkg.id} className={`
            relative overflow-hidden rounded-[1.5rem] border-2 transition-all duration-300 group bg-white
            ${isPending 
                ? 'border-amber-200' 
                : 'border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-lg'}
        `}>
            <div className="p-4 h-full flex flex-col relative z-10">
                {/* Compact Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className={`
                        w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md transform group-hover:scale-105 transition-transform
                        ${isPending 
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}
                    `}>
                        {isPending ? <Clock className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-800 text-sm leading-tight truncate">
                            {pkg.clientName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border
                                ${isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}
                            `}>
                                {pkg.packageName}
                            </span>
                            {isOldType && <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">OLD</span>}
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    {isPending ? (
                        <div className="bg-slate-50 rounded-xl p-3 border border-amber-100 mb-3 space-y-3">
                            <div className="flex items-center justify-between text-center">
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Max Limit</p>
                                    <p className="text-xs font-black text-slate-700">{pkg.totalServices} Visits</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Start At</p>
                                    <p className="text-xs font-black text-indigo-600">#{stats.startDisplay}</p>
                                </div>
                            </div>
                            
                            {currentUser?.role === Role.ADMIN ? (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => handlePackageApproval(e, pkg.id, 'APPROVE')} 
                                        className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all shadow-sm active:scale-95"
                                    >
                                        APPROVE
                                    </button>
                                    <button 
                                        onClick={(e) => handlePackageApproval(e, pkg.id, 'REJECT')} 
                                        className="w-10 flex items-center justify-center rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 active:scale-95"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <p className="text-[8px] font-black text-slate-400 text-center uppercase tracking-widest py-1">Awaiting Admin...</p>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Usage</span>
                                <span className={`text-xs font-black ${stats.isExpired ? 'text-red-500' : 'text-slate-800'}`}>
                                    {stats.totalUsed} <span className="text-slate-300 font-bold text-[10px]">/ {pkg.totalServices}</span>
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${stats.isExpired ? 'bg-red-500' : 'bg-indigo-600'}`} 
                                    style={{width: `${Math.min((stats.totalUsed / pkg.totalServices) * 100, 100)}%`}}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Metadata (Compact) */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-700">₹{pkg.totalCost}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[10px] font-bold text-slate-500">{pkg.startDate}</span>
                        <CalendarRange className="w-3 h-3 text-slate-400" />
                    </div>
                </div>

                {currentUser?.role === Role.ADMIN && !isPending && (
                <button 
                    onClick={(e) => { e.stopPropagation(); setEditingPackage(pkg); setIsEditModalOpen(true); }}
                    className="absolute top-3 right-3 text-slate-200 hover:text-indigo-600 p-1 transition-colors"
                >
                    <Pencil className="w-3 h-3" />
                </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500 pb-24">
      
      {/* Sidebar: Entry Form (Compact) */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-[2rem] shadow-xl border-2 border-slate-200 sticky top-10 overflow-hidden">
            <div className="px-6 py-6 bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg"><PackageCheck className="w-5 h-5 text-white" /></div>
                    <h3 className="font-black text-lg tracking-tight uppercase">New Plan</h3>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div> 
                     <SearchableSelect label="Assign Client" options={clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact }))} value={newPkg.clientName || ''} onChange={handleClientChange} placeholder="Search Name..." required />
                </div>
                
                <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Plan Source</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        {['NEW', 'OLD'].map(type => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setNewPkg(prev => ({ ...prev, packageType: type as any }))}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all border
                                ${newPkg.packageType === type 
                                    ? 'bg-white text-indigo-700 shadow-sm border-indigo-200' 
                                    : 'text-slate-400 border-transparent'}
                                `}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {newPkg.packageType === 'OLD' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1 ml-1">Start Count</label>
                        <input 
                            type="number" 
                            className="w-full rounded-xl border-2 border-indigo-100 bg-white px-4 py-3 text-indigo-900 font-black focus:border-indigo-500 outline-none text-xl shadow-inner"
                            placeholder="0"
                            value={newPkg.oldServiceNumber || ''}
                            onChange={e => setNewPkg({...newPkg, oldServiceNumber: Number(e.target.value)})}
                        />
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Plan Name</label>
                        <input type="text" className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-slate-800 font-bold outline-none focus:border-indigo-500" placeholder="e.g. 1 Year" value={newPkg.packageName} onChange={e => setNewPkg({...newPkg, packageName: e.target.value})} required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Cost (₹)</label>
                            <input type="number" className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-slate-800 font-bold outline-none" value={newPkg.totalCost || ''} onChange={e => setNewPkg({...newPkg, totalCost: Number(e.target.value)})} required />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Total visits</label>
                            <input type="number" className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-slate-800 font-bold outline-none" value={newPkg.totalServices || ''} onChange={e => setNewPkg({...newPkg, totalServices: Number(e.target.value)})} required />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Start Date</label>
                        <input type="date" className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-slate-800 font-bold outline-none" value={newPkg.startDate} onChange={e => setNewPkg({...newPkg, startDate: e.target.value})} required />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-lg transition-all active:scale-95 border-b-4 border-slate-950"
                >
                    {loading ? 'Processing...' : 'Submit Plan'}
                </button>
            </form>
        </div>
      </div>

      {/* Main List: Higher Density Cards */}
      <div className="lg:col-span-3 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Active Ledger</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Real-time service tracking</p>
            </div>
            <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                    type="text" 
                    placeholder="Search client..." 
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-100 bg-white focus:outline-none focus:border-indigo-500 font-bold text-xs" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
        </div>
        
        {pendingPackages.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-4 ml-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Pending Review ({pendingPackages.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingPackages.map(pkg => renderCard(pkg))}
                </div>
            </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-8">
            <div className="flex items-center gap-2 mb-4 ml-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Verified Plans ({activePackages.length})</h3>
            </div>
            {activePackages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activePackages.map(pkg => renderCard(pkg))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-300 font-black text-xs uppercase tracking-widest">No active plans found</p>
                </div>
            )}
        </div>
      </div>

      {/* Edit Modal (Polished) */}
      {isEditModalOpen && editingPackage && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
                      <h3 className="font-black text-lg uppercase tracking-tight">Modify Plan</h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleUpdatePackage} className="p-8 space-y-6">
                      <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Plan Name</label><input type="text" value={editingPackage.packageName} onChange={e => setEditingPackage({...editingPackage, packageName: e.target.value})} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold" required /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Price (₹)</label><input type="number" value={editingPackage.totalCost} onChange={e => setEditingPackage({...editingPackage, totalCost: Number(e.target.value)})} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold" required /></div>
                          <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Max Capacity</label><input type="number" value={editingPackage.totalServices} onChange={e => setEditingPackage({...editingPackage, totalServices: Number(e.target.value)})} className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 font-bold" required /></div>
                      </div>
                      <div><label className="block text-[10px] font-black uppercase text-indigo-500 mb-1 ml-1">Historical Count</label><input type="number" value={editingPackage.oldServiceNumber || 0} onChange={e => setEditingPackage({...editingPackage, oldServiceNumber: Number(e.target.value)})} className="w-full rounded-xl border-2 border-indigo-100 bg-indigo-50/30 px-4 py-3 font-black text-indigo-800" /></div>
                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 font-black rounded-xl uppercase text-[10px]">Cancel</button>
                          <button type="submit" disabled={loading} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg uppercase text-xs">Apply Updates</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ServicePackages;
