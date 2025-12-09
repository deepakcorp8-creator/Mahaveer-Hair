
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client } from '../types';
import { Search, UserPlus, Loader2 } from 'lucide-react';

const ClientMaster: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newClient, setNewClient] = useState<Client>({
    name: '', contact: '', address: '', gender: 'Male', email: '', dob: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const data = await api.getOptions();
    setClients(data.clients);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
        await api.addClient(newClient);
        setShowModal(false);
        setNewClient({ name: '', contact: '', address: '', gender: 'Male', email: '', dob: '' });
        loadClients();
    } catch (e) {
        console.error(e);
    } finally {
        setIsSubmitting(false);
    }
  };

  // FIX: Cast properties to string to ensure .includes() works correctly on all data types
  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(c.contact || '').includes(searchTerm)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Client Master</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-blue-700"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Client
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by Name or Contact..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Address</th>
                <th className="px-6 py-3">Gender</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">DOB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-3">{client.contact}</td>
                  <td className="px-6 py-3">{client.address}</td>
                  <td className="px-6 py-3">{client.gender}</td>
                  <td className="px-6 py-3 text-blue-600">{client.email}</td>
                  <td className="px-6 py-3">{client.dob}</td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Add New Client</h3>
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input required type="text" className="w-full border rounded p-2" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Contact</label>
                    <input required type="text" className="w-full border rounded p-2" value={newClient.contact} onChange={e => setNewClient({...newClient, contact: e.target.value})} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <select className="w-full border rounded p-2" value={newClient.gender} onChange={e => setNewClient({...newClient, gender: e.target.value as any})}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="w-full border rounded p-2" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" className="w-full border rounded p-2" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">DOB</label>
                <input type="date" className="w-full border rounded p-2" value={newClient.dob} onChange={e => setNewClient({...newClient, dob: e.target.value})} />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} disabled={isSubmitting} className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className={`px-4 py-2 text-white rounded flex items-center ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Client'}
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
