import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Terminal, Group, Activity, Bolt, AlertCircle, Layout, 
  CheckCircle, Rocket, History, ShieldAlert, Bug, ClipboardList, Settings, UserCheck, Trash2
} from 'lucide-react';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const userRole = user?.role?.replace('_', ' ').toLowerCase() || 'developer';

  const [stats, setStats] = useState({ 
    projects: null, users: null, issues: null, systemHealth: null 
  });
  const [dbUsers, setDbUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // FIX: credentials: 'include' sends the auth cookie so authMiddleware accepts the request
      const statsRes = await fetch(
        `http://localhost:5000/api/stats/summary?role=${userRole}&userId=${user?.user_id}`,
        { credentials: 'include' }
      );
      const statsData = await statsRes.json();
      setStats(prev => ({ ...prev, ...statsData }));

      if (userRole === 'admin' || userRole === 'project manager') {
        const usersRes = await fetch('http://localhost:5000/api/admin/users', {
          credentials: 'include'   // FIX: was missing — caused 401 → empty user list
        });
        const usersData = await usersRes.json();
        // Admin route may return { data: [...] } or a plain array
        const list = Array.isArray(usersData) ? usersData : (usersData.data ?? []);
        setDbUsers(list);
      }
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [userRole, user?.user_id]);

  const handleUpdateRole = async (userId, roleToSet) => {
    const finalRole = (roleToSet || selectedUser?.role).replace('_', ' ').toLowerCase();
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',   // FIX: added
        body: JSON.stringify({ role: finalRole }),
      });
      if (res.ok) {
        setSuccessMsg(`SYNC_SUCCESS: ROLE UPDATED TO ${finalRole.toUpperCase()}`);
        setTimeout(() => {
          setSuccessMsg('');
          setIsModalOpen(false);
          setNewRole('');
          fetchDashboardData();
        }, 2000);
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("CRITICAL: Permanent deletion?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
          method: 'DELETE',
          credentials: 'include',   // FIX: added
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchDashboardData();
        }
      } catch (error) { console.error(error); }
    }
  };

  if (isLoading) return (
    <div className="h-screen bg-[#0f1415] flex items-center justify-center text-cyan-400 font-mono tracking-widest uppercase">
      Initializing_Nodes...
    </div>
  );

  return (
    <div className="relative z-10 space-y-8 w-full animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4 border-b border-[#d2f5fa]/10 pb-6">
        <div>
          <p className="text-xs text-[#78e5ef]/60 uppercase tracking-widest">Workspace</p>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-3">
            {userRole === 'admin' && <ShieldAlert size={22} className="text-red-400" />}
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Logged in as <span className="text-white font-medium">{user?.username}</span> · Status: Online
          </p>
        </div>
        <button
          onClick={() => { logout(); navigate('/signin'); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors shrink-0 mt-1"
        >
          TERMINATE_ACCESS
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Live Projects" value={stats.projects} icon={<Terminal />} color="text-cyan-400" />
        <StatCard label="Identifiers" value={stats.users} icon={<Group />} color="text-cyan-400" />
        <StatCard label="Threats" value={stats.issues} icon={<AlertCircle />} color="text-red-500" pulse={stats.issues > 0} />
        <StatCard label="Uptime" value={stats.systemHealth} icon={<Bolt />} color="text-cyan-400" bar />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-10">
          {(userRole === 'admin' || userRole === 'project manager') && (
            <div className="bg-[#042124]/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-[#78e5ef]" />
                  <h3 className="text-sm text-[#78e5ef] font-semibold uppercase tracking-widest">
                    User_Node_Directory
                  </h3>
                </div>
                <Settings size={14} className="text-[#78e5ef]/20" />
              </div>
              <div className="overflow-x-auto">
                {dbUsers.length === 0 ? (
                  <p className="text-xs text-white/20 font-mono uppercase text-center py-10">
                    No users found — check auth cookie is being sent
                  </p>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-black/40 text-gray-500 uppercase tracking-widest text-xs">
                      <tr>
                        <th className="px-6 py-4 text-xs">User_Identity</th>
                        <th className="px-6 py-4 text-xs">System_Privilege</th>
                        <th className="px-6 py-4 text-xs text-right">Access_Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dbUsers.map((u, i) => (
                        <tr key={u.user_id || u.id || i} className="hover:bg-[#78e5ef]/5 transition-all">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white text-sm">{u.username}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-[#78e5ef]/5 text-[#78e5ef] text-xs font-medium rounded-md border border-[#78e5ef]/20 uppercase tracking-wide">
                              {(u.role || '').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                              className="text-xs font-semibold text-[#78e5ef] border border-[#78e5ef]/30 px-4 py-2 rounded-lg hover:bg-[#78e5ef]/10 transition-all uppercase tracking-wider"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#042124]/60 border border-white/5 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
            <h3 className="text-sm text-[#78e5ef] font-semibold uppercase tracking-widest mb-6 flex items-center gap-3">
              <History size={16} /> Activity_Feed
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex gap-4">
                <div className="w-1 h-1 rounded-full mt-2 bg-green-500 shadow-[0_0_12px_#22c55e]"></div>
                <div>
                  <p className="text-white font-semibold">Sync_Protocol_Established</p>
                  <p className="text-gray-400 mt-1 text-xs">PostgreSQL_Node: Connected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Management Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-lg p-6">
          <div className="bg-[#042124] border border-[#78e5ef]/30 p-12 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-[#78e5ef] font-bold uppercase tracking-[0.4em] text-sm text-center">Security_Override</h3>
            <p className="text-[10px] text-white/20 font-mono mt-3 text-center uppercase tracking-widest border-b border-white/5 pb-6 mb-6">
              Identifier: {selectedUser.username} // ID: {selectedUser.user_id || selectedUser.id}
            </p>

            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-400 text-[10px] p-5 my-6 text-center animate-pulse font-mono uppercase">
                {successMsg}
              </div>
            )}

            <div className="space-y-8 font-mono mt-6 text-center">
              <select
                className="w-full bg-black border border-white/10 p-5 text-xs text-[#78e5ef] outline-none cursor-pointer"
                onChange={(e) => setNewRole(e.target.value)}
                defaultValue={(selectedUser.role || '').replace('_', ' ')}
              >
                <option value="admin">Admin</option>
                <option value="project manager">Project Manager</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
              </select>
              <button
                onClick={() => handleUpdateRole(selectedUser.user_id || selectedUser.id, newRole)}
                className="w-full py-5 bg-[#78e5ef]/10 border border-[#78e5ef]/50 text-[#78e5ef] text-[10px] font-bold uppercase hover:bg-[#78e5ef] hover:text-black transition-all"
              >
                Authorize_Change
              </button>

              <button
                onClick={() => handleDeleteUser(selectedUser.user_id || selectedUser.id)}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-500/50 hover:text-red-500 text-[9px] uppercase tracking-[0.2em] transition-all font-bold"
              >
                <Trash2 size={12} /> [ Termination_Protocol ]
              </button>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full text-[9px] text-white/10 uppercase tracking-widest hover:text-white pt-6 font-bold"
              >
                Exit_Interface
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon, color, pulse, bar }) => (
  <div className="bg-[#042124]/50 border border-[#d2f5fa]/10 p-5 rounded-xl shadow-xl backdrop-blur-md hover:border-[#78e5ef]/30 transition-all group overflow-hidden">
    <div className="flex justify-between items-start mb-4 gap-2">
      <p className="text-xs text-[#78e5ef]/60 uppercase tracking-widest font-semibold truncate">{label}</p>
      <span className={`${color} shrink-0 ${pulse ? 'animate-pulse' : ''} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </span>
    </div>
    <div className="text-3xl font-bold text-white tracking-tight truncate">{value ?? "--"}</div>
    {bar && (
      <div className="w-full bg-black/60 h-1 mt-4 overflow-hidden rounded-full">
        <div className="bg-[#78e5ef] h-full transition-all duration-700" style={{ width: typeof value === 'string' && value.endsWith('%') ? value : '0%' }}></div>
      </div>
    )}
  </div>
);

export default Dashboard;