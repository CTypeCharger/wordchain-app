import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db } from './firebase';

// 사용자 등록
export const registerUser = async (email, password, username) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Firestore에 사용자 정보 저장
    await setDoc(doc(db, 'users', user.uid), {
      username: username,
      email: email,
      words: [],
      createdAt: new Date()
    });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자 로그인
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자 로그아웃
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자 데이터 저장
export const saveUserData = async (userId, data) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      words: data.items || [],
      lastUpdated: new Date()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 사용자 데이터 불러오기
export const getUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return { 
        success: true, 
        data: { 
          items: data.words || [],
          username: data.username 
        } 
      };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 인증 상태 변화 감지
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
