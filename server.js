const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

async function callGroqAI({ prompt, language = 'english', maxTokens = 8192 }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured in .env file');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${process.env.GROQ_API_KEY}` 
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Groq API request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

app.post('/api/generate-keywords', async (req, res) => {
  try {
    const { topic, language = 'english' } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const langMap = {
      english: 'English',
      hindi: 'हिन्दी (Hindi)', 
      bengali: 'বাংলা (Bengali)', 
      tamil: 'தமிழ் (Tamil)', 
      telugu: 'తెలుగు (Telugu)', 
      marathi: 'मराठी (Marathi)'
    };
    
    const targetLang = langMap[language] || 'English';
    const useNativeScript = language !== 'english';
    
    const prompt = `Generate 30 SEO keywords for the topic: "${topic}"

Language: ${targetLang}
${useNativeScript ? 'IMPORTANT: Write keywords in native script (' + targetLang.split('(')[0].trim() + ')' : ''}

Return ONLY a valid JSON array with this exact format:
[
  {"keyword": "keyword text", "volume": 15000, "ranking": "high"},
  {"keyword": "another keyword", "volume": 8000, "ranking": "medium"}
]

Rules:
- Include mix of ranking levels: "high" (10-12 keywords), "medium" (10-12 keywords), "low" (6-8 keywords)
- Volume should be realistic (500 to 50000)
- Keywords should be relevant and varied (short-tail and long-tail)
${useNativeScript ? '- Write ALL keywords in ' + targetLang.split('(')[0].trim() + ' script' : ''}
- Return ONLY the JSON array, no explanation`;
    
    const text = await callGroqAI({ prompt, language, maxTokens: 4000 });
    
    // Clean and parse JSON
    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }
    
    const keywords = JSON.parse(jsonMatch[0]);
    
    // Validate keywords array
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('No keywords generated');
    }
    
    console.log(`✅ Generated ${keywords.length} keywords for "${topic}" in ${targetLang}`);
    res.json({ content: [{ text: JSON.stringify(keywords) }] });
  } catch (err) {
    console.error('Error generating keywords:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-outline', async (req, res) => {
  try {
    const { topic, keywords, language = 'english' } = req.body;
    
    if (!topic || !keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'Topic and keywords are required' });
    }

    const langMap = {
      english: 'English',
      hindi: 'हिन्दी (Hindi)', 
      bengali: 'বাংলা (Bengali)', 
      tamil: 'தமிழ் (Tamil)', 
      telugu: 'తెలుగు (Telugu)', 
      marathi: 'मराठी (Marathi)'
    };
    
    const targetLang = langMap[language] || 'English';
    
    const prompt = `Create a comprehensive blog post outline for: "${topic}"

Target Keywords: ${keywords.join(', ')}
Language: ${targetLang}

Generate a structured outline with:

1. SEO Title (60-70 characters, include main keyword)
2. Meta Description (150-160 characters)
3. Introduction (4-5 paragraphs)
4. 8 Main Sections with subsections
5. Key Takeaways (7-8 bullet points)
6. 7 Frequently Asked Questions
7. Conclusion (3-4 paragraphs)

Make it comprehensive, SEO-optimized, and ensure natural keyword integration.
${language !== 'english' ? 'Write the outline in ' + targetLang : ''}`;
    
    const text = await callGroqAI({ prompt, language, maxTokens: 4000 });
    
    console.log(`✅ Generated outline for "${topic}" in ${targetLang}`);
    res.json({ content: [{ text }] });
  } catch (err) {
    console.error('Error generating outline:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-content', async (req, res) => {
  try {
    const { topic, keywords, language = 'english' } = req.body;
    
    if (!topic || !keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'Topic and keywords are required' });
    }

    const langMap = {
      english: 'English',
      hindi: 'हिन्दी (Hindi)', 
      bengali: 'বাংলা (Bengali)', 
      tamil: 'தமிழ் (Tamil)', 
      telugu: 'తెలుగু (Telugu)', 
      marathi: 'मराठी (Marathi)'
    };
    
    const targetLang = langMap[language] || 'English';
    
    const prompt = `Write a complete 2500-word SEO-optimized blog post about "${topic}".

Target Keywords: ${keywords.join(', ')}
Language: ${targetLang}
${language !== 'english' ? 'IMPORTANT: Write the ENTIRE content in ' + targetLang.split('(')[0].trim() + ' script' : ''}

Use this EXACT HTML structure and start immediately with the content:

<h1>Your Complete SEO-Optimized Title About ${topic}</h1>

<div style="background:#e0f2fe;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #0284c7;">
<p style="margin:5px 0;"><strong>Meta Description:</strong> Write 150-160 characters with main keyword and call-to-action</p>
<p style="margin:5px 0;"><strong>Keywords:</strong> ${keywords.slice(0,5).join(', ')}</p>
</div>

<h2>Introduction</h2>
<p>Opening paragraph with hook and main keyword "${keywords[0]}".</p>
<p>Paragraph explaining the problem or opportunity.</p>
<p>Paragraph on why this matters to readers.</p>
<p>Paragraph previewing what readers will learn.</p>

<h2>Understanding ${topic}: The Basics</h2>
<p>Define and explain the core concept.</p>
<p>Provide context and background.</p>
<p>Include examples or statistics.</p>
<p>Explain importance and relevance.</p>

<h3>Key Components</h3>
<p>Detail important elements.</p>
<p>Provide specific examples.</p>

<h2>Benefits and Advantages</h2>
<p>Main benefit with supporting details.</p>
<p>Secondary benefits.</p>
<p>Real-world applications.</p>
<p>Long-term value.</p>

<h2>Step-by-Step Implementation Guide</h2>
<p>Introduction to the process.</p>
<p>Step 1 with detailed explanation.</p>
<p>Step 2 with detailed explanation.</p>
<p>Step 3 with detailed explanation.</p>

<h3>Best Practices</h3>
<p>Expert tips and recommendations.</p>
<p>Common mistakes to avoid.</p>

<h2>Advanced Strategies and Techniques</h2>
<p>Advanced concept 1.</p>
<p>Advanced concept 2.</p>
<p>Pro tips for optimization.</p>
<p>Expert-level insights.</p>

<h2>Common Challenges and Solutions</h2>
<p>Challenge 1 and how to overcome it.</p>
<p>Challenge 2 with practical solutions.</p>
<p>Challenge 3 and expert advice.</p>

<h2>Tools and Resources</h2>
<p>Essential tools overview.</p>
<p>Recommended platforms or software.</p>
<p>Free vs paid options.</p>

<h2>Case Studies and Real-World Examples</h2>
<p>Example 1 with results.</p>
<p>Example 2 with analysis.</p>
<p>Lessons learned.</p>
<p>Key takeaways from examples.</p>

<h2>Future Trends and Predictions</h2>
<p>Emerging trends in ${topic}.</p>
<p>Expert predictions.</p>
<p>How to prepare for changes.</p>

<h2>Key Takeaways</h2>
<ul>
<li>Main insight about ${keywords[0]}</li>
<li>Important principle to remember</li>
<li>Critical success factor</li>
<li>Best practice recommendation</li>
<li>Common mistake to avoid</li>
<li>Future consideration</li>
<li>Action item for readers</li>
</ul>

<h2>Conclusion</h2>
<p>Summarize the main points covered.</p>
<p>Reinforce the value and importance of ${keywords[0]}.</p>
<p>Provide actionable next steps.</p>
<p>Strong call-to-action encouraging implementation.</p>

<h2>Frequently Asked Questions</h2>

<h3>What is the best way to start with ${keywords[0]}?</h3>
<p>Comprehensive answer with practical steps and recommendations. Include specific details and actionable advice.</p>

<h3>How long does it take to see results with ${topic}?</h3>
<p>Realistic timeline with factors that influence results. Provide specific examples and expectations.</p>

<h3>What are the main benefits of ${topic}?</h3>
<p>Detailed explanation of primary benefits with supporting examples and data.</p>

<h3>What common mistakes should I avoid?</h3>
<p>List and explain critical errors with guidance on how to prevent them.</p>

<h3>Do I need special tools or resources for ${topic}?</h3>
<p>Explain requirements with recommendations for different budgets and skill levels.</p>

<h3>Is ${topic} suitable for beginners?</h3>
<p>Address accessibility with guidance for different experience levels and learning paths.</p>

<h3>How can I measure success with ${keywords[0]}?</h3>
<p>Define metrics and KPIs with practical measurement strategies and benchmarks.</p>

CRITICAL REQUIREMENTS:
1. Start immediately with <h1> tag (no markdown, no preamble)
2. Write 2500+ words of high-quality, original content
3. Include all sections as shown above
4. Use HTML tags exactly as specified
5. Integrate keywords naturally throughout
6. Make each paragraph 3-5 sentences minimum
7. Provide specific, actionable information
8. NO code blocks, NO markdown formatting
${language !== 'english' ? '9. Write EVERYTHING in ' + targetLang.split('(')[0].trim() + ' script (except HTML tags)' : ''}

Begin writing now:`;
    
    let text = await callGroqAI({ prompt, language, maxTokens: 8192 });
    
    // Clean up any markdown artifacts
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Ensure it starts with <h1>
    if (!text.startsWith('<h1>')) {
      text = `<h1>${topic} - Complete Guide</h1>\n\n` + text;
    }
    
    console.log(`✅ Generated ${text.length} characters of content for "${topic}" in ${targetLang}`);
    res.json({ content: [{ text }] });
  } catch (err) {
    console.error('Error generating content:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasGroq = !!process.env.GROQ_API_KEY;
  res.json({ 
    status: 'ok', 
    groq: hasGroq ? 'configured' : 'missing',
    message: hasGroq ? 'Server ready' : 'GROQ_API_KEY not found in .env'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 AI SEO Content Studio Server');
  console.log('========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔑 Groq API: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log('========================================');
  if (!process.env.GROQ_API_KEY) {
    console.log('⚠️  WARNING: GROQ_API_KEY not found!');
    console.log('📝 Create a .env file with: GROQ_API_KEY=your_key_here');
    console.log('========================================');
  }
});