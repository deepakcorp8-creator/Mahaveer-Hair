
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Database, Download, UserPlus, Trash2, 
  CheckCircle, XCircle, Lock, 
  FileSpreadsheet, FileText, Activity, 
  Edit2, Save
} from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if we are editing
  const [newUser, setNewUser] = useState({ 
      username: '', 
      password: '', 
      role: 'USER', 
      department: ''
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['/new-entry']); 
  const formRef = useRef<HTMLDivElement>(null);

  // Available modules for permissions
  const availableModules = [
      { id: '/new-entry', label: 'New Entry Form' },
      { id: '/daily-report', label: 'Today Daily Report' },
      { id: '/appointments', label: 'Appointments / Booking' },
      { id: '/packages', label: 'Service Packages' },
      { id: '/clients', label: 'Client Master' },
      { id: '/pending-dues', label: 'Pending Dues' },
      { id: '/history', label: 'Client History' }
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

  // --- EXPORT FUNCTIONALITY ---
  const handleExportCSV = async () => {
      const entries = await api.getEntries();
      if (!entries || entries.length === 0) {
          alert("No data to export.");
          return;
      }

      // Define Headers
      const headers = ["Date", "Client Name", "Contact", "Service", "Amount", "Status", "Technician"];
      
      // Convert to CSV string
      const csvContent = [
          headers.join(","),
          ...entries.map(e => [
              e.date, 
              `"${e.clientName}"`, // Quote strings with commas
              e.contactNo,
              e.serviceType,
              e.amount,
              e.workStatus,
              e.technician
          ].join(","))
      ].join("\n");

      // Trigger Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Mahaveer_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleEditUser = (user: any, e: React.MouseEvent) => {
      // STOP PROPAGATION to prevent any row clicks if implemented later
      e.stopPropagation();
      e.preventDefault();

      // Set State
      setNewUser({
          username: user.username,
          password: user.password, // Pre-fill existing password
          role: user.role,
          department: user.department || ''
      });
      setSelectedPermissions(user.permissions || []);
      setIsEditing(true);
      setShowAddForm(true);
      
      // Scroll to form with a slight delay to ensure render
      setTimeout(() => {
          if(formRef.current) {
              formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      }, 100);
  };

  const handleAddOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setLoading(true);
    
    if (isEditing) {
        await api.updateUserAdmin({
            username: newUser.username,
            role: newUser.role as Role,
            department: newUser.department,
            password: newUser.password,
            permissions: newUser.role === 'ADMIN' ? [] : selectedPermissions
        });
    } else {
        await api.addUser({
            username: newUser.username,
            role: newUser.role as Role,
            department: newUser.department,
            password: newUser.password,
            permissions: newUser.role === 'ADMIN' ? [] : selectedPermissions
        });
    }
    
    // Reset
    setNewUser({ username: '', password: '', role: 'USER', department: '' });
    setSelectedPermissions(['/new-entry']);
    setShowAddForm(false);
    setIsEditing(false);
    await loadData();
    setLoading(false);
  };

  const handleDeleteUser = async (e: React.MouseEvent, username: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!username) return;
      if(window.confirm(`Delete user "${username}"?`)) {
          setLoading(true);
          await api.deleteUser(username);
          await loadData();
          setLoading(false);
      }
  };

  const handlePermissionChange = (moduleId: string) => {
      setSelectedPermissions(prev => prev.includes(moduleId) ? prev.filter(p => p !== moduleId) : [...prev, moduleId]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans text-slate-800">
       
       {/* Page Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Shield className="w-3 h-3" />
                <span>Dashboard</span>
                <span>/</span>
                <span>Admin</span>
                <span>/</span>
                <span className="text-slate-600">User Management</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Admin Control Panel</h2>
            <p className="text-slate-500 font-medium mt-1">Manage system settings, users and exports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- LEFT: USER MANAGEMENT (Col 8) --- */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-slate-800">User Management</h3>
                            <p className="text-xs text-slate-500 font-bold">Manage access and roles</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setShowAddForm(!showAddForm);
                                setIsEditing(false);
                                setNewUser({ username: '', password: '', role: 'USER', department: '' });
                            }}
                            className={`flex items-center text-sm font-bold text-white px-4 py-2 rounded-xl transition-all shadow-md 
                                ${showAddForm ? 'bg-slate-700 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                        >
                            {showAddForm ? <XCircle className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            {showAddForm ? 'Close' : 'Add User'}
                        </button>
                    </div>
                </div>

                {/* ADD / EDIT USER FORM */}
                {showAddForm && (
                    <div ref={formRef} id="user-form-container" className="p-6 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-4">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600">
                                {isEditing ? 'Edit User Details' : 'Create New User'}
                            </h4>
                            {isEditing && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">Editing Mode</span>}
                        </div>
                        
                        <form onSubmit={handleAddOrUpdateUser} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            
                            {/* Inputs */}
                            <div className="md:col-span-12 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Username</label>
                                    <input 
                                        type="text" 
                                        className={`w-full rounded-xl border-slate-200 border p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none ${isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                        value={newUser.username}
                                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                                        required
                                        readOnly={isEditing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Password</label>
                                    <input 
                                        type="text" 
                                        className="w-full rounded-xl border-slate-200 border p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.password}
                                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Role</label>
                                    <select 
                                        className="w-full rounded-xl border-slate-200 border p-2.5 text-sm font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.role}
                                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                                    >
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Department</label>
                                    <input 
                                        type="text" 
                                        className="w-full rounded-xl border-slate-200 border p-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newUser.department}
                                        onChange={e => setNewUser({...newUser, department: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Permissions */}
                            {newUser.role === 'USER' && (
                                <div className="md:col-span-12 bg-white rounded-xl border border-slate-200 p-4">
                                    <label className="flex items-center text-xs font-black text-slate-700 uppercase mb-3">
                                        <Lock className="w-3 h-3 mr-1.5" /> Access Permissions
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {availableModules.map(mod => (
                                            <label key={mod.id} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                    checked={selectedPermissions.includes(mod.id)}
                                                    onChange={() => handlePermissionChange(mod.id)}
                                                />
                                                <span className="text-xs font-bold text-slate-600">{mod.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="md:col-span-12 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                                <button type="submit" disabled={loading} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-all shadow-lg flex items-center">
                                    {loading ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-3 h-3 mr-2" />}
                                    {loading ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* USER LIST TABLE */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-white text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Permissions</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {/* Large Avatar - Standard Initials */}
                                            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg font-black text-slate-500 shadow-sm">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 text-base">{u.username}</div>
                                                <div className="text-xs font-bold text-slate-400">{u.department || 'General'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.role === 'ADMIN' ? (
                                            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Full Access
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                                <Lock className="w-3 h-3 mr-1" /> Restricted
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => handleEditUser(u, e)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 shadow-sm"
                                                title="Edit User"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteUser(e, u.username)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shadow-sm"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* --- RIGHT: WIDGETS (Col 4) --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* System Health */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Database className="w-5 h-5" /></div>
                        <h3 className="font-black text-lg text-slate-800">System Health</h3>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                        <span className="font-bold text-emerald-800">Database Status</span>
                        <span className="text-emerald-600 font-black flex items-center text-xs uppercase tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                            Online
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <span className="font-bold text-slate-600">API Connection</span>
                        <span className="text-emerald-600 font-black text-xs uppercase">Active</span>
                    </div>

                    <div className="flex justify-between items-center text-sm p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <span className="font-bold text-slate-600">Last Sync</span>
                        <span className="text-slate-400 font-bold text-xs">Just now</span>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-2">
                        <Activity className="w-3 h-3" /> Auto-refreshing every 30 sec.
                    </div>
                    {/* Visual Pulse Graph */}
                    <div className="h-12 w-full bg-slate-50 rounded-lg flex items-end justify-between px-1 pb-1 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-50 to-transparent opacity-50"></div>
                        {[40, 60, 30, 80, 50, 90, 40, 70, 60, 50, 80, 40, 60].map((h, i) => (
                            <div key={i} className="w-1.5 bg-emerald-400 rounded-t-sm transition-all duration-500" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                    <div className="text-right text-[10px] font-black text-emerald-600 mt-1">Uptime: 100%</div>
                </div>
            </div>

            {/* Data Exports */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4 text-slate-800">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Download className="w-5 h-5" /></div>
                    <h3 className="font-black text-lg">Data Exports</h3>
                </div>
                
                <p className="text-xs font-bold text-slate-400 mb-6 leading-relaxed">
                    Last Exported: Yesterday by <span className="text-slate-700">Mahaveer</span>
                </p>

                <div className="grid grid-cols-3 gap-3">
                    <button 
                        onClick={handleExportCSV}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all group"
                    >
                        <FileSpreadsheet className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase">CSV</span>
                    </button>
                    
                    <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all group opacity-60 cursor-not-allowed" title="Coming Soon">
                        <FileText className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-black uppercase">Excel</span>
                    </button>

                    <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-100 transition-all group opacity-60 cursor-not-allowed" title="Coming Soon">
                        <FileText className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-black uppercase">PDF</span>
                    </button>
                </div>

                <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-slate-400 bg-slate-50 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-3 h-3" />
                        Last Backup
                    </div>
                    <span>Yesterday</span>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
