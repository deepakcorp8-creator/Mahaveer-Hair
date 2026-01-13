
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { PackageCheck, Plus, Search, User as UserIcon, Clock, Pencil, X, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, CalendarRange, IndianRupee, Layers, Rewind, Loader2, Zap, ArrowRight, BatteryWarning } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ServicePackages: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // NEW: View Filter State
  const [viewFilter, setViewFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'EXPIRING'>('ALL');

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
    oldServiceCount: 0
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
        if(newPkg.clientName && newPkg.packageName) {
            const payload = {
                ...newPkg,
                contact: newPkg.contact || '',
                totalCost: Number(newPkg.totalCost || 0),
                totalServices: Number(newPkg.totalServices || 0),
                oldServiceCount: Number(newPkg.oldServiceCount || 0),
                status: 'PENDING'
            } as ServicePackage;

            await api.addPackage(payload);
            
            setNewPkg({
                clientName: '',
                contact: '',
                packageName: '',
                totalCost: 0,
                totalServices: 12,
                startDate: new Date().toISOString().split('T')[0],
                status: 'PENDING',
                packageType: 'NEW',
                oldServiceCount: 0
            });
            await loadData(); 
            alert("✅ Package created successfully!");
        } else {
            alert("⚠️ Please fill in Client Name and Package Name");
        }
    } catch (e: any) {
        console.error(e);
        const errString = e.message || e.toString();
        if (errString.includes("Unknown action") || errString.includes("Action processed")) {
             alert(`❌ CRITICAL ERROR: Backend Script Not Updated.\n\nPlease go to Google Apps Script -> Deploy -> New Deployment. (Do NOT just click save)\n\nError Details: ${errString}`);
        } else {
             alert(`❌ Error creating package: ${errString}`);
        }
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
      if(isDelete && !window.confirm("REJECT and DELETE this package?")) return;

      setLoading(true);
      try {
          if (isDelete) await api.deletePackage(id);
          else await api.updatePackageStatus(id, 'APPROVED');
          
          setTimeout(async () => {
              await loadData();
              setLoading(false);
          }, 1000); 
      } catch (e) {
          setLoading(false);
          alert("Action failed.");
      }
  }

  const getPackageUsage = (pkg: ServicePackage) => {
      const pkgName = (pkg.clientName || '').trim().toLowerCase();
      const pkgStart = new Date(pkg.startDate);
      pkgStart.setHours(0,0,0,0);

      const dbUsed = entries.filter(e => {
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
      
      const startingCount = pkg.packageType === 'OLD' ? (pkg.oldServiceCount || 0) : 0;
      const totalUsed = dbUsed + startingCount;
      
      const remaining = Math.max(0, pkg.totalServices - totalUsed);
      const isExpired = totalUsed >= pkg.totalServices;
      return { used: totalUsed, remaining, isExpired, startingCount };
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      const total = packages.length;
      const pending = packages.filter(p => p.status === 'PENDING' || !p.status).length;
      const active = packages.filter(p => p.status === 'APPROVED').length;
      
      let expiring = 0;
      packages.forEach(p => {
          if(p.status === 'APPROVED') {
              const usage = getPackageUsage(p);
              if (usage.remaining <= 2) expiring++;
          }
      });

      return { total, pending, active, expiring };
  }, [packages, entries]); // Recalculate if packages or entries change

  // --- LIST FILTERING ---
  const filteredPackages = packages.filter(p => {
    // 1. Search Filter
    const matchesSearch = (p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.packageName || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. View Mode Filter
    if (viewFilter === 'ALL') return true;
    if (viewFilter === 'PENDING') return p.status === 'PENDING' || !p.status;
    if (viewFilter === 'ACTIVE') return p.status === 'APPROVED';
    if (viewFilter === 'EXPIRING') {
        const usage = getPackageUsage(p);
        return p.status === 'APPROVED' && usage.remaining <= 2;
    }
    return true;
  });

  const pendingPackages = filteredPackages.filter(p => p.status === 'PENDING' || !p.status);
  const activePackages = filteredPackages.filter(p => p.status !== 'PENDING' && !!p.status);

  // Bulk Approve Handler
  const handleBulkApprove = async () => {
      if (pendingPackages.length === 0) return;
      if (!window.confirm(`Approve all ${pendingPackages.length} pending packages?`)) return;

      setLoading(true);
      try {
          await Promise.all(pendingPackages.map(p => api.updatePackageStatus(p.id, 'APPROVED')));
          setTimeout(async () => {
              await loadData();
              setLoading(false);
              alert("All pending packages approved!");
          }, 1200);
      } catch (e) {
          console.error(e);
          setLoading(false);
          alert("Some approvals might have failed.");
      }
  };

  // Helper to render card
  const renderCard = (pkg: ServicePackage) => {
    const stats = getPackageUsage(pkg);
    const isPending = pkg.status === 'PENDING' || !pkg.status;
    const isOldPackage = pkg.packageType === 'OLD';
    const isExpiringSoon = !isPending && stats.remaining <= 2 && !stats.isExpired;
    
    return (
        <div key={pkg.id} className={`
            relative overflow-hidden rounded-[1.5rem] border transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group bg-white animate-in fade-in slide-in-from-bottom-4
            ${isPending 
                ? 'border-amber-200' 
                : isExpiringSoon 
                    ? 'border-rose-200 ring-1 ring-rose-100'
                    : 'border-slate-100 hover:border-indigo-200'}
        `}>
            
            {/* Ambient Background Gradient */}
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none transition-colors duration-500
                ${isPending ? 'bg-amber-400' : isExpiringSoon ? 'bg-rose-500' : 'bg-indigo-400'}
            `}></div>

            <div className="p-6 h-full flex flex-col justify-between relative z-10">
                
                {/* Header: Client Name Top, Package Badge Below */}
                <div className="flex justify-between items-start mb-5">
                    <div className="flex items-start gap-4 w-full">
                        {/* Icon Box */}
                        <div className={`
                            w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300
                            ${isPending 
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200' 
                                : isExpiringSoon
                                    ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-rose-200'
                                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200'}
                        `}>
                            {isPending ? <Clock className="w-6 h-6" /> : isExpiringSoon ? <BatteryWarning className="w-6 h-6 animate-pulse" /> : <PackageCheck className="w-6 h-6" />}
                        </div>
                        
                        {/* Text Content */}
                        <div className="min-w-0 flex-1">
                            <h3 className="font-black text-slate-800 text-lg leading-tight tracking-tight mb-1 truncate">
                                {pkg.clientName}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm
                                    ${isPending 
                                        ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'}
                                `}>
                                    {pkg.packageName}
                                </div>
                                {isOldPackage && (
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm bg-slate-100 text-slate-600 border-slate-200">
                                        OLD PKG
                                    </div>
                                )}
                                {isExpiringSoon && (
                                    <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm bg-rose-50 text-rose-600 border-rose-100 animate-pulse">
                                        LOW BALANCE
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1">
                    {/* INFO FOR ADMIN - Old Package Details */}
                    {isOldPackage && (
                        <div className="mb-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center">
                                <Rewind className="w-3 h-3 mr-1" /> Prev. Done
                            </span>
                            <span className="text-xs font-black text-slate-800">{pkg.oldServiceCount} Services</span>
                        </div>
                    )}

                    {isPending ? (
                        <div className="bg-white/80 rounded-xl p-3 border border-amber-100 text-center mb-4">
                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-wider mb-2 flex items-center justify-center">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Awaiting Approval
                            </p>
                            {currentUser?.role === Role.ADMIN ? (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => handlePackageApproval(e, pkg.id, 'APPROVE')}
                                        className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm"
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={(e) => handlePackageApproval(e, pkg.id, 'REJECT')}
                                        className="flex-1 py-2 rounded-lg bg-white border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Pending admin review</p>
                            )}
                        </div>
                    ) : (
                        <div className="mb-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Usage</span>
                                <span className={`text-sm font-black ${stats.isExpired ? 'text-red-500' : isExpiringSoon ? 'text-rose-600' : 'text-slate-700'}`}>
                                    {stats.used} <span className="text-slate-400 text-xs font-bold">/ {pkg.totalServices}</span>
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-sm
                                    ${stats.isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-gradient-to-r from-rose-400 to-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                                    style={{width: `${Math.min((stats.used / pkg.totalServices) * 100, 100)}%`}}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
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

                 {/* Edit Button (Absolute) */}
                {currentUser?.role === Role.ADMIN && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingPackage(pkg);
                        setIsEditModalOpen(true);
                    }}
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
      
      {/* Create Package Form - ADJUSTED SCROLLING */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto backdrop-blur-md">
            <div className="px-8 py-8 bg-gradient-to-br from-slate-900 to-indigo-900 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                <div className="relative z-10 flex items-center text-white">
                    <div className="p-3 bg-white/10 rounded-2xl mr-4 border border-white/10 backdrop-blur-sm shadow-inner">
                        <PackageCheck className="w-6 h-6 text-indigo-200" />
                    </div>
                    <div>
                         <h3 className="font-black text-2xl tracking-tight">New Package</h3>
                         <p className="text-indigo-200 text-sm font-medium opacity-80">Create service plan</p>
                    </div>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-sm text-indigo-700 font-bold animate-in fade-in slide-in-from-top-2 shadow-inner">
                        <span className="font-black uppercase text-[10px] tracking-widest text-indigo-400 block mb-1">Contact Details</span> 
                        {newPkg.contact}
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Package Name</label>
                    <input 
                        type="text" 
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold focus:bg-white transition-colors"
                        placeholder="e.g. Yearly Gold Plan"
                        value={newPkg.packageName}
                        onChange={e => setNewPkg({...newPkg, packageName: e.target.value})}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Total Cost (₹)</label>
                        <input 
                            type="number" 
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                            placeholder="5999"
                            value={newPkg.totalCost || ''}
                            onChange={e => setNewPkg({...newPkg, totalCost: Number(e.target.value)})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Services</label>
                        <input 
                            type="number" 
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                            placeholder="12"
                            value={newPkg.totalServices || ''}
                            onChange={e => setNewPkg({...newPkg, totalServices: Number(e.target.value)})}
                            required
                        />
                    </div>
                </div>

                {/* NEW FIELDS: Package Type & Old Count */}
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Package Type</label>
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setNewPkg({ ...newPkg, packageType: 'NEW', oldServiceCount: 0 })}
                            className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${newPkg.packageType === 'NEW' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            NEW PACKAGE
                        </button>
                        <button
                            type="button"
                            onClick={() => setNewPkg({ ...newPkg, packageType: 'OLD' })}
                            className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${newPkg.packageType === 'OLD' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            OLD PACKAGE
                        </button>
                    </div>
                </div>

                {newPkg.packageType === 'OLD' && (
                    <div className="animate-in fade-in slide-in-from-top-2 bg-amber-50 p-4 rounded-2xl border border-amber-200">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2 ml-1 flex items-center">
                            <Rewind className="w-3 h-3 mr-1" /> Completed Services
                        </label>
                        <input 
                            type="number" 
                            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="e.g. 5"
                            value={newPkg.oldServiceCount || ''}
                            onChange={e => setNewPkg({...newPkg, oldServiceCount: Number(e.target.value)})}
                        />
                        <p className="text-[10px] text-amber-600 mt-2 font-medium">
                            Enter number of services *already done* in this package. Next service will count from here.
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Start Date</label>
                    <input 
                        type="date" 
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 shadow-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                        value={newPkg.startDate}
                        onChange={e => setNewPkg({...newPkg, startDate: e.target.value})}
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 text-white font-black text-lg rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 hover:shadow-2xl flex justify-center items-center active:scale-95 border
                        ${loading ? 'bg-slate-400 border-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 border-slate-700 shadow-slate-400/40'}
                    `}
                >
                    {loading ? (
                        <span className="flex items-center"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</span>
                    ) : (
                        <span className="flex items-center"><Plus className="w-5 h-5 mr-2" /> Create Package</span>
                    )}
                </button>
            </form>
        </div>
      </div>

      {/* Main Content Area: Packages List */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* INTERACTIVE STATS DASHBOARD */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
                onClick={() => setViewFilter('ALL')}
                className={`relative p-5 rounded-[2rem] border text-left transition-all duration-300 group hover:-translate-y-1 overflow-hidden
                ${viewFilter === 'ALL' ? 'bg-white border-blue-200 ring-2 ring-blue-100 shadow-xl' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg'}`}
            >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-125 duration-500 ${viewFilter === 'ALL' ? 'scale-110' : ''}`}></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-xl ${viewFilter === 'ALL' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Layers className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
                </div>
            </button>

            <button 
                onClick={() => setViewFilter('PENDING')}
                className={`relative p-5 rounded-[2rem] border text-left transition-all duration-300 group hover:-translate-y-1 overflow-hidden
                ${viewFilter === 'PENDING' ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-orange-200 border-transparent' : 'bg-white border-slate-100 hover:border-amber-200 hover:shadow-lg'}`}
            >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-6 -mt-6 blur-md pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-xl backdrop-blur-sm ${viewFilter === 'PENDING' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${viewFilter === 'PENDING' ? 'text-white/80' : 'text-slate-400'}`}>Pending</span>
                    </div>
                    <h3 className={`text-3xl font-black ${viewFilter === 'PENDING' ? 'text-white' : 'text-slate-800'}`}>{stats.pending}</h3>
                </div>
            </button>

            <button 
                onClick={() => setViewFilter('ACTIVE')}
                className={`relative p-5 rounded-[2rem] border text-left transition-all duration-300 group hover:-translate-y-1 overflow-hidden
                ${viewFilter === 'ACTIVE' ? 'bg-white border-emerald-200 ring-2 ring-emerald-100 shadow-xl' : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-lg'}`}
            >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-125 duration-500 ${viewFilter === 'ACTIVE' ? 'scale-110' : ''}`}></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-xl ${viewFilter === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800">{stats.active}</h3>
                </div>
            </button>

            <button 
                onClick={() => setViewFilter('EXPIRING')}
                className={`relative p-5 rounded-[2rem] border text-left transition-all duration-300 group hover:-translate-y-1 overflow-hidden
                ${viewFilter === 'EXPIRING' ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-200 border-transparent' : 'bg-white border-slate-100 hover:border-rose-200 hover:shadow-lg'}`}
            >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-6 -mt-6 blur-md pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-xl backdrop-blur-sm ${viewFilter === 'EXPIRING' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
                            <BatteryWarning className={`w-4 h-4 ${stats.expiring > 0 ? 'animate-pulse' : ''}`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${viewFilter === 'EXPIRING' ? 'text-white/80' : 'text-slate-400'}`}>Expiring Soon</span>
                    </div>
                    <h3 className={`text-3xl font-black ${viewFilter === 'EXPIRING' ? 'text-white' : 'text-slate-800'}`}>{stats.expiring}</h3>
                </div>
            </button>
        </div>

        {/* HEADER & SEARCH */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Packages</h2>
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                    <span>Manage memberships</span>
                    {viewFilter !== 'ALL' && (
                        <>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-indigo-600 font-bold uppercase text-xs tracking-wider">{viewFilter} VIEW</span>
                        </>
                    )}
                </div>
            </div>
            <div className="relative group w-full md:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search package..." 
                    className="w-full md:w-72 pl-10 pr-6 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        
        {/* SECTION 1: PENDING APPROVALS (Only show if ALL or PENDING selected) */}
        {(viewFilter === 'ALL' || viewFilter === 'PENDING') && pendingPackages.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Pending Approvals ({pendingPackages.length})</h3>
                    </div>
                    {currentUser?.role === Role.ADMIN && (
                        <button 
                            onClick={handleBulkApprove}
                            disabled={loading}
                            className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors flex items-center shadow-sm border border-emerald-200"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve All
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {pendingPackages.map(pkg => renderCard(pkg))}
                </div>
            </div>
        )}

        {/* SECTION 2: ACTIVE PACKAGES (Show if ALL, ACTIVE, or EXPIRING) */}
        {(viewFilter === 'ALL' || viewFilter === 'ACTIVE' || viewFilter === 'EXPIRING') && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-2 mb-4">
                     <div className={`p-1.5 rounded-lg ${viewFilter === 'EXPIRING' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {viewFilter === 'EXPIRING' ? <BatteryWarning className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                        {viewFilter === 'EXPIRING' ? 'Expiring Soon' : 'Active Memberships'} ({activePackages.length})
                    </h3>
                </div>
                
                {activePackages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {activePackages.map(pkg => renderCard(pkg))}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 font-bold text-sm">No packages found for this filter.</p>
                    </div>
                )}
            </div>
        )}

      </div>

      {/* EDIT MODAL - Dark Themed Header */}
      {isEditModalOpen && editingPackage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                  <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
                      <h3 className="font-black text-lg flex items-center tracking-tight">
                          <Pencil className="w-5 h-5 mr-3 text-indigo-400" /> Edit Package
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <form onSubmit={handleUpdatePackage} className="p-8 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Package Name</label>
                          <input 
                              type="text"
                              value={editingPackage.packageName}
                              onChange={e => setEditingPackage({...editingPackage, packageName: e.target.value})}
                              className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                              required
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cost</label>
                              <input 
                                  type="number"
                                  value={editingPackage.totalCost}
                                  onChange={e => setEditingPackage({...editingPackage, totalCost: Number(e.target.value)})}
                                  className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Services</label>
                              <input 
                                  type="number"
                                  value={editingPackage.totalServices}
                                  onChange={e => setEditingPackage({...editingPackage, totalServices: Number(e.target.value)})}
                                  className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                              />
                          </div>
                      </div>
                      
                      {/* Edit Old Service Count if applicable */}
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                              <input 
                                  type="date"
                                  value={editingPackage.startDate}
                                  onChange={e => setEditingPackage({...editingPackage, startDate: e.target.value})}
                                  className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  required
                              />
                          </div>
                          {editingPackage.packageType === 'OLD' && (
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Old Count</label>
                                  <input 
                                      type="number"
                                      value={editingPackage.oldServiceCount}
                                      onChange={e => setEditingPackage({...editingPackage, oldServiceCount: Number(e.target.value)})}
                                      className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                              </div>
                          )}
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
                            className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-300 transition-all flex items-center justify-center border border-indigo-700"
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
