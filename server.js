import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 테스트 API
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Dictionary.com 크롤링 API
app.post('/api/scrape-dictionary', async (req, res) => {
  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Word is required' });
  }

  try {
    // Dictionary.com에서 HTML 가져오기
    const response = await axios.get(`https://www.dictionary.com/browse/${encodeURIComponent(word)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // 발음 추출 (여러 선택자 시도)
    let pronunciation = '';
    const pronunciationSelectors = [
      "#dictionary-entry-1 > div:nth-child(1) > section > div.aB40zqNSml1nCbUuOh7V > p",
      "[data-testid='pronunciation']",
      ".pronunciation",
      ".pron",
      "[class*='pronunciation']"
    ];

    for (const selector of pronunciationSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        // HTML 태그를 유지하면서 볼드체 부분을 대문자로 변환
        let html = element.html();
        if (html) {
          // <b>, <strong>, <span style="font-weight:bold"> 등의 볼드 태그를 찾아서 대문자로 변환
          html = html.replace(/<b[^>]*>(.*?)<\/b>/gi, (match, content) => {
            return `<b>${content.toUpperCase()}</b>`;
          });
          html = html.replace(/<strong[^>]*>(.*?)<\/strong>/gi, (match, content) => {
            return `<strong>${content.toUpperCase()}</strong>`;
          });
          html = html.replace(/<span[^>]*style="[^"]*font-weight:\s*bold[^"]*"[^>]*>(.*?)<\/span>/gi, (match, content) => {
            return `<span style="font-weight:bold">${content.toUpperCase()}</span>`;
          });
          pronunciation = html;
        } else {
          pronunciation = element.text().trim();
        }
        break;
      }
    }

    // 품사 추출 (여러 선택자 시도)
    let partOfSpeech = '';
    const partOfSpeechSelectors = [
      "[data-testid='part-of-speech']",
      ".part-of-speech",
      ".pos",
      "[class*='part-of-speech']",
      ".luna-part-of-speech",
      "h2[class*='pos']",
      "h3[class*='pos']",
      ".css-1a7l3io",
      ".css-1a7l3io h2",
      ".css-1a7l3io h3",
      "h2",
      "h3",
      ".dictionary-entry-header h2",
      ".dictionary-entry-header h3",
      "[class*='entry-header'] h2",
      "[class*='entry-header'] h3",
      // 추가 선택자들
      "span[class*='pos']",
      "div[class*='pos']",
      "[class*='grammar']",
      "[class*='word-type']",
      "em",
      "i",
      ".italic",
      "[class*='italic']"
    ];

    for (const selector of partOfSpeechSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        const text = element.text().trim();
        // 품사로 보이는 텍스트만 필터링 (noun, verb, adjective 등)
        if (text.match(/^(noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun|determiner|particle)$/i)) {
          partOfSpeech = text;
          break;
        }
        // 또는 짧은 텍스트 (1-3단어)인 경우
        if (text.length < 20 && text.split(' ').length <= 3) {
          partOfSpeech = text;
          break;
        }
        // 또는 품사가 포함된 텍스트인 경우
        if (text.match(/\b(noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun|determiner|particle)\b/i)) {
          partOfSpeech = text.match(/\b(noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun|determiner|particle)\b/i)[0];
          break;
        }
      }
    }

    // 영영정의 추출 (여러 선택자 시도)
    let definition = '';
    const definitionSelectors = [
      "#dictionary-entry-1 > div:nth-child(2) > section > div:nth-child(1) > ol li",
      "[data-testid='definition']",
      ".definition",
      ".def",
      "[class*='definition'] li",
      "ol li"
    ];

    for (const selector of definitionSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        definition = element.text().trim();
        break;
      }
    }

    // 결과 반환
    const result = {
      success: true,
      data: {
        pronunciation: pronunciation || '',
        definition: definition || '',
        partOfSpeech: partOfSpeech || '',
        source: 'Dictionary.com'
      }
    };
    
    console.log('Scraping result:', result);
    res.json(result);

  } catch (error) {
    console.error('Scraping error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to scrape dictionary',
      details: error.message
    });
  }
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    details: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
