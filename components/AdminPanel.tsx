import React from 'react';
import { Shield, Settings, Database, Download } from 'lucide-react';

const AdminPanel: React.FC = () => {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin Control Panel</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-red-100 rounded-full text-red-600 mr-4">
                    <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">User Management</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">Create, edit, or remove application users and manage roles.</p>
            <button className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100">Manage Users</button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
                    <Database className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">Data Management</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">Backup database, reset filters, and perform maintenance.</p>
            <button className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100">Data Tools</button>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
                    <Download className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg">Exports</h3>
            </div>
            <p className="text-gray-500 text-sm mb-4">Export full transaction history and audit logs to CSV.</p>
            <button className="w-full py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100">Export All Data</button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-yellow-800 font-bold flex items-center mb-2">
              <Settings className="w-5 h-5 mr-2" />
              System Status
          </h3>
          <p className="text-yellow-700 text-sm">
              All systems operational. Connected to Google Sheets API (Mock Mode).
              <br/>
              Last backup: Today, 09:00 AM
          </p>
      </div>
    </div>
  );
};

export default AdminPanel;