'use client';

import { useState, useTransition } from 'react';
import { createBranchUserAction, updateBranchUserAction } from '@/app/actions';
import { 
  Users, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Lock,
  UserCheck,
  UserX,
  Edit2
} from 'lucide-react';

interface UsersClientProps {
  branchUsers: any[];
  branches: any[];
  customerId: string;
}

export default function UsersClient({ branchUsers, branches, customerId }: UsersClientProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');

  // Form Fields for new user
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [branchId, setBranchId] = useState('');

  // Editing User Fields
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editBranchId, setEditBranchId] = useState('');

  // Status/Transitions
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Toggle user state transition
  const handleToggleActive = (userItem: any) => {
    setStatusMsg(null);
    const newActive = !userItem.active;
    const actionLabel = newActive ? 'enable' : 'disable';

    startTransition(async () => {
      const res = await updateBranchUserAction(userItem.id, { active: newActive });
      if (res.success) {
        setStatusMsg({ success: true, message: `Successfully ${actionLabel}d user "${userItem.fullName}"!` });
      } else {
        setStatusMsg({ success: false, message: res.error || `Failed to ${actionLabel} user.` });
      }
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setStatusMsg({ success: false, message: 'Please assign a branch to this user.' });
      return;
    }

    setStatusMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('customerId', customerId);
      formData.append('branchId', branchId);
      formData.append('username', username);
      formData.append('password', password);
      formData.append('fullName', fullName);
      formData.append('email', email);

      const res = await createBranchUserAction(null, formData);

      if (res.success) {
        setStatusMsg({ success: true, message: res.message || 'Branch user created successfully!' });
        // Reset form
        setUsername('');
        setPassword('');
        setFullName('');
        setEmail('');
        setBranchId('');
        setActiveTab('list');
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to create branch user.' });
      }
    });
  };

  const handleStartEdit = (userItem: any) => {
    setEditingUser(userItem);
    setEditFullName(userItem.fullName);
    setEditEmail(userItem.email || '');
    setEditPassword('');
    setEditBranchId(userItem.branchId || '');
    setStatusMsg(null);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setStatusMsg(null);
    startTransition(async () => {
      const payload: any = {
        fullName: editFullName,
        email: editEmail,
        branchId: editBranchId
      };
      if (editPassword.trim()) {
        payload.password = editPassword;
      }

      const res = await updateBranchUserAction(editingUser.id, payload);

      if (res.success) {
        setStatusMsg({ success: true, message: `User "${editFullName}" updated successfully!` });
        setEditingUser(null);
      } else {
        setStatusMsg({ success: false, message: res.error || 'Failed to update branch user.' });
      }
    });
  };

  const getBranchName = (bId: string) => {
    const br = branches.find(b => b.id === bId);
    return br ? `${br.branchName} (${br.branchCode})` : 'Unassigned';
  };

  return (
    <div className="space-y-6 text-xs font-semibold">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('list'); setEditingUser(null); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'list' && !editingUser ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Branch Users ({branchUsers.length})
        </button>
        <button
          onClick={() => { setActiveTab('new'); setEditingUser(null); setStatusMsg(null); }}
          className={`px-5 py-3 font-bold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'new' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Register New User
        </button>
        {editingUser && (
          <span className="px-5 py-3 font-bold border-b-2 border-indigo-600 text-indigo-600">
            Editing User: {editingUser.username}
          </span>
        )}
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl border flex gap-2 items-start ${
          statusMsg.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Users List Tab */}
      {activeTab === 'list' && !editingUser && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {branchUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="mx-auto text-slate-300 mb-2" size={24} />
              <p className="font-semibold text-xs">No branch portal users registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="px-5 py-4">Full Name</th>
                    <th className="px-5 py-4">Username</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Assigned Branch</th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4">Date Registered</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-black text-slate-900">{u.fullName}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-600">{u.username}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500">{u.email || '—'}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">{getBranchName(u.branchId)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-md ${
                          u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStartEdit(u)}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-205 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-[10px]"
                            title="Edit User Info"
                          >
                            <Edit2 size={10} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isPending}
                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1 ${
                              u.active 
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {u.active ? <UserX size={10} /> : <UserCheck size={10} />}
                            <span>{u.active ? 'Disable' : 'Enable'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Register User Tab */}
      {activeTab === 'new' && !editingUser && (
        <form onSubmit={handleCreateUser} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">Register Branch User</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
              <input
                type="text"
                required
                placeholder="E.g. Rajesh Kumar"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
              <input
                type="email"
                required
                placeholder="rajesh@abc-exports.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Portal Username *</label>
              <input
                type="text"
                required
                placeholder="abc_rajesh"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Login Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned Branch *</label>
              <select
                required
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all"
            >
              {isPending ? 'Registering User...' : 'Register User'}
            </button>
          </div>
        </form>
      )}

      {/* Edit User Form */}
      {editingUser && (
        <form onSubmit={handleUpdateUser} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Edit Branch User: {editingUser.username}
            </h2>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              Cancel Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={e => setEditFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Reset Password (leave empty to keep current)
              </label>
              <input
                type="password"
                placeholder="New Password (optional)"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Assigned Branch *</label>
              <select
                required
                value={editBranchId}
                onChange={e => setEditBranchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-slate-800 focus:bg-white transition-all font-semibold"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.branchName} ({b.branchCode})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-xl cursor-pointer shadow-sm text-xs disabled:opacity-50 transition-all"
            >
              {isPending ? 'Updating User...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl cursor-pointer transition-all text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
