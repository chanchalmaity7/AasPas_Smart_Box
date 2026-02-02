import { useState, useEffect } from 'react';
import { Lightbulb, Clock, Power, Timer } from 'lucide-react';

export default function Dashboard() {
  const [status, setStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEndTime, setTimerEndTime] = useState(null);
  const [timerDuration, setTimerDuration] = useState(0);
  const [scheduleMinutes, setScheduleMinutes] = useState('');
  const [scheduleSeconds, setScheduleSeconds] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [scheduleActive, setScheduleActive] = useState(false);
  const [scheduleOnTime, setScheduleOnTime] = useState('');
  const [scheduleOffTime, setScheduleOffTime] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleDays, setScheduleDays] = useState([]);

  const API_BASE = 'https://apiaaspassmartbox.vercel.app';

  // Optimistic UI Toggle
  const toggleDevice = async () => {
    // Immediate UI update (Optimistic)
    setStatus(!status);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      // Update with server response
      setStatus(data.status);
      setTimerActive(data.timerActive || false);
      setTimerEndTime(data.timerEndTime);
      setTimerDuration(data.timerDuration || 0);
    } catch (error) {
      // Revert on error
      setStatus(!status);
      console.error('Error toggling device:', error);
    }
    setLoading(false);
  };

  // Schedule Timer
  const scheduleTimer = async () => {
    const mins = parseInt(scheduleMinutes) || 0;
    const secs = parseInt(scheduleSeconds) || 0;
    const totalMinutes = mins + (secs / 60);
    
    if (totalMinutes <= 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: totalMinutes })
      });
      const data = await response.json();
      
      setStatus(data.status);
      setTimerActive(data.timerActive);
      setTimerEndTime(data.timerEndTime);
      setTimerDuration(data.timerDuration);
      setScheduleMinutes('');
      setScheduleSeconds('');
    } catch (error) {
      console.error('Error setting timer:', error);
    }
    setLoading(false);
  };

  // Set Time-based Schedule
  const setTimeSchedule = async () => {
    if (!scheduleOnTime || !scheduleOffTime) return;
    if (scheduleType === 'once' && !scheduleDate) return;
    if (scheduleType === 'weekly' && scheduleDays.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/set-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onTime: scheduleOnTime, 
          offTime: scheduleOffTime,
          type: scheduleType,
          date: scheduleDate,
          days: scheduleDays
        })
      });
      const data = await response.json();
      
      setScheduleActive(data.scheduleActive);
      setScheduleOnTime(data.scheduleOnTime);
      setScheduleOffTime(data.scheduleOffTime);
      setScheduleType(data.scheduleType);
      setScheduleDate(data.scheduleDate || '');
      setScheduleDays(data.scheduleDays || []);
    } catch (error) {
      console.error('Error setting schedule:', error);
    }
    setLoading(false);
  };

  // Clear Schedule
  const clearSchedule = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/clear-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setScheduleActive(false);
      setScheduleOnTime('');
      setScheduleOffTime('');
      setScheduleType('daily');
      setScheduleDate('');
      setScheduleDays([]);
    } catch (error) {
      console.error('Error clearing schedule:', error);
    }
    setLoading(false);
  };

  // Update time remaining
  useEffect(() => {
    if (timerActive && timerEndTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const end = new Date(timerEndTime);
        const diff = end - now;
        
        if (diff <= 0) {
          setTimeRemaining('Timer completed');
          setTimerActive(false);
          setStatus(false);
        } else {
          const minutes = Math.floor(diff / 60000);
          const seconds = Math.floor((diff % 60000) / 1000);
          setTimeRemaining(`${minutes}m ${seconds}s`);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timerActive, timerEndTime]);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();
        
        setStatus(data.status === '1' || data.status === true);
        setTimerActive(data.timerActive || false);
        setTimerEndTime(data.timerEndTime);
        setTimerDuration(data.timerDuration || 0);
        setScheduleActive(data.scheduleActive || false);
        setScheduleOnTime(data.scheduleOnTime || '');
        setScheduleOffTime(data.scheduleOffTime || '');
        setScheduleType(data.scheduleType || 'daily');
        setScheduleDate(data.scheduleDate || '');
        setScheduleDays(data.scheduleDays || []);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };
    fetchStatus();
  }, []);

  // Client-side only rendering for time
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AasPas Smart Box</h1>
          <p className="text-slate-300">ESP32 Smart Switch Dashboard</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Device Control Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <div className="mb-6">
                <Lightbulb 
                  size={80} 
                  className={`mx-auto transition-all duration-300 ${
                    status 
                      ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(255,255,0,0.8)] animate-pulse-glow' 
                      : 'text-gray-500'
                  }`}
                />
              </div>
              
              <h2 className="text-2xl font-semibold text-white mb-2">
                Device Status
              </h2>
              
              <div className={`text-lg font-medium mb-6 ${
                status ? 'text-green-400' : 'text-red-400'
              }`}>
                {status ? 'ON' : 'OFF'}
              </div>

              <button
                onClick={toggleDevice}
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  status
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                    : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <Power size={20} />
                {loading ? 'Processing...' : (status ? 'Turn OFF' : 'Turn ON')}
              </button>
            </div>
          </div>

          {/* Schedule Timer Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-center">
              <div className="mb-6">
                <Timer 
                  size={80} 
                  className={`mx-auto transition-all duration-300 ${
                    timerActive 
                      ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-pulse-glow' 
                      : 'text-gray-500'
                  }`}
                />
              </div>
              
              <h2 className="text-2xl font-semibold text-white mb-4">
                Schedule Timer
              </h2>

              {timerActive ? (
                <div className="mb-6">
                  <div className="text-blue-400 text-lg font-medium mb-2">
                    Timer Active
                  </div>
                  <div className="text-white text-xl font-mono">
                    {timeRemaining}
                  </div>
                  <div className="text-slate-300 text-sm mt-2">
                    Duration: {timerDuration} minutes
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-slate-300 text-sm block mb-2">Minutes</label>
                      <input
                        type="number"
                        value={scheduleMinutes}
                        onChange={(e) => setScheduleMinutes(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-slate-400 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="1440"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm block mb-2">Seconds</label>
                      <input
                        type="number"
                        value={scheduleSeconds}
                        onChange={(e) => setScheduleSeconds(e.target.value)}
                        placeholder="0"
                        className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-slate-400 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={scheduleTimer}
                    disabled={loading || (!scheduleMinutes && !scheduleSeconds)}
                    className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Clock size={20} />
                    Start Timer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Time-based Schedule Card */}
        <div className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">
              🕐 Time-based Schedule
            </h2>

            {scheduleActive ? (
              <div className="mb-6">
                <div className="text-green-400 text-lg font-medium mb-3">
                  Schedule Active
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/10 p-3 rounded-lg">
                    <div className="text-slate-300 text-sm">ON Time</div>
                    <div className="text-white text-xl font-mono">{scheduleOnTime}</div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg">
                    <div className="text-slate-300 text-sm">OFF Time</div>
                    <div className="text-white text-xl font-mono">{scheduleOffTime}</div>
                  </div>
                </div>
                <button
                  onClick={clearSchedule}
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-lg shadow-red-500/30 hover:scale-105 disabled:opacity-50"
                >
                  Clear Schedule
                </button>
              </div>
            ) : (
              <div className="mb-6">
                {/* Schedule Type Selector */}
                <div className="mb-4">
                  <label className="text-slate-300 text-sm block mb-2">Schedule Type</label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="once" className="bg-slate-800">One Time</option>
                    <option value="daily" className="bg-slate-800">Daily</option>
                    <option value="weekly" className="bg-slate-800">Weekly</option>
                  </select>
                </div>

                {/* Date picker for one-time */}
                {scheduleType === 'once' && (
                  <div className="mb-4">
                    <label className="text-slate-300 text-sm block mb-2">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                {/* Day selector for weekly */}
                {scheduleType === 'weekly' && (
                  <div className="mb-4">
                    <label className="text-slate-300 text-sm block mb-2">Select Days</label>
                    <div className="grid grid-cols-7 gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            if (scheduleDays.includes(index)) {
                              setScheduleDays(scheduleDays.filter(d => d !== index));
                            } else {
                              setScheduleDays([...scheduleDays, index]);
                            }
                          }}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                            scheduleDays.includes(index)
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-slate-300 text-sm block mb-2">ON Time</label>
                    <input
                      type="time"
                      value={scheduleOnTime}
                      onChange={(e) => setScheduleOnTime(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-2">OFF Time</label>
                    <input
                      type="time"
                      value={scheduleOffTime}
                      onChange={(e) => setScheduleOffTime(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/20 border border-white/30 text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                
                <button
                  onClick={setTimeSchedule}
                  disabled={loading || !scheduleOnTime || !scheduleOffTime || (scheduleType === 'once' && !scheduleDate) || (scheduleType === 'weekly' && scheduleDays.length === 0)}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-purple-500 hover:bg-purple-600 transition-all duration-200 shadow-lg shadow-purple-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Set Schedule
                </button>
                <p className="text-slate-400 text-xs mt-2">
                  {scheduleType === 'once' && 'One-time schedule on selected date'}
                  {scheduleType === 'daily' && 'Repeats every day'}
                  {scheduleType === 'weekly' && 'Repeats on selected days'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Info */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
          <div className="text-center text-slate-300 text-sm">
            <p>ESP32 API: {API_BASE}/api/status/simple</p>
            {mounted && <p className="mt-1">Last updated: {new Date().toLocaleTimeString()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}