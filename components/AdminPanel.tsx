
import React, { useState, useEffect } from 'react';
import { Shield, Settings, Database, Download, UserPlus, Trash2, User as UserIcon, CheckCircle, XCircle, Ticket, Lock, RefreshCw, Pencil } from 'lucide-react';
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
      { id: '/', label: 'Dashboard' },
      { id: '/new-entry', label: 'New Entry' },
      { id: '/pending-dues', label: 'Payment Follow-up' },
      { id: '/daily-report', label: 'Today Report' },
      { id: '/history', label: 'Client History' },
      { id: '/appointments', label: 'Bookings' },
      { id: '/packages', label: 'Service Packages' },
      { id: '/clients', label: 'Clients' },
      { id: '/admin', label: 'Admin Panel' },
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
          password: '', // Password masked or not provided unless changing
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
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">System Administration</h2>
            <p className="text-slate-500 font-medium">Control user access and security settings</p>
        </div>
        <button 
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
            title="Refresh Users"
        >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center">
                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 mr-4 border border-indigo-200 shadow-sm">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">User Management</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Staff Accounts</p>
                    </div>
                </div>
                <button 
                    onClick={() => showAddForm ? handleCancelEdit() : setShowAddForm(true)}
                    className={`flex items-center text-sm font-black px-5 py-3 rounded-xl transition-all border shadow-sm
                        ${showAddForm ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                    {showAddForm ? <XCircle className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {showAddForm ? (editingUser ? 'Cancel Edit' : 'Cancel') : 'Add New User'}
                </button>
            </div>

            {showAddForm && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmitUser} className="p-8 bg-indigo-50/30 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex items-center gap-4 mb-2">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] whitespace-nowrap">
                                {editingUser ? `Updating Identity: ${editingUser}` : 'Security Credentials Setup'}
                            </span>
                            <div className="h-px bg-indigo-100 flex-1"></div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Login Username</label>
                            <input 
                                type="text" 
                                className={`w-full rounded-xl border-slate-300 border px-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all ${editingUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white'}`}
                                value={newUser.username}
                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                placeholder="Staff Name"
                                required
                                disabled={!!editingUser}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                {editingUser ? 'Update Password (Optional)' : 'Access Password'}
                            </label>
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-slate-300 border bg-white px-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                placeholder={editingUser ? 'Leave blank to keep current' : 'Secure Password'}
                                required={!editingUser}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Role</label>
                            <select 
                                className="w-full rounded-xl border-slate-300 border bg-white px-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="USER">Standard User (Restricted Access)</option>
                                <option value="ADMIN">Super Admin (Unrestricted Access)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Operating Department</label>
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-slate-300 border bg-white px-4 py-3.5 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                value={newUser.department}
                                onChange={e => setNewUser({...newUser, department: e.target.value})}
                                placeholder="e.g. Sales, Technical, Admin"
                            />
                        </div>

                        {newUser.role === 'USER' && (
                            <div className="md:col-span-2 bg-white rounded-3xl border border-indigo-100 p-8 shadow-sm">
                                <label className="flex items-center text-[10px] font-black text-slate-700 uppercase tracking-widest mb-6 border-b border-indigo-50 pb-4">
                                    <Lock className="w-4 h-4 mr-2 text-indigo-500" />
                                    ACCESS PERMISSIONS (SELECT MODULES)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {availableModules.map(mod => (
                                        <label key={mod.id} className={`flex items-center gap-3 cursor-pointer p-3.5 rounded-2xl border-2 transition-all group
                                            ${selectedPermissions.includes(mod.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-100 hover:bg-slate-50'}`}>
                                            <input 
                                                type="checkbox"
                                                className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 transition-all cursor-pointer"
                                                checked={selectedPermissions.includes(mod.id)}
                                                onChange={() => handlePermissionChange(mod.id)}
                                            />
                                            <span className="text-xs font-black uppercase tracking-tight group-hover:text-indigo-600">{mod.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 pt-4 flex gap-4">
                            <button type="submit" disabled={loading} className="flex-1 py-4.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-xl transition-all border border-slate-700 flex items-center justify-center uppercase tracking-widest">
                                {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (editingUser ? 'Update Security Node' : 'Initialize Account')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/50 text-slate-400 uppercase font-black text-[10px] tracking-[0.2em] border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-6">Identity Node</th>
                            <th className="px-8 py-6">Authority</th>
                            <th className="px-8 py-6">Active Permissions</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((u, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mr-4 text-sm font-black text-slate-500 border border-slate-300 shadow-sm overflow-hidden transform group-hover:scale-105 transition-transform">
                                            {u.dpUrl ? <img src={u.dpUrl} className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-lg leading-none mb-1.5 uppercase">{u.username}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.department || 'GENERAL STAFF'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm
                                        ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    {u.role === 'ADMIN' ? (
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic opacity-60">Full Master Access</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 max-w-[300px]">
                                            {u.permissions && u.permissions.length > 0 ? (
                                                u.permissions
                                                  .filter((p: string) => !p.startsWith('http'))
                                                  .map((p: string) => {
                                                    const label = availableModules.find(m => m.id === p)?.label || p;
                                                    return (
                                                        <span key={p} className="text-[9px] bg-indigo-50/50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 font-black uppercase tracking-tight shadow-sm whitespace-nowrap">
                                                            {label}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest italic opacity-50">No Module Access</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => handleEditClick(u)}
                                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all"
                                            title="Edit Node Access"
                                            disabled={loading}
                                        >
                                            <Pencil className="w-4.5 h-4.5" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteUser(e, u.username)}
                                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 shadow-sm transition-all"
                                            title="Revoke Account"
                                            disabled={loading}
                                        >
                                            <Trash2 className="w-4.5 h-4.5" />
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
                    <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">System Node Info</h3>
                </div>
                <div className="space-y-6">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Security Layer</span>
                        <span className="text-emerald-600 flex items-center bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                            Encrypted
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Portal Version</span>
                        <span className="text-slate-800 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">V.5.0.3-PRO</span>
                    </div>
                     <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">Last Database Sync</span>
                        <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">Instantaneous</span>
                    </div>
                </div>
            </div>

             <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                <div className="flex items-center mb-6 relative z-10">
                    <Download className="w-6 h-6 mr-3 text-indigo-400 animate-bounce" />
                    <h3 className="font-black text-lg uppercase tracking-tight">Master Export</h3>
                </div>
                <p className="text-xs font-bold text-indigo-200/80 mb-8 leading-relaxed relative z-10 uppercase tracking-wider">Download a complete audit trail of user access and permission configurations.</p>
                <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all border border-white/10 backdrop-blur-xl relative z-10 shadow-xl active:scale-95">Generate Snapshot</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
