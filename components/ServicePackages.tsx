import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ServicePackage, Client } from '../types';
import { PackageCheck, Plus, Search, Tag, Users } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const ServicePackages: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newPkg, setNewPkg] = useState<Partial<ServicePackage>>({
    clientName: '',
    contact: '',
    packageName: '',
    totalCost: 0,
    totalServices: 12, // Default
    startDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pkgData, options] = await Promise.all([
      api.getPackages(),
      api.getOptions()
    ]);
    setPackages(pkgData);
    setClients(options.clients);
  };

  const handleClientChange = (name: string) => {
      const client = clients.find(c => c.name === name);
      if (client) {
          setNewPkg(prev => ({ ...prev, clientName: client.name, contact: client.contact }));
      } else {
          setNewPkg(prev => ({ ...prev, clientName: '', contact: '' }));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        if(newPkg.clientName && newPkg.packageName && newPkg.totalServices) {
            await api.addPackage(newPkg as ServicePackage);
            await loadData();
            // Reset form
            setNewPkg({
                clientName: '',
                contact: '',
                packageName: '',
                totalCost: 0,
                totalServices: 12,
                startDate: new Date().toISOString().split('T')[0],
                status: 'ACTIVE'
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const filteredPackages = packages.filter(p => 
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.packageName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Package Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center">
                <PackageCheck className="w-5 h-5 text-indigo-600 mr-2" />
                <h3 className="font-bold text-indigo-900">Create New Package</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                     <SearchableSelect 
                        label="Select Client"
                        options={clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact }))}
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
                    {loading ? 'Creating...' : <><Plus className="w-5 h-5 mr-1" /> Create Package</>}
                </button>
            </form>
        </div>
      </div>

      {/* Package List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800">Active Packages</h2>
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
            {filteredPackages.map(pkg => (
                <div key={pkg.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-bl-xl">
                        {pkg.status}
                    </div>
                    
                    <div className="flex items-start mb-3">
                        <div className="p-2 bg-indigo-50 rounded-lg mr-3">
                            <Tag className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-slate-800">{pkg.packageName}</h4>
                            <div className="flex items-center text-sm text-slate-500 mt-1">
                                <Users className="w-3 h-3 mr-1" /> {pkg.clientName}
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm mt-4 border-t border-slate-100 pt-4">
                        <div>
                            <span className="block text-slate-400 text-xs">Total Cost</span>
                            <span className="font-bold text-slate-800">₹{pkg.totalCost}</span>
                        </div>
                        <div>
                            <span className="block text-slate-400 text-xs">Limit</span>
                            <span className="font-bold text-slate-800">{pkg.totalServices} Times</span>
                        </div>
                         <div>
                            <span className="block text-slate-400 text-xs">Started</span>
                            <span className="font-medium text-slate-800">{pkg.startDate}</span>
                        </div>
                    </div>
                </div>
            ))}
            
            {filteredPackages.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                    No packages found matching your search.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ServicePackages;
