
import React, { useState, useEffect } from 'react';
import { Shield, Settings, Database, Download, UserPlus, Trash2, User as UserIcon, CheckCircle, XCircle, Ticket, Lock, RefreshCw, Pencil, LayoutDashboard, BarChart3 } from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // User Form State
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'USER', department: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['/new-entry']); 
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);

  const availableModules = [
      { id: '/', label: 'Dashboard Overview' },
      { id: '/new-entry', label: 'Create New Entry' },
      { id: '/pending-dues', label: 'Payment Follow-ups' },
      { id: '/daily-report', label: 'View Today Report' },
      { id: '/history', label: 'Client History' },
      { id: '/appointments', label: 'Booking System' },
      { id: '/packages', label: 'Service Packages' },
      { id: '/clients', label: 'Client Master' },
      { id: '/reports', label: 'Business Analysis' },
      { id: '/admin', label: 'Admin Access' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await api.getUsers();
        setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (moduleId: string) => {
      setSelectedPermissions(prev => {
          if (prev.includes(moduleId)) {
              return prev.filter(p => p !== moduleId);
          } else {
              return [...prev, moduleId];
          }
      });
  };

  const handleEditClick = (user: any) => {
      setEditingUser(user.username);
      setNewUser({
          username: user.username,
          password: '', 
          role: user.role,
          department: user.department || ''
      });
      setSelectedPermissions(user.permissions || []);
      setShowAddForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingUser(null);
      setNewUser({ username: '', password: '', role: 'USER', department: '' });
      setSelectedPermissions(['/new-entry']);
      setShowAddForm(false);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username) return;
    if (!editingUser && !newUser.password) return; 
    
    setLoading(true);
    try {
        const payload: any = {
            username: newUser.username,
            role: newUser.role as Role,
            department: newUser.department,
            permissions: newUser.role === 'ADMIN' ? [] : selectedPermissions
        };
        
        if (newUser.password) payload.password = newUser.password;

        if (editingUser) {
            await api.updateUser(payload);
        } else {
            await api.addUser(payload);
        }
        
        handleCancelEdit();
        await loadData();
    } catch (err) {
        alert("Action failed.");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteUser = async (e: React.MouseEvent, username: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!username) return;

      if(window.confirm(`Are you sure you want to delete user "${username}"?`)) {
          setLoading(true);
          try {
              const success = await api.deleteUser(username);
              if (success) await loadData();
          } catch(err) {
              alert("Delete failed.");
          } finally {
              setLoading(false);
          }
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Access Control Center</h2>
            <p className="text-slate-500 font-medium">Manage security identities and system permissions</p>
        </div>
        <button 
            onClick={loadData}
            className="p-3 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
            title="Reload Security Matrix"
        >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden min-h-[600px]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center">
                    <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white mr-4 shadow-lg">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Staff Credentials</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Authorization Registry</p>
                    </div>
                </div>
                <button 
                    onClick={() => showAddForm ? handleCancelEdit() : setShowAddForm(true)}
                    className={`flex items-center text-sm font-black px-6 py-3.5 rounded-2xl transition-all border shadow-lg
                        ${showAddForm ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800 hover:scale-105'}`}
                >
                    {showAddForm ? <XCircle className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                    {showAddForm ? (editingUser ? 'Cancel Identity Update' : 'Dismiss Form') : 'Provision New Account'}
                </button>
            </div>

            {showAddForm && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmitUser} className="p-8 bg-indigo-50/20 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex items-center gap-4 mb-2">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] whitespace-nowrap bg-white px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                                {editingUser ? `SECURE MODIFICATION: ${editingUser}` : 'IDENTITY INITIALIZATION'}
                            </span>
                            <div className="h-px bg-indigo-100 flex-1"></div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Staff ID / Username</label>
                            <input 
                                type="text" 
                                className={`w-full rounded-2xl border-2 border-slate-200 px-4 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all ${editingUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white hover:border-indigo-200 focus:border-indigo-500'}`}
                                value={newUser.username}
                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                placeholder="Username"
                                required
                                disabled={!!editingUser}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {editingUser ? 'Change Security Key' : 'Security Key'}
                            </label>
                            <input 
                                type="text" 
                                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 hover:border-indigo-200 focus:border-indigo-500 outline-none transition-all"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                placeholder={editingUser ? '•••••••• (Empty to skip)' : 'Access Key'}
                                required={!editingUser}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Tier</label>
                            <select 
                                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 hover:border-indigo-200 focus:border-indigo-500 outline-none cursor-pointer appearance-none transition-all"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="USER">Restricted Operator (USER)</option>
                                <option value="ADMIN">Full Controller (ADMIN)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Office / Department</label>
                            <input 
                                type="text" 
                                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 hover:border-indigo-200 focus:border-indigo-500 outline-none transition-all"
                                value={newUser.department}
                                onChange={e => setNewUser({...newUser, department: e.target.value})}
                                placeholder="e.g. Raipur HQ"
                            />
                        </div>

                        {newUser.role === 'USER' && (
                            <div className="md:col-span-2 bg-white rounded-[2.5rem] border-2 border-indigo-50 p-8 shadow-inner">
                                <label className="flex items-center text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] mb-8 pb-4 border-b border-slate-50">
                                    <Shield className="w-4 h-4 mr-2 text-indigo-500" />
                                    ASSIGNABLE APP MODULES
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {availableModules.map(mod => (
                                        <label key={mod.id} className={`flex items-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition-all group
                                            ${selectedPermissions.includes(mod.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-slate-50 border-transparent text-slate-400 hover:border-indigo-100 hover:bg-white'}`}>
                                            <input 
                                                type="checkbox"
                                                className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedPermissions.includes(mod.id)}
                                                onChange={() => handlePermissionChange(mod.id)}
                                            />
                                            <span className="text-xs font-black uppercase tracking-tight">{mod.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 pt-4 flex gap-4">
                            <button type="submit" disabled={loading} className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-200 transition-all border border-indigo-800 flex items-center justify-center uppercase tracking-widest active:scale-95">
                                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (editingUser ? 'Commit Identity Update' : 'Finalize Registry')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/50 text-slate-400 uppercase font-black text-[10px] tracking-[0.3em] border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-6">Staff Member</th>
                            <th className="px-8 py-6">Tier</th>
                            <th className="px-8 py-6">Scope of Access</th>
                            <th className="px-8 py-6 text-right">Utility</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((u, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-slate-100 flex items-center justify-center mr-4 text-base font-black text-indigo-600 border-2 border-indigo-50 shadow-md group-hover:scale-110 transition-transform">
                                            {u.dpUrl ? <img src={u.dpUrl} className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-lg leading-none mb-1.5 uppercase">{u.username}</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{u.department || 'GLOBAL OPS'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 shadow-sm
                                        ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    {u.role === 'ADMIN' ? (
                                        <div className="flex items-center text-purple-600">
                                            <Shield className="w-3.5 h-3.5 mr-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Master Controller</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 max-w-[300px]">
                                            {u.permissions && u.permissions.length > 0 ? (
                                                u.permissions
                                                  .filter((p: string) => !p.startsWith('http'))
                                                  .map((p: string) => {
                                                    const label = availableModules.find(m => m.id === p)?.label || p;
                                                    return (
                                                        <span key={p} className="text-[9px] bg-white text-indigo-600 px-2 py-1 rounded-lg border-2 border-indigo-50 font-black uppercase tracking-tight shadow-sm whitespace-nowrap">
                                                            {label}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest bg-red-50 px-3 py-1 rounded-lg border border-red-100">Restricted</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleEditClick(u)}
                                            className="p-3 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm transition-all"
                                            title="Update Security Profile"
                                            disabled={loading}
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteUser(e, u.username)}
                                            className="p-3 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all"
                                            title="Terminate Node"
                                            disabled={loading}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                <div className="flex items-center mb-8 border-b border-slate-50 pb-4">
                    <div className="p-3 bg-slate-100 rounded-2xl mr-4 text-slate-500 border border-slate-200 shadow-inner"><Database className="w-6 h-6" /></div>
                    <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Security Matrix</h3>
                </div>
                <div className="space-y-6">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Database Integrity</span>
                        <span className="text-emerald-600 flex items-center bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                            Verified
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Total Identities</span>
                        <span className="text-slate-800 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">{users.length}</span>
                    </div>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Last Audit</span>
                        <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">Continuous</span>
                    </div>
                </div>
            </div>

             <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                <div className="flex items-center mb-6 relative z-10">
                    <Download className="w-6 h-6 mr-3 text-indigo-300 animate-bounce" />
                    <h3 className="font-black text-lg uppercase tracking-tight">Security Backup</h3>
                </div>
                <p className="text-xs font-bold text-slate-400 mb-8 leading-relaxed relative z-10 uppercase tracking-wider">Download an encrypted snapshot of the user access matrix for offline compliance verification.</p>
                <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all border border-white/10 backdrop-blur-xl relative z-10 shadow-xl active:scale-95">Generate Audit Log</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
