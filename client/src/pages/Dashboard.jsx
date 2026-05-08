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
    projects: null, users: null, issues: null, sprints: 3, systemHealth: "98.2%" 
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
    <div className="relative z-10 space-y-10 p-10 animate-in fade-in zoom-in duration-700">
      <div className="flex justify-between items-center border-b border-[#78e5ef]/10 pb-8">
        <div>
          <h2 className="text-3xl font-black text-[#78e5ef] tracking-tighter flex items-center gap-4 uppercase">
            {userRole === 'admin' && <ShieldAlert size={32} className="text-red-500" />}
            {userRole}_DASHBOARD
          </h2>
          <p className="text-[10px] text-[#78e5ef]/40 uppercase tracking-widest font-mono mt-2">
            OPERATOR: {user?.username} // STATUS: ONLINE
          </p>
        </div>
        <button
          onClick={() => { logout(); navigate('/signin'); }}
          className="text-[10px] font-bold text-red-500 border border-red-500/20 px-8 py-4 hover:bg-red-500/10 uppercase tracking-widest font-mono transition-all"
        >
          TERMINATE_ACCESS
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label="Live Projects" value={stats.projects} icon={<Terminal />} color="text-cyan-400" />
        <StatCard label="Identifiers" value={stats.users} icon={<Group />} color="text-cyan-400" />
        <StatCard label="Threats" value={stats.issues} icon={<AlertCircle />} color="text-red-500" pulse={stats.issues > 0} />
        <StatCard label="Uptime" value={stats.systemHealth} icon={<Bolt />} color="text-cyan-400" bar />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {(userRole === 'admin' || userRole === 'project manager') && (
            <div className="bg-[#042124]/60 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <UserCheck size={18} className="text-[#78e5ef]" />
                  <h3 className="text-xs text-[#78e5ef] font-bold uppercase tracking-[0.3em] font-mono">
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
                    <thead className="bg-black/40 text-white/30 uppercase tracking-widest text-[9px]">
                      <tr>
                        <th className="px-10 py-8">User_Identity</th>
                        <th className="px-10 py-8">System_Privilege</th>
                        <th className="px-10 py-8 text-right">Access_Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dbUsers.map((u, i) => (
                        <tr key={u.user_id || u.id || i} className="hover:bg-[#78e5ef]/5 transition-all">
                          <td className="px-10 py-6">
                            <div className="font-bold text-white uppercase">{u.username}</div>
                            <div className="text-[9px] text-white/20">{u.email}</div>
                          </td>
                          <td className="px-10 py-6">
                            <span className="px-3 py-1 bg-[#78e5ef]/5 text-[#78e5ef] text-[9px] font-bold rounded border border-[#78e5ef]/20 uppercase">
                              {(u.role || '').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button
                              onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                              className="text-[9px] font-bold text-[#78e5ef] border border-[#78e5ef]/30 px-5 py-2 hover:bg-[#78e5ef] hover:text-black transition-all uppercase tracking-widest"
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
            <h3 className="text-xs text-[#78e5ef] font-bold uppercase tracking-widest mb-10 flex items-center gap-3 font-mono">
              <History size={16} /> Activity_Feed
            </h3>
            <div className="space-y-10 font-mono text-[10px]">
              <div className="flex gap-4">
                <div className="w-1 h-1 rounded-full mt-2 bg-green-500 shadow-[0_0_12px_#22c55e]"></div>
                <div>
                  <p className="text-white uppercase font-bold tracking-tighter">Sync_Protocol_Established</p>
                  <p className="text-white/20 mt-1">PostgreSQL_Node: Connected</p>
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
  <div className="bg-[#042124]/50 border border-white/5 p-8 rounded-2xl shadow-2xl backdrop-blur-md hover:border-[#78e5ef]/30 transition-all group">
    <div className="flex justify-between items-start mb-6 text-white/20 text-[9px] uppercase font-bold tracking-[0.2em] font-mono">
      {label}
      <span className={`${color} ${pulse ? 'animate-pulse shadow-[0_0_20px_rgba(255,0,0,0.4)]' : ''} group-hover:scale-125 transition-transform duration-500`}>
        {icon}
      </span>
    </div>
    <div className="text-5xl font-black text-white font-mono tracking-tighter">{value ?? "--"}</div>
    {bar && (
      <div className="w-full bg-black/60 h-1.5 mt-8 overflow-hidden rounded-full">
        <div className="bg-[#78e5ef] h-full w-[85%] shadow-[0_0_20px_rgba(120,229,239,0.5)]"></div>
      </div>
    )}
  </div>
);

export default Dashboard;
