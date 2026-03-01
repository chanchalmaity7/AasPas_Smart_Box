import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Lightbulb, Fan, Droplets, Wifi, WifiOff } from 'lucide-react';

export default function DeviceControl() {
  const router = useRouter();
  const { id } = router.query;
  const [device, setDevice] = useState(null);
  const [relay1, setRelay1] = useState(false);
  const [relay2, setRelay2] = useState(false);
  const [relay3, setRelay3] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'https://aaspas-smart-box-backend.onrender.com/api';

  useEffect(() => {
    if (!id) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/devices/${id}/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDevice(data);
        setRelay1(data.relay1);
        setRelay2(data.relay2);
        setRelay3(data.relay3);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch status');
    }
  };

  const toggleRelay = async (relayNum) => {
    try {
      const token = localStorage.getItem('token');
      
      // Optimistic update
      if (relayNum === 1) setRelay1(!relay1);
      if (relayNum === 2) setRelay2(!relay2);
      if (relayNum === 3) setRelay3(!relay3);

      const response = await fetch(`${API_BASE}/devices/${id}/toggle/${relayNum}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRelay1(data.relay1);
        setRelay2(data.relay2);
        setRelay3(data.relay3);
      }
    } catch (err) {
      console.error('Failed to toggle');
      fetchStatus(); // Revert on error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/devices')}
            className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
          >
            <ArrowLeft size={24} />
            <span className="text-lg">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            {device?.isOnline ? (
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

        {/* Device Name */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{device?.deviceName}</h1>
          <p className="text-slate-400 font-mono">{device?.deviceId}</p>
        </div>

        {/* Control Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Light Control */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="text-center mb-6">
              <div className={`inline-block p-6 rounded-full mb-4 transition-all duration-300 ${
                relay1 
                  ? 'bg-yellow-500/30 shadow-lg shadow-yellow-500/50' 
                  : 'bg-gray-500/20'
              }`}>
                <Lightbulb 
                  size={48} 
                  className={`transition-all duration-300 ${
                    relay1 ? 'text-yellow-400 animate-pulse' : 'text-gray-400'
                  }`}
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{device?.relay1Name || 'Light'}</h3>
              <p className={`text-sm font-medium ${relay1 ? 'text-yellow-400' : 'text-gray-400'}`}>
                {relay1 ? 'ON' : 'OFF'}
              </p>
            </div>
            
            <button
              onClick={() => toggleRelay(1)}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                relay1
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/50'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {relay1 ? 'Turn OFF' : 'Turn ON'}
            </button>
          </div>

          {/* Fan Control */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="text-center mb-6">
              <div className={`inline-block p-6 rounded-full mb-4 transition-all duration-300 ${
                relay2 
                  ? 'bg-blue-500/30 shadow-lg shadow-blue-500/50' 
                  : 'bg-gray-500/20'
              }`}>
                <Fan 
                  size={48} 
                  className={`transition-all duration-300 ${
                    relay2 ? 'text-blue-400 animate-spin' : 'text-gray-400'
                  }`}
                  style={{ animationDuration: relay2 ? '2s' : '0s' }}
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{device?.relay2Name || 'Fan'}</h3>
              <p className={`text-sm font-medium ${relay2 ? 'text-blue-400' : 'text-gray-400'}`}>
                {relay2 ? 'RUNNING' : 'STOPPED'}
              </p>
            </div>
            
            <button
              onClick={() => toggleRelay(2)}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                relay2
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {relay2 ? 'Stop Fan' : 'Start Fan'}
            </button>
          </div>

          {/* Water Pump Control */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300">
            <div className="text-center mb-6">
              <div className={`inline-block p-6 rounded-full mb-4 transition-all duration-300 ${
                relay3 
                  ? 'bg-cyan-500/30 shadow-lg shadow-cyan-500/50' 
                  : 'bg-gray-500/20'
              }`}>
                <Droplets 
                  size={48} 
                  className={`transition-all duration-300 ${
                    relay3 ? 'text-cyan-400' : 'text-gray-400'
                  }`}
                />
                {relay3 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-cyan-400/30 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{device?.relay3Name || 'Water Pump'}</h3>
              <p className={`text-sm font-medium ${relay3 ? 'text-cyan-400' : 'text-gray-400'}`}>
                {relay3 ? 'PUMPING' : 'IDLE'}
              </p>
            </div>
            
            <button
              onClick={() => toggleRelay(3)}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                relay3
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {relay3 ? 'Stop Pump' : 'Start Pump'}
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-3xl font-bold mb-1 ${relay1 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {relay1 ? '💡' : '⚫'}
              </div>
              <p className="text-slate-400 text-sm">Light</p>
            </div>
            <div>
              <div className={`text-3xl font-bold mb-1 ${relay2 ? 'text-blue-400' : 'text-gray-500'}`}>
                {relay2 ? '🌀' : '⚫'}
              </div>
              <p className="text-slate-400 text-sm">Fan</p>
            </div>
            <div>
              <div className={`text-3xl font-bold mb-1 ${relay3 ? 'text-cyan-400' : 'text-gray-500'}`}>
                {relay3 ? '💧' : '⚫'}
              </div>
              <p className="text-slate-400 text-sm">Pump</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
