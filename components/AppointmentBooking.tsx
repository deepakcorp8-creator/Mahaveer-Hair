
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Appointment, Client } from '../types';
import { Calendar, CheckCircle, Clock, Filter, Activity, CheckSquare, Plus, Search, Phone, MessageCircle, RefreshCw, CalendarClock, History, ArrowRightCircle, Megaphone, UserCheck, XCircle, MapPin } from 'lucide-react';

const AppointmentBooking: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Tabs: 'SCHEDULE' (Pending), 'LEADS' (Followup), 'HISTORY' (Closed)
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'LEADS' | 'HISTORY'>('SCHEDULE');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Time Parts State for 12H Format
  const [timeParts, setTimeParts] = useState({
      hour: '10',
      minute: '00',
      period: 'AM'
  });

  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    contact: '',
    address: '',
    note: '',
    status: 'PENDING',
    branch: 'RPR', // Default
    time: '10:00 AM'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  // Update newAppt.time whenever parts change
  useEffect(() => {
      setNewAppt(prev => ({
          ...prev,
          time: `${timeParts.hour}:${timeParts.minute} ${timeParts.period}`
      }));
  }, [timeParts]);

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
      // Logic to "Re-book" a past client (Creates NEW record)
      setNewAppt({
          date: todayStr, // Default to today
          clientName: appt.clientName,
          contact: appt.contact,
          address: appt.address,
          note: `Re-booking: Last visit was on ${appt.date}`,
          status: 'PENDING',
          branch: appt.branch || 'RPR',
          time: '10:00 AM'
      });
      setTimeParts({ hour: '10', minute: '00', period: 'AM' });
      // Scroll to top of main container
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    setLoading(true);
    try {
      if (newAppt.clientName && newAppt.date) {
        await api.addAppointment(newAppt as Appointment);
        // Reset form but keep Branch/Date potentially
        setNewAppt({ 
            ...newAppt, 
            clientName: '', 
            contact: '', 
            address: '', 
            note: '',
            time: '10:00 AM'
        }); 
        setTimeParts({ hour: '10', minute: '00', period: 'AM' });
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
      // Search Logic
      const searchSafe = searchFilter.toLowerCase();
      const matchesSearch = (a.clientName || '').toLowerCase().includes(searchSafe) || String(a.contact || '').includes(searchFilter);
      
      if (!matchesSearch) return false;

      if (activeTab === 'SCHEDULE') return a.status === 'PENDING';
      if (activeTab === 'LEADS') return a.status === 'FOLLOWUP';
      if (activeTab === 'HISTORY') return a.status === 'CLOSED';
      
      return false;
  });

  // Split Schedule into "Today" and "Upcoming"
  const todayAppointments = filteredAppointments.filter(a => a.date === todayStr && activeTab === 'SCHEDULE');
  const otherAppointments = filteredAppointments.filter(a => a.date !== todayStr && activeTab === 'SCHEDULE');
  
  // Stats
  const todayCount = appointments.filter(a => a.date === todayStr && a.status === 'PENDING').length;
  const pendingCount = appointments.filter(a => a.status === 'PENDING').length;
  const followupCount = appointments.filter(a => a.status === 'FOLLOWUP').length;

  const renderAppointmentCard = (appt: Appointment, isToday: boolean = false) => {
      const isOverdue = !isToday && new Date(appt.date) < new Date(todayStr) && appt.status === 'PENDING';
      const isLead = appt.status === 'FOLLOWUP';
      const isClosed = appt.status === 'CLOSED';
      
      return (
        <div key={appt.id} className={`
            relative p-4 rounded-2xl border transition-all duration-300 group shadow-sm
            ${isToday 
                ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-300 shadow-lg shadow-indigo-100/50' 
                : isLead
                    ? 'bg-amber-50/50 border-amber-200 hover:shadow-md'
                    : isClosed
                        ? 'bg-slate-50 border-slate-200 opacity-90'
                    : isOverdue 
                        ? 'bg-red-50 border-red-300 shadow-red-100' 
                        : 'bg-white border-slate-200 hover:shadow-md hover:border-indigo-200'}
        `}>
            {isToday && (
                <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center border border-indigo-700">
                    <Clock className="w-3 h-3 mr-1" /> TODAY'S VISIT
                </div>
            )}
            {isOverdue && (
                <div className="absolute -top-3 left-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md border border-red-600">
                    OVERDUE
                </div>
            )}
            {isLead && (
                 <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center border border-amber-600">
                    <Megaphone className="w-3 h-3 mr-1" /> ACTIVE LEAD
                </div>
            )}
             {isClosed && (
                 <div className="absolute -top-3 left-4 bg-slate-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md flex items-center border border-slate-700">
                    <CheckCircle className="w-3 h-3 mr-1" /> COMPLETED
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
                {/* Left: Date & Name */}
                <div className="flex items-start gap-4">
                    <div className={`
                        flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 shadow-sm
                        ${isToday ? 'bg-white border-indigo-200 text-indigo-700' : isLead ? 'bg-amber-100 border-amber-200 text-amber-700' : isClosed ? 'bg-slate-100 border-slate-300 text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-600'}
                    `}>
                        <span className="text-xs font-bold uppercase">{new Date(appt.date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-2xl font-black leading-none">{new Date(appt.date).getDate()}</span>
                    </div>
                    <div>
                        <h4 className={`font-black text-lg ${isClosed ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-800'}`}>{appt.clientName}</h4>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-bold">
                            <span>{appt.contact}</span>
                            {appt.time && (
                                <span className="flex items-center text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-xs uppercase">
                                    <Clock className="w-3 h-3 mr-1" /> {appt.time}
                                </span>
                            )}
                            {appt.branch && (
                                <span className="flex items-center text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs uppercase">
                                    <MapPin className="w-3 h-3 mr-1" /> {appt.branch}
                                </span>
                            )}
                        </div>
                        {appt.note && (
                            <div className="mt-2 text-xs text-slate-500 font-medium italic bg-yellow-50 px-2 py-1 rounded-lg inline-block border border-yellow-100">
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
                            <a href={`tel:${appt.contact}`} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700 transition-colors border border-slate-200 hover:border-green-300 shadow-sm">
                                <Phone className="w-4 h-4" />
                            </a>
                            <a 
                                href={`https://wa.me/91${String(appt.contact).replace(/\D/g,'')}?text=Hello ${appt.clientName}, regarding your appointment at Mahaveer Hair Solution.`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors border border-slate-200 hover:border-emerald-300 shadow-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </a>
                        </>
                    )}

                    <div className="w-px h-8 bg-slate-200 mx-1 hidden md:block"></div>

                    {/* 1. SCHEDULE ACTIONS (Pending) */}
                    {appt.status === 'PENDING' && (
                        <>
                            <button 
                                onClick={() => updateStatus(appt.id, 'FOLLOWUP')}
                                className="px-3 py-2 rounded-xl bg-white text-amber-600 font-bold text-xs hover:bg-amber-50 border border-amber-200 hover:border-amber-400 transition-all flex items-center shadow-sm"
                                title="Move to Active Leads"
                            >
                                <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Follow Up
                            </button>
                            <button 
                                onClick={() => updateStatus(appt.id, 'CLOSED')}
                                className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center border border-indigo-700 hover:-translate-y-0.5"
                                title="Mark as Completed"
                            >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Done
                            </button>
                        </>
                    )}

                    {/* 2. LEADS ACTIONS (Follow-Up) */}
                    {appt.status === 'FOLLOWUP' && (
                        <>
                             <button 
                                onClick={() => updateStatus(appt.id, 'PENDING')}
                                className="px-3 py-2 rounded-xl bg-white text-blue-600 font-bold text-xs hover:bg-blue-50 border border-blue-200 hover:border-blue-400 transition-all flex items-center shadow-sm"
                                title="Move back to Schedule"
                            >
                                <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Book Visit
                            </button>
                             <button 
                                onClick={() => updateStatus(appt.id, 'CLOSED')}
                                className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all flex items-center border border-emerald-700 hover:-translate-y-0.5"
                                title="Close this Lead"
                            >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Close Lead
                            </button>
                        </>
                    )}

                    {/* 3. HISTORY ACTIONS (Closed) */}
                    {appt.status === 'CLOSED' && (
                        <button 
                            onClick={() => handleRecall(appt)}
                            className="px-4 py-2 rounded-xl bg-white border-2 border-indigo-100 text-indigo-600 font-bold text-xs hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center shadow-sm"
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

  // Generate options for time selects
  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00, 05, 10...

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative rounded-3xl p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-500/30 border border-indigo-500 overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <p className="text-indigo-200 text-xs font-black uppercase tracking-widest border-b border-indigo-400/30 pb-1 mb-1 inline-block">Today's Visits</p>
                        <h3 className="text-4xl font-black mt-1">{todayCount}</h3>
                    </div>
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                        <CalendarClock className="w-7 h-7 text-white" />
                    </div>
                </div>
            </div>

             <div className="relative bg-white rounded-3xl p-6 border border-slate-200 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-amber-500 text-xs font-black uppercase tracking-widest mb-1">Active Follow-Ups</p>
                        <h3 className="text-4xl font-black text-slate-800 mt-1">{followupCount}</h3>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-2xl text-amber-500 border border-amber-100 shadow-inner">
                        <Megaphone className="w-7 h-7" />
                    </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{width: '60%'}}></div>
                </div>
            </div>

             <div className="relative bg-white rounded-3xl p-6 border border-slate-200 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-emerald-500 text-xs font-black uppercase tracking-widest mb-1">Total Pending</p>
                        <h3 className="text-4xl font-black text-slate-800 mt-1">{pendingCount}</h3>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500 border border-emerald-100 shadow-inner">
                        <Activity className="w-7 h-7" />
                    </div>
                </div>
                 <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{width: '40%'}}></div>
                </div>
            </div>
        </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left: Booking Form */}
        <div className="lg:w-1/3 order-1">
            <div className="bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-300 overflow-hidden sticky top-6 backdrop-blur-sm z-10">
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
                    <div>
                        <h3 className="text-lg font-black flex items-center tracking-tight">
                           <Plus className="w-5 h-5 mr-2 text-indigo-400" />
                           Book Visit
                        </h3>
                        <p className="text-xs text-slate-400 font-bold">Schedule or Follow-up</p>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Date</label>
                            <input
                                type="date"
                                value={newAppt.date}
                                onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Time (12H)</label>
                            <div className="flex gap-1">
                                <select 
                                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-3.5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-indigo-500 appearance-none text-center"
                                    value={timeParts.hour}
                                    onChange={(e) => setTimeParts(prev => ({...prev, hour: e.target.value}))}
                                >
                                    {hours.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <select 
                                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-3.5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-indigo-500 appearance-none text-center"
                                    value={timeParts.minute}
                                    onChange={(e) => setTimeParts(prev => ({...prev, minute: e.target.value}))}
                                >
                                    {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select 
                                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 py-3.5 text-slate-900 text-sm font-bold focus:ring-2 focus:ring-indigo-500 appearance-none text-center"
                                    value={timeParts.period}
                                    onChange={(e) => setTimeParts(prev => ({...prev, period: e.target.value}))}
                                >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Branch</label>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                            {['RPR', 'JDP'].map(b => (
                                <button
                                    type="button"
                                    key={b}
                                    onClick={() => setNewAppt(prev => ({ ...prev, branch: b }))}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border
                                    ${newAppt.branch === b 
                                        ? 'bg-white text-indigo-700 shadow-sm border-indigo-200' 
                                        : 'text-slate-400 hover:text-slate-600 border-transparent'}
                                    `}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Client Name</label>
                        <input
                            type="text"
                            value={newAppt.clientName || ''}
                            onChange={e => setNewAppt({...newAppt, clientName: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-bold placeholder:font-normal"
                            placeholder="Enter Client Name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Contact Number</label>
                        <input
                            type="text"
                            value={newAppt.contact}
                            onChange={e => setNewAppt({...newAppt, contact: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-semibold placeholder:font-normal"
                            placeholder="Phone number"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Location</label>
                        <input
                            type="text"
                            value={newAppt.address}
                            onChange={e => setNewAppt({...newAppt, address: e.target.value})}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-semibold placeholder:font-normal"
                            placeholder="City / Area"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 ml-1">Reason / Note</label>
                        <textarea
                            value={newAppt.note}
                            onChange={e => setNewAppt({...newAppt, note: e.target.value})}
                            rows={3}
                            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-slate-900 shadow-inner focus:ring-2 focus:ring-indigo-500 font-semibold resize-none placeholder:font-normal"
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

        {/* Right: Lists (Schedule & Leads & History) */}
        <div className="lg:w-2/3 order-2 space-y-6">
            
            {/* Tab Navigation - 3 Sections */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto border border-slate-200 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('SCHEDULE')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-black transition-all duration-300 flex items-center justify-center whitespace-nowrap
                            ${activeTab === 'SCHEDULE' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-indigo-600 border border-transparent'}`}
                    >
                        <Calendar className="w-4 h-4 mr-2" /> Schedule
                    </button>
                    <button
                        onClick={() => setActiveTab('LEADS')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-black transition-all duration-300 flex items-center justify-center whitespace-nowrap
                            ${activeTab === 'LEADS' ? 'bg-white text-amber-600 shadow-md border border-amber-100' : 'text-slate-500 hover:text-amber-600 border border-transparent'}`}
                    >
                        <Megaphone className="w-4 h-4 mr-2" /> Follow-Ups
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-black transition-all duration-300 flex items-center justify-center whitespace-nowrap
                            ${activeTab === 'HISTORY' ? 'bg-white text-slate-600 shadow-md border border-slate-100' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
                    >
                        <History className="w-4 h-4 mr-2" /> History
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search name or number..." 
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                    />
                </div>
            </div>

            {/* List Content: SCHEDULE TAB */}
            {activeTab === 'SCHEDULE' && (
                <div className="space-y-6">
                    {/* Today's Section - Only show if there are appointments */}
                    {todayAppointments.length > 0 && (
                         <div className="animate-in fade-in slide-in-from-bottom-4">
                             <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center">
                                 <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full mr-2 animate-pulse shadow-sm"></span>
                                 Today's Schedule ({todayAppointments.length})
                             </h3>
                             <div className="space-y-3">
                                 {todayAppointments.map(appt => renderAppointmentCard(appt, true))}
                             </div>
                         </div>
                    )}

                    {/* Other Upcoming */}
                    <div>
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 mt-4">Upcoming & Pending</h3>
                        <div className="space-y-3">
                            {otherAppointments.length > 0 ? (
                                otherAppointments.map(appt => renderAppointmentCard(appt))
                            ) : (
                                <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                                    <p className="text-slate-400 font-bold text-sm">No pending appointments found in schedule.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* List Content: FOLLOW-UPS (LEADS) TAB */}
            {activeTab === 'LEADS' && (
                <div className="animate-in fade-in space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center">
                                <Megaphone className="w-4 h-4 mr-2" />
                                Active Leads / Follow-Ups
                            </h3>
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded font-black border border-amber-200">
                                {filteredAppointments.length} Active
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                             {filteredAppointments.length > 0 ? (
                                 filteredAppointments.map(appt => renderAppointmentCard(appt))
                             ) : (
                                 <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
                                     <p className="text-slate-400 font-bold text-sm">No active follow-ups pending.</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* List Content: HISTORY TAB */}
            {activeTab === 'HISTORY' && (
                <div className="animate-in fade-in space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Closed History
                            </h3>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-black border border-slate-200">
                                {filteredAppointments.length} Records
                            </span>
                        </div>
                        
                        <div className="space-y-3 opacity-90 hover:opacity-100 transition-opacity">
                             {filteredAppointments.length > 0 ? (
                                 filteredAppointments.map(appt => renderAppointmentCard(appt))
                             ) : (
                                 <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                     <h4 className="text-slate-400 font-bold mb-1">No History Found</h4>
                                     <p className="text-slate-300 text-xs font-semibold">Completed appointments will appear here.</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;
