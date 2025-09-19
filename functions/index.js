const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.scrapeDictionary = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

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
        ".pron-spell",
        ".pron",
        "[data-testid='pronunciation-text']",
        ".pronunciation"
      ];

      for (const selector of pronunciationSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          pronunciation = element.html() || element.text();
          break;
        }
      }

      // 발음에서 볼드체를 대문자로 변환
      if (pronunciation) {
        pronunciation = pronunciation.replace(/<b>(.*?)<\/b>/g, (match, content) => {
          return `<b>${content.toUpperCase()}</b>`;
        });
      }

      // 정의 추출 (여러 선택자 시도)
      let definition = '';
      const definitionSelectors = [
        "[data-testid='definition']",
        ".e1q3nk1v3",
        ".definition",
        ".def-content",
        "[data-testid='word-definition']"
      ];

      for (const selector of definitionSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          definition = element.text().trim();
          break;
        }
      }

      // 품사 추출
      let partOfSpeech = '';
      const partOfSpeechSelectors = [
        "[data-testid='part-of-speech']",
        ".luna-part-of-speech",
        ".pos",
        ".part-of-speech",
        "h2"
      ];

      for (const selector of partOfSpeechSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          const text = element.text().trim().toLowerCase();
          if (text && !text.includes('pronunciation') && !text.includes('definition')) {
            partOfSpeech = text;
            break;
          }
        }
      }

      // 품사 필터링 (일반적인 품사만 허용)
      const validPartsOfSpeech = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun', 'determiner'];
      if (partOfSpeech && !validPartsOfSpeech.some(pos => partOfSpeech.includes(pos))) {
        partOfSpeech = '';
      }

      return res.json({
        success: true,
        data: {
          pronunciation: pronunciation || '',
          definition: definition || '',
          partOfSpeech: partOfSpeech || '',
          source: 'Dictionary.com'
        }
      });

    } catch (error) {
      console.error('Scraping error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to scrape dictionary',
        details: error.message
      });
    }
  });
});
