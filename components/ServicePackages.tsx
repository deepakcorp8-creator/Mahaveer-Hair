
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client, Entry, Role, User } from '../types';
import { PackageCheck, Plus, Search, User as UserIcon, Clock, Pencil, X, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, CalendarRange, IndianRupee, Layers, Rewind, Loader2, Zap, ArrowRight, BatteryWarning, RefreshCw, PlusCircle, History, Trash2 } from 'lucide-react';
import { SearchableSelect, Option } from './SearchableSelect';

const ServicePackages: React.FC = () => {
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // NEW: View Filter State
    const [viewFilter, setViewFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED'>('ALL');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

    // Redesign: create-form-as-modal + card history modal
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [historyPkg, setHistoryPkg] = useState<ServicePackage | null>(null);

    // --- NEW STATES FOR RENEWAL & ADDON ---
    const [isAddOnModalOpen, setIsAddOnModalOpen] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [selectedPkgForAction, setSelectedPkgForAction] = useState<ServicePackage | null>(null);

    const [addonForm, setAddonForm] = useState({ count: 0, cost: 0 });
    const [renewForm, setRenewForm] = useState<Partial<ServicePackage>>({
        startDate: new Date().toISOString().split('T')[0],
        totalCost: 0,
        totalServices: 12,
        packageName: ''
    });

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
            } catch (e) { }
        }
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [options, pkgData, entriesData] = await Promise.all([
                api.getOptions(),
                api.getPackages(), // Using cache for speed
                api.getEntries()
            ]);

            setClients(options.clients || []);
            setPackages(pkgData);
            setEntries(entriesData);
        } catch (e) {
            console.error("Load Failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleClientChange = (name: string, selectedOption?: Option) => {
        let client: Client | undefined;

        // 1. Precise lookup if option selected
        if (selectedOption && selectedOption.subtext) {
            client = clients.find(c => c.name === selectedOption.label && c.contact === selectedOption.subtext);
        }

        // 2. Fallback lookup by name
        if (!client) {
            client = clients.find(c => String(c.name || '').toLowerCase() === String(name || '').toLowerCase());
        }

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
            if (newPkg.clientName && newPkg.packageName) {
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
                setIsNewModalOpen(false);
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
        if (isDelete && !window.confirm("REJECT and DELETE this package?")) return;

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


    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to PERMANENTLY DELETE this package?")) return;

        setLoading(true);
        try {
            await api.deletePackage(id);
            await loadData();
            alert("Package deleted.");
        } catch (e) {
            console.error(e);
            alert("Failed to delete.");
        } finally {
            setLoading(false);
        }
    };

    // --- ADD-ON LOGIC ---
    const openAddOnModal = (pkg: ServicePackage) => {
        setSelectedPkgForAction(pkg);
        setAddonForm({ count: 0, cost: 0 });
        setIsAddOnModalOpen(true);
    };

    const handleAddOnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPkgForAction) return;

        setLoading(true);
        try {
            const updatedPkg = {
                ...selectedPkgForAction,
                totalServices: Number(selectedPkgForAction.totalServices) + Number(addonForm.count),
                totalCost: Number(selectedPkgForAction.totalCost) + Number(addonForm.cost)
            };

            await api.editPackage(updatedPkg);
            await loadData();
            setIsAddOnModalOpen(false);
            setSelectedPkgForAction(null);
            alert(`✅ Added ${addonForm.count} services to package!`);
        } catch (e) {
            console.error(e);
            alert("Failed to add-on services.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENEWAL LOGIC ---
    const openRenewModal = (pkg: ServicePackage) => {
        setSelectedPkgForAction(pkg);
        setRenewForm({
            packageName: pkg.packageName, // Default to same name
            totalCost: 0,
            totalServices: 12,
            startDate: new Date().toISOString().split('T')[0],
            packageType: 'NEW',
            oldServiceCount: 0
        });
        setIsRenewModalOpen(true);
    };

    const handleRenewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPkgForAction) return;

        setLoading(true);
        try {
            // 1. Mark old package as COMPLETED/EXPIRED
            await api.updatePackageStatus(selectedPkgForAction.id, 'COMPLETED');

            // 2. Create new package
            const payload = {
                ...renewForm,
                clientName: selectedPkgForAction.clientName,
                contact: selectedPkgForAction.contact,
                status: 'APPROVED', // Auto-approve renewals
                packageType: 'NEW'
            } as ServicePackage;

            await api.addPackage(payload);

            await loadData();
            setIsRenewModalOpen(false);
            setSelectedPkgForAction(null);
            alert("✅ Package Renewed Successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to renew package.");
        } finally {
            setLoading(false);
        }
    };

    const getPackageUsage = (pkg: ServicePackage) => {
        const pkgName = String(pkg.clientName || '').trim().toLowerCase();

        let pkgStart = new Date();
        if (pkg.startDate) {
            const parsedStart = new Date(pkg.startDate);
            if (!isNaN(parsedStart.getTime())) pkgStart = parsedStart;
        }
        pkgStart.setHours(0, 0, 0, 0);

        const dbUsed = (entries || []).filter(e => {
            const entryName = String(e.clientName || '').trim().toLowerCase();
            let entryDate = new Date();
            if (e.date) {
                const parsedDate = new Date(e.date);
                if (!isNaN(parsedDate.getTime())) entryDate = parsedDate;
            }
            entryDate.setHours(0, 0, 0, 0);

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
        const pkgList = packages || [];
        const total = pkgList.length;
        const pending = pkgList.filter(p => p.status === 'PENDING' || !p.status).length;
        
        let active = 0;
        let expiring = 0;
        let expired = 0;
        pkgList.forEach(p => {
            if (p.status === 'APPROVED') {
                const usage = getPackageUsage(p);
                if (usage.isExpired) {
                    expired++;
                } else {
                    active++;
                    if (usage.remaining <= 2) expiring++;
                }
            } else if (p.status === 'COMPLETED') {
                expired++;
            }
        });

        return { total, pending, active, expiring, expired };
    }, [packages, entries]);

    // --- LIST FILTERING ---
    const filteredPackages = (packages || []).filter(p => {
        // 1. Search Filter
        const matchesSearch = String(p.clientName || '').toLowerCase().includes(String(searchTerm || '').toLowerCase()) ||
            String(p.packageName || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
        if (!matchesSearch) return false;

        // 2. View Mode Filter
        if (viewFilter === 'ALL') return true;
        if (viewFilter === 'PENDING') return p.status === 'PENDING' || !p.status;
        if (viewFilter === 'ACTIVE') {
            const usage = getPackageUsage(p);
            return p.status === 'APPROVED' && !usage.isExpired;
        }
        if (viewFilter === 'EXPIRING') {
            const usage = getPackageUsage(p);
            return p.status === 'APPROVED' && usage.remaining <= 2 && !usage.isExpired;
        }
        if (viewFilter === 'EXPIRED') {
            const usage = getPackageUsage(p);
            return p.status === 'COMPLETED' || (p.status === 'APPROVED' && usage.isExpired);
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

    // --- 3D tilt (no state; direct DOM transform) ---
    const tilt = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(800px) rotateY(${px * 11}deg) rotateX(${-py * 11}deg) translateY(-5px)`;
        el.style.setProperty('--mx', (px + 0.5) * 100 + '%');
        el.style.setProperty('--my', (py + 0.5) * 100 + '%');
    };
    const untilt = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = ''; };
    const statTilt = (e: React.MouseEvent<HTMLButtonElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(700px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-4px)`;
    };
    const statUntilt = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = ''; };

    const fmtShort = (d?: string) => {
        if (!d) return '—';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return `${String(dt.getMonth() + 1).padStart(2, '0')} / ${String(dt.getFullYear()).slice(-2)}`;
    };
    const fmtLong = (d?: string) => {
        if (!d) return '—';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Helper to render a credit-card style membership
    const renderCard = (pkg: ServicePackage, idx: number = 0) => {
        const stats = getPackageUsage(pkg);
        const isPending = pkg.status === 'PENDING' || !pkg.status;
        const isOldPackage = pkg.packageType === 'OLD';
        const isExpired = !isPending && stats.isExpired;
        const isExpiringSoon = !isPending && stats.remaining <= 2 && !stats.isExpired;
        const variant = isPending ? 'pending' : isExpired ? 'expired' : isExpiringSoon ? 'low' : '';
        const total = Number(pkg.totalServices) || 0;
        const pctUsed = total > 0 ? Math.min((stats.used / total) * 100, 100) : 0;
        const trackCls = isExpired ? 'exp' : isExpiringSoon ? 'low' : '';

        return (
            <div key={pkg.id} className="sp-pkg" style={{ animationDelay: `${(idx % 12) * 55}ms` }}>
                <div className={`sp-card ${variant}`} onMouseMove={tilt} onMouseLeave={untilt} onClick={() => setHistoryPkg(pkg)}>
                    <div className="sp-glow"></div>

                    {currentUser?.role === Role.ADMIN && (
                        <div className="sp-tools">
                            <button title="Edit Package" onClick={(e) => { e.stopPropagation(); setEditingPackage(pkg); setIsEditModalOpen(true); }}><Pencil className="w-3.5 h-3.5" /></button>
                            <button title="Delete Package" onClick={(e) => handleDelete(e, pkg.id)}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    )}

                    <div className="sp-row">
                        <div className="sp-brand">MAHAVEER<small>HAIR · MEMBERSHIP</small></div>
                        <div className="sp-tier">
                            {isOldPackage && <span className="sp-oldtag">Old</span>}
                            {isPending ? <span className="sp-status pend"><b></b>Pending</span>
                                : isExpired ? <span className="sp-status exp"><b></b>Full</span>
                                    : isExpiringSoon ? <span className="sp-status low"><b></b>Low</span>
                                        : <span className="sp-name">{pkg.packageName}</span>}
                        </div>
                    </div>

                    <div className="sp-midrow">
                        <div className="sp-chip"></div>
                        <div className="sp-memno">MHS •••• {String(total).padStart(2, '0')}</div>
                    </div>

                    <div className="sp-usage">
                        <div className="sp-cap"><span>{isPending ? 'Awaiting approval' : (isOldPackage ? `Usage · ${pkg.oldServiceCount || 0} carried` : 'Service Usage')}</span><b>{isPending ? `— / ${total}` : `${stats.used} / ${total}`}</b></div>
                        <div className={`sp-track ${trackCls}`}><span style={{ width: `${isPending ? 0 : pctUsed}%` }}></span></div>
                    </div>

                    <div className="sp-foot">
                        <div className="sp-holder"><small>Card Holder</small>{pkg.clientName}</div>
                        <div className="sp-meta"><div className="k">{isPending ? 'Requested' : 'Since'}</div><div className="v">{fmtShort(pkg.startDate)}</div></div>
                    </div>
                    <div className="sp-hint">Tap for history</div>
                </div>

                {isPending ? (
                    currentUser?.role === Role.ADMIN ? (
                        <div className="sp-tray">
                            <button className="sp-btn approve" onClick={(e) => handlePackageApproval(e, pkg.id, 'APPROVE')}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                            <button className="sp-btn reject" onClick={(e) => handlePackageApproval(e, pkg.id, 'REJECT')}><X className="w-3.5 h-3.5" /> Reject</button>
                        </div>
                    ) : (
                        <div className="sp-pendnote"><AlertTriangle className="w-3.5 h-3.5" /> Pending admin review</div>
                    )
                ) : (
                    <div className="sp-tray">
                        <button className="sp-btn addon" onClick={() => openAddOnModal(pkg)}><PlusCircle className="w-3.5 h-3.5" /> Add-on</button>
                        <button className="sp-btn renew" onClick={() => openRenewModal(pkg)}><RefreshCw className="w-3.5 h-3.5" /> Renew</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 -mt-2">

            <style>{SP_STYLES}</style>

            {/* Create Package Form — MODAL */}
            {isNewModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden my-6 animate-in fade-in zoom-in-95">
                    <div className="px-7 py-6 bg-gradient-to-br from-slate-900 to-indigo-900 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                        <button onClick={() => setIsNewModalOpen(false)} className="absolute top-4 right-4 z-20 text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
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

                    <form onSubmit={handleSubmit} className="p-7 space-y-5 max-h-[70vh] overflow-y-auto">
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
                                onChange={e => setNewPkg({ ...newPkg, packageName: e.target.value })}
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
                                    onChange={e => setNewPkg({ ...newPkg, totalCost: Number(e.target.value) })}
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
                                    onChange={e => setNewPkg({ ...newPkg, totalServices: Number(e.target.value) })}
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
                                    onChange={e => setNewPkg({ ...newPkg, oldServiceCount: Number(e.target.value) })}
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
                                onChange={e => setNewPkg({ ...newPkg, startDate: e.target.value })}
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
            )}

            {/* Main Content Area */}
            <div className="space-y-8">

                {/* 3D STATS DASHBOARD (also acts as filters) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4" style={{ perspective: '1000px' }}>
                    {([
                        { key: 'ALL', label: 'Total', value: stats.total, c: '#8b5cf6' },
                        { key: 'PENDING', label: 'Pending', value: stats.pending, c: '#f59e0b' },
                        { key: 'ACTIVE', label: 'Active', value: stats.active, c: '#10b981' },
                        { key: 'EXPIRING', label: 'Expiring', value: stats.expiring, c: '#f43f5e' },
                        { key: 'EXPIRED', label: 'Expired', value: stats.expired, c: '#94a3b8' },
                    ] as const).map((s, i) => (
                        <button
                            key={s.key}
                            onClick={() => setViewFilter(s.key as any)}
                            onMouseMove={statTilt}
                            onMouseLeave={statUntilt}
                            className={`sp-stat ${viewFilter === s.key ? 'active' : ''}`}
                            style={{ ['--c' as any]: s.c, animationDelay: `${i * 60}ms` }}
                        >
                            <div className="sp-stat-top"><span className="sp-stat-chip"><i></i></span><span className="sp-stat-lbl">{s.label}</span></div>
                            <div className="sp-stat-num">{s.value}</div>
                        </button>
                    ))}
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
                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <div className="relative group flex-1 md:flex-none">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search package..."
                                className="w-full md:w-64 pl-10 pr-6 py-3.5 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all text-slate-700"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsNewModalOpen(true)}
                            className="flex items-center gap-2 px-4 md:px-5 py-3.5 rounded-2xl text-white font-black text-sm whitespace-nowrap shadow-lg shadow-indigo-300/50 transition-all hover:-translate-y-0.5 active:scale-95 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600"
                        >
                            <Plus className="w-4 h-4" /> New Package
                        </button>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {pendingPackages.map((pkg, i) => renderCard(pkg, i))}
                        </div>
                    </div>
                )}

                {/* SECTION 2: ACTIVE PACKAGES (Show if ALL, ACTIVE, or EXPIRING) */}
                {(viewFilter === 'ALL' || viewFilter === 'ACTIVE' || viewFilter === 'EXPIRING' || viewFilter === 'EXPIRED') && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`p-1.5 rounded-lg ${viewFilter === 'EXPIRING' ? 'bg-rose-100 text-rose-600' : viewFilter === 'EXPIRED' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {viewFilter === 'EXPIRING' ? <BatteryWarning className="w-4 h-4" /> : viewFilter === 'EXPIRED' ? <Trash2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                                {viewFilter === 'EXPIRING' ? 'Expiring Soon' : viewFilter === 'EXPIRED' ? 'Expired Packages' : 'Active Memberships'} ({activePackages.length})
                            </h3>
                        </div>

                        {activePackages.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {activePackages.map((pkg, i) => renderCard(pkg, i))}
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
                                        <p className="text-indigo-400 font-bold text-sm">Loading packages...</p>
                                    </>
                                ) : (
                                    <>
                                        <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-400 font-bold text-sm">No packages found for this filter.</p>
                                    </>
                                )}
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
                                    onChange={e => setEditingPackage({ ...editingPackage, packageName: e.target.value })}
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
                                        onChange={e => setEditingPackage({ ...editingPackage, totalCost: Number(e.target.value) })}
                                        className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Services</label>
                                    <input
                                        type="number"
                                        value={editingPackage.totalServices}
                                        onChange={e => setEditingPackage({ ...editingPackage, totalServices: Number(e.target.value) })}
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
                                        onChange={e => setEditingPackage({ ...editingPackage, startDate: e.target.value })}
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
                                            onChange={e => setEditingPackage({ ...editingPackage, oldServiceCount: Number(e.target.value) })}
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

            {/* --- ADDON MODAL --- */}
            {isAddOnModalOpen && selectedPkgForAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
                            <h3 className="font-black text-lg flex items-center tracking-tight">
                                <PlusCircle className="w-5 h-5 mr-3 text-blue-200" /> Add Services
                            </h3>
                            <p className="text-blue-100 text-xs font-bold mt-1">Top-up {selectedPkgForAction.packageName}</p>
                        </div>
                        <form onSubmit={handleAddOnSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Additional Services</label>
                                    <input
                                        type="number"
                                        value={addonForm.count}
                                        onChange={e => setAddonForm({ ...addonForm, count: Number(e.target.value) })}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Additional Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={addonForm.cost}
                                        onChange={e => setAddonForm({ ...addonForm, cost: Number(e.target.value) })}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddOnModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700">{loading ? 'Saving...' : 'Add Services'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- RENEWAL MODAL --- */}
            {isRenewModalOpen && selectedPkgForAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-6 text-white">
                            <h3 className="font-black text-lg flex items-center tracking-tight">
                                <RefreshCw className="w-5 h-5 mr-3 text-emerald-200" /> Renew Package
                            </h3>
                            <p className="text-emerald-100 text-xs font-bold mt-1">Start new cycle for {selectedPkgForAction.clientName}</p>
                        </div>
                        <form onSubmit={handleRenewSubmit} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">New Package Name</label>
                                <input
                                    type="text"
                                    value={renewForm.packageName}
                                    onChange={e => setRenewForm({ ...renewForm, packageName: e.target.value })}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">New Cost</label>
                                    <input
                                        type="number"
                                        value={renewForm.totalCost}
                                        onChange={e => setRenewForm({ ...renewForm, totalCost: Number(e.target.value) })}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Services</label>
                                    <input
                                        type="number"
                                        value={renewForm.totalServices}
                                        onChange={e => setRenewForm({ ...renewForm, totalServices: Number(e.target.value) })}
                                        className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={renewForm.startDate}
                                    onChange={e => setRenewForm({ ...renewForm, startDate: e.target.value })}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                />
                            </div>

                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-700 font-medium flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>This will close the current package and start a fresh count.</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsRenewModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700">{loading ? 'Processing...' : 'Confirm Renewal'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- HISTORY MODAL --- */}
            {historyPkg && (() => {
                const pkg = historyPkg;
                const u = getPackageUsage(pkg);
                const isPending = pkg.status === 'PENDING' || !pkg.status;
                const nm = String(pkg.clientName || '').trim().toLowerCase();
                const hist = (entries || [])
                    .filter(e => String(e.clientName || '').trim().toLowerCase() === nm)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 15);
                return (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center p-4 overflow-y-auto" onClick={() => setHistoryPkg(null)}>
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden my-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="px-7 py-6 bg-gradient-to-br from-slate-900 to-indigo-900 relative overflow-hidden text-white">
                                <button onClick={() => setHistoryPkg(null)} className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/70 mb-1">Membership History</p>
                                <h3 className="text-2xl font-black tracking-tight">{pkg.clientName}</h3>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15">{pkg.packageName}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15">{isPending ? 'Pending' : u.isExpired ? 'Full' : 'Active'}</span>
                                    {pkg.packageType === 'OLD' && <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15">Old Pkg</span>}
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-2 mb-5">
                                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 mb-0.5">Used</p>
                                        <p className="text-base font-black text-slate-800 tabular-nums leading-none">{u.used}/{pkg.totalServices}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 mb-0.5">Left</p>
                                        <p className="text-base font-black text-emerald-600 tabular-nums leading-none">{u.remaining}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-center">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 mb-0.5">Cost</p>
                                        <p className="text-base font-black text-slate-800 tabular-nums leading-none">₹{pkg.totalCost}</p>
                                    </div>
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Service Timeline</p>
                                {hist.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 font-semibold py-6 bg-slate-50 rounded-xl">No service records found for this client.</p>
                                ) : (
                                    <div className="relative pl-6 space-y-4 max-h-64 overflow-y-auto before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100">
                                        {hist.map((e, i) => (
                                            <div key={e.id || i} className="relative">
                                                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-white shadow-[0_0_0_2px_rgba(99,102,241,0.35)]"></span>
                                                <p className="font-black text-slate-700 text-sm leading-tight">{e.serviceType}{e.patchMethod ? ` · ${e.patchMethod}` : ''}</p>
                                                <p className="text-[11px] text-slate-400 font-semibold tabular-nums">{fmtLong(e.date)}{e.technician ? ` · ${e.technician}` : ''}{e.workStatus ? ` · ${e.workStatus}` : ''}</p>
                                            </div>
                                        ))}
                                        <div className="relative">
                                            <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-slate-300 ring-2 ring-white"></span>
                                            <p className="font-black text-slate-600 text-sm leading-tight">Package Started</p>
                                            <p className="text-[11px] text-slate-400 font-semibold tabular-nums">{fmtLong(pkg.startDate)}</p>
                                        </div>
                                    </div>
                                )}
                                {!isPending && (
                                    <div className="flex gap-2 mt-5">
                                        <button onClick={() => { const p = pkg; setHistoryPkg(null); openAddOnModal(p); }} className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-black text-xs hover:bg-blue-100 border border-blue-100 flex items-center justify-center gap-1.5"><PlusCircle className="w-3.5 h-3.5" /> Add-on</button>
                                        <button onClick={() => { const p = pkg; setHistoryPkg(null); openRenewModal(p); }} className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-xs hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Renew</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>
    );
};

const SP_STYLES = `
  @keyframes spRise { from { opacity:0; transform:translateY(22px) rotateX(12deg);} to { opacity:1; transform:none; } }
  @keyframes spCardIn { to { opacity:1; transform:none; } }

  .sp-stat{ position:relative; overflow:hidden; border-radius:18px; padding:15px 16px 16px; color:#eef1f7; text-align:left; cursor:pointer;
     background:linear-gradient(150deg,#262c3d 0%,#171b28 100%); border:1px solid rgba(255,255,255,.08);
     box-shadow:0 16px 32px -18px rgba(10,12,25,.75), inset 0 1px 0 rgba(255,255,255,.07);
     transform-style:preserve-3d; transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s, border-color .3s;
     opacity:0; animation:spRise .6s cubic-bezier(.22,1,.36,1) forwards; }
  .sp-stat::before{ content:""; position:absolute; z-index:0; top:-45%; right:-25%; width:120px; height:120px; border-radius:50%; background:radial-gradient(circle, var(--c), transparent 68%); opacity:.55; }
  .sp-stat::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:3px; background:linear-gradient(90deg, transparent, var(--c), transparent); }
  .sp-stat:hover{ box-shadow:0 26px 46px -20px rgba(10,12,25,.9), 0 0 30px -12px var(--c); }
  .sp-stat.active{ border-color:var(--c); box-shadow:0 0 0 2px var(--c), 0 22px 42px -18px rgba(10,12,25,.85); }
  .sp-stat-top{ position:relative; z-index:1; display:flex; align-items:center; gap:9px; }
  .sp-stat-chip{ width:26px; height:26px; border-radius:9px; display:grid; place-items:center; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); }
  .sp-stat-chip i{ width:9px; height:9px; border-radius:3px; background:var(--c); box-shadow:0 0 9px var(--c); }
  .sp-stat-lbl{ font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#aab2c5; }
  .sp-stat-num{ position:relative; z-index:1; font-size:30px; font-weight:900; letter-spacing:-.02em; margin-top:9px; font-variant-numeric:tabular-nums; text-shadow:0 2px 14px rgba(0,0,0,.45); }

  .sp-pkg{ display:flex; flex-direction:column; gap:9px; opacity:0; transform:translateY(30px) rotateX(14deg); transform-origin:50% 100%; animation:spCardIn .6s cubic-bezier(.22,1,.36,1) forwards; }
  .sp-card{ position:relative; aspect-ratio:1.585/1; border-radius:18px; padding:15px; color:#f4f1ff; overflow:hidden; isolation:isolate;
     background:linear-gradient(135deg,#241b52 0%,#4c1d95 52%,#6d28d9 100%);
     box-shadow:0 18px 42px -20px rgba(40,20,90,.78), inset 0 0 0 1px rgba(255,255,255,.09), inset 0 1px 0 rgba(255,255,255,.18);
     cursor:pointer; transform-style:preserve-3d;
     transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s; display:flex; flex-direction:column; justify-content:space-between; }
  .sp-card:hover{ box-shadow:0 32px 62px -24px rgba(60,30,120,.72), inset 0 0 0 1px rgba(255,255,255,.15), inset 0 1px 0 rgba(255,255,255,.26); }
  .sp-card::before{ content:""; position:absolute; inset:0; z-index:0; background:
     linear-gradient(180deg, rgba(255,255,255,.16), transparent 20%),
     radial-gradient(120% 90% at 85% 8%, rgba(255,255,255,.22), transparent 55%),
     radial-gradient(90% 80% at 8% 100%, rgba(230,180,94,.2), transparent 60%); }
  .sp-card::after{ content:""; position:absolute; top:0; bottom:0; left:-60%; width:38%; z-index:0; pointer-events:none;
     background:linear-gradient(100deg, transparent, rgba(255,255,255,.28), transparent); transform:skewX(-18deg); opacity:0; }
  .sp-card:hover::after{ animation:spSheen 1s cubic-bezier(.22,1,.36,1); }
  @keyframes spSheen{ 0%{ left:-60%; opacity:0; } 18%{ opacity:1; } 100%{ left:130%; opacity:0; } }
  .sp-card > *{ position:relative; z-index:1; }
  .sp-card .sp-glow{ position:absolute; inset:0; z-index:0; background:radial-gradient(150px 150px at var(--mx,50%) var(--my,50%), rgba(255,255,255,.18), transparent 60%); opacity:0; transition:opacity .3s; }
  .sp-card:hover .sp-glow{ opacity:1; }
  .sp-card.low{ background:linear-gradient(135deg,#3a1140,#7a1550 55%,#b21e59); }
  .sp-card.expired{ background:linear-gradient(135deg,#2a0f18,#6b1522 55%,#9f1d33); }
  .sp-card.pending{ background:linear-gradient(135deg,#262d3f,#414b60 55%,#55617d); }

  .sp-row{ display:flex; align-items:flex-start; justify-content:space-between; }
  .sp-brand{ font-weight:850; letter-spacing:.14em; font-size:11px; }
  .sp-brand small{ display:block; font-size:7px; letter-spacing:.3em; font-weight:700; opacity:.7; margin-top:2px; }
  .sp-tier{ display:flex; align-items:center; gap:7px; }
  .sp-name{ font-size:10px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; background:linear-gradient(90deg,#f6dfa4,#e6b45e,#c98f34); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .sp-oldtag{ font-size:7.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; padding:2px 6px; border-radius:5px; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.2); }
  .sp-status{ font-size:8px; font-weight:850; letter-spacing:.1em; text-transform:uppercase; padding:3px 7px; border-radius:999px; display:inline-flex; align-items:center; gap:4px; }
  .sp-status.low{ background:rgba(255,255,255,.16); color:#ffe1ec; }
  .sp-status.exp{ background:rgba(0,0,0,.28); color:#ffd9d9; }
  .sp-status.pend{ background:rgba(245,158,11,.92); color:#3a2600; }
  .sp-status b{ width:5px; height:5px; border-radius:50%; background:currentColor; }
  .sp-chip{ width:34px; height:26px; border-radius:6px; background:linear-gradient(135deg,#f6dfa4,#e6b45e 55%,#b9852f); position:relative; box-shadow:inset 0 1px 1px rgba(255,255,255,.5); }
  .sp-chip::before{ content:""; position:absolute; inset:4px 6px; border:1px solid rgba(120,80,20,.55); border-radius:2px; }
  .sp-chip::after{ content:""; position:absolute; top:4px; bottom:4px; left:50%; width:1px; background:rgba(120,80,20,.55); box-shadow:-6px 0 rgba(120,80,20,.4),6px 0 rgba(120,80,20,.4); }
  .sp-midrow{ display:flex; align-items:center; justify-content:space-between; }
  .sp-memno{ font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:12.5px; letter-spacing:.14em; font-weight:600; opacity:.92; font-variant-numeric:tabular-nums; }
  .sp-usage .sp-cap{ display:flex; justify-content:space-between; align-items:center; font-size:8px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; opacity:.85; margin-bottom:5px; }
  .sp-usage .sp-cap b{ font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:11px; letter-spacing:0; opacity:1; }
  .sp-track{ height:6px; border-radius:999px; background:rgba(255,255,255,.2); overflow:hidden; }
  .sp-track > span{ display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,#f6dfa4,#e6b45e); }
  .sp-track.low > span{ background:linear-gradient(90deg,#fb7185,#f43f5e); }
  .sp-track.exp > span{ background:#ff5b6e; }
  .sp-foot{ display:flex; align-items:flex-end; justify-content:space-between; }
  .sp-holder{ font-size:12.5px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
  .sp-holder small{ display:block; font-size:7px; letter-spacing:.22em; opacity:.6; font-weight:700; margin-bottom:2px; }
  .sp-meta{ text-align:right; }
  .sp-meta .k{ font-size:7px; letter-spacing:.18em; opacity:.6; font-weight:700; text-transform:uppercase; }
  .sp-meta .v{ font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:10.5px; font-weight:600; font-variant-numeric:tabular-nums; }
  .sp-hint{ position:absolute; bottom:6px; left:50%; transform:translateX(-50%); font-size:7px; letter-spacing:.18em; text-transform:uppercase; opacity:0; transition:opacity .3s; font-weight:700; z-index:1; }
  .sp-card:hover .sp-hint{ opacity:.5; }
  .sp-tools{ position:absolute; top:11px; right:11px; display:flex; gap:5px; opacity:0; transition:opacity .25s; z-index:2; }
  .sp-card:hover .sp-tools{ opacity:1; }
  .sp-tools button{ width:26px; height:26px; border-radius:7px; border:none; cursor:pointer; background:rgba(255,255,255,.16); color:#fff; display:grid; place-items:center; backdrop-filter:blur(4px); }

  .sp-tray{ display:flex; gap:8px; }
  .sp-btn{ flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px; border-radius:11px; font-weight:800; font-size:11.5px; cursor:pointer; border:1px solid transparent; transition:transform .12s, background .2s; }
  .sp-btn:active{ transform:scale(.97); }
  .sp-btn.addon{ background:#efe9fd; color:#6d28d9; border-color:#ddd0fb; }
  .sp-btn.renew{ background:#e7f7f0; color:#059669; border-color:#c9efe0; }
  .sp-btn.approve{ background:#10b981; color:#04150e; }
  .sp-btn.reject{ background:#fdeaec; color:#e11d48; border-color:#f9d4da; }
  .sp-pendnote{ display:flex; align-items:center; justify-content:center; gap:6px; padding:9px; border-radius:11px; font-weight:800; font-size:11px; color:#b45309; background:#fef6e7; border:1px solid #fbe6bf; }

  @media (prefers-reduced-motion: reduce){
    .sp-stat, .sp-pkg{ animation:none; opacity:1; transform:none; }
    .sp-card, .sp-stat{ transition:none; }
    .sp-card:hover::after{ animation:none; }
  }
`;

export default ServicePackages;
