import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Power, Timer, Wifi, WifiOff } from 'lucide-react';

export default function DeviceControl() {
  const router = useRouter();
  const { id } = router.query;
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('');

  const API_BASE = 'https://aaspas-smart-box-backend.onrender.com/api';

  useEffect(() => {
    if (!id) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/devices/${id}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDevice(data);
      }
    } catch (err) {
      console.error('Failed to fetch status');
    }
  };

  const toggleDevice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/devices/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStatus();
    } catch (err) {
      console.error('Toggle failed');
    }
    setLoading(false);
  };

  const setTimer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/devices/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ minutes: parseInt(timerMinutes) })
      });
      setTimerMinutes('');
      fetchStatus();
    } catch (err) {
      console.error('Timer failed');
    }
    setLoading(false);
  };

  if (!device) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/devices')}
          className="flex items-center gap-2 text-slate-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Devices
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{device.deviceName}</h1>
              <p className="text-slate-400 text-sm font-mono">{device.deviceId}</p>
              <p className="text-slate-500 text-xs mt-1">{device.modelNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              {device.isOnline ? (
                <>
                  <Wifi size={20} className="text-green-400" />
                  <span className="text-green-400 text-sm">Online</span>
                </>
              ) : (
                <>
                  <WifiOff size={20} className="text-red-400" />
                  <span className="text-red-400 text-sm">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-6">
          <div className="text-center mb-6">
            <Power
              size={80}
              className={`mx-auto transition-all duration-200 ${
                device.status
                  ? 'text-yellow-400 drop-shadow-[0_0_25px_rgba(255,255,0,0.9)]'
                  : 'text-gray-500'
              }`}
            />
          </div>

          <div className={`text-center text-2xl font-semibold mb-6 ${
            device.status ? 'text-green-400' : 'text-red-400'
          }`}>
            {device.status ? 'ON' : 'OFF'}
          </div>

          <button
            onClick={toggleDevice}
            disabled={loading || !device.isOnline}
            className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2 ${
              device.status
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
            } hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Power size={20} />
            {device.status ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Timer size={24} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Schedule Timer</h2>
          </div>

          {device.timerActive ? (
            <div className="text-center py-4">
              <p className="text-blue-400 text-lg mb-2">Timer Active</p>
              <p className="text-slate-300">Device will turn OFF automatically</p>
            </div>
          ) : (
            <form onSubmit={setTimer} className="flex gap-3">
              <input
                type="number"
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
                placeholder="Minutes"
                min="1"
                max="1440"
                className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={loading || !device.isOnline}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                Start
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
