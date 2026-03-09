import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { ArrowLeft, Lightbulb, Fan, Droplets, Wifi, WifiOff, Clock, Calendar, X } from 'lucide-react';

const API_BASE = 'https://aaspas-smart-box-backend.onrender.com/api';
const SOCKET_URL = API_BASE.replace(/\/api\/?$/, '');

const RELAY_THEME = {
  1: {
    fallbackName: 'Light',
    icon: Lightbulb,
    chipOn: 'bg-amber-500/30 shadow-lg shadow-amber-500/35',
    chipOff: 'bg-slate-500/25',
    iconOn: 'text-amber-300 animate-pulse',
    iconOff: 'text-slate-400',
  },
  2: {
    fallbackName: 'Fan',
    icon: Fan,
    chipOn: 'bg-sky-500/30 shadow-lg shadow-sky-500/35',
    chipOff: 'bg-slate-500/25',
    iconOn: 'text-sky-300 animate-spin',
    iconOff: 'text-slate-400',
  },
  3: {
    fallbackName: 'Water Pump',
    icon: Droplets,
    chipOn: 'bg-cyan-500/30 shadow-lg shadow-cyan-500/35',
    chipOff: 'bg-slate-500/25',
    iconOn: 'text-cyan-300 animate-bounce',
    iconOff: 'text-slate-400',
  },
};

export default function DeviceControl() {
  const router = useRouter();
  const { id } = router.query;

  const [device, setDevice] = useState(null);
  const [relay1, setRelay1] = useState(false);
  const [relay2, setRelay2] = useState(false);
  const [relay3, setRelay3] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveState, setLiveState] = useState('CONNECTING');
  const [tick, setTick] = useState(Date.now());
  const [pendingRelayMap, setPendingRelayMap] = useState({ 1: false, 2: false, 3: false });

  const [showTimerModal, setShowTimerModal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState('30');
  const [timerActionBusy, setTimerActionBusy] = useState(false);
  const [scheduleActionBusy, setScheduleActionBusy] = useState(false);
  const [scheduleType, setScheduleType] = useState('daily');
  const [onTime, setOnTime] = useState('06:00');
  const [offTime, setOffTime] = useState('08:00');
  const [scheduleDate, setScheduleDate] = useState('');

  const lastTapRef = useRef({ 1: 0, 2: 0, 3: 0 });

  const applySnapshot = useCallback((payload) => {
    if (!payload) {
      return;
    }
    const next = payload.device ? payload.device : payload;
    setDevice(next);
    setRelay1(Boolean(next.relay1));
    setRelay2(Boolean(next.relay2));
    setRelay3(Boolean(next.relay3));
    setLoading(false);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE}/devices/${id}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        applySnapshot(data);
      }
    } catch (error) {
      console.error('Failed to fetch status');
    }
  }, [applySnapshot, id, router]);

  useEffect(() => {
    if (!id) {
      return;
    }
    fetchStatus();
  }, [fetchStatus, id]);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    let heartbeatTimer = null;
    const socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: { token },
    });

    socket.on('connect', () => {
      setLiveState('LIVE');
      socket.emit('device:subscribe', { deviceId: id });
      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(() => {
          socket.emit('app:heartbeat', { clientTime: Date.now() });
        }, 25000);
      }
    });

    socket.on('device:status', (payload) => {
      if (payload?.deviceId === id) {
        applySnapshot(payload);
      }
    });

    socket.on('disconnect', () => {
      setLiveState('RECONNECTING');
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    });

    socket.on('connect_error', () => {
      setLiveState('ERROR');
    });

    return () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [applySnapshot, id, router]);

  const relayStateMap = {
    1: relay1,
    2: relay2,
    3: relay3,
  };

  const toggleRelay = async (relayNum) => {
    const now = Date.now();
    if (pendingRelayMap[relayNum] || now - lastTapRef.current[relayNum] < 260) {
      return;
    }
    lastTapRef.current[relayNum] = now;

    const current = relayStateMap[relayNum];
    setPendingRelayMap((prev) => ({ ...prev, [relayNum]: true }));
    if (relayNum === 1) setRelay1(!current);
    if (relayNum === 2) setRelay2(!current);
    if (relayNum === 3) setRelay3(!current);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/devices/${id}/toggle/${relayNum}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('toggle_failed');
      }

      const data = await response.json();
      applySnapshot(data);
    } catch (error) {
      if (relayNum === 1) setRelay1(current);
      if (relayNum === 2) setRelay2(current);
      if (relayNum === 3) setRelay3(current);
      console.error('Failed to toggle');
    } finally {
      setPendingRelayMap((prev) => ({ ...prev, [relayNum]: false }));
    }
  };

  const setTimer = async (relay) => {
    if (timerActionBusy) {
      return;
    }
    const minutes = Number.parseInt(timerMinutes, 10);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
      return;
    }

    try {
      setTimerActionBusy(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/devices/${id}/timer/${relay}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ minutes }),
      });
      if (!response.ok) {
        throw new Error('timer_failed');
      }
      const data = await response.json();
      applySnapshot(data);
      setShowTimerModal(null);
    } catch (error) {
      console.error('Failed to set timer');
    } finally {
      setTimerActionBusy(false);
    }
  };

  const clearTimer = async (relay) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/devices/${id}/timer/${relay}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('clear_timer_failed');
      }
      const data = await response.json();
      applySnapshot(data);
    } catch (error) {
      console.error('Failed to clear timer');
    }
  };

  const setSchedule = async (relay) => {
    if (scheduleActionBusy) {
      return;
    }
    try {
      setScheduleActionBusy(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/devices/${id}/schedule/${relay}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: scheduleType,
          onTime,
          offTime,
          date: scheduleType === 'once' ? scheduleDate : null,
        }),
      });
      if (!response.ok) {
        throw new Error('schedule_failed');
      }
      const data = await response.json();
      applySnapshot(data);
      setShowScheduleModal(null);
    } catch (error) {
      console.error('Failed to set schedule');
    } finally {
      setScheduleActionBusy(false);
    }
  };

  const clearSchedule = async (relay) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/devices/${id}/schedule/${relay}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('clear_schedule_failed');
      }
      const data = await response.json();
      applySnapshot(data);
    } catch (error) {
      console.error('Failed to clear schedule');
    }
  };

  const getTimeRemaining = (endTime) => {
    const diff = new Date(endTime).getTime() - tick;
    if (diff <= 0) {
      return 'Ending...';
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const nudgeTimerMinutes = (delta) => {
    const current = Number.parseInt(timerMinutes || '0', 10);
    const safe = Number.isFinite(current) ? current : 0;
    const next = Math.min(1440, Math.max(1, safe + delta));
    setTimerMinutes(String(next));
  };

  const liveBadge = useMemo(() => {
    if (liveState === 'LIVE') {
      return { label: 'Live', cls: 'text-emerald-300', dot: 'bg-emerald-400' };
    }
    if (liveState === 'RECONNECTING') {
      return { label: 'Reconnecting', cls: 'text-amber-300', dot: 'bg-amber-400' };
    }
    if (liveState === 'ERROR') {
      return { label: 'Socket Error', cls: 'text-rose-300', dot: 'bg-rose-400' };
    }
    return { label: 'Connecting', cls: 'text-slate-300', dot: 'bg-slate-400' };
  }, [liveState]);

  const RelayCard = ({ relay, name, timer, schedule }) => {
    const theme = RELAY_THEME[relay];
    const Icon = theme.icon;
    const active = relayStateMap[relay];
    const pending = pendingRelayMap[relay];

    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 transition-all duration-300 ${active ? theme.chipOn : theme.chipOff}`}>
            <Icon
              size={46}
              className={`${active ? theme.iconOn : theme.iconOff}`}
              style={{ animationDuration: relay === 2 && active ? '1.2s' : undefined }}
            />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{name || theme.fallbackName}</h3>
          <p className={`text-sm font-medium ${active ? 'text-emerald-300' : 'text-slate-400'}`}>
            {active ? 'ON' : 'OFF'}
          </p>
        </div>

        {timer?.active && (
          <div className="mb-3 bg-orange-500/20 border border-orange-500/50 rounded-lg p-2 text-center">
            <div className="text-orange-300 text-xs font-medium">Timer Active</div>
            <div className="text-orange-200 text-lg font-bold tabular-nums animate-pulse">{getTimeRemaining(timer.endTime)}</div>
            <button onClick={() => clearTimer(relay)} className="text-orange-300 text-xs hover:text-orange-100 mt-1">
              Cancel
            </button>
          </div>
        )}

        {schedule?.active && (
          <div className="mb-3 bg-blue-500/20 border border-blue-500/50 rounded-lg p-2 text-center">
            <div className="text-blue-300 text-xs font-medium">{schedule.type === 'daily' ? 'Daily' : 'One-time'} Schedule</div>
            <div className="text-blue-200 text-sm">{schedule.onTime} - {schedule.offTime}</div>
            {schedule.type === 'once' && <div className="text-blue-300 text-xs">{schedule.date}</div>}
            <button onClick={() => clearSchedule(relay)} className="text-blue-300 text-xs hover:text-blue-100 mt-1">
              Remove
            </button>
          </div>
        )}

        <button
          onClick={() => toggleRelay(relay)}
          disabled={pending}
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 active:scale-95 mb-2 flex items-center justify-center gap-2 ${
            pending
              ? 'bg-slate-500/40 text-slate-100'
              : active
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-red-500/35'
                : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
          }`}
        >
          {pending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          <span>{pending ? 'Switching...' : active ? 'Turn OFF' : 'Turn ON'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              const activeTimer = device?.[`relay${relay}Timer`];
              if (activeTimer?.active && activeTimer?.endTime) {
                const left = Math.max(1, Math.ceil((new Date(activeTimer.endTime).getTime() - Date.now()) / 60000));
                setTimerMinutes(String(left));
              } else {
                setTimerMinutes('30');
              }
              setShowTimerModal(relay);
            }}
            className="py-2 px-3 bg-orange-500/20 text-orange-300 rounded-lg hover:bg-orange-500/30 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <Clock size={14} /> Timer
          </button>
          <button
            onClick={() => {
              const activeSchedule = device?.[`relay${relay}Schedule`];
              if (activeSchedule?.active) {
                setScheduleType(activeSchedule.type || 'daily');
                setOnTime(activeSchedule.onTime || '06:00');
                setOffTime(activeSchedule.offTime || '20:00');
                setScheduleDate(activeSchedule.date || '');
              } else {
                setScheduleType('daily');
                setOnTime('06:00');
                setOffTime('08:00');
                setScheduleDate('');
              }
              setShowScheduleModal(relay);
            }}
            className="py-2 px-3 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <Calendar size={14} /> Schedule
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Connecting live controls...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/35 to-slate-900 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/devices')}
            className="flex items-center gap-2 text-white hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft size={24} />
            <span className="text-lg">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${liveBadge.dot}`} />
            <span className={`text-sm ${liveBadge.cls}`}>{liveBadge.label}</span>
            {device?.isOnline ? (
              <>
                <Wifi size={20} className="text-emerald-400" />
                <span className="text-emerald-400 text-sm">Device Online</span>
              </>
            ) : (
              <>
                <WifiOff size={20} className="text-rose-400" />
                <span className="text-rose-400 text-sm">Device Offline</span>
              </>
            )}
          </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">{device?.deviceName || 'Smart Box'}</h1>
          <p className="text-slate-400 font-mono">{device?.deviceId}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <RelayCard relay={1} name={device?.relay1Name} timer={device?.relay1Timer} schedule={device?.relay1Schedule} />
          <RelayCard relay={2} name={device?.relay2Name} timer={device?.relay2Timer} schedule={device?.relay2Schedule} />
          <RelayCard relay={3} name={device?.relay3Name} timer={device?.relay3Timer} schedule={device?.relay3Schedule} />
        </div>

        {showTimerModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Set Timer</h2>
                <button onClick={() => setShowTimerModal(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <p className="text-slate-300 mb-4">Auto turn off after selected duration.</p>

              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-2">Minutes</label>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => nudgeTimerMinutes(-5)} className="px-3 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600">-5</button>
                  <input
                    type="number"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes((e.target.value || '').replace(/[^0-9]/g, '').slice(0, 4))}
                    min="1"
                    max="1440"
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button onClick={() => nudgeTimerMinutes(5)} className="px-3 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600">+5</button>
                </div>
                <div className="flex gap-2">
                  {[15, 30, 60, 120].map((m) => (
                    <button
                      key={m}
                      onClick={() => setTimerMinutes(String(m))}
                      className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setTimer(showTimerModal)}
                disabled={timerActionBusy}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-60"
              >
                {timerActionBusy ? 'Saving...' : 'Start Timer'}
              </button>
            </div>
          </div>
        )}

        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Set Schedule</h2>
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
                      scheduleType === 'daily' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setScheduleType('once')}
                    className={`py-2 rounded-lg font-medium transition-colors ${
                      scheduleType === 'once' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
                disabled={scheduleActionBusy}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-60"
              >
                {scheduleActionBusy ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
