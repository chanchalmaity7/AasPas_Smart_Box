import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Lightbulb, Fan, Droplets, Wifi, WifiOff, Clock, Calendar, X } from 'lucide-react';

export default function DeviceControl() {
  const router = useRouter();
  const { id } = router.query;
  const [device, setDevice] = useState(null);
  const [relay1, setRelay1] = useState(false);
  const [relay2, setRelay2] = useState(false);
  const [relay3, setRelay3] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTimerModal, setShowTimerModal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [scheduleType, setScheduleType] = useState('daily');
  const [onTime, setOnTime] = useState('06:00');
  const [offTime, setOffTime] = useState('08:00');
  const [scheduleDate, setScheduleDate] = useState('');

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
      fetchStatus();
    }
  };

  const setTimer = async (relay) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/devices/${id}/timer/${relay}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ minutes: timerMinutes })
      });
      setShowTimerModal(null);
      fetchStatus();
    } catch (err) {
      console.error('Failed to set timer');
    }
  };

  const clearTimer = async (relay) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/devices/${id}/timer/${relay}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to clear timer');
    }
  };

  const setSchedule = async (relay) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/devices/${id}/schedule/${relay}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          type: scheduleType, 
          onTime, 
          offTime, 
          date: scheduleType === 'once' ? scheduleDate : null 
        })
      });
      setShowScheduleModal(null);
      fetchStatus();
    } catch (err) {
      console.error('Failed to set schedule');
    }
  };

  const clearSchedule = async (relay) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/devices/${id}/schedule/${relay}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to clear schedule');
    }
  };

  const getTimeRemaining = (endTime) => {
    const diff = new Date(endTime) - new Date();
    if (diff <= 0) return 'Ending...';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const RelayCard = ({ relay, name, icon: Icon, color, active, timer, schedule }) => (
    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
      <div className="text-center mb-4">
        <div className={`inline-block p-6 rounded-full mb-4 transition-all duration-300 ${
          active ? `bg-${color}-500/30 shadow-lg shadow-${color}-500/50` : 'bg-gray-500/20'
        }`}>
          <Icon size={48} className={`transition-all duration-300 ${
            active ? `text-${color}-400 ${relay === 2 ? 'animate-spin' : 'animate-pulse'}` : 'text-gray-400'
          }`} style={{ animationDuration: relay === 2 && active ? '2s' : '0s' }} />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
        <p className={`text-sm font-medium ${active ? `text-${color}-400` : 'text-gray-400'}`}>
          {active ? 'ON' : 'OFF'}
        </p>
      </div>

      {timer?.active && (
        <div className="mb-3 bg-orange-500/20 border border-orange-500/50 rounded-lg p-2 text-center">
          <div className="text-orange-300 text-xs font-medium">⏰ Timer Active</div>
          <div className="text-orange-200 text-lg font-bold">{getTimeRemaining(timer.endTime)}</div>
          <button onClick={() => clearTimer(relay)} className="text-orange-300 text-xs hover:text-orange-100 mt-1">
            Cancel
          </button>
        </div>
      )}

      {schedule?.active && (
        <div className="mb-3 bg-blue-500/20 border border-blue-500/50 rounded-lg p-2 text-center">
          <div className="text-blue-300 text-xs font-medium">📅 {schedule.type === 'daily' ? 'Daily' : 'One-time'}</div>
          <div className="text-blue-200 text-sm">{schedule.onTime} - {schedule.offTime}</div>
          {schedule.type === 'once' && <div className="text-blue-300 text-xs">{schedule.date}</div>}
          <button onClick={() => clearSchedule(relay)} className="text-blue-300 text-xs hover:text-blue-100 mt-1">
            Remove
          </button>
        </div>
      )}
      
      <button
        onClick={() => toggleRelay(relay)}
        className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 mb-2 ${
          active
            ? `bg-gradient-to-r from-${color}-500 to-${color}-600 text-white shadow-lg shadow-${color}-500/50`
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {active ? 'Turn OFF' : 'Turn ON'}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowTimerModal(relay)}
          className="py-2 px-3 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors text-sm flex items-center justify-center gap-1"
        >
          <Clock size={14} /> Timer
        </button>
        <button
          onClick={() => setShowScheduleModal(relay)}
          className="py-2 px-3 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center justify-center gap-1"
        >
          <Calendar size={14} /> Schedule
        </button>
      </div>
    </div>
  );

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

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{device?.deviceName}</h1>
          <p className="text-slate-400 font-mono">{device?.deviceId}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RelayCard 
            relay={1} 
            name={device?.relay1Name || 'Light'} 
            icon={Lightbulb} 
            color="yellow" 
            active={relay1}
            timer={device?.relay1Timer}
            schedule={device?.relay1Schedule}
          />
          <RelayCard 
            relay={2} 
            name={device?.relay2Name || 'Fan'} 
            icon={Fan} 
            color="blue" 
            active={relay2}
            timer={device?.relay2Timer}
            schedule={device?.relay2Schedule}
          />
          <RelayCard 
            relay={3} 
            name={device?.relay3Name || 'Water Pump'} 
            icon={Droplets} 
            color="cyan" 
            active={relay3}
            timer={device?.relay3Timer}
            schedule={device?.relay3Schedule}
          />
        </div>

        {/* Timer Modal */}
        {showTimerModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">⏰ Set Timer</h2>
                <button onClick={() => setShowTimerModal(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-slate-300 mb-4">Device will turn ON now and auto OFF after:</p>
              
              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Minutes</label>
                <input
                  type="number"
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(parseInt(e.target.value))}
                  min="1"
                  max="1440"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <div className="flex gap-2 mt-2">
                  {[15, 30, 60, 120].map(m => (
                    <button
                      key={m}
                      onClick={() => setTimerMinutes(m)}
                      className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setTimer(showTimerModal)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
              >
                Start Timer
              </button>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">📅 Set Schedule</h2>
                <button onClick={() => setShowScheduleModal(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-medium mb-2">Schedule Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setScheduleType('daily')}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      scheduleType === 'daily' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setScheduleType('once')}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      scheduleType === 'once' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    One-time
                  </button>
                </div>
              </div>

              {scheduleType === 'once' && (
                <div className="mb-4">
                  <label className="block text-slate-300 text-sm font-medium mb-2">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">ON Time</label>
                  <input
                    type="time"
                    value={onTime}
                    onChange={(e) => setOnTime(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">OFF Time</label>
                  <input
                    type="time"
                    value={offTime}
                    onChange={(e) => setOffTime(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={() => setSchedule(showScheduleModal)}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all"
              >
                Save Schedule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
