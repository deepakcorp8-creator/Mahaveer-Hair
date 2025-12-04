import React, { useState, useEffect } from 'react';
import { Shield, Settings, Database, Download, UserPlus, Trash2, User as UserIcon } from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'USER', department: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      // If data is empty (mock mode or empty sheet), fallback to a basic list for UI demo if needed, 
      // but api.getUsers should return what's in the sheet.
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setLoading(true);
    await api.addUser({
        username: newUser.username,
        role: newUser.role as Role,
        department: newUser.department,
        password: newUser.password
    });
    setNewUser({ username: '', password: '', role: 'USER', department: '' });
    setShowAddForm(false);
    await loadUsers();
    setLoading(false);
  };

  const handleDeleteUser = async (username: string) => {
      if(window.confirm(`Are you sure you want to delete user ${username}?`)) {
          setLoading(true);
          await api.deleteUser(username);
          await loadUsers();
          setLoading(false);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex justify-between items-center">
        <div>
            <h2 className="text-3xl font-bold text-gray-800">Admin Control Panel</h2>
            <p className="text-gray-500">Manage system settings and users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mr-3">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-800">User Management</h3>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {showAddForm ? 'Cancel' : 'Add User'}
                </button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
                <form onSubmit={handleAddUser} className="p-6 bg-indigo-50/50 border-b border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                        <input 
                            type="text" 
                            className="w-full rounded-lg border-gray-300 border p-2 text-sm"
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
                    <div className="md:col-span-2 pt-2">
                        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm w-full hover:bg-indigo-700">
                            {loading ? 'Saving...' : 'Create User Profile'}
                        </button>
                    </div>
                </form>
            )}

            {/* User List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Department</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map((u, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-xs font-bold">
                                        {u.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-900">{u.username}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{u.department}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleDeleteUser(u.username)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="Remove User"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No users found.</td></tr>
                        )}
                        {loading && users.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading users...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* System Info Sidebar */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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

             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center mb-4 text-slate-800">
                    <Download className="w-5 h-5 mr-3 text-slate-400" />
                    <h3 className="font-bold text-lg">Data Exports</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">Download backup copies of your daily transactions.</p>
                <button className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200">Export CSV</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;