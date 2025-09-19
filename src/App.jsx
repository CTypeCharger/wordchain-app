import React, { useEffect, useMemo, useState } from "react";
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  saveUserData, 
  getUserData, 
  onAuthStateChange 
} from "./firebaseService";
import { auth } from "./firebase";

/**
 * 영어 단어 체인 암기 웹앱 (Follow-Along)
 * - 스크립트에서 설명한 학습 루틴을 그대로 따라갈 수 있는 싱글 파일 리액트 앱
 * - 핵심 기능
 *   1) 모르는 단어만 체크→등록
 *   2) 영영정의/발음/관련어(체인) 기록
 *   3) 1주 집중 암기, 4주 복습 일정 자동 생성
 *   4) 주머니용 4등분 Pocket Sheet 생성/인쇄
 *   5) 가리기 테스트(정의/한국어 뜻 숨김), 셀프 채점
 *   6) 로컬 저장/내보내기/가져오기 (백엔드 불필요)
 *
 * 사용법 요약
 * - [추가]에서 단어 등록 → [학습]에서 가리기/퀴즈 → [리뷰]에서 오늘 복습 Due 항목 처리
 * - [Pocket Sheet]에서 4등분 용지 인쇄
 * - [백업]에서 JSON 내보내기/가져오기
 */

// ===== 유틸 =====
const STORAGE_KEY = "follow_along_vocab_v1";
const USERS_KEY = "follow_along_users_v1";
const CURRENT_USER_KEY = "follow_along_current_user_v1";

const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const uid = () => Math.random().toString(36).slice(2, 9);

// ===== 사용자 관리 =====
// Firebase 기반 사용자 관리로 대체됨

// Firebase 함수들은 import로 가져옴

// ===== 데이터 관리 =====
const clearAllUserData = () => {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(STORAGE_KEY);
};

const clearCurrentUserData = (username) => {
  const users = getUsers();
  if (users[username]) {
    users[username] = { 
      items: [], 
      settings: { hideMeaningsByDefault: true },
      createdAt: users[username].createdAt,
      password: users[username].password
    };
    saveUsers(users);
  }
};

const clearUserData = (username) => {
  const users = getUsers();
  if (users[username]) {
    users[username] = { 
      items: [], 
      settings: { hideMeaningsByDefault: true },
      createdAt: users[username].createdAt,
      password: users[username].password
    };
    saveUsers(users);
    return { success: true };
  }
  return { success: false, error: "사용자를 찾을 수 없습니다" };
};

const clearAllWords = () => {
  const users = getUsers();
  Object.keys(users).forEach(username => {
    users[username].items = [];
    users[username].settings = { hideMeaningsByDefault: true };
  });
  saveUsers(users);
  localStorage.removeItem(STORAGE_KEY);
};

const getUserCount = () => {
  // Firebase에서는 사용자 수를 직접 계산하기 어려우므로 임시로 0 반환
  return 0;
};

const getTotalWordCount = () => {
  // Firebase에서는 전체 단어 수를 직접 계산하기 어려우므로 임시로 0 반환
  return 0;
};

// ===== 관리자 인증 =====
const ADMIN_KEY = "follow_along_admin_v1";
const ADMIN_PASSWORD = "admin123"; // 실제 운영에서는 더 강력한 비밀번호 사용

const checkAdminLoginStatus = () => {
  return localStorage.getItem(ADMIN_KEY) === "true";
};

const loginAdmin = (password) => {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, "true");
    return { success: true };
  }
  return { success: false, error: "관리자 비밀번호가 올바르지 않습니다" };
};

const logoutAdmin = () => {
  localStorage.removeItem(ADMIN_KEY);
};

// defaultSample 함수 제거 - 새 사용자는 빈 데이터로 시작

function useLocalStore(currentUser) {
  const [data, setData] = useState(() => {
    // Firebase 사용자 데이터는 useEffect에서 로드됨
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { items: [], settings: { hideMeaningsByDefault: true } };
  });
  
  useEffect(() => {
    if (currentUser && auth.currentUser) {
      saveUserData(auth.currentUser.uid, data);
    } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, currentUser]);
  
  return [data, setData];
}

// ===== UI 구성요소 =====
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap min-h-[36px] flex items-center justify-center
        ${active 
          ? "bg-gray-900 text-white" 
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }
      `}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, color = "indigo" }) {
  const colorClasses = {
    indigo: "text-blue-600",
    emerald: "text-green-600", 
    amber: "text-orange-600",
    rose: "text-red-600"
  };
  
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="text-sm font-medium text-gray-500 mb-3">{label}</div>
      <div className={`text-4xl font-light ${colorClasses[color]}`}>
        {value}
      </div>
    </div>
  );
}

function Tag({ children, variant = "default" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    stage: "bg-blue-100 text-blue-700",
    pronunciation: "bg-green-100 text-green-700",
    partOfSpeech: "bg-blue-100 text-blue-700",
    related: "bg-orange-100 text-orange-700"
  };
  
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${variants[variant]} ${variant === 'pronunciation' ? 'pronunciation-display' : ''}`}>
      {variant === 'pronunciation' ? (
        <span dangerouslySetInnerHTML={{ __html: children }}></span>
      ) : (
        children
      )}
    </span>
  );
}

// ===== 관리자 로그인 화면 =====
function AdminLoginScreen({ onLogin, onBack }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = loginAdmin(password);
    if (result.success) {
      onLogin();
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">🔐</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            관리자 로그인
          </h2>
          <p className="text-gray-600">
            관리자 기능을 사용하려면 비밀번호를 입력하세요
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              관리자 비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            관리자 비밀번호를 입력하세요
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== 관리자 패널 =====
function AdminPanel({ onClose, onDataCleared, onLogout }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [actionType, setActionType] = useState("");
  const [loading, setLoading] = useState(false);

  const userCount = getUserCount();
  const totalWords = getTotalWordCount();

  const handleClearData = (type) => {
    setActionType(type);
    setShowConfirm(true);
  };

  const confirmClear = () => {
    setLoading(true);
    
    try {
      switch (actionType) {
        case "all":
          clearAllUserData();
          onDataCleared("모든 사용자 데이터와 단어가 삭제되었습니다");
          break;
        case "words":
          clearAllWords();
          onDataCleared("모든 단어가 삭제되었습니다");
          break;
        case "current":
          clearCurrentUserData(auth.currentUser?.uid);
          onDataCleared("현재 사용자의 단어가 삭제되었습니다");
          break;
      }
    } catch (error) {
      console.error("데이터 삭제 오류:", error);
    }
    
    setLoading(false);
    setShowConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">관리자 패널</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              관리자 로그아웃
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="font-medium text-gray-900 mb-3">현재 상태</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>등록된 사용자: <span className="font-medium text-gray-900">{userCount}명</span></div>
              <div>총 단어 수: <span className="font-medium text-gray-900">{totalWords}개</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">데이터 초기화</h3>
            
            <button
              onClick={() => handleClearData("current")}
              className="w-full p-4 bg-orange-50 border border-orange-200 rounded-2xl text-left hover:bg-orange-100 transition-colors duration-200"
            >
              <div className="font-medium text-orange-900">현재 사용자 단어 삭제</div>
              <div className="text-sm text-orange-700 mt-1">현재 로그인한 사용자의 단어만 삭제</div>
            </button>

            <button
              onClick={() => handleClearData("words")}
              className="w-full p-4 bg-red-50 border border-red-200 rounded-2xl text-left hover:bg-red-100 transition-colors duration-200"
            >
              <div className="font-medium text-red-900">모든 단어 삭제</div>
              <div className="text-sm text-red-700 mt-1">모든 사용자의 단어를 삭제 (사용자 계정은 유지)</div>
            </button>

            <button
              onClick={() => handleClearData("all")}
              className="w-full p-4 bg-red-100 border border-red-300 rounded-2xl text-left hover:bg-red-200 transition-colors duration-200"
            >
              <div className="font-medium text-red-900">모든 데이터 삭제</div>
              <div className="text-sm text-red-700 mt-1">사용자 계정과 모든 단어를 완전 삭제</div>
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">정말 삭제하시겠습니까?</h3>
              <p className="text-gray-600 mb-6">
                {actionType === "current" && "현재 사용자의 모든 단어가 삭제됩니다."}
                {actionType === "words" && "모든 사용자의 단어가 삭제됩니다."}
                {actionType === "all" && "모든 사용자 계정과 단어가 완전히 삭제됩니다."}
                <br /><br />
                <strong>이 작업은 되돌릴 수 없습니다!</strong>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
                >
                  취소
                </button>
                <button
                  onClick={confirmClear}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== 비밀번호 복구 화면 =====
function PasswordRecoveryScreen({ onBack, onReset }) {
  const [step, setStep] = useState(1); // 1: 사용자명 입력, 2: 보안 질문, 3: 새 비밀번호
  const [form, setForm] = useState({
    username: "",
    securityAnswer: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const securityQuestions = [
    "가장 좋아하는 색깔은?",
    "어릴 때 살던 도시는?",
    "첫 번째 애완동물의 이름은?",
    "가장 좋아하는 음식은?",
    "졸업한 초등학교 이름은?"
  ];

  const handleStep1 = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const users = getUsers();
    if (!users[form.username]) {
      setError("사용자를 찾을 수 없습니다");
      setLoading(false);
      return;
    }

    setStep(2);
    setLoading(false);
  };

  const handleStep2 = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 간단한 보안 검증 (실제로는 더 복잡해야 함)
    const users = getUsers();
    const user = users[form.username];
    
    // 기본 보안 답변 (실제로는 사용자가 설정한 답변을 사용해야 함)
    const defaultAnswer = "blue"; // 예시 답변
    
    if (form.securityAnswer.toLowerCase() !== defaultAnswer) {
      setError("보안 답변이 올바르지 않습니다");
      setLoading(false);
      return;
    }

    setStep(3);
    setLoading(false);
  };

  const handleStep3 = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (form.newPassword !== form.confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다");
      setLoading(false);
      return;
    }

    if (form.newPassword.length < 4) {
      setError("비밀번호는 최소 4자 이상이어야 합니다");
      setLoading(false);
      return;
    }

    // 비밀번호 업데이트
    const users = getUsers();
    users[form.username].password = form.newPassword;
    saveUsers(users);

    setError("");
    setLoading(false);
    onReset("비밀번호가 성공적으로 재설정되었습니다");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="Follow-Along" className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              비밀번호 복구
            </h2>
            <p className="text-gray-600">
              {step === 1 && "사용자명을 입력하세요"}
              {step === 2 && "보안 질문에 답하세요"}
              {step === 3 && "새 비밀번호를 설정하세요"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사용자명
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({...form, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="사용자명을 입력하세요"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? "확인 중..." : "다음"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  보안 질문
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  {securityQuestions[0]}
                </p>
                <input
                  type="text"
                  value={form.securityAnswer}
                  onChange={(e) => setForm({...form, securityAnswer: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="답변을 입력하세요"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? "확인 중..." : "다음"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({...form, newPassword: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="새 비밀번호를 입력하세요"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? "재설정 중..." : "비밀번호 재설정"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors duration-200"
            >
              로그인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 로그인 컴포넌트 =====
function LoginScreen({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [showRecovery, setShowRecovery] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register") {
      if (form.password !== form.confirmPassword) {
        setError("비밀번호가 일치하지 않습니다");
        setLoading(false);
        return;
      }
      
      const result = await onRegister(form.email, form.password, form.username);
      if (!result.success) {
        setError(result.error);
      }
    } else {
      const result = await onLogin(form.email, form.password);
      if (!result.success) {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  const handleRecoverySuccess = (message) => {
    setError(message);
    setShowRecovery(false);
  };

  // 비밀번호 복구 화면 표시
  if (showRecovery) {
    return (
      <PasswordRecoveryScreen 
        onBack={() => setShowRecovery(false)} 
        onReset={handleRecoverySuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <img src="/logo.png" alt="로고" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-medium text-gray-900 mb-2">영어 단어 체인 암기</h1>
            <p className="text-gray-500">개인별 단어장 관리</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                placeholder="이메일을 입력하세요"
              />
            </div>
            
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사용자명</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                  value={form.username}
                  onChange={e => setForm({...form, username: e.target.value})}
                  placeholder="사용자명을 입력하세요"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                  value={form.confirmPassword}
                  onChange={e => setForm({...form, confirmPassword: e.target.value})}
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 rounded-2xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 rounded-2xl bg-gray-900 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {mode === "login" && (
              <div>
                <button
                  onClick={() => setShowRecovery(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm transition-colors duration-200"
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setForm({ username: "", password: "", confirmPassword: "" });
              }}
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors duration-200"
            >
              {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 메인 앱 =====
export default function App() {
  const [currentUser, setCurrentUserState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  
  // currentUser가 있을 때만 useLocalStore 사용
  const [store, setStore] = useLocalStore(currentUser);

  // Firebase 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        setCurrentUserState(user.displayName || user.email);
        // 사용자 데이터 로드
        getUserData(user.uid).then(result => {
          if (result.success) {
            setStore(result.data);
          }
        });
      } else {
        setCurrentUserState(null);
        setStore({ items: [], settings: { hideMeaningsByDefault: true } });
      }
      setIsAdminLoggedIn(checkAdminLoginStatus());
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    const result = await loginUser(email, password);
    if (result.success) {
      // Firebase auth state change가 자동으로 처리됨
    }
    return result;
  };

  const handleRegister = async (email, password, username) => {
    const result = await registerUser(email, password, username);
    if (result.success) {
      // Firebase auth state change가 자동으로 처리됨
    }
    return result;
  };

  const handleLogout = async () => {
    await logoutUser();
    setTab("dashboard");
  };

  const handleAdminDataCleared = (message) => {
    setAdminMessage(message);
    // 데이터가 삭제되었으므로 store를 새로고침
    window.location.reload();
  };

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    setShowAdminLogin(false);
    setShowAdminPanel(true);
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setIsAdminLoggedIn(false);
    setShowAdminPanel(false);
  };

  const handleAdminButtonClick = () => {
    if (isAdminLoggedIn) {
      setShowAdminPanel(true);
    } else {
      setShowAdminLogin(true);
    }
  };

  // 모든 훅을 최상위에서 호출
  const items = store?.items || [];
  const dueToday = useMemo(() => items.filter(i => i.next_due && i.next_due <= todayStr()), [items]);
  const unknownCount = useMemo(() => items.filter(i => i.unknown_only).length, [items]);

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
          <p className="text-xs text-gray-400 mt-2">App 컴포넌트 로딩 중</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우 로그인 화면 표시
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between pl-2 pr-4 py-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="로고" className="w-full h-full object-contain" />
            </div>
            <div>
                <h1 className="text-2xl font-medium text-gray-900 whitespace-nowrap">
                  WordChain
                </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex gap-3">
            {[
              ["dashboard", "대시보드"],
              ["add", "추가"],
              ["study", "학습"],
              ["review", "리뷰(오늘)"],
              ["pocket", "Pocket Sheet"],
              ["backup", "백업"],
                ["settings", "설정"],
              ["howto", "방법"],
            ].map(([key, label]) => (
              <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>{label}</TabButton>
            ))}
          </nav>
            
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-sm text-gray-600 whitespace-nowrap">
                <span className="font-medium">{currentUser}</span>님
              </div>
              <button
                onClick={handleAdminButtonClick}
                className={`px-3 py-2 text-xs rounded-xl transition-all duration-200 whitespace-nowrap ${
                  isAdminLoggedIn 
                    ? "text-green-600 hover:text-green-800 hover:bg-green-50" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
                title={isAdminLoggedIn ? "관리자 패널 (로그인됨)" : "관리자 로그인"}
              >
                {isAdminLoggedIn ? "🔐" : "⚙️"}
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 whitespace-nowrap"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {tab === "dashboard" && <Dashboard items={items} dueToday={dueToday} unknownCount={unknownCount} onGo={(t)=>setTab(t)} />}
        {tab === "add" && <AddWord onAdd={(item)=>setStore(s=>({ ...s, items: [item, ...s.items] }))} />}
        {tab === "study" && <Study items={items} onUpdate={(next)=>setStore(s=>({ ...s, items: next }))} />}
        {tab === "review" && <Review items={items} onUpdate={(next)=>setStore(s=>({ ...s, items: next }))} />}
        {tab === "pocket" && <PocketSheet items={items} />}
        {tab === "backup" && <Backup store={store} setStore={setStore} />}
        {tab === "settings" && <Settings currentUser={currentUser} onDataCleared={handleAdminDataCleared} />}
        {tab === "howto" && <HowTo />}
      </main>

      <footer className="max-w-6xl mx-auto p-8 text-center">
        <div className="rounded-2xl bg-white/60 backdrop-blur-sm p-6 border border-white/20">
          <p className="text-sm text-gray-600 whitespace-nowrap">
        © {new Date().getFullYear()} WordChain · 클라우드 동기화 (Firebase)
          </p>
        </div>
      </footer>

      {/* 관리자 로그인 화면 */}
      {showAdminLogin && (
        <AdminLoginScreen 
          onLogin={handleAdminLogin}
          onBack={() => setShowAdminLogin(false)}
        />
      )}

      {/* 관리자 패널 */}
      {showAdminPanel && (
        <AdminPanel 
          onClose={() => setShowAdminPanel(false)} 
          onDataCleared={handleAdminDataCleared}
          onLogout={handleAdminLogout}
        />
      )}

      {/* 관리자 메시지 */}
      {adminMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-2xl shadow-lg z-50">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{adminMessage}</span>
            <button
              onClick={() => setAdminMessage("")}
              className="text-green-600 hover:text-green-800 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style>{`
        .btn { 
          @apply px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 min-h-[48px] flex items-center justify-center whitespace-nowrap; 
        }
        .btn-sub { 
          @apply px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm text-gray-700 font-semibold border border-gray-200/60 hover:bg-white hover:shadow-md transition-all duration-200 min-h-[48px] flex items-center justify-center whitespace-nowrap; 
        }
        .inp { 
          @apply w-full px-4 py-3 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200; 
        }
        .lbl { 
          @apply text-sm font-semibold text-gray-700; 
        }
        .pocket-sheet { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          grid-auto-rows: 1fr; 
          gap: 1rem; 
          background: white; 
          padding: 2rem; 
          border: 1px solid #e5e7eb; 
          border-radius: 2rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .pocket-sheet .cell { 
          @apply border-2 border-gray-200 rounded-2xl p-4; 
          break-inside: avoid; 
          min-height: 140px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          transition: all 0.2s ease;
        }
        .pocket-sheet .cell:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .pocket-sheet.show-fold { position: relative; }
        .pocket-sheet.show-fold::before,
        .pocket-sheet.show-fold::after { 
          content: ""; position: absolute; background: repeating-linear-gradient(90deg, transparent, transparent 8px, #e5e7eb 8px, #e5e7eb 9px);
        }
        .pocket-sheet.show-fold::before { left: 25%; top: 0; bottom: 0; width: 1px; }
        .pocket-sheet.show-fold::after { left: 50%; top: 0; bottom: 0; width: 1px; box-shadow: inset 0 0 0 0 #e5e7eb; }
        .pocket-sheet.show-fold .cell:nth-child(4n+1) { border-left-width: 3px; border-left-color: #3b82f6; }

        /* 애니메이션 */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out;
        }

        /* 스크롤바 스타일링 */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header, footer, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .pocket-sheet { gap: 1rem; border: none; padding: 0; box-shadow: none; }
          .pocket-sheet .cell { border-color: #000; background: white; }
        }
      `}</style>
    </div>
  );
}

// ===== 대시보드 =====
function Dashboard({ items, dueToday, unknownCount, onGo }) {
  const total = items.length;
  const stage0 = items.filter(i=>i.stage===0).length;
  const stage1 = items.filter(i=>i.stage===1).length;
  const stage2 = items.filter(i=>i.stage===2).length;

  return (
    <div className="space-y-16 pt-60">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        <Stat label="총 단어" value={total} color="indigo" />
        <Stat label="모르는 단어(체크)" value={unknownCount} color="rose" />
        <Stat label="오늘 Due" value={dueToday.length} color="emerald" />
        <Stat label="스테이지(0/1/2)" value={`${stage0}/${stage1}/${stage2}`} color="amber" />
      </div>

      <div className="bg-gray-50 rounded-3xl p-12">
        <h2 className="text-4xl font-medium text-gray-900 mb-12 text-center">
          바로 시작하기
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <button 
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 min-h-[160px] flex flex-col items-center justify-center text-center"
            onClick={()=>onGo("add")}
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-xl">+</span>
        </div>
            <div className="text-xl font-semibold text-gray-900 mb-2 whitespace-nowrap">모르는 단어 등록</div>
            <div className="text-sm text-gray-500">새로운 단어 추가</div>
          </button>
          
          <button 
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 min-h-[160px] flex flex-col items-center justify-center text-center"
            onClick={()=>onGo("study")}
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-xl">📚</span>
      </div>
            <div className="text-xl font-semibold text-gray-900 mb-2 whitespace-nowrap">가리기 학습 시작</div>
            <div className="text-sm text-gray-500">단어 암기 연습</div>
          </button>
          
          <button 
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 min-h-[160px] flex flex-col items-center justify-center text-center"
            onClick={()=>onGo("review")}
          >
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-xl">🔄</span>
            </div>
            <div className="text-xl font-semibold text-gray-900 mb-2 whitespace-nowrap">오늘 리뷰 처리</div>
            <div className="text-sm text-gray-500">복습 일정 관리</div>
          </button>
          
          <button 
            className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 min-h-[160px] flex flex-col items-center justify-center text-center"
            onClick={()=>onGo("pocket")}
          >
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="text-white text-xl">📄</span>
            </div>
            <div className="text-xl font-semibold text-gray-900 mb-2 whitespace-nowrap">Pocket Sheet 만들기</div>
            <div className="text-sm text-gray-500">인쇄용 학습지</div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100">
        <h3 className="text-3xl font-light text-gray-900 mb-12 text-center">
          최근 추가된 단어
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {items.slice(0, 6).map(i => (
            <div key={i.id} className="group bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-all duration-300 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="text-2xl font-light text-gray-900">
                  {i.word}
                </div>
                <Tag variant="stage">Stage {i.stage}</Tag>
              </div>
              <div className="text-base text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                {i.definition_en}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">다음 리뷰: {i.next_due || "-"}</span>
                <div className="flex gap-2">
                  {i.pronunciation && <Tag variant="pronunciation">{i.pronunciation}</Tag>}
                  {i.partOfSpeech && <Tag variant="partOfSpeech">{i.partOfSpeech}</Tag>}
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== 단어 추가 =====
function AddWord({ onAdd }) {
  const [form, setForm] = useState({ word: "", pronunciation: "", partOfSpeech: "", definition_en: "", notes_ko: "", related_terms: "", source: "" });
  const [testResult, setTestResult] = useState("");
  const [includeAfterSemicolon, setIncludeAfterSemicolon] = useState(false);
  const [autoSearchFailed, setAutoSearchFailed] = useState(false);

  const scrapeDictionary = async (word) => {
    if (!word.trim()) return;
    
    setTestResult("Dictionary.com에서 검색 중...");
    setAutoSearchFailed(false);
    
    try {
      const response = await fetch('https://engilsh-word-study-4y0dtuwhh-ascertains-projects.vercel.app/api/scrape-dictionary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: word.trim() })
      });
      
      // 응답 상태 확인
      if (!response.ok) {
        const errorText = await response.text();
        setTestResult(`❌ 자동 검색 실패 (HTTP ${response.status})\n\n수동으로 입력해주세요.`);
        setAutoSearchFailed(true);
        return;
      }
      
      // 응답 텍스트 먼저 확인
      const responseText = await response.text();
      console.log('API 응답:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        setTestResult(`❌ 자동 검색 실패 (데이터 파싱 오류)\n\n수동으로 입력해주세요.`);
        setAutoSearchFailed(true);
        return;
      }
      
      if (result.success) {
        const { pronunciation, definition, partOfSpeech, source } = result.data;
        
        // 세미콜론 옵션에 따라 정의 처리
        let processedDefinition = definition || '';
        if (!includeAfterSemicolon && processedDefinition.includes(';')) {
          processedDefinition = processedDefinition.split(';')[0].trim();
        }
        
        // 폼에 자동 입력
        setForm(prev => ({
          ...prev,
          pronunciation: pronunciation || prev.pronunciation,
          partOfSpeech: partOfSpeech || prev.partOfSpeech,
          definition_en: processedDefinition || prev.definition_en,
          source: source || prev.source
        }));
        
        setTestResult(`✅ 성공!\n발음: ${pronunciation}\n품사: ${partOfSpeech}\n정의: ${processedDefinition}`);
        setAutoSearchFailed(false);
      } else {
        setTestResult(`❌ 자동 검색 실패: ${result.error}\n\n수동으로 입력해주세요.`);
        setAutoSearchFailed(true);
      }
      
    } catch (error) {
      setTestResult(`❌ 자동 검색 실패 (네트워크 오류)\n\n수동으로 입력해주세요.`);
      setAutoSearchFailed(true);
    }
  };


  const add = () => {
    const rel = (form.related_terms || "").split(",").map(s=>s.trim()).filter(Boolean).map(t=>({ term: t, hint: "" }));
    if (!form.word || !form.definition_en) return alert("단어와 영영정의를 입력해주세요");
    const item = {
      id: uid(),
      word: form.word.trim(),
      pronunciation: form.pronunciation.trim(),
      partOfSpeech: form.partOfSpeech.trim(),
      definition_en: form.definition_en.trim(),
      notes_ko: form.notes_ko.trim(),
      related_terms: rel,
      source: form.source.trim(),
      created_at: todayStr(),
      stage: 0,
      next_due: addDays(todayStr(), 7),
      last_tested: null,
      unknown_only: true,
    };
    onAdd(item);
    setForm({ word: "", pronunciation: "", partOfSpeech: "", definition_en: "", notes_ko: "", related_terms: "", source: "" });
    setApiResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-16 text-center">
        <h2 className="text-5xl font-medium text-gray-900 mb-6">
          새 단어 추가
        </h2>
        <p className="text-xl text-gray-500 mb-4">스크립트처럼 <span className="font-medium text-gray-900">모르는 단어만</span> 추가하세요.</p>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-2 text-blue-800">
            <span className="text-lg">🔄</span>
            <span className="font-medium">자동 검색 기능</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            단어를 입력하고 <strong>Enter 키</strong>를 누르거나 "검색" 버튼을 클릭하면 <strong>발음, 품사, 영영정의</strong>가 자동으로 입력됩니다. 
            수동으로도 수정 가능합니다.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100">
          <div className="grid gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">단어 *</label>
              <div className="flex gap-4">
                <input 
                  className="flex-1 px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-lg" 
                  value={form.word} 
                  onChange={e=>setForm({...form, word:e.target.value})} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && form.word.trim()) {
                      scrapeDictionary(form.word);
                    }
                  }}
                  placeholder="단어를 입력하고 Enter를 누르세요" 
                />
                  <button
                    className="px-8 py-4 rounded-2xl bg-gray-900 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 min-h-[56px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    onClick={() => scrapeDictionary(form.word)}
                    disabled={!form.word.trim()}
                  >
                    🔍 검색
                  </button>
              </div>
              
              {/* 세미콜론 옵션 체크박스 */}
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAfterSemicolon}
                    onChange={e => setIncludeAfterSemicolon(e.target.checked)}
                    className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                  />
                  <span className="text-sm text-gray-600">
                    세미콜론(;) 이후의 내용도 포함
                  </span>
        </label>
                <span className="text-xs text-gray-400">
                  (체크 해제 시 세미콜론 앞까지만 가져옵니다)
                </span>
              </div>

              {/* 자동 검색 실패 시 안내 및 재시도 버튼 */}
              {autoSearchFailed && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-orange-800 mb-2">
                    <span className="text-lg">⚠️</span>
                    <span className="font-medium">자동 검색에 실패했습니다</span>
                  </div>
                  <p className="text-sm text-orange-700 mb-3">
                    Dictionary.com에서 데이터를 가져올 수 없습니다. 아래 필드들을 수동으로 입력해주세요.
                  </p>
                  <button
                    onClick={() => scrapeDictionary(form.word)}
                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm font-medium rounded-xl transition-colors duration-200"
                  >
                    🔄 다시 시도
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                발음 {autoSearchFailed ? "(수동 입력)" : "(자동 입력)"}
                <span className={`text-xs ml-2 ${autoSearchFailed ? 'text-orange-600' : 'text-blue-600'}`}>
                  {autoSearchFailed ? '⚠️ 수동으로 입력해주세요' : '🔄 자동 검색으로 입력됩니다'}
                </span>
        </label>
              {autoSearchFailed ? (
                <input 
                  className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-lg font-mono" 
                  value={form.pronunciation} 
                  onChange={e=>setForm({...form, pronunciation:e.target.value})} 
                  placeholder="/KOM-pruh-myz/ 또는 [KOM-pruh-myz]" 
                />
              ) : (
                <div className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-gray-50 min-h-[56px] flex items-center">
                  {form.pronunciation && (
                    <div 
                      className="font-mono text-lg pronunciation-display"
                      dangerouslySetInnerHTML={{ __html: form.pronunciation }}
                    ></div>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                품사 {autoSearchFailed ? "(수동 입력)" : "(자동 입력)"}
                <span className={`text-xs ml-2 ${autoSearchFailed ? 'text-orange-600' : 'text-blue-600'}`}>
                  {autoSearchFailed ? '⚠️ 수동으로 입력해주세요' : '🔄 자동 검색으로 입력됩니다'}
                </span>
        </label>
              <input 
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-lg" 
                value={form.partOfSpeech} 
                onChange={e=>setForm({...form, partOfSpeech:e.target.value})} 
                placeholder={autoSearchFailed ? "noun, verb, adjective 등" : "자동으로 입력되거나 수동으로 입력하세요"} 
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                영영정의 {autoSearchFailed ? "(수동 입력)" : "(자동 입력)"} *
                <span className={`text-xs ml-2 ${autoSearchFailed ? 'text-orange-600' : 'text-blue-600'}`}>
                  {autoSearchFailed ? '⚠️ 수동으로 입력해주세요' : '🔄 자동 검색으로 입력됩니다'}
                </span>
        </label>
              <textarea 
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 h-32 resize-none text-lg" 
                value={form.definition_en} 
                onChange={e=>setForm({...form, definition_en:e.target.value})} 
                placeholder={autoSearchFailed ? "영어 정의를 입력하세요" : "자동으로 입력되거나 수동으로 입력하세요"} 
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">한국어 노트 (선택)</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-lg" 
                value={form.notes_ko} 
                onChange={e=>setForm({...form, notes_ko:e.target.value})} 
                placeholder="한국어 노트를 입력하세요" 
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">관련어 (쉼표로 구분)</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-lg" 
                value={form.related_terms} 
                onChange={e=>setForm({...form, related_terms:e.target.value})} 
                placeholder="관련어를 쉼표로 구분하여 입력하세요" 
              />
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                출처/링크 (자동 입력)
                <span className="text-xs text-blue-600 ml-2">🔄 자동 검색으로 입력됩니다</span>
        </label>
              <input 
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 text-lg" 
                value={form.source} 
                onChange={e=>setForm({...form, source:e.target.value})} 
                placeholder="자동으로 입력되거나 수동으로 입력하세요" 
              />
      </div>
          </div>
          
          <div className="flex gap-4 mt-12">
            <button 
              className="px-8 py-4 rounded-2xl bg-gray-900 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 min-h-[56px] flex items-center justify-center" 
              onClick={add}
            >
              단어 추가
            </button>
            <button
              className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 min-h-[56px] flex items-center justify-center whitespace-nowrap" 
              onClick={() => window.open(`https://www.dictionary.com/browse/${encodeURIComponent(form.word || '')}`, '_blank')}
            >
              📖 Dictionary.com
            </button>
            <button
              className="px-6 py-4 rounded-2xl bg-gray-100 text-gray-700 font-medium shadow-sm hover:shadow-md transition-all duration-200 min-h-[56px] flex items-center justify-center whitespace-nowrap" 
              onClick={() => window.open(`https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(form.word || '')}`, '_blank')}
            >
              📚 Oxford
            </button>
          </div>
      </div>
    </div>
  );
}

// ===== 학습(가리기/퀴즈) =====
function Study({ items, onUpdate }) {
  const [mode, setMode] = useState("hide-def"); // hide-def | hide-word | quiz
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const list = useMemo(() => items.filter(i=>i.unknown_only), [items]);
  const cur = list[idx];

  const next = () => {
    setIdx(i => (i + 1) % Math.max(list.length, 1));
    setShowAnswer(false);
  };
  const prev = () => {
    setIdx(i => (i - 1 + Math.max(list.length, 1)) % Math.max(list.length, 1));
    setShowAnswer(false);
  };

  const markKnown = () => {
    const nextItems = items.map(it => it.id === cur.id ? { ...it, unknown_only: false } : it);
    onUpdate(nextItems);
    next();
  };

  if (!list.length) return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-12 shadow-xl border border-white/20">
        <div className="text-6xl mb-6">📚</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">학습할 단어가 없습니다</h3>
        <p className="text-gray-600 mb-8">[추가] 탭에서 모르는 단어를 등록하거나, [리뷰] 탭을 사용하세요.</p>
        <button 
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          onClick={() => window.location.reload()}
        >
          새로고침
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center whitespace-nowrap">
          단어 학습
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <TabButton active={mode==='hide-def'} onClick={()=>{setMode('hide-def'); setShowAnswer(false);}}>
            정의 가리기
          </TabButton>
          <TabButton active={mode==='hide-word'} onClick={()=>{setMode('hide-word'); setShowAnswer(false);}}>
            단어 가리기
          </TabButton>
          <TabButton active={mode==='quiz'} onClick={()=>{setMode('quiz'); setShowAnswer(false);}}>
            짧은 퀴즈
          </TabButton>
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 backdrop-blur-sm p-8 shadow-xl border border-white/20">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 font-semibold text-sm">
              {idx+1} / {list.length}
          </div>
            <div className="text-sm text-gray-500">다음 리뷰: {cur.next_due || "-"}</div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-4xl font-bold text-gray-800 mb-4">
            {mode!=="hide-word" ? cur.word : "████████"}
            <div className="flex gap-2 mt-2">
              {cur.pronunciation && <Tag variant="pronunciation">{cur.pronunciation}</Tag>}
              {cur.partOfSpeech && <Tag variant="partOfSpeech">{cur.partOfSpeech}</Tag>}
          </div>
          </h3>
        </div>

        <div className="text-center mb-8">
          <div className="text-xl text-gray-700 leading-relaxed">
          {mode!=="hide-def" ? (
              <p className="bg-gray-50 rounded-2xl p-6 border border-gray-200/60">{cur.definition_en}</p>
            ) : (
              <div 
                className="bg-gray-100 rounded-2xl p-6 border border-gray-200/60 cursor-pointer hover:bg-gray-200 transition-colors duration-200 select-none" 
                title="클릭하여 보기" 
                onClick={()=>setShowAnswer(true)}
              >
                {showAnswer ? (
                  <p className="text-gray-700">{cur.definition_en}</p>
                ) : (
                  <p className="text-gray-500">████████ (클릭하여 보기)</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {cur.related_terms?.length > 0 && (
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-600 mb-2">관련어(체인)</div>
              <div className="flex flex-wrap justify-center gap-2">
                {cur.related_terms.map((r, i)=>(<Tag key={i} variant="related">{r.term}</Tag>))}
              </div>
            </div>
          )}
          {cur.notes_ko && (
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-600 mb-2">한국어 노트</div>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200/60 text-gray-700">
                {cur.notes_ko}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button 
            className="px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm text-gray-700 font-semibold border border-gray-200/60 hover:bg-white hover:shadow-md transition-all duration-200 min-h-[48px] flex items-center justify-center whitespace-nowrap" 
            onClick={prev}
          >
            ← 이전
          </button>
          <button 
            className="px-6 py-3 rounded-2xl bg-white/80 backdrop-blur-sm text-gray-700 font-semibold border border-gray-200/60 hover:bg-white hover:shadow-md transition-all duration-200 min-h-[48px] flex items-center justify-center whitespace-nowrap" 
            onClick={next}
          >
            다음 →
          </button>
          <button 
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 min-h-[48px] flex items-center justify-center whitespace-nowrap" 
            onClick={markKnown}
          >
            ✅ 이제 안 헷갈림
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== 리뷰(스페이스드 반복) =====
function Review({ items, onUpdate }) {
  const due = useMemo(() => items.filter(i => i.next_due && i.next_due <= todayStr()), [items]);
  const [cursor, setCursor] = useState(0);
  const cur = due[cursor];

  const grade = (pass) => {
    if (!cur) return;
    const now = todayStr();
    const next = items.map(it => {
      if (it.id !== cur.id) return it;
      if (!pass) {
        // 실패 → 2일 후 재시도, stage 유지
        return { ...it, last_tested: now, next_due: addDays(now, 2) };
      }
      if (it.stage === 0) {
        // 1주 완료 → 다음은 4주 복습
        return { ...it, stage: 1, last_tested: now, next_due: addDays(now, 28) };
      }
      if (it.stage === 1) {
        // 4주 완료 → 장기 주기(8주)로 전환
        return { ...it, stage: 2, last_tested: now, next_due: addDays(now, 56) };
      }
      // stage 2 이상은 8주씩 반복
      return { ...it, last_tested: now, next_due: addDays(now, 56) };
    });
    onUpdate(next);
    setCursor(c => Math.min(c, Math.max(due.length - 2, 0)));
  };

  if (!due.length) return <div className="text-sm text-gray-600">오늘 Due 단어가 없습니다. 대시보드에서 통계를 확인하세요.</div>;

  return (
    <div className="grid gap-4">
      <div className="text-sm text-gray-600">오늘 Due: <b>{due.length}</b>개</div>
      {cur && (
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-start justify-between">
            <h3 className="text-2xl font-bold">{cur.word} 
              <div className="flex gap-2 mt-1">
                {cur.pronunciation && <Tag variant="pronunciation">{cur.pronunciation}</Tag>}
                {cur.partOfSpeech && <Tag variant="partOfSpeech">{cur.partOfSpeech}</Tag>}
              </div>
            </h3>
            <div className="text-xs text-gray-500">Stage {cur.stage}</div>
          </div>
          <p className="mt-3 text-lg">{cur.definition_en}</p>
          {cur.notes_ko && <p className="mt-2 text-sm text-gray-600">KO: {cur.notes_ko}</p>}
          <div className="mt-2 text-sm text-gray-600">관련어: {cur.related_terms?.map((r,i)=>(<Tag key={i}>{r.term}</Tag>))}</div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button className="btn" onClick={()=>grade(true)}>통과(기억남)</button>
            <button className="btn-sub" onClick={()=>grade(false)}>실패(기억안남)</button>
            <button className="btn-sub" onClick={()=>setCursor(c=> (c+1) % due.length)}>다음</button>
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500">* 1주 통과 → 4주 복습 / 4주 통과 → 8주 주기</div>
    </div>
  );
}

// ===== Pocket Sheet (4등분 인쇄) =====
function PocketSheet({ items }) {
  const [selected, setSelected] = useState(() => new Set(items.slice(0, 16).map(i=>i.id)));
  const [hideDef, setHideDef] = useState(false);
  const [foldGuide, setFoldGuide] = useState(true);

  useEffect(()=>{
    // 아이템이 변해도 기존 선택 유지
  }, [items]);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selItems = items.filter(i=>selected.has(i.id));

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pocket Sheet 구성 (최대 16개 권장)</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={hideDef} onChange={e=>setHideDef(e.target.checked)} /> 정의 가리기</label>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={foldGuide} onChange={e=>setFoldGuide(e.target.checked)} /> 접는선 표시</label>
            <button className="btn" onClick={()=>window.print()}>인쇄</button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-2 mt-3 max-h-64 overflow-auto pr-1">
          {items.map(i => (
            <label key={i.id} className="flex items-center gap-2 text-sm border rounded-lg p-2">
              <input type="checkbox" checked={selected.has(i.id)} onChange={()=>toggle(i.id)} />
              <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                <b>{i.word}</b> 
                <div className="flex gap-1">
                  <span className="text-gray-500 pronunciation-display" dangerouslySetInnerHTML={{ __html: i.pronunciation }}></span>
                  {i.partOfSpeech && <span className="text-blue-600 text-xs">({i.partOfSpeech})</span>}
                </div>
                <span className="text-gray-500"> · {i.definition_en.slice(0,60)}{i.definition_en.length>60?"…":""}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className={`pocket-sheet ${foldGuide?"show-fold":""}`}>
        {selItems.slice(0,16).map((i, idx) => (
          <div key={i.id} className="cell">
            <div className="text-base font-semibold leading-tight">{i.word}</div>
            <div className="flex gap-2 text-xs text-gray-600">
              {i.pronunciation && <div className="pronunciation-display" dangerouslySetInnerHTML={{ __html: i.pronunciation }}></div>}
              {i.partOfSpeech && <div className="text-blue-600">({i.partOfSpeech})</div>}
            </div>
            <div className="mt-1 text-sm">
              {hideDef ? "□□□□□□" : i.definition_en}
            </div>
            {!!(i.related_terms?.length) && (
              <div className="mt-2 text-[11px] text-gray-600">chain: {i.related_terms.map((r,k)=>r.term).join(", ")}</div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500">* A4/Letter 가로 인쇄 권장 · 4등분 접어 주머니에 넣어 사용</div>
    </div>
  );
}

// ===== 백업/복원 =====
function Backup({ store, setStore }) {
  const download = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `follow_along_backup_${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.items) throw new Error("형식 오류");
        setStore(data);
        alert("복원 완료!");
      } catch (err) {
        alert("가져오기 실패: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid gap-3 max-w-xl">
      <div className="rounded-2xl border p-5 bg-white">
        <h3 className="font-semibold mb-2">내보내기</h3>
        <p className="text-sm text-gray-600 mb-2">로컬 JSON 파일로 백업합니다.</p>
        <button className="btn" onClick={download}>JSON 다운로드</button>
      </div>

      <div className="rounded-2xl border p-5 bg-white">
        <h3 className="font-semibold mb-2">가져오기</h3>
        <p className="text-sm text-gray-600 mb-2">기존 데이터는 덮어쓰여요. 주의하세요.</p>
        <input type="file" accept="application/json" onChange={onFile} />
      </div>
    </div>
  );
}

// ===== 사용자 설정 =====
function Settings({ currentUser, onDataCleared }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClearData = () => {
    setShowConfirm(true);
  };

  const confirmClear = () => {
    setLoading(true);
    
    try {
      const result = clearUserData(currentUser);
      if (result.success) {
        onDataCleared("모든 단어가 삭제되었습니다");
      } else {
        alert(result.error);
      }
    } catch (error) {
      console.error("데이터 삭제 오류:", error);
      alert("데이터 삭제 중 오류가 발생했습니다");
    }
    
    setLoading(false);
    setShowConfirm(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-16 text-center">
        <h2 className="text-5xl font-medium text-gray-900 mb-6">
          사용자 설정
        </h2>
        <p className="text-xl text-gray-500 mb-4">
          <span className="font-medium text-gray-900">{currentUser}</span>님의 계정 설정
        </p>
      </div>

      <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100">
        <div className="space-y-8">
          <div className="border-b border-gray-200 pb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">계정 정보</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl">
                <span className="text-gray-700">사용자명</span>
                <span className="font-medium text-gray-900">{currentUser}</span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-2xl">
                <span className="text-gray-700">계정 생성일</span>
                <span className="font-medium text-gray-900">
                  {new Date().toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">데이터 관리</h3>
            <div className="space-y-4">
              <div className="p-6 bg-orange-50 border border-orange-200 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-900 mb-2">데이터 초기화</h4>
                    <p className="text-orange-700 mb-4">
                      모든 단어와 학습 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                    </p>
                    <button
                      onClick={handleClearData}
                      className="px-6 py-3 bg-orange-600 text-white font-medium rounded-xl hover:bg-orange-700 transition-colors duration-200"
                    >
                      모든 데이터 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">도움말</h3>
            <div className="space-y-3 text-gray-600">
              <p>• 데이터를 삭제하면 모든 단어와 학습 기록이 영구적으로 제거됩니다</p>
              <p>• 삭제 후에는 백업 파일이 없다면 복구할 수 없습니다</p>
              <p>• 계정 자체는 삭제되지 않으며, 언제든지 다시 사용할 수 있습니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* 확인 대화상자 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">정말 삭제하시겠습니까?</h3>
            <p className="text-gray-600 mb-6">
              <strong>{currentUser}</strong>님의 모든 단어와 학습 기록이 삭제됩니다.
              <br /><br />
              <strong>이 작업은 되돌릴 수 없습니다!</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                취소
              </button>
              <button
                onClick={confirmClear}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 방법(체크리스트) =====
function HowTo() {
  return (
    <div className="prose prose-sm max-w-none">
      <h2>학습 방법 체크리스트</h2>
      <ol>
        <li>단어장을 훑으며 <b>모르는 단어만 체크</b>한다(헷갈리면 모름 처리).</li>
        <li>[추가] 탭에서 단어·발음·영영정의를 입력하고, 정의 속 모르는 단어는 <b>관련어 체인</b>으로 함께 등록한다.</li>
        <li>등록 시점 기준으로 <b>1주 뒤</b>에 리뷰 일정이 자동 생성된다.</li>
        <li>[학습] 탭에서 <b>가리기 모드</b>로 수시로 확인(주머니용 Pocket Sheet도 활용).</li>
        <li>[리뷰] 탭에서 당일 Due 항목을 <b>통과/실패</b>로 처리:
          <ul>
            <li>1주 통과 → <b>4주</b> 후 복습</li>
            <li>4주 통과 → <b>8주 주기</b> 장기 복습</li>
            <li>실패 → <b>2일 후</b> 재시도</li>
          </ul>
        </li>
        <li>한 달마다 단어장을 처음부터 빠르게 훑어 <b>개념→한국어 뜻</b>이 떠오르는지 재확인한다.</li>
      </ol>
      <h3>팁</h3>
      <ul>
        <li>휴대성 극대화: Pocket Sheet 인쇄해 <b>항시 휴대</b>.</li>
        <li>영영정의는 세미콜론 전까지, <b>문장 자체</b>를 소리 내어 읽으며 익히기.</li>
        <li>관련어 체인은 3~5개면 충분. 지나친 과부하는 피하되 <b>연결성</b> 유지.</li>
      </ul>
    </div>
  );
}

