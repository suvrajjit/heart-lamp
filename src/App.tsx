import React, { useState, useEffect, useCallback } from 'react';
import { Heart, User, Edit2, Settings, Palette } from 'lucide-react';
import { 
  database, 
  touchesDatabase,
  syncDatabase,
  initializeFirebase, 
  getCurrentDatabaseUrl, 
  getServerTimestamp,
  isWithinSyncWindow,
  generateSyncId
} from './firebase';
import { ref, onValue, set, get, remove } from 'firebase/database';
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const [isGlowing, setIsGlowing] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [savedUsername, setSavedUsername] = useState(() => localStorage.getItem('username') || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [databaseUrl, setDatabaseUrl] = useState(getCurrentDatabaseUrl());
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [currentDatabase, setCurrentDatabase] = useState(database);
  const [lastTouchTime, setLastTouchTime] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [lampColor, setLampColor] = useState(() => localStorage.getItem('lampColor') || '#ec4899');
  const [isSyncAnimating, setIsSyncAnimating] = useState(false);
  const [mixedColor, setMixedColor] = useState(lampColor);
  const [syncPartner, setSyncPartner] = useState('');
  const [lastNotificationTime, setLastNotificationTime] = useState(0);
  const [syncStartTime, setSyncStartTime] = useState(0);

  const predefinedColors = [
    '#ec4899', // pink-500 (default)
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#a855f7', // purple-500
  ];

  const showNotification = useCallback((title: string, body: string) => {
    const now = Date.now();
    if (now - lastNotificationTime < 2000) {
      return;
    }
    
    setLastNotificationTime(now);

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/appicon.ico',
        silent: false
      });
    }
    
    toast(body, {
      icon: '💖',
      duration: 5000,
      id: `${title}-${now}`
    });
  }, [lastNotificationTime]);

  const resetSyncState = useCallback(() => {
    if (isSyncAnimating && syncPartner) {
      showNotification(
        'Sync Ended',
        `The connection fades but the warmth remains 💖`
      );
    }
    setIsSyncAnimating(false);
    setIsInCooldown(false);
    setMixedColor(lampColor);
    setSyncPartner('');
    setSyncStartTime(0);
  }, [lampColor, isSyncAnimating, syncPartner, showNotification]);

  const mixColors = (color1: string, color2: string) => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  useEffect(() => {
    const savedName = localStorage.getItem('username');
    if (savedName) {
      setSavedUsername(savedName);
      setIsLoggedIn(true);
    }

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  const handleTouch = async () => {
    if (!savedUsername || isSyncAnimating || isInCooldown) return;

    const now = getServerTimestamp();
    setLastTouchTime(now);
    setIsGlowing(true);
    setIsInCooldown(true);
    
    try {
      const touchRef = ref(touchesDatabase, `touches/${savedUsername}`);
      await set(touchRef, {
        timestamp: now,
        color: lampColor
      });

      const touchesSnapshot = await get(ref(touchesDatabase, 'touches'));
      const touches = touchesSnapshot.val() || {};
      
      for (const [otherUser, touchData] of Object.entries(touches)) {
        if (otherUser !== savedUsername && isWithinSyncWindow(now, touchData.timestamp)) {
          const syncId = generateSyncId(savedUsername, otherUser);
          const syncRef = ref(syncDatabase, `syncs/${syncId}`);
          
          const newMixedColor = mixColors(lampColor, touchData.color);
          
          await set(syncRef, {
            active: true,
            users: [savedUsername, otherUser],
            startTime: now,
            mixedColor: newMixedColor,
            expiresAt: now + 10000
          });

          await remove(ref(touchesDatabase, `touches/${savedUsername}`));
          await remove(ref(touchesDatabase, `touches/${otherUser}`));
          
          break;
        }
      }

      toast.success('Sent your love! ❤️');
    } catch (error) {
      console.error('Error sending touch:', error);
      toast.error('Failed to send touch. Please check your connection.');
    }

    setTimeout(async () => {
      try {
        const touchRef = ref(touchesDatabase, `touches/${savedUsername}`);
        const touchSnapshot = await get(touchRef);
        if (touchSnapshot.exists()) {
          await remove(touchRef);
        }
      } catch (error) {
        console.error('Error cleaning up touch:', error);
      }
      if (!isSyncAnimating) {
        setIsGlowing(false);
        setIsInCooldown(false);
      }
    }, 5000);
  };

  useEffect(() => {
    if (!savedUsername) return;

    const touchesRef = ref(touchesDatabase, 'touches');
    const syncRef = ref(syncDatabase, 'syncs');
    let syncTimeout: NodeJS.Timeout;
    let syncStartTimeout: NodeJS.Timeout;
    
    const touchesUnsubscribe = onValue(touchesRef, async (snapshot) => {
      const touches = snapshot.val() || {};
      
      if (isSyncAnimating || !touches) return;

      for (const [otherUser, touchData] of Object.entries(touches)) {
        if (otherUser !== savedUsername && touchData) {
          setIsGlowing(true);
          showNotification(
            'New Touch',
            `${otherUser} sent you love! ❤️`
          );
          
          setTimeout(() => {
            if (!isSyncAnimating) {
              setIsGlowing(false);
            }
          }, 5000);
          break;
        }
      }
    });

    const syncUnsubscribe = onValue(syncRef, async (snapshot) => {
      const syncs = snapshot.val() || {};
      let foundActiveSync = false;
      
      for (const [syncId, syncData] of Object.entries(syncs)) {
        if (
          syncData.active && 
          syncData.users.includes(savedUsername) &&
          syncData.expiresAt > getServerTimestamp()
        ) {
          foundActiveSync = true;
          const otherUser = syncData.users.find(user => user !== savedUsername);
          
          if (otherUser) {
            if (!isSyncAnimating || otherUser !== syncPartner) {
              setSyncPartner(otherUser);
              setIsGlowing(false);
              setMixedColor(syncData.mixedColor);
              
              // Clear any existing timeouts
              if (syncStartTimeout) clearTimeout(syncStartTimeout);
              if (syncTimeout) clearTimeout(syncTimeout);
              
              // Start sync with delay
              syncStartTimeout = setTimeout(() => {
                setIsSyncAnimating(true);
                showNotification(
                  'Hearts Connected!',
                  `Your heart is now beating in sync with ${otherUser}! 💖`
                );
              }, 1000);
              
              setSyncStartTime(Date.now());
            }

            const timeLeft = syncData.expiresAt - getServerTimestamp();
            if (timeLeft > 0) {
              if (syncTimeout) clearTimeout(syncTimeout);
              syncTimeout = setTimeout(async () => {
                await remove(ref(syncDatabase, `syncs/${syncId}`));
                resetSyncState();
              }, timeLeft);
            }
          }
          break;
        }
      }

      if (!foundActiveSync && isSyncAnimating) {
        resetSyncState();
      }
    });

    const userRef = ref(database, `users/${savedUsername}`);
    set(userRef, { color: lampColor }).catch(console.error);

    return () => {
      touchesUnsubscribe();
      syncUnsubscribe();
      if (syncTimeout) clearTimeout(syncTimeout);
      if (syncStartTimeout) clearTimeout(syncStartTimeout);
      resetSyncState();
    };
  }, [savedUsername, lampColor, isSyncAnimating, resetSyncState, showNotification, syncPartner]);

  const handleColorChange = (color: string) => {
    setLampColor(color);
    localStorage.setItem('lampColor', color);
    setShowColorPicker(false);
    toast.success('Lamp color updated! ❤️');
    
    if (savedUsername) {
      const userRef = ref(currentDatabase, `users/${savedUsername}`);
      set(userRef, { color }).catch(console.error);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      const trimmedUsername = username.trim();
      setSavedUsername(trimmedUsername);
      setIsLoggedIn(true);
      setIsEditing(false);
      localStorage.setItem('username', trimmedUsername);
      toast.success(`Welcome ${trimmedUsername}!`);
    }
  };

  const handleEditUsername = () => {
    setUsername(savedUsername);
    setIsEditing(true);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    
    try {
      if (!databaseUrl.startsWith('https://')) {
        throw new Error('Database URL must start with https://');
      }
      
      const newDb = initializeFirebase(databaseUrl);
      const testRef = ref(newDb.mainDb, '.info/connected');
      
      await new Promise((resolve, reject) => {
        const unsubscribe = onValue(testRef, (snapshot) => {
          unsubscribe();
          if (snapshot.val() === true) {
            resolve(true);
          } else {
            reject(new Error('Could not connect to database'));
          }
        }, (error) => {
          reject(error);
        });
        
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      setCurrentDatabase(newDb.mainDb);
      setShowSettings(false);
      toast.success('Firebase settings updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update Firebase settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  if (!isLoggedIn || isEditing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8">
        <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <User className="text-pink-500 w-8 h-8" />
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-gray-200 mb-2">
                {isEditing ? 'Edit your name' : 'Enter your name'}
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Your name"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                {isEditing ? 'Save' : 'Continue'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col items-center justify-center p-8
      ${isSyncAnimating 
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800' 
        : isGlowing 
          ? 'bg-gradient-to-br from-slate-950 to-slate-900' 
          : 'bg-gradient-to-br from-slate-900 to-slate-800'}`}>
      <Toaster position="top-center" />
      
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm w-full max-w-md">
            <h2 className="text-xl text-white mb-4">Firebase Settings</h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label htmlFor="databaseUrl" className="block text-gray-200 mb-2">
                  Database URL
                </label>
                <input
                  type="text"
                  id="databaseUrl"
                  value={databaseUrl}
                  onChange={(e) => setDatabaseUrl(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Firebase Realtime Database URL"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">
                  Must start with https:// and be a valid Firebase Realtime Database URL
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isUpdatingSettings}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 text-white py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isUpdatingSettings ? 'Updating...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  disabled={isUpdatingSettings}
                  className="px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showColorPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 p-8 rounded-lg backdrop-blur-sm w-full max-w-md">
            <h2 className="text-xl text-white mb-4">Choose Lamp Color</h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className="w-12 h-12 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowColorPicker(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative mb-24">
        <button
          onClick={handleTouch}
          className="relative group outline-none"
          aria-label="Touch lamp"
          disabled={isSyncAnimating || isInCooldown}
        >
          <div
            className={`absolute inset-0 scale-150 blur-2xl transition-all duration-1000
              ${isSyncAnimating ? 'opacity-90 scale-200' : isGlowing ? 'opacity-70' : 'opacity-0'}`}
            style={{ 
              background: isSyncAnimating
                ? `radial-gradient(circle, ${mixedColor}, transparent)`
                : `radial-gradient(circle, ${lampColor}, transparent)`
            }}
          />
          
          <div className={`relative transition-transform duration-300 
            ${isSyncAnimating 
              ? 'scale-125 animate-[heartbeat_0.5s_ease-in-out_infinite]' 
              : isGlowing 
                ? 'scale-110 animate-heartbeat' 
                : 'scale-100'}`}>
            <Heart
              size={180}
              className="transition-all duration-500 ease-in-out"
              style={{
                color: isSyncAnimating ? mixedColor : isGlowing ? lampColor : `${lampColor}33`,
                filter: (isSyncAnimating || isGlowing) ? `drop-shadow(0 0 30px ${isSyncAnimating ? mixedColor : lampColor}99)` : 'none'
              }}
              fill={isSyncAnimating ? mixedColor : isGlowing ? lampColor : `${lampColor}33`}
              strokeWidth={1}
            />
          </div>

          {(isGlowing || isSyncAnimating) && (
            <div className={`absolute inset-0 ${isSyncAnimating ? 'animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]' : 'animate-ping'}`}>
              <Heart
                size={180}
                style={{ color: isSyncAnimating ? `${mixedColor}33` : `${lampColor}33` }}
                fill="currentColor"
                strokeWidth={1}
              />
            </div>
          )}
        </button>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-center bg-white/5 p-6 rounded-xl backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4">
          <p className="text-gray-300 text-base">
            Logged in as: <span className="text-pink-400 font-medium">{savedUsername}</span>
          </p>
          <button
            onClick={handleEditUsername}
            className="text-gray-400 hover:text-pink-400 transition-colors p-2 hover:bg-white/5 rounded-lg"
            aria-label="Edit username"
            disabled={isSyncAnimating}
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => setShowColorPicker(true)}
            className="text-gray-400 hover:text-pink-400 transition-colors p-2 hover:bg-white/5 rounded-lg"
            aria-label="Change color"
            disabled={isSyncAnimating}
          >
            <Palette size={20} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-pink-400 transition-colors p-2 hover:bg-white/5 rounded-lg"
            aria-label="Settings"
            disabled={isSyncAnimating}
          >
            <Settings size={20} />
          </button>
        </div>
        <p className="text-gray-500 text-sm mt-2">
          {isSyncAnimating 
            ? `Hearts beating in perfect sync with ${syncPartner}! 💖` 
            : isInCooldown
              ? 'Waiting to send love again...'
              : 'Tap the heart to send your love'}
        </p>
      </div>
    </div>
  );
}

export default App;