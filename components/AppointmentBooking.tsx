import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Appointment, Client } from '../types';
import { Calendar, CheckCircle, Clock, Filter, Activity, CheckSquare, Plus, Search, Phone, MessageCircle, RefreshCw, CalendarClock, History, ArrowRightCircle } from 'lucide-react';

const AppointmentBooking: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Tabs: 'SCHEDULE' for Today/Upcoming, 'HISTORY' for Closed/Leads
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'HISTORY'>('SCHEDULE');
  const [searchFilter, setSearchFilter] = useState('');
  
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    contact: '',
    address: '',
    note: '',
    status: 'PENDING'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [apptData, options] = await Promise.all([
      api.getAppointments(),
      api.getOptions()
    ]);
    // Sort: Today first, then Pending, then Future date
    const sorted = apptData.sort((a, b) => {
        if (a.date === todayStr && b.date !== todayStr) return -1;
        if (a.date !== todayStr && b.date === todayStr) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    setAppointments(sorted);
    setClients(options.clients);
  };

  const handleRecall = (appt: Appointment) => {
      // Logic to "Re-book" a past client
      setNewAppt({
          date: todayStr, // Default to today
          clientName: appt.clientName,
          contact: appt.contact,
          address: appt.address,
          note: `Follow up: Last visit was on ${appt.date}`,
          status: 'PENDING'
      });
      // Scroll to top of main container
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (newAppt.clientName && newAppt.date) {
        await api.addAppointment(newAppt as Appointment);
        setNewAppt({ ...newAppt, clientName: '', contact: '', address: '', note: '' }); // Keep date
        await loadData();
        // Scroll to top of main container after successful booking
        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Filter Logic
  const filteredAppointments = appointments.filter(a => {
      // Tab Logic
      const isHistory = a.status === 'CLOSED';
      if (activeTab === 'SCHEDULE' && isHistory) return false;
      if (activeTab === 'HISTORY' && !isHistory) return false;

      // Search Logic
      const searchSafe = searchFilter.toLowerCase();
      return (
          (a.clientName || '').toLowerCase().includes(searchSafe) || 
          String(a.contact || '').includes(searchFilter)
      );
  });

  // Split Schedule into "Today", "Overdue" and "Upcoming" for the Schedule Tab
  const todayAppointments = filteredAppointments.filter(a => a.date === todayStr && activeTab === 'SCHEDULE');
  const otherAppointments = filteredAppointments.filter(a => a.date !== todayStr && activeTab === 'SCHEDULE');
  
  // For History Tab, show all filtered
  const historyAppointments = filteredAppointments;

  // Stats
  const todayCount = appointments.filter(a => a.date === todayStr && a.status !== 'CLOSED').length;
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const closedCount = appointments.filter(a => a.status === 'CLOSED').length;

  const card3D = "bg-white rounded-2xl shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)] border border-slate-200 p-4 relative overflow-hidden transition-transform hover:-translate-y-1";

  const renderAppointmentCard = (appt: Appointment, isToday: boolean = false) => {
      const isOverdue = !isToday && new Date(appt.date) < new Date(todayStr) && appt.status === 'PENDING';
      
      return (
        <div key={appt.id} className={`
            relative p-4 rounded-2xl border transition-all duration-300 group
            ${isToday 
                ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-300 shadow-md shadow-indigo-100' 
                : isOverdue 
                    ? 'bg-red-50 border-red-300' 
                    : 'bg-white border-slate-300 hover:shadow-md'}
        `}>
            {isToday && (
                <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> TODAY'S VISIT
                </div>
            )}
            {isOverdue && (
                <div className="absolute -top-3 left-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                    OVERDUE
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                {/* Left: Date & Name */}
                <div className="flex items-start gap-4">
                    <div className={`
                        flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2
                        ${isToday ? 'bg-white border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500'}
                    `}>
                        <span className="text-xs font-bold uppercase">{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-2xl font-black leading-none">{new Date(appt.date).getDate()}</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">{appt.clientName}</h4>
                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                            <span>{appt.contact}</span>
                            {appt.address && (
                                <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="truncate max-w-[120px]">{appt.address}</span>
                                </>
                            )}
                        </div>
                        {appt.note && (
                            <div className="mt-1 text-xs text-slate-400 italic bg-white/50 px-2 py-0.5 rounded inline-block border border-slate-100">
                                Note: {appt.note}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {/* Communication Buttons */}
                    {appt.contact && (
                        <>
                            <a href={`tel:${appt.contact}`} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-600 transition-colors border border-slate-200 hover:border-green-200">
                                <Phone className="w-4 h-4" />
                            </a>
                            <a 
                                href={`https://wa.me/91${String(appt.contact).replace(/\D/g,'')}?text=Hello ${appt.clientName}, regarding your appointment at Mahaveer Hair Solution.`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors border border-slate-200 hover:border-emerald-200"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </a>
                        </>
                    )}

                    <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

                    {/* Status Actions */}
                    {activeTab === 'SCHEDULE' ? (
                        <>
                            <button 
                                onClick={() => updateStatus(appt.id, 'FOLLOWUP')}
                                className="px-3 py-2 rounded-xl bg-amber-50 text-amber-600 font-bold text-xs hover:bg-amber-100 border border-amber-200 transition-colors"
                            >
                                Follow Up
                            </button>
                            <button 
                                onClick={() => updateStatus(appt.id, 'CLOSED')}
                                className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center border border-indigo-700"
                            >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Done
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={() => handleRecall(appt)}
                            className="px-4 py-2 rounded-xl bg-white border-2 border-indigo-200 text-indigo-600 font-bold text-xs hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center shadow-sm"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-2" />
                            Re-book
                        </button>
                    )}
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
        
        {/* Top Stats - Dashboard Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${card3D} bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-indigo-600`}>
                <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Today's Appointments</p>
                        <h3 className="text-3xl font-black mt-1">{todayCount}</h3>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                        <CalendarClock className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>
             <div className={card3D}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Pending Total</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{pendingCount}</h3>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-500 border border-amber-100">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>
            </div>
             <div className={card3D}>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Leads / Closed</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{closedCount}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 border border-emerald-100">
                        <History className="w-6 h-6" />
                    </div>
                </div>
            </div>
        </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left: Booking Form */}
        <div className="lg:w-1/3 order-1">
            <div className="bg-white rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-300 overflow-hidden sticky top-6 backdrop-blur-sm">
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black flex items-center">
                           <Plus className="w-5 h-5 mr-2 text-indigo-400" />
                           Book Visit
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Schedule or Follow-up</p>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Date</label>
                        <input
                            type="date"
                            value={newAppt.date}
                            onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-bold"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Client Name</label>
                        <input
                            type="text"
                            value={newAppt.clientName || ''}
                            onChange={e => setNewAppt({...newAppt, clientName: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-bold"
                            placeholder="Enter Client Name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Contact Number</label>
                        <input
                            type="text"
                            value={newAppt.contact}
                            onChange={e => setNewAppt({...newAppt, contact: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-medium"
                            placeholder="Phone number"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Location</label>
                        <input
                            type="text"
                            value={newAppt.address}
                            onChange={e => setNewAppt({...newAppt, address: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-medium"
                            placeholder="City / Area"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Reason / Note</label>
                        <textarea
                            value={newAppt.note}
                            onChange={e => setNewAppt({...newAppt, note: e.target.value})}
                            rows={3}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
                            placeholder="e.g. Monthly maintenance"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-300 transition-all flex justify-center items-center active:scale-95 hover:-translate-y-1 border border-indigo-800"
                    >
                        {loading ? 'Processing...' : 'Confirm Booking'}
                    </button>
                </form>
            </div>
        </div>

        {/* Right: Lists (Schedule & Leads) */}
        <div className="lg:w-2/3 order-2 space-y-6">
            
            {/* Tab Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto border border-slate-200">
                    <button
                        onClick={() => setActiveTab('SCHEDULE')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center border
                            ${activeTab === 'SCHEDULE' ? 'bg-white text-indigo-600 shadow-md border-indigo-100' : 'text-slate-500 hover:text-indigo-600 border-transparent'}`}
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center border
                            ${activeTab === 'HISTORY' ? 'bg-white text-emerald-600 shadow-md border-emerald-100' : 'text-slate-500 hover:text-emerald-600 border-transparent'}`}
                    >
                        <History className="w-4 h-4 mr-2" /> History / Leads
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search name or number..." 
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                </div>
            </div>

            {/* List Content */}
            {activeTab === 'SCHEDULE' && (
                <div className="space-y-6">
                    {/* Today's Section - Only show if there are appointments */}
                    {todayAppointments.length > 0 && (
                         <div className="animate-in fade-in slide-in-from-bottom-4">
                             <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center">
                                 <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span>
                                 Today's Schedule ({todayAppointments.length})
                             </h3>
                             <div className="space-y-3">
                                 {todayAppointments.map(appt => renderAppointmentCard(appt, true))}
                             </div>
                         </div>
                    )}

                    {/* Other Upcoming */}
                    <div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 mt-4">Upcoming & Pending</h3>
                        <div className="space-y-3">
                            {otherAppointments.length > 0 ? (
                                otherAppointments.map(appt => renderAppointmentCard(appt))
                            ) : (
                                <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-2xl">
                                    <p className="text-slate-400 font-medium text-sm">No upcoming appointments found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History / Leads Tab */}
            {activeTab === 'HISTORY' && (
                <div className="animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-black text-emerald-800 uppercase tracking-widest">Closed Appointments (Leads)</h3>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold border border-emerald-200">{historyAppointments.length} Records</span>
                    </div>
                    
                    <div className="space-y-3">
                         {historyAppointments.length > 0 ? (
                             historyAppointments.map(appt => renderAppointmentCard(appt))
                         ) : (
                             <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center shadow-sm">
                                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 border border-slate-100">
                                     <CheckSquare className="w-8 h-8" />
                                 </div>
                                 <h4 className="text-slate-800 font-bold mb-1">No History Found</h4>
                                 <p className="text-slate-400 text-sm">Completed appointments will appear here.</p>
                             </div>
                         )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;
