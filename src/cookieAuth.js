// 쿠키 기반 익명 세션 시스템
export class CookieAuth {
  constructor() {
    this.SESSION_COOKIE = 'wordchain_session';
    this.SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30일
  }

  // 세션 ID 생성 또는 가져오기
  getSessionId() {
    let sessionId = this.getCookie(this.SESSION_COOKIE);
    
    if (!sessionId) {
      sessionId = this.generateSessionId();
      this.setCookie(this.SESSION_COOKIE, sessionId, this.SESSION_DURATION);
    }
    
    return sessionId;
  }

  // 세션 ID 생성
  generateSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // 쿠키 설정
  setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  // 쿠키 가져오기
  getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  // 사용자 데이터 키 생성
  getUserDataKey() {
    return `session_data_${this.getSessionId()}`;
  }

  // 세션 만료 확인
  isSessionValid() {
    const sessionId = this.getCookie(this.SESSION_COOKIE);
    return sessionId !== null;
  }

  // 세션 갱신
  refreshSession() {
    const sessionId = this.getSessionId();
    this.setCookie(this.SESSION_COOKIE, sessionId, this.SESSION_DURATION);
  }
}

export const cookieAuth = new CookieAuth();
