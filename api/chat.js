export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, userId, sessionId, title } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
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

    // Save to Supabase if userId provided
    if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      try {
        const allMessages = [...messages, { role: 'assistant', content: reply }];
        const sessionTitle = title || (messages[0]?.content?.slice(0, 50) || 'New chat');

        if (sessionId) {
          // Update existing conversation
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/conversations?id=eq.${sessionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              messages: allMessages,
              updated_at: new Date().toISOString()
            })
          });
        } else {
          // Create new conversation
          const createRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/conversations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              user_id: userId,
              title: sessionTitle,
              messages: allMessages,
              updated_at: new Date().toISOString()
            })
          });
          const created = await createRes.json();
          return res.status(200).json({ reply, sessionId: created[0]?.id });
        }
      } catch (dbError) {
        console.error('Supabase error:', dbError);
        // Don't fail the request if DB save fails
      }
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
