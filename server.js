const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const hasGroq = !!process.env.GROQ_API_KEY;
const hasGemini = !!process.env.GEMINI_API_KEY;

async function callAI({ provider = 'auto', prompt, language = 'english', maxTokens = 8192 }) {
  if (provider === 'auto') provider = hasGroq ? 'groq' : 'gemini';

  if (provider === 'gemini' && gemini) {
    try {
      const model = gemini.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (hasGroq) return callAI({ provider: 'groq', prompt, language, maxTokens });
      throw err;
    }
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

app.post('/api/generate-keywords', async (req, res) => {
  try {
    const { topic, language = 'english' } = req.body;
    const langMap = {
      hindi: 'हिन्दी', bengali: 'বাংলা', tamil: 'தமிழ்', telugu: 'తెలుగు', marathi: 'मराठी'
    };
    
    const prompt = `Generate 30 SEO keywords for "${topic}" in ${langMap[language] || 'English'}. Use native script. Return ONLY JSON array: [{"keyword":"text", "volume":10000, "ranking":"high"}]`;
    
    const text = await callAI({ prompt, language });
    const clean = text.replace(/```json|```/g, '').trim();
    const keywords = JSON.parse(clean.match(/\[[\s\S]*\]/)?.[0] || clean);
    res.json({ content: [{ text: JSON.stringify(keywords) }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-outline', async (req, res) => {
  try {
    const { topic, keywords, language = 'english' } = req.body;
    const prompt = `Create blog outline for "${topic}". Keywords: ${keywords.join(', ')}. Include: title, meta, intro, 8 sections, FAQs, conclusion.`;
    const text = await callAI({ prompt, language, maxTokens: 4000 });
    res.json({ content: [{ text }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-content', async (req, res) => {
  try {
    const { topic, keywords, language = 'english' } = req.body;
    
    const prompt = `Write a complete 2500-word SEO blog post about "${topic}".

Keywords: ${keywords.join(', ')}

Write in ${language}. Start immediately with the title and content. Use this EXACT format:

<h1>Your Complete SEO Title About ${topic}</h1>

<div style="background:#e0f2fe;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #0284c7;">
<p style="margin:5px 0;"><strong>Meta Description:</strong> Write 150-160 characters here with keyword and call-to-action</p>
<p style="margin:5px 0;"><strong>Keywords:</strong> ${keywords.slice(0,5).join(', ')}</p>
</div>

<h2>Introduction</h2>
<p>First paragraph introducing ${topic} with a hook.</p>
<p>Second paragraph explaining the problem and mentioning ${keywords[0]}.</p>
<p>Third paragraph on why this matters.</p>
<p>Fourth paragraph on what readers will learn.</p>

<h2>First Main Topic About ${topic}</h2>
<p>Paragraph explaining this aspect.</p>
<p>Paragraph with examples and details.</p>
<p>Paragraph with insights.</p>
<p>Paragraph with benefits.</p>

<h3>Important Subtopic</h3>
<p>Detailed paragraph about this subtopic.</p>
<p>More details and examples.</p>

<h2>Second Main Topic</h2>
<p>Four paragraphs of content here.</p>

<h2>Third Main Topic</h2>
<p>Four paragraphs here.</p>

<h2>Fourth Main Topic</h2>
<p>Three to four paragraphs.</p>

<h2>Fifth Main Topic</h2>
<p>Three to four paragraphs.</p>

<h2>Sixth Main Topic</h2>
<p>Three to four paragraphs.</p>

<h2>Seventh Main Topic</h2>
<p>Three to four paragraphs.</p>

<h2>Eighth Main Topic</h2>
<p>Three to four paragraphs about tools or future trends.</p>

<h2>Key Takeaways</h2>
<ul>
<li>First key takeaway sentence</li>
<li>Second key takeaway sentence</li>
<li>Third key takeaway sentence</li>
<li>Fourth key takeaway sentence</li>
<li>Fifth key takeaway sentence</li>
<li>Sixth key takeaway sentence</li>
<li>Seventh key takeaway sentence</li>
</ul>

<h2>Conclusion</h2>
<p>Paragraph summarizing main points.</p>
<p>Paragraph on value with ${keywords[0]}.</p>
<p>Paragraph on action steps.</p>
<p>Paragraph with strong CTA.</p>

<h2>Frequently Asked Questions</h2>

<h3>What is the best approach to ${keywords[0]}?</h3>
<p>Answer in 3-4 sentences with practical information.</p>

<h3>How can I get started with ${topic}?</h3>
<p>Answer in 3-4 sentences.</p>

<h3>What are the main benefits?</h3>
<p>Answer in 3-4 sentences.</p>

<h3>What challenges should I expect?</h3>
<p>Answer in 3-4 sentences.</p>

<h3>How long does it take to see results?</h3>
<p>Answer in 3-4 sentences.</p>

<h3>What tools or resources do I need?</h3>
<p>Answer in 3-4 sentences.</p>

<h3>Is this suitable for beginners?</h3>
<p>Answer in 3-4 sentences.</p>

Write the COMPLETE blog following this structure. Replace example text with REAL content about ${topic}. Start with <h1> tag immediately:`;

    let text = await callAI({ prompt, language, maxTokens: 8192 });
    
    // Clean up any markdown artifacts
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Ensure it starts with <h1>
    if (!text.startsWith('<h1>')) {
      text = '<h1>' + topic + ' - Complete Guide</h1>\n\n' + text;
    }
    
    console.log(`✅ Generated content (${text.length} chars)`);
    res.json({ content: [{ text }] });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('========================================');
  console.log('🚀 Server running on port', process.env.PORT || 3000);
  console.log('Groq:', hasGroq ? '✅' : '❌');
  console.log('Gemini:', hasGemini ? '✅' : '❌');
  console.log('========================================');
});