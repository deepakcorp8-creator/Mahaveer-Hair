
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client, Item, Technician, Entry, ServicePackage } from '../types';
import { Save, AlertCircle, User, CreditCard, Scissors, Calendar, MapPin, RefreshCw, CheckCircle2, Ticket, FileDown, ShieldCheck, Search, PenSquare, Wallet, X, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { generateInvoice } from '../utils/invoiceGenerator';

const NewEntryForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [checkingPackage, setCheckingPackage] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [todayEntries, setTodayEntries] = useState<Entry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEW: Store names of clients who have active packages
  const [activePackageClients, setActivePackageClients] = useState<Set<string>>(new Set());
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const [activePackage, setActivePackage] = useState<{
      package: ServicePackage,
      currentServiceNumber: number,
      usedCount: number,
      isExpired: boolean,
      remaining?: number
  } | null>(null);

  const initialFormState: Partial<Entry> = {
    date: new Date().toISOString().split('T')[0],
    branch: 'RPR',
    serviceType: 'SERVICE',
    patchMethod: 'TAPING',
    paymentMethod: 'CASH',
    workStatus: 'DONE',
    numberOfService: 1,
    amount: 0,
    remark: '',
    clientName: '',
    contactNo: '',
    address: '',
    technician: '',
    patchSize: ''
  };
  
  const [formData, setFormData] = useState<Partial<Entry>>(initialFormState);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error' | 'warning'} | null>(null);
  const [lastSubmittedEntry, setLastSubmittedEntry] = useState<Entry | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Parallel fetch for speed
    const [options, packages] = await Promise.all([
        api.getOptions(),
        api.getPackages()
    ]);

    setClients(options.clients);
    setTechnicians(options.technicians);
    setItems(options.items);
    
    // Identify clients with ACTIVE or APPROVED packages
    const activeNames = new Set(
        packages
            .filter(p => p.status === 'ACTIVE' || p.status === 'APPROVED')
            .map(p => p.clientName.trim().toLowerCase())
    );
    setActivePackageClients(activeNames);

    loadTodayEntries();
  };

  const loadTodayEntries = async () => {
      const allEntries = await api.getEntries(true); // Force refresh
      const today = new Date().toISOString().split('T')[0];
      const todays = allEntries.filter(e => e.date === today);
      setTodayEntries(todays);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (clientName: string) => {
    setFormData(prev => ({ ...prev, clientName: clientName }));
    setActivePackage(null);

    if (!clientName) return;

    // 1. Try to find client details in Master List
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    
    let contactToUse = '';

    if (client) {
      setFormData(prev => ({
        ...prev,
        clientName: client.name, // Use exact casing from master
        contactNo: client.contact,
        address: client.address
      }));
      contactToUse = client.contact;
    }

    // 2. Check for Package (Always check, even if not in master list)
    // Use the name found in master list if available, otherwise use typed name
    const nameToCheck = client ? client.name : clientName;
    checkPackage(nameToCheck, contactToUse);
  };
  
  const checkPackage = async (name: string, contact?: string) => {
     if (!name) return;
     setCheckingPackage(true);
     try {
        const pkgStatus = await api.checkClientPackage(name, contact);
        if (pkgStatus && !pkgStatus.isExpired) {
            setActivePackage(pkgStatus);
            setFormData(prev => ({ 
                ...prev, 
                numberOfService: pkgStatus.currentServiceNumber,
                workStatus: 'DONE' 
            }));
        } else if (pkgStatus && pkgStatus.isExpired) {
             setActivePackage(pkgStatus);
             setFormData(prev => ({ ...prev, workStatus: 'DONE' }));
        } else {
            setActivePackage(null);
            setFormData(prev => ({ ...prev, numberOfService: 1, workStatus: 'DONE' }));
        }
    } catch (e) {
        console.error("Error checking package", e);
    } finally {
        setCheckingPackage(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setNotification(null);
    setLastSubmittedEntry(null);

    if (!formData.clientName || !formData.technician) {
      setNotification({ msg: 'Please fill in all required fields (Client, Technician).', type: 'error' });
      setLoading(false);
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const result = await api.addEntry(formData as Entry);
      setLastSubmittedEntry(result as Entry);
      const isPackage = activePackage && !activePackage.isExpired;
      setNotification({ 
          msg: isPackage ? 'Package Service Recorded Successfully!' : 'Transaction recorded successfully!', 
          type: 'success' 
      });
      setFormData({
          ...initialFormState, 
          date: formData.date 
      });
      setActivePackage(null);
      await loadTodayEntries(); // Refresh the list
      
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => setNotification(null), 8000);
    } catch (error) {
      setNotification({ msg: 'Failed to add entry. Please check your connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- EDIT / COMPLETE PAYMENT LOGIC ---
  const openEditModal = (entry: Entry) => {
      setEditingEntry(entry);
      setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingEntry) return;

      setLoading(true);
      try {
          // Sanitise amount: Ensure it is a number (handle empty string case)
          const safeAmount = (editingEntry.amount as any) === '' ? 0 : Number(editingEntry.amount);
          
          // If amount is > 0 and method was pending, assume it's collected now
          const updatedEntry = { ...editingEntry, amount: safeAmount };
          if (updatedEntry.amount > 0 && updatedEntry.paymentMethod === 'PENDING') {
             // Keep user selected method or default to CASH if they didn't change it from PENDING?
             // Actually, the UI allows them to change it.
          }

          await api.updateEntry(updatedEntry);
          setIsEditModalOpen(false);
          setEditingEntry(null);
          await loadTodayEntries();
          setNotification({ msg: 'Entry updated successfully!', type: 'success' });
      } catch (e) {
          setNotification({ msg: 'Failed to update entry.', type: 'error' });
      } finally {
          setLoading(false);
      }
  };

  const techOptions = technicians.map(t => ({ label: t.name, value: t.name }));
  const patchSizeOptions = items.map(i => ({ label: i.name, value: i.name, subtext: i.category }));

  // Styles
  const cardClass = "bg-white rounded-3xl shadow-[0_15px_40px_-5px_rgba(0,0,0,0.1)] border-2 border-slate-200 relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_50px_-5px_rgba(0,0,0,0.15)] hover:border-slate-300";
  const inputClass = "w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-gray-900 shadow-inner focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all font-bold placeholder:font-normal placeholder:text-slate-400";
  const labelClass = "block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 ml-1";

  // Filter Today's List
  const filteredTodayEntries = todayEntries.filter(e => 
      e.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(e.contactNo).includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* 3D Floating Header */}
      <div className="mb-10 relative group">
         <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] blur-xl opacity-40 transform group-hover:scale-[1.02] transition-transform duration-500"></div>
         <div className="relative bg-gradient-to-r from-indigo-700 to-purple-700 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-2 drop-shadow-md">New Transaction</h1>
                    <p className="text-indigo-100 font-medium text-lg opacity-90">Create a new service entry and generate billing.</p>
                </div>
                <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 shadow-inner">
                    <Calendar className="w-5 h-5 mr-3 text-indigo-100" />
                    <span className="font-bold text-lg">{new Date().toDateString()}</span>
                </div>
            </div>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-16">
        
        {notification && (
          <div className={`mb-8 p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between shadow-xl gap-4 
            ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
            <div className="flex items-center">
                {notification.type === 'success' ? <CheckCircle2 className="w-8 h-8 mr-4 text-emerald-600" /> : <AlertCircle className="w-8 h-8 mr-4 text-red-600" />}
                <div>
                    <h4 className="font-black text-lg">
                        {notification.type === 'success' ? 'Success' : 'Error'}
                    </h4>
                    <p className="font-medium">{notification.msg}</p>
                </div>
            </div>
            {notification.type === 'success' && lastSubmittedEntry && (
                <button
                    type="button"
                    onClick={() => {
                        if (lastSubmittedEntry.invoiceUrl && lastSubmittedEntry.invoiceUrl.startsWith('http')) {
                            window.open(lastSubmittedEntry.invoiceUrl, '_blank');
                        } else {
                            generateInvoice(lastSubmittedEntry);
                        }
                    }}
                    className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 hover:-translate-y-0.5 border border-emerald-700"
                >
                    <FileDown className="w-5 h-5 mr-2" />
                    Download Invoice
                </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
                {/* 1. Client Card (3D) */}
                <div className={cardClass}>
                    <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 flex items-center">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl mr-4 shadow-sm border border-blue-200">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Client Details</h3>
                            <p className="text-sm text-blue-500 font-bold">Customer Information</p>
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-b from-white to-blue-50/20">
                        <div className="col-span-full">
                            <div className="flex items-center justify-between mb-1">
                                <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
                                {checkingPackage && <span className="text-[10px] text-indigo-600 flex items-center font-bold"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking Plan...</span>}
                            </div>
                            <SearchableSelect 
                                options={clients.map(c => ({ 
                                    label: c.name, 
                                    value: c.name, 
                                    subtext: c.contact,
                                    isHighlight: activePackageClients.has(c.name.trim().toLowerCase()) 
                                }))}
                                value={formData.clientName || ''}
                                onChange={handleClientChange}
                                placeholder="Search Client..."
                                required
                            />
                        </div>
                        {activePackage && (
                             <div className={`col-span-full rounded-2xl border-2 p-5 flex items-start gap-4 shadow-lg transition-all duration-300 transform hover:scale-[1.01] animate-in fade-in slide-in-from-top-4
                                ${activePackage.isExpired 
                                    ? 'bg-red-50 border-red-300' 
                                    : 'bg-emerald-50 border-emerald-300'}
                             `}>
                                 <div className={`p-3 rounded-xl shadow-sm border ${activePackage.isExpired ? 'bg-red-100 border-red-200 text-red-600' : 'bg-emerald-100 border-emerald-200 text-emerald-600'}`}>
                                     <Ticket className="w-8 h-8" />
                                 </div>
                                 <div className="flex-1">
                                     <div className="flex justify-between items-center mb-1">
                                         <h4 className={`font-black text-xl ${activePackage.isExpired ? 'text-red-900' : 'text-emerald-900'}`}>
                                             {activePackage.isExpired ? 'PACKAGE EXPIRED' : activePackage.package.packageName}
                                         </h4>
                                         {!activePackage.isExpired && (
                                             <span className="bg-white/80 backdrop-blur px-4 py-1.5 rounded-lg text-sm font-black border border-emerald-300 shadow-sm text-emerald-700">
                                                 Remaining: {activePackage.remaining}
                                             </span>
                                         )}
                                     </div>
                                     <p className={`font-medium ${activePackage.isExpired ? 'text-red-700' : 'text-emerald-700'}`}>
                                         Service <span className="font-black text-lg mx-1">{activePackage.currentServiceNumber}</span> of {activePackage.package.totalServices}
                                     </p>
                                 </div>
                             </div>
                        )}

                        <div>
                            <label className={labelClass}>Contact Number</label>
                            <input
                                type="text"
                                name="contactNo"
                                value={formData.contactNo || ''}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="9876543210"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Address</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                    className={`${inputClass} pl-11`}
                                    placeholder="City/Area"
                                />
                                <MapPin className="w-5 h-5 text-slate-400 absolute left-4 top-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Service Card (3D) */}
                <div className={cardClass}>
                    <div className="px-8 py-6 bg-gradient-to-r from-violet-50 to-white border-b border-violet-100 flex items-center">
                        <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl mr-4 shadow-sm border border-violet-200">
                            <Scissors className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Service Data</h3>
                            <p className="text-sm text-violet-500 font-bold">Work & Technician</p>
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-b from-white to-violet-50/20">
                        <div>
                            <label className={labelClass}>Branch</label>
                            <div className="flex gap-4 p-1 bg-slate-100/50 rounded-2xl border border-slate-200">
                                {['RPR', 'JDP'].map((b) => (
                                    <button
                                        type="button"
                                        key={b}
                                        onClick={() => setFormData(prev => ({ ...prev, branch: b as any }))}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 border
                                            ${formData.branch === b 
                                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 transform scale-105 border-violet-700' 
                                                : 'text-slate-500 hover:bg-white hover:text-slate-700 border-transparent hover:border-slate-200'
                                            }`}
                                    >
                                        {b}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Transaction Date</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>

                         <div className="md:col-span-2 h-px bg-slate-200 my-2"></div>

                        <div>
                            <label className={labelClass}>Service Type</label>
                            <div className="relative">
                                <select
                                    name="serviceType"
                                    value={formData.serviceType}
                                    onChange={handleChange}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="SERVICE">SERVICE</option>
                                    <option value="NEW">NEW</option>
                                    <option value="DEMO">DEMO</option>
                                    <option value="MUNDAN">MUNDAN</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                            </div>
                        </div>

                        {formData.serviceType === 'NEW' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                             <SearchableSelect 
                                label="Patch Size"
                                options={patchSizeOptions}
                                value={formData.patchSize || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, patchSize: val }))}
                                placeholder="Select Patch Size..."
                            />
                        </div>
                        )}

                        <div>
                            <label className={labelClass}>Patch Method</label>
                            <div className="relative">
                                <select
                                    name="patchMethod"
                                    value={formData.patchMethod}
                                    onChange={handleChange}
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    <option value="TAPING">TAPING</option>
                                    <option value="BONDING">BONDING</option>
                                    <option value="CLIPPING">CLIPPING</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                            </div>
                        </div>
                        
                         <div className="md:col-span-2">
                             <SearchableSelect 
                                label="Technician Assigned"
                                options={techOptions}
                                value={formData.technician || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, technician: val }))}
                                placeholder="Select Technician..."
                                required
                            />
                        </div>
                        
                         <div className="md:col-span-2">
                            <label className={labelClass}>Remarks / Notes</label>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                rows={2}
                                className={inputClass}
                                placeholder="Additional details..."
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
                {/* 3. Payment Card (3D) */}
                <div className={`${cardClass} sticky top-6 bg-gradient-to-b from-white to-emerald-50/20`}>
                    <div className="px-8 py-6 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl mr-4 shadow-sm border border-emerald-200">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800">Payment</h3>
                    </div>
                     <div className="p-6 space-y-8">
                         <div className="bg-white rounded-3xl p-8 border border-emerald-200 text-center shadow-inner">
                            <label className="text-emerald-800 font-black text-xs uppercase tracking-widest mb-4 block">Total Payable Amount</label>
                            <div className="relative flex justify-center items-center">
                                <span className="text-emerald-500 text-4xl font-black mr-2">₹</span>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    onFocus={(e) => (formData.amount === 0 || (formData.amount as any) === '0') && setFormData(prev => ({ ...prev, amount: '' as any }))}
                                    className="w-48 bg-transparent text-5xl font-black text-slate-800 text-center border-b-4 border-emerald-300 focus:border-emerald-500 focus:outline-none placeholder-slate-200 transition-colors"
                                    placeholder="0"
                                    min="0"
                                    required
                                />
                            </div>
                        </div>
                        
                         <div>
                            <label className={labelClass}>Payment Method</label>
                             <div className="grid grid-cols-2 gap-4 mt-3">
                                {['CASH', 'UPI', 'CARD', 'PENDING'].map(method => {
                                    const activeColors: Record<string, string> = {
                                        'CASH': 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 border-emerald-600',
                                        'UPI': 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/30 border-blue-600',
                                        'CARD': 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-violet-500/30 border-violet-600',
                                        'PENDING': 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/30 border-red-600',
                                    };
                                    const isActive = formData.paymentMethod === method;
                                    
                                    return (
                                        <button
                                            type="button"
                                            key={method}
                                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method as any }))}
                                            className={`py-4 px-2 text-sm font-black rounded-2xl border transition-all duration-200 shadow-sm
                                                ${isActive 
                                                    ? `${activeColors[method]} transform scale-105 shadow-lg` 
                                                    : 'bg-white text-slate-400 border-slate-300 hover:bg-slate-50 hover:text-slate-600'}`}
                                        >
                                            {method}
                                        </button>
                                    );
                                })}
                             </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full group flex items-center justify-center py-5 px-8 rounded-2xl shadow-xl text-lg font-black text-white transition-all transform duration-300 border
                                ${loading 
                                    ? 'bg-slate-400 cursor-not-allowed border-slate-500' 
                                    : activePackage && !activePackage.isExpired 
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/30 hover:-translate-y-1 border-emerald-600'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-indigo-500/30 hover:-translate-y-1 border-indigo-600'}`}
                        >
                            {loading ? (
                                <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                            ) : activePackage && !activePackage.isExpired ? (
                                <ShieldCheck className="w-6 h-6 mr-3" />
                            ) : (
                                <Save className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                            )}
                            {loading ? 'Processing...' : (activePackage && !activePackage.isExpired ? 'SUBMIT PACKAGE ENTRY' : 'COMPLETE TRANSACTION')}
                        </button>
                     </div>
                </div>
            </div>
        </div>
      </form>

      {/* --- TODAY'S ACTIVITY LIST --- */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden relative">
          {/* Header */}
          <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200">
                     <Clock className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-xl font-black text-slate-800">Today's Activity</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toDateString()}</p>
                  </div>
              </div>
              <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
                  <input 
                      type="text" 
                      placeholder="Search today's client..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  />
              </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100">
             {filteredTodayEntries.length === 0 ? (
                 <div className="p-12 text-center text-slate-400 font-medium">
                     No transactions found for today.
                 </div>
             ) : (
                 filteredTodayEntries.map((entry) => {
                     const isPending = entry.paymentMethod === 'PENDING' || Number(entry.amount) === 0;
                     
                     return (
                         <div key={entry.id} className={`p-6 transition-colors hover:bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6
                             ${isPending ? 'bg-amber-50/40' : ''}
                         `}>
                             {/* Client Info */}
                             <div className="flex items-center gap-4 w-full md:w-1/3">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border
                                    ${isPending ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}
                                 `}>
                                     {entry.clientName.charAt(0)}
                                 </div>
                                 <div>
                                     <h4 className="font-black text-slate-800 text-lg leading-tight">{entry.clientName}</h4>
                                     <div className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1">
                                         <span>{entry.contactNo}</span>
                                         {isPending && (
                                            <span className="flex items-center text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Payment Pending
                                            </span>
                                         )}
                                     </div>
                                 </div>
                             </div>

                             {/* Service Info */}
                             <div className="w-full md:w-1/4">
                                 <div className="text-sm font-bold text-slate-700">{entry.serviceType}</div>
                                 <div className="text-xs text-slate-400 font-medium">Tech: {entry.technician}</div>
                             </div>

                             {/* Amount & Status */}
                             <div className="w-full md:w-1/6 text-right md:text-left">
                                 <div className={`font-black text-xl ${isPending ? 'text-amber-600' : 'text-slate-800'}`}>
                                     ₹{entry.amount}
                                 </div>
                                 <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                     {entry.paymentMethod}
                                 </div>
                             </div>

                             {/* Actions */}
                             <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                 {isPending && (
                                     <button 
                                        onClick={() => openEditModal(entry)}
                                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-center border border-emerald-600"
                                     >
                                         <Wallet className="w-4 h-4 mr-2" />
                                         Amount
                                     </button>
                                 )}
                                 <button 
                                    onClick={() => openEditModal(entry)}
                                    className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                                    title="Edit Entry"
                                 >
                                     <PenSquare className="w-4 h-4" />
                                 </button>
                             </div>
                         </div>
                     );
                 })
             )}
          </div>
      </div>

      {/* EDIT / COMPLETE PAYMENT MODAL */}
      {isEditModalOpen && editingEntry && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 border border-white/20">
                  <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
                      <div>
                          <h3 className="font-black text-lg flex items-center tracking-tight">
                              {editingEntry.amount === 0 ? 'Complete Payment' : 'Edit Transaction'}
                          </h3>
                          <p className="text-slate-400 text-xs font-bold">{editingEntry.clientName}</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <form onSubmit={handleEditSubmit} className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Technician</label>
                              <select 
                                  value={editingEntry.technician}
                                  onChange={e => setEditingEntry({...editingEntry, technician: e.target.value})}
                                  className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              >
                                  {technicians.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Service Type</label>
                              <select 
                                  value={editingEntry.serviceType}
                                  onChange={e => setEditingEntry({...editingEntry, serviceType: e.target.value as any})}
                                  className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              >
                                  <option value="SERVICE">SERVICE</option>
                                  <option value="NEW">NEW</option>
                                  <option value="DEMO">DEMO</option>
                                  <option value="MUNDAN">MUNDAN</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Amount Received (₹)</label>
                          <input 
                              type="number"
                              value={editingEntry.amount}
                              onChange={e => setEditingEntry({...editingEntry, amount: e.target.value as any})}
                              onFocus={(e) => (editingEntry.amount === 0 || (editingEntry.amount as any) === '0') && setEditingEntry({...editingEntry, amount: '' as any})}
                              className="w-full rounded-xl border-emerald-200 border-2 bg-emerald-50/50 px-4 py-4 text-2xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                              autoFocus={editingEntry.amount === 0}
                          />
                      </div>

                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Method</label>
                          <div className="grid grid-cols-4 gap-2">
                              {['CASH', 'UPI', 'CARD', 'PENDING'].map(m => (
                                  <button
                                      type="button"
                                      key={m}
                                      onClick={() => setEditingEntry({...editingEntry, paymentMethod: m as any})}
                                      className={`py-2 rounded-lg text-xs font-black border transition-colors
                                          ${editingEntry.paymentMethod === m 
                                              ? 'bg-slate-800 text-white border-slate-900' 
                                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                      `}
                                  >
                                      {m}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                           <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Remarks</label>
                           <textarea
                                value={editingEntry.remark}
                                onChange={e => setEditingEntry({...editingEntry, remark: e.target.value})}
                                rows={2}
                                className="w-full rounded-xl border-slate-200 border bg-slate-50 px-4 py-3 font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                           />
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-300 transition-all flex items-center justify-center border border-indigo-700 text-lg"
                      >
                          {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Update Transaction'}
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default NewEntryForm;
