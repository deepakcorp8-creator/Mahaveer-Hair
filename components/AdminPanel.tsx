
import React, { useState, useEffect } from 'react';
import { Shield, Settings, Database, Download, UserPlus, Trash2, User as UserIcon, CheckCircle, XCircle, Ticket, Lock, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // User Form State
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'USER', department: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['/new-entry']); 

  const [showAddForm, setShowAddForm] = useState(false);

  // Expanded modules to match all actual app routes
  const availableModules = [
      { id: '/new-entry', label: 'New Entry' },
      { id: '/pending-dues', label: 'Follow-ups' },
      { id: '/daily-report', label: 'Today Report' },
      { id: '/appointments', label: 'Bookings' },
      { id: '/history', label: 'History' },
      { id: '/packages', label: 'Packages' },
      { id: '/clients', label: 'Clients' },
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setLoading(true);
    try {
        await api.addUser({
            username: newUser.username,
            role: newUser.role as Role,
            department: newUser.department,
            password: newUser.password,
            permissions: newUser.role === 'ADMIN' ? [] : selectedPermissions
        });
        
        setNewUser({ username: '', password: '', role: 'USER', department: '' });
        setSelectedPermissions(['/new-entry']);
        setShowAddForm(false);
        await loadData();
    } catch (err) {
        alert("Failed to add user.");
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
        {/* User Management List */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center">
                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 mr-4 border border-indigo-200 shadow-sm">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-slate-800">User Management</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Staff Accounts</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`flex items-center text-sm font-black px-5 py-3 rounded-xl transition-all border shadow-sm
                        ${showAddForm ? 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-indigo-200'}`}
                >
                    {showAddForm ? <XCircle className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {showAddForm ? 'Cancel' : 'Add New User'}
                </button>
            </div>

            {/* Add User Form Section */}
            {showAddForm && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleAddUser} className="p-8 bg-indigo-50/30 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex items-center gap-4 mb-2">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] whitespace-nowrap">Security Setup</span>
                            <div className="h-px bg-indigo-100 flex-1"></div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-slate-200 border bg-white px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newUser.username}
                                onChange={e => setNewUser({...newUser, username: e.target.value})}
                                placeholder="Employee Name"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-slate-200 border bg-white px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                placeholder="Strong Password"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Account Role</label>
                            <select 
                                className="w-full rounded-xl border-slate-200 border bg-white px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="USER">Standard User (Restricted)</option>
                                <option value="ADMIN">Administrator (Full Access)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Department</label>
                            <input 
                                type="text" 
                                className="w-full rounded-xl border-slate-200 border bg-white px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newUser.department}
                                onChange={e => setNewUser({...newUser, department: e.target.value})}
                                placeholder="e.g. Sales, Service"
                            />
                        </div>

                        {newUser.role === 'USER' && (
                            <div className="md:col-span-2 bg-white/60 rounded-2xl border border-indigo-100 p-6 shadow-sm">
                                <label className="flex items-center text-[10px] font-black text-slate-700 uppercase tracking-widest mb-5">
                                    <Lock className="w-4 h-4 mr-2 text-indigo-500" />
                                    Access Permissions (Select modules)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {availableModules.map(mod => (
                                        <label key={mod.id} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all
                                            ${selectedPermissions.includes(mod.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-100'}`}>
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                checked={selectedPermissions.includes(mod.id)}
                                                onChange={() => handlePermissionChange(mod.id)}
                                            />
                                            <span className="text-xs font-bold">{mod.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 pt-2">
                            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-xl shadow-slate-300 transition-all border border-slate-700 flex items-center justify-center">
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Create User Account'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* User Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50/50 text-slate-400 uppercase font-black text-[10px] tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5">User</th>
                            <th className="px-8 py-5">Role</th>
                            <th className="px-8 py-5">Permissions</th>
                            <th className="px-8 py-5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((u, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5 flex items-center">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mr-4 text-sm font-black text-slate-500 border border-slate-300 shadow-sm overflow-hidden">
                                        {u.dpUrl ? <img src={u.dpUrl} className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-800 text-base">{u.username}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{u.department || 'No Dept'}</div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm
                                        ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    {u.role === 'ADMIN' ? (
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Full Access</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 max-w-[250px]">
                                            {u.permissions && u.permissions.length > 0 ? (
                                                u.permissions
                                                  // FIX: Filter out any items that are full URLs to avoid layout breakage
                                                  .filter((p: string) => !p.startsWith('http'))
                                                  .map((p: string) => {
                                                    const label = availableModules.find(m => m.id === p)?.label || p;
                                                    return (
                                                        <span key={p} className="text-[10px] bg-white text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 font-black uppercase tracking-tight shadow-sm">
                                                            {label}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs font-bold text-red-400 italic">No Access</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDeleteUser(e, u.username)}
                                        className="text-slate-300 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                                        title="Delete Account"
                                        disabled={loading}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* System Sidebar */}
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex items-center mb-6">
                    <div className="p-2.5 bg-slate-100 rounded-xl mr-4 text-slate-400 border border-slate-200"><Database className="w-5 h-5" /></div>
                    <h3 className="font-black text-lg text-slate-800">System Info</h3>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase">Database Status</span>
                        <span className="text-emerald-600 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>Active</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase">API Version</span>
                        <span className="text-slate-700">V.5.0.2</span>
                    </div>
                     <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400 uppercase">Sync Frequency</span>
                        <span className="text-slate-700">Real-time</span>
                    </div>
                </div>
            </div>

             <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="flex items-center mb-4 relative z-10">
                    <Download className="w-5 h-5 mr-3 text-indigo-400" />
                    <h3 className="font-bold text-lg">Quick Backup</h3>
                </div>
                <p className="text-xs font-medium text-slate-400 mb-6 leading-relaxed relative z-10">Generate a snapshot of all user data and permissions for record keeping.</p>
                <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all border border-white/10 backdrop-blur-md relative z-10">Export Records</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
