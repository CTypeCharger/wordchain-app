// 익명 사용자 인증 시스템
export class AnonymousAuth {
  constructor() {
    this.ANONYMOUS_ID_KEY = 'wordchain_anonymous_id';
    this.ANONYMOUS_NAME_KEY = 'wordchain_anonymous_name';
  }

  // 익명 ID 생성 또는 가져오기
  getAnonymousId() {
    let anonymousId = localStorage.getItem(this.ANONYMOUS_ID_KEY);
    
    if (!anonymousId) {
      // 고유한 익명 ID 생성 (UUID v4)
      anonymousId = this.generateUUID();
      localStorage.setItem(this.ANONYMOUS_ID_KEY, anonymousId);
    }
    
    return anonymousId;
  }

  // 익명 사용자명 설정
  setAnonymousName(name) {
    localStorage.setItem(this.ANONYMOUS_NAME_KEY, name);
  }

  // 익명 사용자명 가져오기
  getAnonymousName() {
    return localStorage.getItem(this.ANONYMOUS_NAME_KEY) || '익명 사용자';
  }

  // UUID v4 생성
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 사용자 데이터 키 생성
  getUserDataKey() {
    return `user_data_${this.getAnonymousId()}`;
  }

  // 사용자 설정 키 생성
  getUserSettingsKey() {
    return `user_settings_${this.getAnonymousId()}`;
  }

  // 데이터 초기화
  clearUserData() {
    const anonymousId = this.getAnonymousId();
    localStorage.removeItem(`user_data_${anonymousId}`);
    localStorage.removeItem(`user_settings_${anonymousId}`);
  }

  // 모든 익명 사용자 데이터 가져오기 (관리자용)
  getAllAnonymousUsers() {
    const users = [];
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith('user_data_')) {
        const anonymousId = key.replace('user_data_', '');
        const userData = JSON.parse(localStorage.getItem(key) || '{"items": []}');
        const userName = localStorage.getItem(`wordchain_anonymous_name_${anonymousId}`) || '익명 사용자';
        
        users.push({
          id: anonymousId,
          name: userName,
          wordCount: userData.items?.length || 0,
          lastActive: new Date().toISOString()
        });
      }
    });
    
    return users;
  }
}

export const anonymousAuth = new AnonymousAuth();
