import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Appointment, Client } from '../types';
import { Calendar, CheckCircle, Clock, XCircle, Filter, Activity, CheckSquare } from 'lucide-react';

const AppointmentBooking: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'FOLLOWUP' | 'CLOSED'>('ALL');
  
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
    setAppointments(apptData);
    setClients(options.clients);
  };

  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const client = clients.find(c => c.name === e.target.value);
    if (client) {
      setNewAppt(prev => ({
        ...prev,
        clientName: client.name,
        contact: client.contact
      }));
    } else {
      setNewAppt(prev => ({ ...prev, clientName: e.target.value, contact: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (newAppt.clientName && newAppt.date) {
        await api.addAppointment(newAppt as Appointment);
        // Refresh list
        await loadData();
        // Reset form but keep date
        setNewAppt(prev => ({ ...prev, clientName: '', contact: '', note: '' }));
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
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FOLLOWUP': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CLOSED': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(a => {
      if (statusFilter === 'ALL') return true;
      return a.status === statusFilter;
  });

  // Calculate stats
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const followupCount = appointments.filter(a => a.status === 'FOLLOWUP').length;
  const closedCount = appointments.filter(a => a.status === 'CLOSED').length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200 flex items-center justify-between">
                <div>
                    <p className="text-yellow-600 font-bold text-xs uppercase">Pending</p>
                    <h3 className="text-2xl font-black text-gray-800">{pendingCount}</h3>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                    <Clock className="w-5 h-5" />
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 flex items-center justify-between">
                <div>
                    <p className="text-blue-600 font-bold text-xs uppercase">Follow Up</p>
                    <h3 className="text-2xl font-black text-gray-800">{followupCount}</h3>
                </div>
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                    <Activity className="w-5 h-5" />
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border border-green-200 flex items-center justify-between">
                <div>
                    <p className="text-green-600 font-bold text-xs uppercase">Closed</p>
                    <h3 className="text-2xl font-black text-gray-800">{closedCount}</h3>
                </div>
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                    <CheckSquare className="w-5 h-5" />
                </div>
            </div>
        </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Booking Form */}
        <div className="lg:w-1/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b bg-indigo-600">
                <h3 className="text-lg font-bold text-white flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Book Appointment
                </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                    type="date"
                    value={newAppt.date}
                    onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                    required
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <select
                    value={newAppt.clientName}
                    onChange={handleClientSelect}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                >
                    <option value="">Select Existing or Type New</option>
                    {clients.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700">Contact</label>
                <input
                    type="text"
                    value={newAppt.contact}
                    onChange={e => setNewAppt({...newAppt, contact: e.target.value})}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <textarea
                    value={newAppt.note}
                    onChange={e => setNewAppt({...newAppt, note: e.target.value})}
                    rows={3}
                    className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                />
                </div>
                <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                {loading ? 'Booking...' : 'Book Appointment'}
                </button>
            </form>
            </div>
        </div>

        {/* List */}
        <div className="lg:w-2/3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-800">Scheduled Appointments</h3>
                
                {/* Filter Controls */}
                <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-1"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="FOLLOWUP">Follow Up</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-500 uppercase text-xs">
                    <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Note</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredAppointments.map(appt => (
                    <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700">{appt.date}</td>
                        <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{appt.clientName}</div>
                        <div className="text-gray-500 text-xs">{appt.contact}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{appt.note}</td>
                        <td className="px-6 py-4">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${getStatusColor(appt.status)}`}>
                            {appt.status}
                        </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        {appt.status !== 'CLOSED' && (
                            <>
                            <button onClick={() => updateStatus(appt.id, 'CLOSED')} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100" title="Close">
                                <CheckCircle className="w-5 h-5" />
                            </button>
                            <button onClick={() => updateStatus(appt.id, 'FOLLOWUP')} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100" title="Follow Up">
                                <Clock className="w-5 h-5" />
                            </button>
                            </>
                        )}
                        {appt.status === 'CLOSED' && (
                            <span className="text-gray-300 italic text-xs">Archived</span>
                        )}
                        </td>
                    </tr>
                    ))}
                    {filteredAppointments.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        No appointments found for selected filter.
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
