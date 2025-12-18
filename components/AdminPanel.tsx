import React, { useState, useEffect } from 'react';
import { Shield, Settings, Database, Download, UserPlus, Trash2, User as UserIcon, CheckCircle, XCircle, Ticket, Lock } from 'lucide-react';
import { api } from '../services/api';
import { User, Role, Entry } from '../types';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // User Form State
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'USER', department: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['/new-entry']); // Default
  const [showAddForm, setShowAddForm] = useState(false);

  // Available modules for permissions
  const availableModules = [
      { id: '/new-entry', label: 'New Entry Form' },
      { id: '/daily-report', label: 'Today Daily Report' },
      { id: '/appointments', label: 'Appointments / Booking' },
      { id: '/packages', label: 'Service Packages' },
      { id: '/clients', label: 'Client Master' },
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
    await api.addUser({
        username: newUser.username,
        role: newUser.role as Role,
        department: newUser.department,
        password: newUser.password,
        permissions: newUser.role === 'ADMIN' ? [] : selectedPermissions // Admins have all, Users have selected
    });
    
    // Reset
    setNewUser({ username: '', password: '', role: 'USER', department: '' });
    setSelectedPermissions(['/new-entry']);
    setShowAddForm(false);
    await loadData();
    setLoading(false);
  };

  const handleDeleteUser = async (e: React.MouseEvent, username: string) => {
      e.preventDefault();
      e.stopPropagation(); // Stop any parent events
      
      if (!username) return;

      if(window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
          setLoading(true);
          const success = await api.deleteUser(username);
          if (success) {
             await loadData();
          } else {
             alert("Failed to delete user. Please check if the script is properly deployed.");
          }
          setLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Admin Control Panel</h2>
            <p className="text-gray-500">Manage system settings and users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-gray-300 flex justify-between items-center bg-gray-50">
                <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mr-3 border border-indigo-200">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">User Management</h3>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {showAddForm ? 'Cancel' : 'Add User'}
                </button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
                <form onSubmit={handleAddUser} className="p-6 bg-indigo-50/50 border-b border-indigo-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 flex items-center gap-2 mb-2">
                        <div className="h-px bg-indigo-200 flex-1"></div>
                        <span className="text-xs font-bold text-indigo-500 uppercase">Login Credentials</span>
                        <div className="h-px bg-indigo-200 flex-1"></div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                        <select 
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm bg-white"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value})}
                        >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                            value={newUser.department}
                            onChange={e => setNewUser({...newUser, department: e.target.value})}
                        />
                    </div>

                    {/* Permission Selection (Only for Users) */}
                    {newUser.role === 'USER' && (
                        <div className="md:col-span-2 bg-white rounded-xl border border-indigo-200 p-4 shadow-sm">
                            <label className="flex items-center text-xs font-bold text-gray-700 uppercase mb-3">
                                <Lock className="w-3 h-3 mr-1.5" />
                                Access Permissions
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {availableModules.map(mod => (
                                    <label key={mod.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                                        <input 
                                            type="checkbox"
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            checked={selectedPermissions.includes(mod.id)}
                                            onChange={() => handlePermissionChange(mod.id)}
                                        />
                                        <span className="text-sm text-gray-700 font-medium">{mod.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="md:col-span-2 pt-2">
                        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold text-sm w-full hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all border border-indigo-700">
                            {loading ? 'Saving...' : 'Create User & Grant Access'}
                        </button>
                    </div>
                </form>
            )}

            {/* User List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Permissions</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map((u, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-xs font-bold border border-gray-300">
                                        {u.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{u.username}</div>
                                        <div className="text-[10px] text-gray-400">{u.department}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {u.role === 'ADMIN' ? (
                                        <span className="text-xs text-gray-400 italic">Full Access</span>
                                    ) : (
                                        <div className="flex flex-wrap gap-1">
                                            {u.permissions && u.permissions.length > 0 ? (
                                                u.permissions.map((p: string) => {
                                                    const label = availableModules.find(m => m.id === p)?.label || p;
                                                    // Shorten label for tag
                                                    const shortLabel = label.split(' ')[0] + (label.split(' ').length > 1 ? '..' : '');
                                                    return (
                                                        <span key={p} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200">
                                                            {shortLabel}
                                                        </span>
                                                    );
                                                })
                                            ) : (
                                                <span className="text-xs text-red-400">Restricted</span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        type="button"
                                        onClick={(e) => handleDeleteUser(e, u.username)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
                                        title="Remove User"
                                        disabled={loading}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* System Info Sidebar */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-300">
                <div className="flex items-center mb-4 text-slate-800">
                    <Database className="w-5 h-5 mr-3 text-slate-400" />
                    <h3 className="font-bold text-lg">System Health</h3>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Database Status</span>
                        <span className="text-green-600 font-bold flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Online</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">API Connection</span>
                        <span className="text-green-600 font-bold">Active</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Last Sync</span>
                        <span className="text-gray-800">Just now</span>
                    </div>
                </div>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-300">
                <div className="flex items-center mb-4 text-slate-800">
                    <Download className="w-5 h-5 mr-3 text-slate-400" />
                    <h3 className="font-bold text-lg">Data Exports</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Download backup copies of your daily transactions.</p>
                <button className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 border border-slate-200">Export CSV</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
