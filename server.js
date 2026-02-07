const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

/* ==================== 30 KEYWORDS - GROQ ONLY ==================== */
app.post('/api/generate-keywords', async (req, res) => {
  try {
    const { topic, language = 'english' } = req.body;
    
    console.log('========================================');
    console.log('🔍 GENERATING 30 KEYWORDS');
    console.log('Topic:', topic);
    console.log('Language:', language);
    console.log('========================================');

    if (!topic) {
      return res.status(400).json({ error: 'Topic required' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const languageInstructions = {
      'hindi': 'Hindi using Devanagari script (डिजिटल मार्केटिंग, ऑनलाइन व्यापार)',
      'bengali': 'Bengali using Bengali script (ডিজিটাল মার্কেটিং)',
      'tamil': 'Tamil using Tamil script (டிஜிட்டல் மார்க்கெட்டிங்)',
      'telugu': 'Telugu using Telugu script (డిజిటల్ మార్కెటింగ్)',
      'marathi': 'Marathi using Devanagari script (डिजिटल मार्केटिंग)',
      'gujarati': 'Gujarati using Gujarati script (ડિજિટલ માર્કેટિંગ)'
    };

    let prompt = language === 'english'
      ? `Generate EXACTLY 30 diverse SEO keywords for: "${topic}"

Mix:
- 10 high-volume (20K-100K searches)
- 10 medium (5K-20K)
- 10 long-tail (1K-5K)

JSON only:
[{"keyword":"keyword","volume":45000,"ranking":"high"}]

ranking: "high", "medium", "low"`
      : `Generate 30 SEO keywords for "${topic}" in ${languageInstructions[language]}

CRITICAL: Write ALL keywords in NATIVE SCRIPT (NOT English, NOT romanized)

Example for Hindi: "डिजिटल मार्केटिंग गाइड", "ऑनलाइन व्यापार टिप्स"
Example for Tamil: "டிஜிட்டல் மார்க்கெட்டிங்", "வணிக வழிகாட்டி"

Mix:
- 10 high-volume
- 10 medium
- 10 long-tail

JSON only:
[{"keyword":"keyword in native script","volume":45000,"ranking":"high"}]

Write in native script NOW!`;

    console.log('📤 Calling Groq...');

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.85,
          max_tokens: 6000,
          messages: [
            {
              role: 'system',
              content: 'You are an SEO expert. Return ONLY valid JSON array.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Groq API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    let text = data.choices[0].message.content
      .replace(/```json|```|```/g, '')
      .trim();

    console.log('📥 Response preview:', text.substring(0, 300));

    let keywords;
    try {
      keywords = JSON.parse(text);
      
      keywords = keywords.map(kw => ({
        keyword: kw.keyword || kw,
        volume: parseInt(kw.volume) || Math.floor(Math.random() * 20000) + 2000,
        ranking: kw.ranking || 'medium'
      }));

    } catch (e) {
      console.log('⚠️ Parse error, using fallback');
      keywords = generateFallback(topic, language);
    }

    // Ensure 30 keywords
    while (keywords.length < 30) {
      const base = keywords[keywords.length % Math.min(keywords.length, 10)];
      keywords.push({
        keyword: `${base.keyword} guide`,
        volume: Math.floor(Math.random() * 10000) + 1000,
        ranking: 'low'
      });
    }

    keywords = keywords.slice(0, 30);

    console.log('✅ Generated', keywords.length, 'keywords');
    console.log('📊 High:', keywords.filter(k => k.ranking === 'high').length);
    console.log('📊 Medium:', keywords.filter(k => k.ranking === 'medium').length);
    console.log('📊 Low:', keywords.filter(k => k.ranking === 'low').length);

    res.json({ content: [{ text: JSON.stringify(keywords) }] });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function generateFallback(topic, language) {
  const templates = {
    hindi: [
      `${topic} गाइड`, `${topic} टिप्स`, `${topic} ट्यूटोरियल`,
      `${topic} के फायदे`, `${topic} कैसे करें`, `${topic} भारत में`,
      `बेस्ट ${topic}`, `${topic} शुरुआत`, `${topic} रणनीति`,
      `${topic} 2026`, `${topic} उदाहरण`, `${topic} जानकारी`,
      `${topic} लाभ`, `${topic} विधि`, `${topic} महत्व`,
      `${topic} प्रक्रिया`, `${topic} सुझाव`, `${topic} मार्गदर्शन`,
      `${topic} सीखें`, `${topic} युक्तियाँ`, `${topic} विश्लेषण`,
      `${topic} अध्ययन`, `${topic} समीक्षा`, `${topic} परिचय`,
      `${topic} विकल्प`, `${topic} समाधान`, `${topic} प्रभाव`,
      `${topic} चुनौतियाँ`, `${topic} अवसर`, `${topic} भविष्य`
    ],
    english: [
      `${topic} guide`, `${topic} tips`, `${topic} tutorial`,
      `${topic} benefits`, `how to ${topic}`, `${topic} in India`,
      `best ${topic}`, `${topic} beginners`, `${topic} strategy`,
      `${topic} 2026`, `${topic} examples`, `${topic} information`,
      `${topic} advantages`, `${topic} methods`, `${topic} importance`,
      `${topic} process`, `${topic} advice`, `${topic} guidance`,
      `learn ${topic}`, `${topic} tips`, `${topic} analysis`,
      `${topic} study`, `${topic} review`, `${topic} introduction`,
      `${topic} options`, `${topic} solutions`, `${topic} impact`,
      `${topic} challenges`, `${topic} opportunities`, `${topic} future`
    ]
  };

  const list = templates[language] || templates.english;
  return list.map((kw, i) => ({
    keyword: kw,
    volume: i < 10 ? Math.floor(Math.random() * 80000) + 20000 :
            i < 20 ? Math.floor(Math.random() * 15000) + 5000 :
                     Math.floor(Math.random() * 4000) + 1000,
    ranking: i < 10 ? 'high' : i < 20 ? 'medium' : 'low'
  }));
}

/* ==================== OUTLINE ==================== */
app.post('/api/generate-outline', async (req, res) => {
  try {
    const { keywords, language = 'english', topic } = req.body;
    
    const prompt = `Create blog outline for "${topic}". Keywords: ${keywords.join(', ')}. Include title, meta, intro, 8 sections, conclusion.`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.8,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      }
    );

    const data = await response.json();
    res.json({ content: [{ text: data.choices[0].message.content }] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== CONTENT ==================== */
app.post('/api/generate-content', async (req, res) => {
  try {
    const { keywords, language = 'english', topic } = req.body;
    
    const prompt = `Write 2000-word blog about "${topic}". Keywords: ${keywords.join(', ')}. Full article with 8+ sections.`;

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.8,
          max_tokens: 8000,
          messages: [{ role: 'user', content: prompt }]
        })
      }
    );

    const data = await response.json();
    res.json({ content: [{ text: data.choices[0].message.content }] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 AI Blog Generator');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`🔑 Groq: ${process.env.GROQ_API_KEY ? '✅' : '❌'}`);
  console.log('📊 30 keywords per generation');
  console.log('========================================');
});