import React, { useEffect, useMemo, useState } from "react";

/**
 * 영어 단어 체인 암기 웹앱
 * - 로컬 저장소를 사용한 데이터 관리
 * - JSON 백업/복원 기능 제공
 */

// ===== 유틸 =====
const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const uid = () => Math.random().toString(36).slice(2, 9);

// ===== 발음 기능 =====
const speakText = (text, lang = 'en-US') => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.8; // 조금 느리게
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // 영어 음성으로 설정
    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('English')
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    speechSynthesis.speak(utterance);
  } else {
    alert('이 브라우저는 음성 합성을 지원하지 않습니다.');
  }
};

// ===== 사용자 데이터 관리 (로컬 스토리지) =====
const useLocalStorageStore = () => {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('wordchain_settings');
      return stored ? JSON.parse(stored) : { hideMeaningsByDefault: true };
    } catch {
      return { hideMeaningsByDefault: true };
    }
  });
  const [userName, setUserName] = useState(() => localStorage.getItem('wordchain_user_name') || '익명 사용자');
  const [loading, setLoading] = useState(true);

  // 초기 데이터 로드
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('wordchain_items');
      setItems(storedItems ? JSON.parse(storedItems) : []);
    } catch (error) {
      console.error('Failed to load items from local storage:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 데이터 저장
  const saveData = async (newItems, newSettings, newUserName) => {
    try {
      // 데이터를 localStorage에 저장
      localStorage.setItem('wordchain_items', JSON.stringify(newItems));
      localStorage.setItem('wordchain_settings', JSON.stringify(newSettings));
      
      if (newUserName) {
        localStorage.setItem('wordchain_user_name', newUserName);
        setUserName(newUserName);
      }
      
      // 상태 업데이트
      setItems(newItems);
      setSettings(newSettings);
      
      // PWA에서 데이터 지속성 보장
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'DATA_SAVED',
          data: { items: newItems, settings: newSettings, userName: newUserName || userName }
        });
      }
      
      console.log('Data saved successfully:', { items: newItems.length, settings: newSettings, userName: newUserName || userName });
    } catch (error) {
      console.error('Failed to save data to local storage:', error);
      alert('데이터 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.');
    }
  };

  return { 
    items, 
    setItems, 
    settings, 
    setSettings, 
    userName,
    setUserName,
    loading, 
    saveData
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

const Dashboard = ({ items, settings }) => {
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
    <div className="pt-4 md:pt-60 space-y-6">
      <PWAInstallPrompt />
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 md:p-6 rounded-xl">
        <h2 className="text-xl md:text-2xl font-bold mb-2">학습 현황</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold">{stats.total}</div>
            <div className="text-xs md:text-sm opacity-90">전체 단어</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-yellow-300">{stats.dueToday}</div>
            <div className="text-xs md:text-sm opacity-90">오늘 복습</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-green-300">{stats.learning}</div>
            <div className="text-xs md:text-sm opacity-90">학습 중</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-300">{stats.mastered}</div>
            <div className="text-xs md:text-sm opacity-90">완료</div>
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

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">💾 데이터 백업</h3>
        <p className="text-blue-700 text-sm">
          설정에서 데이터를 JSON 파일로 백업하거나 복원할 수 있습니다.
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
    <div className="pt-4 md:pt-60 space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow">
        <h2 className="text-lg md:text-xl font-semibold mb-4">새 단어 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              영어 단어
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="단어를 입력하세요"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              {word.trim() && (
                <button
                  type="button"
                  onClick={() => speakText(word.trim())}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.816A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
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
      <div className="pt-4 md:pt-60 text-center">
        <h2 className="text-lg md:text-xl font-semibold text-gray-600">학습할 단어가 없습니다</h2>
        <p className="text-gray-500 mt-2 text-sm md:text-base">새 단어를 추가하거나 복습할 단어가 생기면 여기에 표시됩니다.</p>
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
    <div className="pt-4 md:pt-60 space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow">
        <div className="text-center mb-4">
          <span className="text-xs md:text-sm text-gray-500">
            {currentIndex + 1} / {studyItems.length}
          </span>
        </div>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {currentItem.word}
          </h2>
          {currentItem.pronunciation && (
            <div className="mb-4">
              <p 
                className="text-base md:text-lg text-gray-600 mb-2 pronunciation-display"
                dangerouslySetInnerHTML={{ __html: currentItem.pronunciation }}
              />
              <button
                onClick={() => speakText(currentItem.word)}
                className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.816A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                발음 듣기
              </button>
            </div>
          )}
        </div>

        {!showAnswer ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full bg-blue-600 text-white py-3 px-4 md:px-6 rounded-lg hover:bg-blue-700 text-sm md:text-base"
            >
              답 보기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">정의:</h3>
          <p className="text-gray-700">{currentItem.definition}</p>
          {currentItem.pronunciation && (
            <div className="mt-2">
              <p 
                className="text-sm text-gray-600 mb-2 pronunciation-display"
                dangerouslySetInnerHTML={{ __html: currentItem.pronunciation }}
              />
              <button
                onClick={() => speakText(currentItem.word)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.816A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
                발음 듣기
              </button>
            </div>
          )}
          {currentItem.partOfSpeech && (
            <p className="text-sm text-gray-500 mt-2">
              ({currentItem.partOfSpeech})
            </p>
          )}
        </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 bg-red-500 text-white py-3 px-4 md:px-6 rounded-lg hover:bg-red-600 text-sm md:text-base"
              >
                틀렸어요
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 bg-green-500 text-white py-3 px-4 md:px-6 rounded-lg hover:bg-green-600 text-sm md:text-base"
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

const WordList = ({ items, onUpdate }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.definition.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (filter) {
      case 'new':
        return item.status === 'new' && matchesSearch;
      case 'learning':
        return item.status === 'learning' && matchesSearch;
      case 'mastered':
        return item.status === 'mastered' && matchesSearch;
      case 'due':
        return item.dueDate === todayStr() && matchesSearch;
      default:
        return matchesSearch;
    }
  });

  const handleDeleteWord = (wordId) => {
    if (window.confirm('이 단어를 삭제하시겠습니까?')) {
      const updatedItems = items.filter(item => item.id !== wordId);
      onUpdate(updatedItems);
    }
  };

  const handleStatusChange = (wordId, newStatus) => {
    const updatedItems = items.map(item => 
      item.id === wordId ? { ...item, status: newStatus } : item
    );
    onUpdate(updatedItems);
  };

  return (
    <div className="pt-4 md:pt-60 space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow">
        <h2 className="text-lg md:text-xl font-semibold mb-4">전체 단어 목록 ({items.length}개)</h2>
        
        {/* 검색 및 필터 */}
        <div className="space-y-4 mb-6">
          <div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="단어나 정의로 검색..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              전체 ({items.length})
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                filter === 'new' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              새 단어 ({items.filter(item => item.status === 'new').length})
            </button>
            <button
              onClick={() => setFilter('learning')}
              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                filter === 'learning' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              학습 중 ({items.filter(item => item.status === 'learning').length})
            </button>
            <button
              onClick={() => setFilter('mastered')}
              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                filter === 'mastered' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              완료 ({items.filter(item => item.status === 'mastered').length})
            </button>
            <button
              onClick={() => setFilter('due')}
              className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                filter === 'due' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              오늘 복습 ({items.filter(item => item.dueDate === todayStr()).length})
            </button>
          </div>
        </div>

        {/* 단어 목록 */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 단어가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{item.word}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'new' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'learning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.status === 'new' ? '새 단어' :
                         item.status === 'learning' ? '학습 중' : '완료'}
                      </span>
                    </div>
                    
                    {item.pronunciation && (
                      <div className="mb-2">
                        <p 
                          className="text-gray-600 mb-1 pronunciation-display"
                          dangerouslySetInnerHTML={{ __html: item.pronunciation }}
                        />
                        <button
                          onClick={() => speakText(item.word)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-4.816A1 1 0 019.383 3.076zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                          </svg>
                          발음
                        </button>
                      </div>
                    )}
                    
                    <p className="text-gray-700 mb-2">{item.definition}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {item.partOfSpeech && (
                        <span>({item.partOfSpeech})</span>
                      )}
                      <span>추가일: {item.addedDate}</span>
                      <span>복습일: {item.dueDate}</span>
                      <span>복습 횟수: {item.reviewCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="new">새 단어</option>
                      <option value="learning">학습 중</option>
                      <option value="mastered">완료</option>
                    </select>
                    
                    <button
                      onClick={() => handleDeleteWord(item.id)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                    <p 
                      className="text-gray-600 pronunciation-display"
                      dangerouslySetInnerHTML={{ __html: item.pronunciation }}
                    />
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

const Settings = ({ settings, onSettingsChange, onClearData, userName, onUserNameChange, items }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [newUserName, setNewUserName] = useState(userName);
  const [showBackupRestore, setShowBackupRestore] = useState(false);

  const handleClearData = async () => {
    if (showConfirm) {
      localStorage.removeItem('wordchain_items');
      localStorage.removeItem('wordchain_settings');
      localStorage.removeItem('wordchain_user_name');
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

  // JSON 백업 다운로드
  const handleBackup = () => {
    const data = {
      items: items,
      settings: settings,
      userName: userName,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `wordchain-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('백업 파일이 다운로드되었습니다!');
  };

  // JSON 복원
  const handleRestore = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // 데이터 검증
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('잘못된 백업 파일입니다. items 배열이 없습니다.');
        }
        
        if (!data.settings || typeof data.settings !== 'object') {
          throw new Error('잘못된 백업 파일입니다. settings 객체가 없습니다.');
        }

        // 데이터 복원
        localStorage.setItem('wordchain_items', JSON.stringify(data.items));
        localStorage.setItem('wordchain_settings', JSON.stringify(data.settings));
        if (data.userName) {
          localStorage.setItem('wordchain_user_name', data.userName);
        }
        
        alert('백업이 성공적으로 복원되었습니다! 페이지를 새로고침합니다.');
        window.location.reload();
      } catch (error) {
        alert('백업 복원에 실패했습니다: ' + error.message);
      }
    };
    reader.readAsText(file);
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  return (
    <div className="pt-4 md:pt-60 space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-xl shadow">
        <h2 className="text-lg md:text-xl font-semibold mb-4">사용자 설정</h2>
        
        <div className="space-y-4">
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
                className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base"
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

      {/* 백업 및 복원 */}
      <div className="bg-blue-50 border border-blue-200 p-4 md:p-6 rounded-xl">
        <h3 className="text-base md:text-lg font-semibold text-blue-800 mb-2">데이터 백업 및 복원</h3>
        <p className="text-blue-600 mb-4 text-sm md:text-base">
          학습 데이터를 JSON 파일로 백업하거나 복원할 수 있습니다.
        </p>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleBackup}
              className="px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm md:text-base"
            >
              📥 데이터 백업
            </button>
            
            <label className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm md:text-base text-center">
              📤 데이터 복원
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
              />
            </label>
          </div>
          
          <div className="text-xs md:text-sm text-blue-600">
            <p>• 백업: 현재 모든 데이터를 JSON 파일로 다운로드합니다</p>
            <p>• 복원: 백업 파일을 선택하여 데이터를 복원합니다</p>
            <p>• 복원 시 기존 데이터는 덮어씌워집니다</p>
          </div>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 p-4 md:p-6 rounded-xl">
        <h3 className="text-base md:text-lg font-semibold text-red-800 mb-2">데이터 관리</h3>
        <p className="text-red-600 mb-4 text-sm md:text-base">
          모든 학습 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          onClick={handleClearData}
          className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base ${
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
            className="ml-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm md:text-base"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
};

// ===== PWA 설치 안내 컴포넌트 =====
const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSupported, setInstallSupported] = useState(false);

  useEffect(() => {
    // iOS 감지
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 이미 설치된 앱인지 확인
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // 모바일 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // PWA 설치 지원 여부 확인 (더 유연한 조건)
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
    const isInstallSupported = hasServiceWorker && hasManifest && isHTTPS;

    console.log('PWA Debug Info:', {
      iOS,
      standalone,
      isMobile,
      isInstallSupported,
      hasServiceWorker,
      hasManifest,
      isHTTPS,
      serviceWorker: 'serviceWorker' in navigator,
      userAgent: navigator.userAgent,
      location: window.location.href,
      protocol: location.protocol,
      hostname: location.hostname
    });

    // PWA 설치 프롬프트 이벤트
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event triggered', e);
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
      setInstallSupported(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 설치 지원 여부 설정
    setInstallSupported(isInstallSupported);

    // 이미 설치되지 않았고, 모바일이면 설치 안내 표시 (조건 완화)
    if (!standalone && isMobile) {
      console.log('Showing install prompt for mobile device');
      setShowInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('Install button clicked, deferredPrompt:', deferredPrompt);
    
    if (deferredPrompt) {
      try {
        // 사용자에게 설치 프롬프트 표시
        deferredPrompt.prompt();
        
        // 사용자 선택 결과 기다리기
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        // 프롬프트 사용 후 정리
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      } catch (error) {
        console.error('Error during install prompt:', error);
        alert('설치 중 오류가 발생했습니다. 브라우저를 새로고침해주세요.');
      }
    } else {
      console.log('No deferred prompt available');
      alert('PWA 설치 프롬프트를 사용할 수 없습니다.\n\n다음 방법을 시도해보세요:\n1. Chrome 메뉴 → "홈 화면에 추가"\n2. 주소창의 설치 아이콘 클릭\n3. 페이지를 새로고침 후 다시 시도');
    }
  };

  // 이미 설치된 앱이면 표시하지 않음
  if (isStandalone) {
    console.log('App is already installed, hiding prompt');
    return null;
  }

  if (!showInstallPrompt) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">📱</div>
          <div>
            <h3 className="font-semibold text-lg">앱으로 설치하기</h3>
            <p className="text-sm opacity-90">홈 화면에 추가하여 앱처럼 사용하세요!</p>
            {!installSupported && (
              <p className="text-xs opacity-75 mt-1">
                Chrome, Edge, Samsung Internet에서 사용 가능
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {isIOS ? (
            <div className="text-right">
              <p className="text-xs opacity-75 mb-1">Safari에서</p>
              <p className="text-xs opacity-75">공유 → 홈 화면에 추가</p>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 text-sm font-medium"
            >
              {deferredPrompt ? '설치하기' : '설치 시도'}
            </button>
          )}
          <button
            onClick={() => setShowInstallPrompt(false)}
            className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 text-sm"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== 메인 앱 =====
const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNameModal, setShowNameModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { 
    items, 
    setItems, 
    settings, 
    setSettings, 
    userName,
    setUserName,
    loading, 
    saveData
  } = useLocalStorageStore();

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
            {/* 로고 */}
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setActiveTab("dashboard")}
            >
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
            
            {/* 데스크톱 네비게이션 */}
            <nav className="hidden md:flex space-x-1">
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
                active={activeTab === "words"}
                onClick={() => setActiveTab("words")}
              >
                단어목록
              </TabButton>
              <TabButton
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              >
                설정
              </TabButton>
            </nav>
            
            {/* 사용자명 (데스크톱) */}
            <div className="hidden sm:flex items-center gap-4">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                안녕하세요, {userName}님!
              </span>
            </div>
            
            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          {/* 모바일 메뉴 */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-2">
                <div className="px-2 py-1 text-sm text-gray-600">
                  안녕하세요, {userName}님!
                </div>
                <TabButton
                  active={activeTab === "dashboard"}
                  onClick={() => {
                    setActiveTab("dashboard");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  대시보드
                </TabButton>
                <TabButton
                  active={activeTab === "add"}
                  onClick={() => {
                    setActiveTab("add");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  추가
                </TabButton>
                <TabButton
                  active={activeTab === "study"}
                  onClick={() => {
                    setActiveTab("study");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  학습
                </TabButton>
                <TabButton
                  active={activeTab === "review"}
                  onClick={() => {
                    setActiveTab("review");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  리뷰
                </TabButton>
                <TabButton
                  active={activeTab === "words"}
                  onClick={() => {
                    setActiveTab("words");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  단어목록
                </TabButton>
                <TabButton
                  active={activeTab === "settings"}
                  onClick={() => {
                    setActiveTab("settings");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full justify-start"
                >
                  설정
                </TabButton>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {activeTab === "dashboard" && <Dashboard items={items} settings={settings} />}
        {activeTab === "add" && <AddWord onAdd={handleAddWord} />}
        {activeTab === "study" && <Study items={items} settings={settings} onUpdate={handleUpdateItems} />}
        {activeTab === "review" && <Review items={items} onUpdate={handleUpdateItems} />}
        {activeTab === "words" && <WordList items={items} onUpdate={handleUpdateItems} />}
        {activeTab === "settings" && (
          <Settings 
            settings={settings} 
            onSettingsChange={handleSettingsChange}
            onClearData={() => {}}
            userName={userName}
            onUserNameChange={handleUserNameChange}
            items={items}
          />
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 WordChain · JSON 백업/복원 지원
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

