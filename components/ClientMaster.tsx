
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client } from '../types';
import { Search, UserPlus, Loader2, Pencil, X, Save, User as UserIcon } from 'lucide-react';

const ClientMaster: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Edit State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOriginalName, setEditingOriginalName] = useState('');
  
  const [formData, setFormData] = useState<Client>({
    name: '', contact: '', address: '', gender: 'Male', email: '', dob: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await api.getOptions(true);
    setClients(data.clients);
  };

  const handleOpenAdd = () => {
      setIsEditMode(false);
      setFormData({ name: '', contact: '', address: '', gender: 'Male', email: '', dob: '' });
      setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
      setIsEditMode(true);
      setEditingOriginalName(client.name);
      setFormData({ ...client });
      setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
        if (isEditMode) {
            await api.updateClient(formData, editingOriginalName);
        } else {
            await api.addClient(formData);
        }
        setShowModal(false);
        setFormData({ name: '', contact: '', address: '', gender: 'Male', email: '', dob: '' });
        loadClients();
    } catch (e) {
        console.error(e);
        alert("Failed to save client.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(c.contact || '').includes(searchTerm)
  );

  const inputClass = "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all font-bold placeholder:font-normal";
  const labelClass = "block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Client Master</h2>
            <p className="text-slate-500 font-medium">Manage master customer records</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl flex items-center font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:scale-95"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add New Client
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by Name or Contact..." 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{filteredClients.length} Verified Records</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-8 py-5">Client Identity</th>
                <th className="px-8 py-5">Contact Details</th>
                <th className="px-8 py-5">Location</th>
                <th className="px-8 py-5">Profile info</th>
                <th className="px-8 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                      <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 flex items-center justify-center mr-4 text-indigo-600 font-black text-sm shadow-sm group-hover:scale-110 transition-transform">
                              {client.name.charAt(0)}
                          </div>
                          <div className="font-black text-slate-800 text-base">{client.name}</div>
                      </div>
                  </td>
                  <td className="px-8 py-5">
                      <div className="font-bold text-slate-700">{client.contact}</div>
                      <div className="text-xs text-blue-500 font-bold mt-0.5">{client.email || 'No email provided'}</div>
                  </td>
                  <td className="px-8 py-5">
                      <div className="text-slate-600 font-medium truncate max-w-[200px]">{client.address || 'Global'}</div>
                  </td>
                  <td className="px-8 py-5">
                      <div className="flex gap-2">
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 border border-slate-200">{client.gender}</span>
                          <span className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-black uppercase text-indigo-600 border border-indigo-100">{client.dob || 'N/A'}</span>
                      </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                      <button 
                         onClick={() => handleOpenEdit(client)}
                         className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
                         title="Edit Client Information"
                      >
                          <Pencil className="w-4 h-4" />
                      </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-black italic">No records found matching your search criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
                <div className="flex items-center">
                    <div className="p-3 bg-indigo-500/20 rounded-xl mr-4">
                        <UserIcon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">{isEditMode ? 'Update Identity' : 'Enroll Client'}</h3>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Master Database Sync</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} className="hover:bg-slate-800 p-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div>
                <label className={labelClass}>Full Legal Name</label>
                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Sharma" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className={labelClass}>Contact Number</label>
                    <input required type="text" className={inputClass} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="98765 43210" />
                </div>
                 <div>
                    <label className={labelClass}>Gender Identity</label>
                    <select className={inputClass} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Electronic Mail (Optional)</label>
                <input type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="name@domain.com" />
              </div>
              <div>
                <label className={labelClass}>Primary Residence Address</label>
                <input type="text" className={inputClass} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="City, Colony, Floor" />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" className={inputClass} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={isSubmitting} 
                  className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-colors uppercase tracking-widest text-xs border-2 border-slate-100"
                >
                    Dismiss
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 uppercase tracking-widest text-sm"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-3" /> {isEditMode ? 'Update Record' : 'Finalize Registry'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMaster;
