import React, { useEffect, useMemo, useState } from "react";
import { deviceAuth } from "./deviceAuth";

/**
 * 영어 단어 체인 암기 웹앱 (범기기 지원 버전)
 * - 로그인 없이 디바이스 지문으로 사용자 식별
 * - Firebase 클라우드 저장으로 어느 기기에서든 접근 가능
 * - 각 사용자는 고유한 디바이스 지문을 가짐
 */

// ===== 유틸 =====
const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const uid = () => Math.random().toString(36).slice(2, 9);

// ===== 범기기 사용자 데이터 관리 =====
const useCrossDeviceStore = () => {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ hideMeaningsByDefault: true });
  const [userName, setUserName] = useState('익명 사용자');
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState('');

  // 사용자 데이터 로드
  const loadUserData = async () => {
    try {
      setLoading(true);
      const deviceId = deviceAuth.getDeviceId();
      setDeviceId(deviceId);
      
      const userData = await deviceAuth.loadUserData();
      setItems(userData.items || []);
      setSettings(userData.settings || { hideMeaningsByDefault: true });
      setUserName(userData.userName || '익명 사용자');
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 사용자 데이터 저장
  const saveData = async (newItems, newSettings, newUserName) => {
    try {
      const data = {
        items: newItems,
        settings: newSettings
      };
      
      await deviceAuth.saveUserData(data);
      
      if (newUserName) {
        deviceAuth.setUserName(newUserName);
        setUserName(newUserName);
      }
      
      setItems(newItems);
      setSettings(newSettings);
    } catch (error) {
      console.error('데이터 저장 실패:', error);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadUserData();
  }, []);

  return { 
    items, 
    setItems, 
    settings, 
    setSettings, 
    userName,
    setUserName,
    loading, 
    saveData,
    deviceId
  };
};

// ===== 컴포넌트들 =====
const TabButton = ({ active, onClick, children, className = "" }) => (
  <button
    className={`px-4 py-2 min-h-[36px] rounded-lg font-medium transition-colors ${
      active
        ? "bg-blue-600 text-white"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    } ${className}`}
    onClick={onClick}
  >
    {children}
  </button>
);

const Dashboard = ({ items, settings, deviceId }) => {
  const today = todayStr();
  
  const stats = useMemo(() => {
    const total = items.length;
    const dueToday = items.filter(item => item.dueDate === today).length;
    const newWords = items.filter(item => item.status === 'new').length;
    const learning = items.filter(item => item.status === 'learning').length;
    const mastered = items.filter(item => item.status === 'mastered').length;
    
    return { total, dueToday, newWords, learning, mastered };
  }, [items, today]);

  return (
    <div className="pt-60 space-y-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-xl">
        <h2 className="text-2xl font-bold mb-2">학습 현황</h2>
        <div className="text-sm opacity-90 mb-4">
          디바이스 ID: {deviceId?.substring(0, 12)}...
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm opacity-90">전체 단어</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-300">{stats.dueToday}</div>
            <div className="text-sm opacity-90">오늘 복습</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-300">{stats.learning}</div>
            <div className="text-sm opacity-90">학습 중</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-300">{stats.mastered}</div>
            <div className="text-sm opacity-90">완료</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-4">오늘의 학습</h3>
          {stats.dueToday > 0 ? (
            <p className="text-gray-600">
              {stats.dueToday}개의 단어를 복습할 시간입니다!
            </p>
          ) : (
            <p className="text-gray-500">오늘은 복습할 단어가 없습니다.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-semibold mb-4">진행률</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>학습 중</span>
              <span>{stats.learning}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>완료</span>
              <span>{stats.mastered}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
        <h3 className="text-lg font-semibold text-green-800 mb-2">🌐 범기기 지원</h3>
        <p className="text-green-700 text-sm">
          이 디바이스에서 학습한 데이터는 클라우드에 저장되어 다른 기기에서도 동일하게 접근할 수 있습니다.
        </p>
      </div>
    </div>
  );
};

const AddWord = ({ onAdd }) => {
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!word.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/scrape-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.trim() })
      });

      if (!response.ok) throw new Error('API 호출 실패');

      const result = await response.json();
      
      if (result.success) {
        const newItem = {
          id: uid(),
          word: word.trim(),
          definition: result.data.definition,
          pronunciation: result.data.pronunciation,
          partOfSpeech: result.data.partOfSpeech,
          status: 'new',
          addedDate: todayStr(),
          dueDate: addDays(todayStr(), 1),
          reviewCount: 0,
          correctCount: 0
        };
        
        onAdd(newItem);
        setWord("");
      } else {
        alert('단어 정보를 가져올 수 없습니다.');
      }
    } catch (error) {
      console.error('단어 추가 실패:', error);
      alert('단어 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-60 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">새 단어 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              영어 단어
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="단어를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !word.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '검색 중...' : '단어 추가'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Study = ({ items, settings, onUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const studyItems = items.filter(item => 
    item.status === 'new' || item.status === 'learning' || item.dueDate === todayStr()
  );

  if (studyItems.length === 0) {
    return (
      <div className="pt-60 text-center">
        <h2 className="text-xl font-semibold text-gray-600">학습할 단어가 없습니다</h2>
        <p className="text-gray-500 mt-2">새 단어를 추가하거나 복습할 단어가 생기면 여기에 표시됩니다.</p>
      </div>
    );
  }

  const currentItem = studyItems[currentIndex];

  const handleAnswer = (isCorrect) => {
    const updatedItems = items.map(item => {
      if (item.id === currentItem.id) {
        const newReviewCount = item.reviewCount + 1;
        const newCorrectCount = item.correctCount + (isCorrect ? 1 : 0);
        
        let newStatus = item.status;
        if (item.status === 'new') {
          newStatus = 'learning';
        } else if (newStatus === 'learning' && newCorrectCount >= 3) {
          newStatus = 'mastered';
        }
        
        let newDueDate = item.dueDate;
        if (isCorrect) {
          const daysToAdd = Math.min(7, Math.pow(2, newReviewCount));
          newDueDate = addDays(todayStr(), daysToAdd);
        } else {
          newDueDate = addDays(todayStr(), 1);
        }

        return {
          ...item,
          status: newStatus,
          reviewCount: newReviewCount,
          correctCount: newCorrectCount,
          dueDate: newDueDate
        };
      }
      return item;
    });

    onUpdate(updatedItems);
    setShowAnswer(false);
    
    if (currentIndex < studyItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  return (
    <div className="pt-60 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <div className="text-center mb-4">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {studyItems.length}
          </span>
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {currentItem.word}
          </h2>
          {currentItem.pronunciation && (
            <p className="text-lg text-gray-600 mb-4">
              {currentItem.pronunciation}
            </p>
          )}
        </div>

        {!showAnswer ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700"
            >
              답 보기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">정의:</h3>
              <p className="text-gray-700">{currentItem.definition}</p>
              {currentItem.partOfSpeech && (
                <p className="text-sm text-gray-500 mt-2">
                  ({currentItem.partOfSpeech})
                </p>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600"
              >
                틀렸어요
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600"
              >
                맞았어요
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Review = ({ items, onUpdate }) => {
  const today = todayStr();
  const dueItems = items.filter(item => item.dueDate === today);

  if (dueItems.length === 0) {
    return (
      <div className="pt-60 text-center">
        <h2 className="text-xl font-semibold text-gray-600">오늘 복습할 단어가 없습니다</h2>
        <p className="text-gray-500 mt-2">내일 다시 확인해보세요!</p>
      </div>
    );
  }

  return (
    <div className="pt-60 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">
          오늘의 복습 ({dueItems.length}개)
        </h2>
        <div className="space-y-4">
          {dueItems.map(item => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{item.word}</h3>
                  {item.pronunciation && (
                    <p className="text-gray-600">{item.pronunciation}</p>
                  )}
                  <p className="text-gray-700 mt-2">{item.definition}</p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      const updatedItems = items.map(i => 
                        i.id === item.id 
                          ? { ...i, dueDate: addDays(today, 1) }
                          : i
                      );
                      onUpdate(updatedItems);
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    내일로
                  </button>
                  <button
                    onClick={() => {
                      const updatedItems = items.filter(i => i.id !== item.id);
                      onUpdate(updatedItems);
                    }}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    완료
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Settings = ({ settings, onSettingsChange, onClearData, userName, onUserNameChange, deviceId }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [newUserName, setNewUserName] = useState(userName);
  const [showDeviceIdInput, setShowDeviceIdInput] = useState(false);
  const [inputDeviceId, setInputDeviceId] = useState('');

  const handleClearData = async () => {
    if (showConfirm) {
      await deviceAuth.clearUserData();
      window.location.reload();
    } else {
      setShowConfirm(true);
    }
  };

  const handleUserNameChange = () => {
    if (newUserName.trim()) {
      onUserNameChange(newUserName.trim());
    }
  };

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId).then(() => {
      alert('디바이스 ID가 복사되었습니다!');
    });
  };

  const handleDeviceIdChange = async () => {
    if (inputDeviceId.trim()) {
      try {
        await deviceAuth.setDeviceId(inputDeviceId.trim());
        alert('디바이스 ID가 변경되었습니다. 페이지를 새로고침합니다.');
        window.location.reload();
      } catch (error) {
        alert('디바이스 ID 변경에 실패했습니다: ' + error.message);
      }
    }
  };

  return (
    <div className="pt-60 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">사용자 설정</h2>
        
        <div className="space-y-4">
          {/* 디바이스 ID 공유 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              디바이스 ID (다른 기기에서 같은 데이터 사용)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={deviceId}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={copyDeviceId}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                복사
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              이 ID를 다른 기기에서 입력하면 같은 데이터를 사용할 수 있습니다.
            </p>
            
            <div className="mt-3">
              <button
                onClick={() => setShowDeviceIdInput(!showDeviceIdInput)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showDeviceIdInput ? '숨기기' : '다른 기기 ID 입력하기'}
              </button>
              
              {showDeviceIdInput && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    다른 기기의 디바이스 ID 입력
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputDeviceId}
                      onChange={(e) => setInputDeviceId(e.target.value)}
                      placeholder="디바이스 ID를 입력하세요"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                    <button
                      onClick={handleDeviceIdChange}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      적용
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    주의: 기존 데이터는 새 디바이스의 데이터로 덮어씌워집니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용자명
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleUserNameChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                변경
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              기본적으로 의미 숨기기
            </label>
            <input
              type="checkbox"
              checked={settings.hideMeaningsByDefault}
              onChange={(e) => onSettingsChange({ 
                ...settings, 
                hideMeaningsByDefault: e.target.checked 
              })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-red-800 mb-2">데이터 관리</h3>
        <p className="text-red-600 mb-4">
          모든 학습 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          onClick={handleClearData}
          className={`px-4 py-2 rounded-lg font-medium ${
            showConfirm 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {showConfirm ? '정말 삭제하시겠습니까?' : '모든 데이터 삭제'}
        </button>
        {showConfirm && (
          <button
            onClick={() => setShowConfirm(false)}
            className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
};

// ===== 메인 앱 =====
const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNameModal, setShowNameModal] = useState(false);
  
  const { 
    items, 
    setItems, 
    settings, 
    setSettings, 
    userName,
    setUserName,
    loading, 
    saveData,
    deviceId
  } = useCrossDeviceStore();

  // 사용자명 설정
  useEffect(() => {
    if (userName === '익명 사용자' && !loading) {
      setShowNameModal(true);
    }
  }, [userName, loading]);

  const handleNameSubmit = () => {
    if (userName.trim()) {
      setUserName(userName.trim());
      setShowNameModal(false);
    }
  };

  const handleAddWord = async (newItem) => {
    const newItems = [...items, newItem];
    await saveData(newItems, settings);
  };

  const handleUpdateItems = async (newItems) => {
    await saveData(newItems, settings);
  };

  const handleSettingsChange = async (newSettings) => {
    await saveData(items, newSettings);
  };

  const handleUserNameChange = async (newUserName) => {
    await saveData(items, settings, newUserName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (showNameModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-center mb-6">환영합니다!</h2>
          <p className="text-gray-600 text-center mb-6">
            학습을 시작하기 전에 이름을 입력해주세요.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
            <button
              onClick={handleNameSubmit}
              disabled={!userName.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="WordChain" 
                  className="h-8 w-8"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <h1 className="text-xl font-bold text-gray-900">WordChain</h1>
              </div>
              
              <nav className="flex space-x-1">
                <TabButton
                  active={activeTab === "dashboard"}
                  onClick={() => setActiveTab("dashboard")}
                >
                  대시보드
                </TabButton>
                <TabButton
                  active={activeTab === "add"}
                  onClick={() => setActiveTab("add")}
                >
                  추가
                </TabButton>
                <TabButton
                  active={activeTab === "study"}
                  onClick={() => setActiveTab("study")}
                >
                  학습
                </TabButton>
                <TabButton
                  active={activeTab === "review"}
                  onClick={() => setActiveTab("review")}
                >
                  리뷰
                </TabButton>
                <TabButton
                  active={activeTab === "settings"}
                  onClick={() => setActiveTab("settings")}
                >
                  설정
                </TabButton>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                안녕하세요, {userName}님!
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && <Dashboard items={items} settings={settings} deviceId={deviceId} />}
        {activeTab === "add" && <AddWord onAdd={handleAddWord} />}
        {activeTab === "study" && <Study items={items} settings={settings} onUpdate={handleUpdateItems} />}
        {activeTab === "review" && <Review items={items} onUpdate={handleUpdateItems} />}
        {activeTab === "settings" && (
          <Settings 
            settings={settings} 
            onSettingsChange={handleSettingsChange}
            onClearData={() => {}}
            userName={userName}
            onUserNameChange={handleUserNameChange}
            deviceId={deviceId}
          />
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 WordChain · 범기기 지원 (클라우드 동기화)
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
