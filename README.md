# 영어 단어 체인 암기 웹앱

## 기능
- 단어 추가/학습/리뷰
- Dictionary.com 자동 크롤링
- 스페이스드 반복 학습
- Pocket Sheet 생성

## 로컬 개발
```bash
npm install
npm run dev
```

## Vercel 배포
1. GitHub에 코드 푸시
2. Vercel에서 프로젝트 연결
3. 자동 배포 완료

## API 엔드포인트
- `POST /api/scrape-dictionary` - Dictionary.com 크롤링

## 사용법
1. 단어 입력
2. "🕷️ 자동 크롤링" 버튼 클릭
3. 발음과 정의가 자동 입력됨
4. "단어 추가" 버튼으로 저장

