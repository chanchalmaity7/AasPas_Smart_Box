import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Plus, Power, Wifi, WifiOff, LogOut } from 'lucide-react';

export default function Devices() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  const API_BASE = 'https://aaspas-smart-box-backend.onrender.com/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }
    
    setUser(JSON.parse(userData));
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/my-devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        setDevices(data.devices);
      }
    } catch (err) {
      console.error('Failed to fetch devices');
    }
  };

  const addDevice = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/add-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceId })
      });

      const data = await response.json();

      if (response.ok) {
        setShowAddDevice(false);
        setDeviceId('');
        fetchDevices();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to add device');
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Devices</h1>
            <p className="text-slate-300">Welcome, {user?.name}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Add Device Button */}
        <button
          onClick={() => setShowAddDevice(true)}
          className="w-full mb-6 py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Add New Device
        </button>

        {/* Add Device Modal */}
        {showAddDevice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Add Device</h2>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={addDevice}>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="ASB-1000-XXXX"
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 font-mono"
                  required
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDevice(false);
                      setError('');
                      setDeviceId('');
                    }}
                    className="flex-1 py-3 px-6 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Device'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Devices Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {devices.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-slate-300 text-lg">No devices added yet</p>
              <p className="text-slate-400 text-sm mt-2">Click "Add New Device" to get started</p>
            </div>
          ) : (
            devices.map((device) => (
              <div
                key={device.deviceId}
                onClick={() => router.push(`/device/${device.deviceId}`)}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {device.deviceName}
                    </h3>
                    <p className="text-slate-400 text-sm font-mono">{device.deviceId}</p>
                  </div>
                  <div className={`p-3 rounded-full ${device.status ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                    <Power size={24} className={device.status ? 'text-green-400' : 'text-gray-400'} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {device.isOnline ? (
                      <>
                        <Wifi size={16} className="text-green-400" />
                        <span className="text-green-400 text-sm">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff size={16} className="text-red-400" />
                        <span className="text-red-400 text-sm">Offline</span>
                      </>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${device.status ? 'text-green-400' : 'text-gray-400'}`}>
                    {device.status ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
