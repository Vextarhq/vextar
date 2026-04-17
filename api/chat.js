export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You are Vextar, an elite AI-powered professional coding assistant. You are precise, efficient, and expert-level.

Your capabilities:
- Generate clean, production-ready code in any language or framework
- Refactor and improve existing code
- Debug and fix errors
- Explain code concepts clearly
- Write documentation and tests
- Review code and suggest improvements

Your style:
- Always provide complete, working code — never truncated snippets
- Add brief comments only when they add real value
- Be direct and concise — no unnecessary filler text
- When generating code, use proper formatting with syntax highlighting markdown
- If the user's request is ambiguous, ask one clarifying question before proceeding

You support all languages: Python, JavaScript, TypeScript, Rust, Go, Swift, Kotlin, Java, C++, Ruby, PHP, and more.`,
        messages: messages
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ error: error.error?.message || 'API error' });
    }

    const data = await response.json();
    const reply = data.content[0].text;

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
