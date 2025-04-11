import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

const DEFAULT_DB_URL = 'https://lamp-8d777-default-rtdb.asia-southeast1.firebasedatabase.app';

let app: FirebaseApp;
let db: Database;
let touchesDb: Database;
let syncDb: Database;

export const initializeFirebase = (databaseURL: string) => {
  try {
    if (!databaseURL.startsWith('https://')) {
      throw new Error('Database URL must start with https://');
    }

    if (app) {
      deleteApp(app).catch(console.error);
    }

    app = initializeApp({
      databaseURL
    });
    
    db = getDatabase(app);
    touchesDb = getDatabase(app);
    syncDb = getDatabase(app);
    
    localStorage.setItem('firebaseUrl', databaseURL);
    
    return {
      mainDb: db,
      touchesDb,
      syncDb
    };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

// Initialize with stored URL or default
const storedUrl = localStorage.getItem('firebaseUrl') || DEFAULT_DB_URL;
const { mainDb, touchesDb: initialTouchesDb, syncDb: initialSyncDb } = initializeFirebase(storedUrl);

export const database = mainDb;
export const touchesDatabase = initialTouchesDb;
export const syncDatabase = initialSyncDb;

export const getCurrentDatabaseUrl = () => {
  return localStorage.getItem('firebaseUrl') || DEFAULT_DB_URL;
};

export const getServerTimestamp = () => Date.now();

export const isWithinSyncWindow = (timestamp1: number, timestamp2: number, windowMs: number = 5000) => {
  return Math.abs(timestamp1 - timestamp2) <= windowMs;
};

export const generateSyncId = (user1: string, user2: string) => {
  const sortedUsers = [user1, user2].sort();
  return `${sortedUsers[0]}_${sortedUsers[1]}_${Date.now()}`;
};