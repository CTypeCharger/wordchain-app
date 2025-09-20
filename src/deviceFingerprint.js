// 디바이스 지문 기반 사용자 식별
export class DeviceFingerprint {
  constructor() {
    this.FINGERPRINT_KEY = 'wordchain_device_fingerprint';
  }

  // 디바이스 지문 생성
  generateFingerprint() {
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
      canvas.toDataURL()
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
    
    return Math.abs(hash).toString(36);
  }

  // 디바이스 지문 가져오기 또는 생성
  getDeviceFingerprint() {
    let fingerprint = localStorage.getItem(this.FINGERPRINT_KEY);
    
    if (!fingerprint) {
      fingerprint = this.generateFingerprint();
      localStorage.setItem(this.FINGERPRINT_KEY, fingerprint);
    }
    
    return fingerprint;
  }

  // 사용자 데이터 키 생성
  getUserDataKey() {
    return `device_data_${this.getDeviceFingerprint()}`;
  }

  // 디바이스 정보 가져오기
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fingerprint: this.getDeviceFingerprint()
    };
  }
}

export const deviceFingerprint = new DeviceFingerprint();
