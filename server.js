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
  res.json({ status: 'OK', message: 'Server is running' });
});

// Language script examples for better AI understanding
const languageScripts = {
  'hindi': {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    example: 'डिजिटल मार्केटिंग, ऑनलाइन व्यापार, सोशल मीडिया'
  },
  'bengali': {
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    example: 'ডিজিটাল মার্কেটিং, অনলাইন ব্যবসা, সোশ্যাল মিডিয়া'
  },
  'tamil': {
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    example: 'டிஜிட்டல் மார்க்கெட்டிங், ஆன்லைன் வணிகம், சமூக ஊடகம்'
  },
  'telugu': {
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    example: 'డిజిటల్ మార్కెటింగ్, ఆన్‌లైన్ వ్యాపారం, సోషల్ మీడియా'
  },
  'marathi': {
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    example: 'डिजिटल मार्केटिंग, ऑनलाइन व्यवसाय, सोशल मीडिया'
  }
};

/* ==================== KEYWORD GENERATION ==================== */
app.post('/api/generate-keywords', async (req, res) => {
  try {
    const { topic, language = 'english' } = req.body;
    
    console.log('========================================');
    console.log('🔍 KEYWORD GENERATION REQUEST');
    console.log('Topic:', topic);
    console.log('Language:', language);
    console.log('========================================');

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const hasGemini = !!process.env.GOOGLE_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;

    // CRITICAL: For non-English, we MUST use Gemini
    let useAPI = 'none';
    if (language !== 'english') {
      if (!hasGemini) {
        return res.status(400).json({ 
          error: 'Gemini API key required for non-English languages. Please add GOOGLE_API_KEY to your .env file.' 
        });
      }
      useAPI = 'gemini';
      console.log('🌐 Using Gemini for', language);
    } else if (hasGroq) {
      useAPI = 'groq';
      console.log('🚀 Using Groq for English');
    } else if (hasGemini) {
      useAPI = 'gemini';
      console.log('🌐 Using Gemini for English');
    }

    if (useAPI === 'none') {
      throw new Error('No API keys configured');
    }

    let keywords;

    if (useAPI === 'gemini') {
      let prompt;
      
      if (language === 'english') {
        prompt = `Generate 12 SEO keywords for: "${topic}"

Return ONLY valid JSON array:
[
  {"keyword": "keyword phrase", "volume": 12000, "ranking": "high"},
  {"keyword": "another keyword", "volume": 8500, "ranking": "medium"}
]

Include ranking field: "high", "medium", or "low" based on SEO potential.
Volumes: 1000-50000. No markdown, no backticks.`;
      } else {
        const langInfo = languageScripts[language];
        
        // ULTRA-STRONG MULTILINGUAL PROMPT
        prompt = `CRITICAL INSTRUCTION - READ CAREFULLY:

You are generating keywords for: "${topic}"
Target Language: ${langInfo.name} (${langInfo.nativeName})
Script: ${langInfo.script}

MANDATORY RULES - NO EXCEPTIONS:
❌ DO NOT write in English
❌ DO NOT use Roman/Latin script  
❌ DO NOT transliterate
❌ DO NOT mix languages
✅ ONLY use ${langInfo.script} script
✅ ONLY write in pure ${langInfo.name}

EXAMPLE (copy this style):
${langInfo.example}

TASK:
Generate 12 SEO keywords about "${topic}" entirely in ${langInfo.name} language using ${langInfo.script} script.

OUTPUT FORMAT (JSON only, no markdown):
[
  {"keyword": "keyword in ${langInfo.script} script", "volume": 12000, "ranking": "high"},
  {"keyword": "keyword in ${langInfo.script} script", "volume": 8500, "ranking": "medium"}
]

RANKING GUIDE:
- "high": Best SEO potential, high search volume
- "medium": Good SEO potential, moderate volume
- "low": Niche keywords, lower volume

VERIFICATION CHECKLIST:
□ All keywords are in ${langInfo.script} script?
□ No English words present?
□ No Roman characters used?
□ Follows example format above?

Generate now - remember: ONLY ${langInfo.script} script!`;
      }

      console.log('📤 Sending to Gemini API...');
      
      // Use stable Gemini models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API Error Response:', errorText);
        throw new Error(`Gemini API failed: ${response.status} - Check your API key and quota`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('❌ Gemini Error:', data.error);
        throw new Error(data.error.message || 'Gemini API error');
      }

      if (!data.candidates || !data.candidates[0]) {
        console.error('❌ Invalid Gemini response:', JSON.stringify(data));
        throw new Error('Invalid response from Gemini API');
      }

      let text = data.candidates[0].content.parts[0].text
        .replace(/```json|```/g, '')
        .trim();

      console.log('📥 Gemini Response (first 300 chars):');
      console.log(text.substring(0, 300));

      try {
        keywords = JSON.parse(text);
        
        // Ensure ranking field exists
        keywords = keywords.map(kw => ({
          keyword: kw.keyword,
          volume: kw.volume || 5000,
          ranking: kw.ranking || 'medium'
        }));
        
        console.log('✅ Successfully parsed', keywords.length, 'keywords');
        console.log('📝 First keyword:', keywords[0]);
        
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message);
        console.error('Raw text:', text);
        throw new Error('Failed to parse keywords - AI returned invalid JSON');
      }

    } else if (useAPI === 'groq') {
      console.log('📤 Sending to Groq API...');
      
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
            temperature: 0.7,
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: `Generate 12 SEO keywords for: "${topic}"

Return JSON array with ranking:
[{"keyword":"keyword","volume":12000,"ranking":"high"}]

ranking values: "high", "medium", "low"
No markdown, just JSON.`
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error('Groq API request failed');
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('❌ Groq Error:', data.error);
        throw new Error(data.error.message || 'Groq API error');
      }

      let text = data.choices[0].message.content
        .replace(/```json|```/g, '')
        .trim();

      console.log('📥 Groq Response (first 200 chars):', text.substring(0, 200));

      keywords = JSON.parse(text);
      
      // Ensure ranking field
      keywords = keywords.map(kw => ({
        keyword: kw.keyword,
        volume: kw.volume || 5000,
        ranking: kw.ranking || 'medium'
      }));
      
      console.log('✅ Parsed', keywords.length, 'keywords');
    }

    res.json({ 
      content: [{ text: JSON.stringify(keywords) }],
      language: language
    });

  } catch (err) {
    console.error('❌❌❌ CRITICAL ERROR:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

/* ==================== OUTLINE GENERATION ==================== */
app.post('/api/generate-outline', async (req, res) => {
  try {
    const { keywords, language = 'english', topic } = req.body;
    
    console.log('========================================');
    console.log('📝 OUTLINE GENERATION REQUEST');
    console.log('Topic:', topic);
    console.log('Language:', language);
    console.log('Keywords:', keywords);
    console.log('========================================');

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords are required' });
    }

    const hasGemini = !!process.env.GOOGLE_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;

    const useAPI = language !== 'english' && hasGemini ? 'gemini' : hasGroq ? 'groq' : hasGemini ? 'gemini' : 'none';

    if (useAPI === 'none') {
      throw new Error('No API keys configured');
    }

    const keywordList = keywords.join(', ');
    let promptText;
    
    if (language === 'english') {
      promptText = `Create blog outline for: "${topic}"

Keywords: ${keywordList}

Include:
- Compelling title
- Meta description (150-160 chars)
- 6-8 H2 sections
- 2-3 H3 subsections each
- Key points per section

Format: Plain text, clear hierarchy.`;
    } else {
      const langInfo = languageScripts[language];
      
      promptText = `CRITICAL - WRITE EVERYTHING IN ${langInfo.name.toUpperCase()}:

Topic: "${topic}"
Keywords (use in ${langInfo.name}): ${keywordList}

STRICT RULES:
❌ NO English text anywhere
❌ NO Roman script
✅ ONLY ${langInfo.script} script
✅ ONLY ${langInfo.name} language

EXAMPLE STYLE: ${langInfo.example}

Create outline IN ${langInfo.name}:
- Title (in ${langInfo.script})
- Meta description (in ${langInfo.script})
- 6-8 main sections (in ${langInfo.script})
- Subsections (in ${langInfo.script})

VERIFY: Every single word must be in ${langInfo.script} script!`;
    }

    let outlineText;

    if (useAPI === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      outlineText = data.candidates[0].content.parts[0].text;

    } else if (useAPI === 'groq') {
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
            messages: [{ role: 'user', content: promptText }]
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      outlineText = data.choices[0].message.content;
    }

    console.log('✅ Outline generated');
    res.json({ content: [{ text: outlineText }] });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ==================== FULL BLOG GENERATION ==================== */
app.post('/api/generate-content', async (req, res) => {
  try {
    const { keywords, language = 'english', topic } = req.body;
    
    console.log('========================================');
    console.log('✍️ FULL BLOG GENERATION REQUEST');
    console.log('Topic:', topic);
    console.log('Language:', language);
    console.log('Keywords:', keywords);
    console.log('========================================');

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords are required' });
    }

    const hasGemini = !!process.env.GOOGLE_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;

    const useAPI = language !== 'english' && hasGemini ? 'gemini' : hasGroq ? 'groq' : hasGemini ? 'gemini' : 'none';

    if (useAPI === 'none') {
      throw new Error('No API keys configured');
    }

    const keywordList = keywords.join(', ');
    let promptText;
    
    if (language === 'english') {
      promptText = `Write a COMPLETE, COMPREHENSIVE SEO blog post about: "${topic}"

Target Keywords (use naturally): ${keywordList}

REQUIREMENTS:
✅ 2000-2500 words (FULL LENGTH article)
✅ Catchy, SEO-optimized title
✅ Engaging introduction (hook the reader)
✅ 8-10 detailed sections with H2 headings
✅ Include H3 subheadings where appropriate
✅ Use keywords naturally throughout (1.5-2% density)
✅ Add examples, statistics, and practical tips
✅ Include bullet points and numbered lists where helpful
✅ Write in conversational, engaging tone
✅ Strong conclusion with call-to-action
✅ Use transition words for flow
✅ Make it informative and valuable

IMPORTANT:
- Write a COMPLETE blog post, not just an outline
- Include ALL content for each section
- Make it ready to publish
- Focus on reader value and engagement

Start writing the FULL blog post now:`;
    } else {
      const langInfo = languageScripts[language];
      
      promptText = `Write a COMPLETE, COMPREHENSIVE blog post IN ${langInfo.name.toUpperCase()}:

Topic: "${topic}"
Keywords (use naturally in ${langInfo.name}): ${keywordList}

ABSOLUTE REQUIREMENTS:
❌ ZERO English words
❌ ZERO Roman script
❌ ZERO transliteration
✅ 100% ${langInfo.script} script
✅ 100% ${langInfo.name} language
✅ 2000-2500 words in ${langInfo.name}

EXAMPLE STYLE: ${langInfo.example}

STRUCTURE (all in ${langInfo.name}):
✅ Catchy title (${langInfo.script})
✅ Engaging introduction (${langInfo.script})
✅ 8-10 detailed sections with headings (${langInfo.script})
✅ Include subheadings (${langInfo.script})
✅ Examples and tips (${langInfo.script})
✅ Use keywords naturally
✅ Strong conclusion (${langInfo.script})

CRITICAL: Write the COMPLETE blog post, not just outline!
Every single word must be in ${langInfo.script} script.

Start writing the FULL blog post in ${langInfo.name} now:`;
    }

    let contentText;

    if (useAPI === 'gemini') {
      console.log('📤 Generating full blog with Gemini...');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.85,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      contentText = data.candidates[0].content.parts[0].text;

    } else if (useAPI === 'groq') {
      console.log('📤 Generating full blog with Groq...');
      
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
            messages: [{ role: 'user', content: promptText }]
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      contentText = data.choices[0].message.content;
    }

    console.log('✅ Full blog generated');
    console.log('📊 Length:', contentText.length, 'characters');
    console.log('📝 Word count:', contentText.split(/\s+/).length, 'words');
    
    res.json({ content: [{ text: contentText }] });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 AI SEO Content Studio Server');
  console.log('========================================');
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`📝 API Keys:`);
  console.log(`   Groq: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Gemini: ${process.env.GOOGLE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('========================================');
  if (!process.env.GOOGLE_API_KEY) {
    console.log('⚠️  WARNING: Gemini API key missing!');
    console.log('   Non-English languages will not work.');
    console.log('   Add GOOGLE_API_KEY to .env file');
  }
  console.log('📚 Using stable Gemini model: gemini-1.5-flash');
  console.log('========================================');
});