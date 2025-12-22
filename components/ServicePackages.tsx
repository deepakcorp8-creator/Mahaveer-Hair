
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { 
  PackageCheck, Plus, Search, User as UserIcon, Clock, Pencil, X, 
  ShieldAlert, Sparkles, CheckCircle2, IndianRupee, 
  CalendarRange, Trash2, Check, RefreshCw, Target, Layers,
  Calendar, ChevronDown
} from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ServicePackages: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  const [newPkg, setNewPkg] = useState<Partial<ServicePackage>>({
    clientName: '', contact: '', packageName: '', totalCost: 0, totalServices: 12,
    startDate: new Date().toISOString().split('T')[0], status: 'PENDING', packageType: 'NEW', oldServiceNumber: 0
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('mahaveer_user');
    if (savedUser) { try { setCurrentUser(JSON.parse(savedUser)); } catch (e) {} }
    loadData();
  }, []);

  const loadData = async (force = false) => {
    try {
        setLoading(true);
        const [options, pkgData, entriesData] = await Promise.all([
            api.getOptions(force),
            api.getPackages(force),
            api.getEntries(force)
        ]);
        setClients(options.clients || []);
        setPackages(pkgData);
        setEntries(entriesData);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
            alert("✅ Membership Request Submitted.");
            setNewPkg({
                clientName: '', contact: '', packageName: '', totalCost: 0, totalServices: 12,
                startDate: new Date().toISOString().split('T')[0], status: 'PENDING', packageType: 'NEW', oldServiceNumber: 0
            });
            await loadData(true);
        }
    } catch (e) { alert("Error saving. Please check connection."); } finally { setLoading(false); }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPackage || loading) return; 
      setLoading(true);
      try {
          await api.editPackage(editingPackage);
          await loadData(true);
          setIsEditModalOpen(false);
          setEditingPackage(null);
      } catch (e) { alert("Update failed."); } finally { setLoading(false); }
  };
  
  const handlePackageAction = async (e: React.MouseEvent, id: string, action: 'APPROVE' | 'DELETE') => {
      e.stopPropagation(); e.preventDefault(); 
      if (processingId || loading) return;

      const isDelete = action === 'DELETE';
      const promptMsg = isDelete ? "Permanently delete this membership record from Google Sheets?" : "Activate this membership plan?";
      
      if(window.confirm(promptMsg)) {
          setProcessingId(id);
          try {
              if (isDelete) {
                  await api.deletePackage(id);
              } else {
                  await api.updatePackageStatus(id, 'APPROVED');
              }
              // Force refresh data from server after action is confirmed
              await loadData(true);
          } catch (err) { 
              console.error(err);
              alert("Action failed. Please check your network or backend script."); 
          } finally { 
              setProcessingId(null); 
          }
      }
  }

  const getPackageUsage = (pkg: ServicePackage) => {
      const pkgName = (pkg.clientName || '').trim().toLowerCase();
      const pkgStart = new Date(pkg.startDate);
      pkgStart.setHours(0,0,0,0);
      const dbUsedCount = entries.filter(e => {
          const entryName = (e.clientName || '').trim().toLowerCase();
          const entryDate = new Date(e.date); entryDate.setHours(0,0,0,0);
          return (entryName === pkgName && entryDate >= pkgStart && e.serviceType === 'SERVICE' && e.workStatus === 'DONE');
      }).length;
      const totalUsed = (Number(pkg.oldServiceNumber) || 0) + dbUsedCount;
      const remaining = Math.max(0, Number(pkg.totalServices) - totalUsed);
      const isExpired = totalUsed >= Number(pkg.totalServices);
      const startAtDisplay = pkg.packageType === 'OLD' ? (pkg.oldServiceNumber || 0) : 1;
      return { totalUsed, remaining, isExpired, startAtDisplay };
  };

  const filteredPackages = packages.filter(p => 
    (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.packageName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingPackages = filteredPackages.filter(p => !p.status || p.status === 'PENDING');
  const activePackages = filteredPackages.filter(p => p.status === 'APPROVED' || p.status === 'ACTIVE');

  const renderCard = (pkg: ServicePackage) => {
    const stats = getPackageUsage(pkg);
    const isPending = !pkg.status || pkg.status === 'PENDING';
    const isProcessing = processingId === pkg.id;
    
    return (
        <div key={pkg.id} className={`
            relative bg-white rounded-3xl border-2 transition-all duration-300 group
            ${isPending ? 'border-amber-200 bg-amber-50/10 shadow-sm' : 'border-slate-100 hover:border-indigo-300 hover:shadow-xl'}
            ${isProcessing ? 'opacity-60 scale-[0.98]' : ''}
        `}>
            <div className="p-5 h-full flex flex-col relative z-10">
                <div className="flex items-center gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm
                        ${isPending ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'}
                    `}>
                        {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : (isPending ? <Clock className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-900 text-[14px] leading-tight truncate uppercase">{pkg.clientName}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border tracking-wider
                                ${isPending ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}
                            `}>{pkg.packageName}</span>
                            <span className="text-[7px] font-black uppercase bg-slate-900 text-white px-1.5 py-0.5 rounded flex items-center gap-1">
                                {pkg.packageType === 'OLD' ? <Layers className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                                {pkg.packageType}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    {isPending ? (
                        <div className="bg-white rounded-2xl p-4 border border-amber-100 mb-2 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Max Limit</p>
                                    <p className="text-sm font-black text-slate-700">{pkg.totalServices} Visits</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Starts At</p>
                                    <p className="text-sm font-black text-indigo-600">#{stats.startAtDisplay}</p>
                                </div>
                            </div>
                            
                            {currentUser?.role === Role.ADMIN ? (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => handlePackageAction(e, pkg.id, 'APPROVE')} 
                                        disabled={!!processingId}
                                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all shadow-md active:scale-95 uppercase tracking-wide disabled:bg-slate-300"
                                    >
                                        {isProcessing ? 'PROCESSING...' : 'APPROVE'}
                                    </button>
                                    <button 
                                        onClick={(e) => handlePackageAction(e, pkg.id, 'DELETE')} 
                                        disabled={!!processingId}
                                        className="w-11 flex items-center justify-center rounded-xl bg-white border-2 border-red-50 text-red-500 hover:bg-red-50 active:scale-95 transition-colors disabled:text-slate-300"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-1 text-amber-600 text-[10px] font-black uppercase tracking-[0.2em]"><ShieldAlert className="w-3.5 h-3.5" /> Verifying...</div>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4 mt-1">
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Utilized Progress</span>
                                    <span className="text-[9px] font-black text-indigo-600">Starting Point: #{stats.startAtDisplay}</span>
                                </div>
                                <span className={`text-sm font-black ${stats.isExpired ? 'text-red-500' : 'text-slate-800'}`}>
                                    {stats.totalUsed} <span className="text-slate-300 font-bold text-xs">/ {pkg.totalServices}</span>
                                </span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ${stats.isExpired ? 'bg-red-500' : 'bg-indigo-600'}`} style={{width: `${Math.min((stats.totalUsed / pkg.totalServices) * 100, 100)}%`}}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-slate-50 flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1.5">
                        <IndianRupee className="w-3 h-3 text-slate-300" />
                        <span className="text-[11px] font-black text-slate-700">₹{pkg.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400">{pkg.startDate}</span>
                        <CalendarRange className="w-3 h-3 text-slate-300" />
                    </div>
                </div>

                {currentUser?.role === Role.ADMIN && !isPending && (
                <button onClick={(e) => { e.stopPropagation(); setEditingPackage(pkg); setIsEditModalOpen(true); }} className="absolute top-4 right-4 text-slate-200 hover:text-indigo-600 p-1 transition-all opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                </button>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700 pb-20">
      
      {/* SIDEBAR: CREATION FORM (PROFESSIONAL THEME) */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 sticky top-10 overflow-hidden">
            {/* Form Header */}
            <div className="px-7 py-7 bg-[#131C2E] text-white flex items-center gap-4">
                <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg">
                    <PackageCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-xl tracking-tight uppercase">NEW PLAN</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">ASSIGN CLIENT <span className="text-red-500">*</span></label>
                    <SearchableSelect 
                        options={clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact }))} 
                        value={newPkg.clientName || ''} 
                        onChange={handleClientChange} 
                        placeholder="Search Name..." 
                        required 
                    />
                </div>
                
                <div className="space-y-2.5">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">PLAN SOURCE</label>
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                        {['NEW', 'OLD'].map(type => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => setNewPkg(prev => ({ ...prev, packageType: type as any }))}
                                className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all
                                ${newPkg.packageType === type 
                                    ? 'bg-white text-[#131C2E] shadow-sm border border-slate-200' 
                                    : 'text-slate-400 hover:text-slate-600'}
                                `}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {newPkg.packageType === 'OLD' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-2 ml-1">STARTING SERVICE #</label>
                        <input 
                            type="number" 
                            className="w-full rounded-2xl border-2 border-indigo-100 bg-white px-5 py-4 text-xl font-black text-indigo-900 outline-none focus:border-indigo-500 shadow-inner"
                            placeholder="e.g. 5"
                            value={newPkg.oldServiceNumber || ''}
                            onChange={e => setNewPkg({...newPkg, oldServiceNumber: Number(e.target.value)})}
                        />
                        <p className="text-[10px] text-indigo-400 font-bold mt-2 ml-1 italic">* Enter the count of services already used.</p>
                    </div>
                )}

                <div className="space-y-5">
                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">PLAN NAME</label>
                        <input 
                            type="text" 
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all shadow-sm" 
                            placeholder="e.g. 1 Year" 
                            value={newPkg.packageName} 
                            onChange={e => setNewPkg({...newPkg, packageName: e.target.value})} 
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">COST (₹)</label>
                            <input 
                                type="number" 
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-800 focus:bg-white outline-none focus:border-indigo-500" 
                                value={newPkg.totalCost || ''} 
                                onChange={e => setNewPkg({...newPkg, totalCost: Number(e.target.value)})} 
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">MAX VISITS</label>
                            <input 
                                type="number" 
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-800 focus:bg-white outline-none focus:border-indigo-500" 
                                value={newPkg.totalServices || ''} 
                                onChange={e => setNewPkg({...newPkg, totalServices: Number(e.target.value)})} 
                                required 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">START DATE</label>
                        <div className="relative">
                            <input 
                                type="date" 
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 focus:bg-white outline-none focus:border-indigo-500 transition-all" 
                                value={newPkg.startDate} 
                                onChange={e => setNewPkg({...newPkg, startDate: e.target.value})} 
                                required 
                            />
                            <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full py-5 bg-[#131C2E] hover:bg-[#1A263E] text-white font-black text-sm uppercase rounded-2xl shadow-xl transition-all active:scale-[0.98] border-b-4 border-slate-900 mt-4"
                >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : 'Register Plan'}
                </button>
            </form>
        </div>
      </div>

      {/* MAIN LISTING AREA (8 COLUMNS) */}
      <div className="lg:col-span-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Active Ledger</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-1.5">Real-time Service Entitlements</p>
            </div>
            <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input type="text" placeholder="Search client..." className="w-full pl-11 pr-5 py-3.5 rounded-2xl border-2 border-slate-100 bg-white text-sm font-bold focus:outline-none focus:border-indigo-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        
        {pendingPackages.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-4 ml-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.25em]">Pending Review ({pendingPackages.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {pendingPackages.map(pkg => renderCard(pkg))}
                </div>
            </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-8">
            <div className="flex items-center gap-2 mb-4 ml-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.25em]">Verified Plans ({activePackages.length})</h3>
            </div>
            {activePackages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {activePackages.map(pkg => renderCard(pkg))}
                </div>
            ) : (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                    <p className="text-slate-300 font-black text-sm uppercase tracking-widest italic">No active records found in ledger.</p>
                </div>
            )}
        </div>
      </div>

      {/* MODAL: REGISTRY MODIFICATION */}
      {isEditModalOpen && editingPackage && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                  <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
                      <div>
                        <h3 className="font-black text-lg uppercase tracking-tight">Modify Registry</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest">{editingPackage.clientName}</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                  <form onSubmit={handleUpdatePackage} className="p-8 space-y-6">
                      <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 block">Plan Name</label><input type="text" value={editingPackage.packageName} onChange={e => setEditingPackage({...editingPackage, packageName: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none focus:border-indigo-500" required /></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 block">Revenue Val (₹)</label><input type="number" value={editingPackage.totalCost} onChange={e => setEditingPackage({...editingPackage, totalCost: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none" required /></div>
                          <div><label className="text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 block">Max Entitlement</label><input type="number" value={editingPackage.totalServices} onChange={e => setEditingPackage({...editingPackage, totalServices: Number(e.target.value)})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black outline-none" required /></div>
                      </div>
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-inner">
                        <label className="text-[10px] font-black uppercase text-indigo-600 mb-2 ml-1 block">Previous Service Count (Used)</label>
                        <input type="number" value={editingPackage.oldServiceNumber || 0} onChange={e => setEditingPackage({...editingPackage, oldServiceNumber: Number(e.target.value)})} className="w-full rounded-xl border-2 border-indigo-200 bg-white px-4 py-3 text-xl font-black text-indigo-900 outline-none" />
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black rounded-xl uppercase text-[10px] tracking-widest border border-slate-100 hover:bg-slate-50 transition-colors">Dismiss</button>
                          <button type="submit" disabled={loading} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-xl shadow-xl shadow-indigo-100 uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all active:translate-y-1">Commit Updates</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ServicePackages;
