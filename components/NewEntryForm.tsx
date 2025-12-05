import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client, Item, Technician, Entry, ServicePackage } from '../types';
import { Save, AlertCircle, User, CreditCard, Scissors, Calendar, MapPin, RefreshCw, CheckCircle2, Ticket, FileDown, Printer } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { generateInvoice } from '../utils/invoiceGenerator';

const NewEntryForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  
  // Package State
  const [activePackage, setActivePackage] = useState<{
      package: ServicePackage,
      currentServiceNumber: number,
      usedCount: number,
      isExpired: boolean,
      remaining?: number
  } | null>(null);

  // Define initial state for full reset
  const initialFormState: Partial<Entry> = {
    date: new Date().toISOString().split('T')[0],
    branch: 'BSP',
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
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  // State to hold the last successful entry to allow printing
  const [lastSubmittedEntry, setLastSubmittedEntry] = useState<Entry | null>(null);

  useEffect(() => {
    const init = async () => {
      // Fetch options once on mount
      const options = await api.getOptions();
      setClients(options.clients);
      setTechnicians(options.technicians);
      setItems(options.items);
    };
    init();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (clientName: string) => {
    // 1. Immediate UI update
    setFormData(prev => ({ ...prev, clientName: clientName }));
    setActivePackage(null);

    if (!clientName) {
         return;
    }

    // 2. Find client in LOCAL state (Don't call API here, it's too slow)
    const client = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientName: clientName, // Keep casing from input or match? keeping input allows correction
        contactNo: client.contact,
        address: client.address
      }));

      // 3. Only check package if we found a valid existing client
      // Debounce this if needed, but for now calling it only when a valid client is matched is safer
      checkPackage(client.name);
    } 
  };
  
  const checkPackage = async (name: string) => {
     try {
        const pkgStatus = await api.checkClientPackage(name);
        if (pkgStatus) {
            setActivePackage(pkgStatus);
            // Auto-set Service Number
            setFormData(prev => ({ 
                ...prev, 
                numberOfService: pkgStatus.currentServiceNumber,
            }));
        } else {
            setFormData(prev => ({ ...prev, numberOfService: 1 }));
        }
    } catch (e) {
        console.error("Error checking package", e);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification(null);
    setLastSubmittedEntry(null); // Reset last entry

    if (!formData.clientName || !formData.amount || !formData.technician) {
      setNotification({ msg: 'Please fill in all required fields (Client, Technician, Amount).', type: 'error' });
      setLoading(false);
      window.scrollTo(0,0);
      return;
    }

    try {
      const result = await api.addEntry(formData as Entry);
      
      // Store result for invoice generation
      setLastSubmittedEntry(result as Entry);
      
      // Show success
      setNotification({ msg: 'Transaction recorded successfully!', type: 'success' });
      
      // FULL RESET of the form
      setFormData({
          ...initialFormState, 
          date: formData.date // Keep the date as user might be entering multiple for same day
      });
      setActivePackage(null);
      
      window.scrollTo(0,0);
      
      // Hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);

    } catch (error) {
      setNotification({ msg: 'Failed to add entry. Please check your connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const techOptions = technicians.map(t => ({ label: t.name, value: t.name }));
  const patchSizeOptions = items.map(i => ({ label: i.name, value: i.name, subtext: i.category }));

  // Helper styles
  const sectionHeaderStyle = "px-6 py-4 flex items-center justify-between";
  const labelStyle = "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1";
  const inputBaseStyle = "w-full rounded-xl border-gray-200 border bg-gray-50/50 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 focus:bg-white";

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Page Header */}
      <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
         <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-10 -mb-10 blur-2xl"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">New Transaction</h1>
                <p className="text-indigo-100 font-medium opacity-90">Create a new service entry and generate billing.</p>
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                <Calendar className="w-5 h-5 mr-2 text-indigo-100" />
                <span className="font-semibold">{new Date().toDateString()}</span>
            </div>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Notification Banner */}
        {notification && (
          <div className={`mb-6 p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between shadow-lg transform transition-all scale-100 gap-4 ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="flex items-center">
                {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6 mr-3 text-emerald-600" /> : <AlertCircle className="w-6 h-6 mr-3 text-red-600" />}
                <div>
                    <h4 className="font-bold text-sm uppercase">{notification.type === 'success' ? 'Success' : 'Error'}</h4>
                    <p className="font-medium">{notification.msg}</p>
                </div>
            </div>

            {/* Print Button for NEW service types */}
            {notification.type === 'success' && lastSubmittedEntry && lastSubmittedEntry.serviceType === 'NEW' && (
                <button
                    type="button"
                    onClick={() => generateInvoice(lastSubmittedEntry)}
                    className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
                >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Invoice
                </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (Client & Service) */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* 1. Client Card (Blue Theme) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`${sectionHeaderStyle} bg-blue-50/50 border-b border-blue-100 border-t-4 border-t-blue-500`}>
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg mr-3 shadow-sm">
                                <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Client Details</h3>
                                <p className="text-xs text-blue-500 font-medium">Customer Information</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            {/* Updated to Datalist for 'Select Existing or Type New' */}
                            <label className={labelStyle}>Client Name <span className="text-red-500">*</span></label>
                            <input
                                list="client-options"
                                type="text"
                                name="clientName"
                                value={formData.clientName || ''}
                                onChange={(e) => handleClientChange(e.target.value)}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                placeholder="Select Existing or Type New..."
                                required
                                autoComplete="off"
                            />
                            <datalist id="client-options">
                                {clients.map((c, idx) => (
                                    <option key={idx} value={c.name}>{c.contact}</option>
                                ))}
                            </datalist>
                        </div>
                        
                        {/* PACKAGE ALERT BANNER */}
                        {activePackage && (
                             <div className={`col-span-full rounded-xl border p-4 flex items-start gap-3 shadow-sm transition-all duration-300
                                ${activePackage.isExpired 
                                    ? 'bg-red-50 border-red-200 text-red-800' 
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-900'}
                             `}>
                                 <div className={`p-2 rounded-lg ${activePackage.isExpired ? 'bg-red-100' : 'bg-indigo-100'}`}>
                                     <Ticket className="w-6 h-6 shrink-0" />
                                 </div>
                                 <div className="flex-1">
                                     <div className="flex justify-between items-center">
                                         <h4 className="font-bold text-lg">
                                             {activePackage.isExpired ? 'PACKAGE EXPIRED' : activePackage.package.packageName}
                                         </h4>
                                         {!activePackage.isExpired && (
                                             <span className="bg-white/50 px-3 py-1 rounded-md text-sm font-black border border-indigo-100 shadow-sm">
                                                 Remaining: {activePackage.remaining}
                                             </span>
                                         )}
                                     </div>
                                     <p className="font-medium text-sm mt-1 opacity-90">
                                         This is Service <span className="font-bold text-lg">{activePackage.currentServiceNumber}</span> of {activePackage.package.totalServices}
                                     </p>
                                     {activePackage.isExpired && (
                                         <p className="text-xs font-bold mt-2 uppercase tracking-wide bg-red-100/50 p-1 rounded inline-block">
                                             Limit Exceeded. Please charge regular price or renew.
                                         </p>
                                     )}
                                 </div>
                             </div>
                        )}

                        <div>
                            <label className={labelStyle}>Contact Number</label>
                            <input
                                type="text"
                                name="contactNo"
                                value={formData.contactNo || ''}
                                onChange={handleChange}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                placeholder="Client Contact"
                            />
                        </div>
                        <div>
                            <label className={labelStyle}>Address</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                    className={`${inputBaseStyle} pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                    placeholder="Client Address"
                                />
                                <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Service Card (Violet Theme) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className={`${sectionHeaderStyle} bg-violet-50/50 border-b border-violet-100 border-t-4 border-t-violet-500`}>
                        <div className="flex items-center">
                            <div className="p-2 bg-violet-100 rounded-lg mr-3 shadow-sm">
                                <Scissors className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Service Data</h3>
                                <p className="text-xs text-violet-500 font-medium">Work & Technician</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelStyle}>Branch</label>
                            <select
                                name="branch"
                                value={formData.branch}
                                onChange={handleChange}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-violet-500 focus:border-violet-500`}
                            >
                                <option value="BSP">BSP</option>
                                <option value="RPR">RPR</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Transaction Date</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-violet-500 focus:border-violet-500`}
                                required
                            />
                        </div>

                         <div className="md:col-span-2 border-t border-dashed border-gray-200 my-2"></div>

                        <div>
                            <label className={labelStyle}>Service Type</label>
                            <select
                                name="serviceType"
                                value={formData.serviceType}
                                onChange={handleChange}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-semibold`}
                            >
                                <option value="SERVICE">SERVICE</option>
                                <option value="NEW">NEW</option>
                                <option value="DEMO">DEMO</option>
                                <option value="MUNDAN">MUNDAN</option>
                            </select>
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
                            <label className={labelStyle}>Patch Method</label>
                            <select
                                name="patchMethod"
                                value={formData.patchMethod}
                                onChange={handleChange}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-violet-500 focus:border-violet-500`}
                            >
                                <option value="TAPING">TAPING</option>
                                <option value="BONDING">BONDING</option>
                                <option value="CLIPPING">CLIPPING</option>
                            </select>
                        </div>
                        
                         <div className="md:col-span-2">
                             <SearchableSelect 
                                label="TECHNICIAN ASSIGNED"
                                options={techOptions}
                                value={formData.technician || ''}
                                onChange={(val) => setFormData(prev => ({ ...prev, technician: val }))}
                                placeholder="Select Technician..."
                                required
                            />
                        </div>
                        
                        <div>
                            <label className={labelStyle}>Number of Service</label>
                            <input
                                type="number"
                                name="numberOfService"
                                value={formData.numberOfService}
                                onChange={handleChange}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-violet-500 focus:border-violet-500 font-semibold`}
                            />
                        </div>
                        
                         <div className="md:col-span-2">
                            <label className={labelStyle}>Remarks / Notes</label>
                            <textarea
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                rows={2}
                                className={`${inputBaseStyle} focus:ring-2 focus:ring-violet-500 focus:border-violet-500`}
                                placeholder="Any additional details..."
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column (Payment) */}
            <div className="lg:col-span-4 space-y-8">
                {/* 3. Payment Card (Emerald Theme) */}
                <div className="bg-white rounded-2xl shadow-lg shadow-emerald-50 border border-emerald-100 overflow-hidden sticky top-6">
                    <div className={`${sectionHeaderStyle} bg-emerald-50/50 border-b border-emerald-100 border-t-4 border-t-emerald-500`}>
                        <div className="flex items-center">
                            <div className="p-2 bg-emerald-100 rounded-lg mr-3 shadow-sm">
                                <CreditCard className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Payment</h3>
                        </div>
                    </div>
                     <div className="p-6 space-y-8">
                         <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 text-center">
                            <label className="text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2 block">Total Amount</label>
                            <div className="relative flex justify-center items-center">
                                <span className="text-emerald-500 text-3xl font-bold mr-2">₹</span>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    className="w-40 bg-transparent text-4xl font-black text-gray-800 text-center border-b-2 border-emerald-300 focus:border-emerald-600 focus:outline-none placeholder-gray-300"
                                    placeholder="0"
                                    min="0"
                                    required
                                />
                            </div>
                        </div>
                        
                         <div>
                            <label className={labelStyle}>Payment Method</label>
                             <div className="grid grid-cols-2 gap-3 mt-3">
                                {['CASH', 'UPI', 'CARD', 'PENDING'].map(method => {
                                    const activeColors: Record<string, string> = {
                                        'CASH': 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200',
                                        'UPI': 'bg-blue-500 border-blue-600 text-white shadow-blue-200',
                                        'CARD': 'bg-violet-500 border-violet-600 text-white shadow-violet-200',
                                        'PENDING': 'bg-red-500 border-red-600 text-white shadow-red-200',
                                    };
                                    const isActive = formData.paymentMethod === method;
                                    
                                    return (
                                        <button
                                            type="button"
                                            key={method}
                                            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method as any }))}
                                            className={`py-3 px-2 text-sm font-bold rounded-xl border transition-all duration-200 shadow-sm
                                                ${isActive 
                                                    ? `${activeColors[method]} shadow-lg transform scale-105` 
                                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}`}
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
                            className={`w-full group flex items-center justify-center py-4 px-6 rounded-xl shadow-xl text-base font-bold text-white transition-all transform duration-200
                                ${loading 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-indigo-200'}`}
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                            )}
                            {loading ? 'Processing...' : 'COMPLETE TRANSACTION'}
                        </button>
                     </div>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
};

export default NewEntryForm;