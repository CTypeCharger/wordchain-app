// 디바이스 지문 기반 익명 인증 시스템
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBVVotiRdcakw5CpDVZFoME_Ol5hsdl4_8",
  authDomain: "wordchain-9db18.firebaseapp.com",
  projectId: "wordchain-9db18",
  storageBucket: "wordchain-9db18.firebasestorage.app",
  messagingSenderId: "790881499796",
  appId: "1:790881499796:web:f8fece7e845f6e5afb5281"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export class DeviceAuth {
  constructor() {
    this.DEVICE_ID_KEY = 'wordchain_device_id';
    this.USER_NAME_KEY = 'wordchain_user_name';
  }

  // 디바이스 고유 ID 생성 또는 가져오기
  getDeviceId() {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    
    if (!deviceId) {
      // 디바이스 지문 생성
      deviceId = this.generateDeviceFingerprint();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  }

  // 디바이스 지문 생성
  generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.hardwareConcurrency || 'unknown',
      navigator.maxTouchPoints || 0,
      canvas.toDataURL(),
      // 추가 고유 정보
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.cookieEnabled,
      navigator.doNotTrack || 'unknown'
    ].join('|');
    
    return this.hashString(fingerprint);
  }

  // 문자열 해시 생성
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer로 변환
    }
    
    return 'device_' + Math.abs(hash).toString(36);
  }

  // 사용자명 설정
  setUserName(name) {
    localStorage.setItem(this.USER_NAME_KEY, name);
  }

  // 사용자명 가져오기
  getUserName() {
    return localStorage.getItem(this.USER_NAME_KEY) || '익명 사용자';
  }

  // 사용자 데이터 저장
  async saveUserData(data) {
    try {
      const deviceId = this.getDeviceId();
      const userName = this.getUserName();
      
      const userRef = doc(db, 'anonymous_users', deviceId);
      await setDoc(userRef, {
        deviceId,
        userName,
        data,
        lastUpdated: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo()
      }, { merge: true });
      
      console.log('데이터 저장 완료:', deviceId);
      return true;
    } catch (error) {
      console.error('데이터 저장 실패:', error);
      return false;
    }
  }

  // 사용자 데이터 로드
  async loadUserData() {
    try {
      const deviceId = this.getDeviceId();
      const userRef = doc(db, 'anonymous_users', deviceId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log('데이터 로드 완료:', deviceId);
        return {
          items: userData.data?.items || [],
          settings: userData.data?.settings || { hideMeaningsByDefault: true },
          userName: userData.userName || '익명 사용자'
        };
      } else {
        console.log('새 사용자 데이터 생성');
        return {
          items: [],
          settings: { hideMeaningsByDefault: true },
          userName: '익명 사용자'
        };
      }
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      return {
        items: [],
        settings: { hideMeaningsByDefault: true },
        userName: '익명 사용자'
      };
    }
  }

  // 사용자 데이터 삭제
  async clearUserData() {
    try {
      const deviceId = this.getDeviceId();
      const userRef = doc(db, 'anonymous_users', deviceId);
      await setDoc(userRef, {
        deviceId,
        userName: this.getUserName(),
        data: { items: [], settings: { hideMeaningsByDefault: true } },
        lastUpdated: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo()
      });
      
      console.log('데이터 삭제 완료:', deviceId);
      return true;
    } catch (error) {
      console.error('데이터 삭제 실패:', error);
      return false;
    }
  }

  // 디바이스 정보 가져오기
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'unknown'
    };
  }

  // 모든 사용자 데이터 가져오기 (관리자용)
  async getAllUsers() {
    try {
      // 이 기능은 관리자 패널에서만 사용
      console.log('관리자 기능: 모든 사용자 데이터 조회');
      return [];
    } catch (error) {
      console.error('사용자 데이터 조회 실패:', error);
      return [];
    }
  }
}

export const deviceAuth = new DeviceAuth();
