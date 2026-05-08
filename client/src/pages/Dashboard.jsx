import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Terminal, Group, Activity, Bolt, AlertCircle, Layout, 
  CheckCircle, Search, Rocket, History, ShieldAlert, Bug, ClipboardList
} from 'lucide-react';

const Dashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  // Normalize role to lowercase to avoid "Admin" vs "admin" bugs
  const userRole = user?.role?.toLowerCase() || 'developer';

  const [stats, setStats] = useState({ projects: 0, users: 0, issues: 0, sprints: 0, systemHealth: "0%" });
  const [dbUsers, setDbUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const statsRes = await fetch(`http://localhost:5000/api/stats/summary?role=${userRole}&userId=${user?.id}`);
        const statsData = await statsRes.json();
        setStats(statsData);

        if (userRole === 'admin' || userRole === 'project manager') {
          const usersRes = await fetch('http://localhost:5000/api/admin/users');
          const usersData = await usersRes.json();
          setDbUsers(usersData);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [userRole, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#d2f5fa]/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-[#78e5ef] tracking-tight flex items-center gap-2">
            {userRole === 'admin' && <ShieldAlert size={20} className="text-red-400" />}
            <span className="capitalize">{userRole}</span> Overview
          </h2>
          <p className="text-xs text-[#d2f5fa]/40 uppercase tracking-widest mt-1">
            Terminal Status: Connected // Node: {user?.username}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="text-[10px] font-bold text-red-400 border border-red-400/30 px-3 py-2 hover:bg-red-400/10 uppercase tracking-widest transition-all">
            End Session
          </button>
        </div>
      </div>

      {/* Stats Grid - Dynamically changes based on role */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {userRole === 'admin' && (
          <>
            <StatCard label="Network Projects" value={stats.projects} icon={<Terminal />} color="text-cyan-400" />
            <StatCard label="Active Identifiers" value={stats.users} icon={<Group />} color="text-cyan-400" />
            <StatCard label="Critical Anomalies" value={stats.issues} icon={<AlertCircle />} color="text-red-500" pulse={stats.issues > 0} />
            <StatCard label="Uptime" value={stats.systemHealth} icon={<Bolt />} color="text-cyan-400" bar />
          </>
        )}

        {userRole === 'project manager' && (
          <>
            <StatCard label="Total Projects" value={stats.projects} icon={<Rocket />} color="text-purple-400" />
            <StatCard label="Total Team Size" value={stats.users} icon={<Group />} color="text-cyan-400" />
            <StatCard label="Blockers" value={stats.issues} icon={<AlertCircle />} color="text-orange-400" pulse />
            <StatCard label="Sprint Progress" value="72%" icon={<Activity />} color="text-green-400" bar />
          </>
        )}

        {userRole === 'developer' && (
          <>
            <StatCard label="Assigned Tickets" value={stats.issues} icon={<Layout />} color="text-blue-400" />
            <StatCard label="Active Sprints" value={stats.sprints} icon={<Activity />} color="text-cyan-400" />
            <StatCard label="Open Bugs" value={stats.issues} icon={<Bug />} color="text-red-400" pulse />
            <StatCard label="Code Coverage" value="94%" icon={<CheckCircle />} color="text-green-400" bar />
          </>
        )}

        {userRole === 'tester' && (
          <>
            <StatCard label="Pending Tests" value={stats.issues} icon={<ClipboardList />} color="text-yellow-400" />
            <StatCard label="Bugs Logged" value="12" icon={<Bug />} color="text-red-400" />
            <StatCard label="Pass Rate" value="88%" icon={<CheckCircle />} color="text-green-400" bar />
            <StatCard label="Environment" value="Stable" icon={<Bolt />} color="text-cyan-400" />
          </>
        )}
      </div>

      {/* Tables and Secondary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {(userRole === 'admin' || userRole === 'project manager') && (
            <div className="bg-[#042124] border border-[#dfe3e4]/5 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-[#dfe3e4]/5 bg-[#1b2121]/50">
                <h3 className="text-sm text-[#78e5ef] font-bold uppercase tracking-widest">User Directory</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#0a0f10] text-[10px] text-[#dfe3e4]/40 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">System Role</th>
                      <th className="px-6 py-4 text-right">Access</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-[#dfe3e4]/5">
                    {dbUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold">{u.username}</div>
                          <div className="text-[10px] text-[#d2f5fa]/40">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-[#78e5ef]/10 text-[#78e5ef] text-[9px] font-bold rounded-sm border border-[#78e5ef]/20 uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-[9px] font-bold text-[#78e5ef] hover:underline uppercase">Manage</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Work in progress message for lower roles */}
          {(userRole === 'developer' || userRole === 'tester') && (
            <div className="bg-[#0a3338] border border-[#d2f5fa]/10 p-8 rounded-lg">
              <h3 className="text-[#78e5ef] text-sm font-bold uppercase tracking-widest mb-4">Assigned Task Queue</h3>
              <p className="text-xs text-[#d2f5fa]/40 italic">Syncing with your project board... No critical blockers found.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0a3338] border border-[#d2f5fa]/10 rounded-lg p-6">
            <h3 className="text-sm text-[#78e5ef] font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
              <History size={16} /> Activity Logs
            </h3>
            <div className="space-y-6">
              <div className="flex gap-3 text-xs">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-cyan-400"></div>
                <p className="text-[#d2f5fa] font-medium leading-tight">PostgreSQL Database Synced Successfully</p>
              </div>
              <div className="flex gap-3 text-xs opacity-40">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-white"></div>
                <p className="text-[#d2f5fa] font-medium leading-tight">Session token refreshed</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color, pulse, bar }) => (
  <div className="bg-[#042124] border border-[#dfe3e4]/5 p-6 rounded-lg shadow-lg shadow-black/20 hover:border-[#78e5ef]/20 transition-all">
    <div className="flex justify-between items-start mb-4 text-[#dfe3e4]/40 text-[10px] uppercase font-bold tracking-widest">
      {label} <span className={`${color} ${pulse ? 'animate-pulse' : ''}`}>{icon}</span>
    </div>
    <div className="text-4xl font-bold text-[#c8faff]">{value}</div>
    {bar && (
      <div className="w-full bg-[#0a0f10] h-1.5 mt-4 overflow-hidden rounded-full">
        <div className="bg-[#78e5ef] h-full w-[85%] shadow-[0_0_10px_#78e5ef]"></div>
      </div>
    )}
  </div>
);

export default Dashboard;