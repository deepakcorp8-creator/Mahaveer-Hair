import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Appointment, Client } from '../types';
import { Calendar, CheckCircle, Clock, Filter, Activity, CheckSquare, Plus, Search } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

const AppointmentBooking: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'FOLLOWUP' | 'CLOSED'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    contact: '',
    note: '',
    status: 'PENDING'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [apptData, options] = await Promise.all([
      api.getAppointments(),
      api.getOptions()
    ]);
    // Sort appointments: Pending first, then by date desc
    const sorted = apptData.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    setAppointments(sorted);
    setClients(options.clients);
  };

  const handleClientChange = (val: string) => {
    const client = clients.find(c => c.name === val);
    if (client) {
      setNewAppt(prev => ({
        ...prev,
        clientName: client.name,
        contact: client.contact
      }));
    } else {
       // Handle case where user clears selection
       setNewAppt(prev => ({ ...prev, clientName: val, contact: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (newAppt.clientName && newAppt.date) {
        await api.addAppointment(newAppt as Appointment);
        
        // Immediate UI Update before fetch
        setNewAppt(prev => ({ ...prev, clientName: '', contact: '', note: '' }));
        
        // Refresh list
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    await api.updateAppointmentStatus(id, status);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'FOLLOWUP': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CLOSED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(a => {
      const matchesStatus = statusFilter === 'ALL' ? true : a.status === statusFilter;
      const matchesSearch = searchFilter === '' ? true : 
        a.clientName.toLowerCase().includes(searchFilter.toLowerCase()) || 
        a.contact.includes(searchFilter);
      return matchesStatus && matchesSearch;
  });

  // Calculate stats
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const followupCount = appointments.filter(a => a.status === 'FOLLOWUP').length;
  const closedCount = appointments.filter(a => a.status === 'CLOSED').length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-amber-100 flex flex-col md:flex-row items-center md:justify-between text-center md:text-left">
                <div>
                    <p className="text-amber-600 font-bold text-[10px] md:text-xs uppercase tracking-wider">Pending</p>
                    <h3 className="text-xl md:text-2xl font-black text-gray-800">{pendingCount}</h3>
                </div>
                <div className="hidden md:block p-2 bg-amber-50 rounded-full text-amber-600">
                    <Clock className="w-5 h-5" />
                </div>
            </div>
             <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col md:flex-row items-center md:justify-between text-center md:text-left">
                <div>
                    <p className="text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-wider">Follow Up</p>
                    <h3 className="text-xl md:text-2xl font-black text-gray-800">{followupCount}</h3>
                </div>
                <div className="hidden md:block p-2 bg-blue-50 rounded-full text-blue-600">
                    <Activity className="w-5 h-5" />
                </div>
            </div>
             <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col md:flex-row items-center md:justify-between text-center md:text-left">
                <div>
                    <p className="text-emerald-600 font-bold text-[10px] md:text-xs uppercase tracking-wider">Closed</p>
                    <h3 className="text-xl md:text-2xl font-black text-gray-800">{closedCount}</h3>
                </div>
                <div className="hidden md:block p-2 bg-emerald-50 rounded-full text-emerald-600">
                    <CheckSquare className="w-5 h-5" />
                </div>
            </div>
        </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Booking Form */}
        <div className="lg:w-1/3 order-1 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden sticky top-6">
                <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Appointment
                    </h3>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Date</label>
                        <input
                            type="date"
                            value={newAppt.date}
                            onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                            className="w-full rounded-xl border-gray-200 border bg-gray-50/50 px-4 py-3 text-gray-900 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-semibold"
                            required
                        />
                    </div>
                    
                    <div>
                         {/* Replaced Standard Input with Mobile Friendly SearchableSelect */}
                         <SearchableSelect 
                            label="Client"
                            options={clients.map(c => ({ label: c.name, value: c.name, subtext: c.contact }))}
                            value={newAppt.clientName || ''}
                            onChange={handleClientChange}
                            placeholder="Select Client..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Contact Number</label>
                        <input
                            type="text"
                            value={newAppt.contact}
                            onChange={e => setNewAppt({...newAppt, contact: e.target.value})}
                            className="w-full rounded-xl border-gray-200 border bg-gray-50/50 px-4 py-3 text-gray-900 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="Phone number"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">Note / Reason</label>
                        <textarea
                            value={newAppt.note}
                            onChange={e => setNewAppt({...newAppt, note: e.target.value})}
                            rows={3}
                            className="w-full rounded-xl border-gray-200 border bg-gray-50/50 px-4 py-3 text-gray-900 shadow-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="Any details..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center active:scale-95"
                    >
                        {loading ? 'Booking...' : <><Plus className="w-5 h-5 mr-2" /> Book Appointment</>}
                    </button>
                </form>
            </div>
        </div>

        {/* List */}
        <div className="lg:w-2/3 order-2 lg:order-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800">Scheduled List</h3>
                    
                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                         <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="text-sm border-gray-200 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 w-full bg-white"
                            >
                                <option value="ALL">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="FOLLOWUP">Follow Up</option>
                                <option value="CLOSED">Closed</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                        <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Client Details</th>
                        <th className="px-6 py-4">Note</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredAppointments.map(appt => (
                        <tr key={appt.id} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">{appt.date}</td>
                            <td className="px-6 py-4">
                                <div className="font-bold text-gray-900 text-base">{appt.clientName}</div>
                                <div className="text-gray-500 text-xs font-medium">{appt.contact}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{appt.note || '-'}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md border ${getStatusColor(appt.status)}`}>
                                    {appt.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                    {appt.status !== 'CLOSED' ? (
                                        <>
                                        <button 
                                            onClick={() => updateStatus(appt.id, 'CLOSED')} 
                                            className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm" 
                                            title="Mark as Done"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => updateStatus(appt.id, 'FOLLOWUP')} 
                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm" 
                                            title="Mark for Follow Up"
                                        >
                                            <Activity className="w-4 h-4" />
                                        </button>
                                        </>
                                    ) : (
                                        <span className="text-gray-300 italic text-xs py-2 px-3 border border-transparent">Archived</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                        ))}
                        {filteredAppointments.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                <div className="flex flex-col items-center">
                                    <div className="bg-gray-50 p-4 rounded-full mb-3">
                                        <Calendar className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p>No appointments found.</p>
                                </div>
                            </td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;