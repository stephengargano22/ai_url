import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from 'openai';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get('/', (req, res) => {
  res.send(`
    <h2>AI URL Generator</h2>
    <input id="input" placeholder="Enter query..." style="width:300px;" />
    <button onclick="send()">Generate</button>
    <pre id="output"></pre>

    <script>
      async function send() {
        const userInput = document.getElementById('input').value;

        const res = await fetch('/generate-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userInput })
        });

        const data = await res.json();
        document.getElementById('output').innerText = JSON.stringify(data, null, 2);
      }
    </script>
  `);
});

app.post('/generate-url', async (req, res) => {
  const { userInput } = req.body;

  try {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `
Today is ${today}.

Extract filters from the user query and return ONLY valid JSON.
Do not use markdown fences.

Schema:
{
  "member_status": "active | lapsed | null",
  "state": "VIC | NSW | QLD | null",
  "join_date_from": "YYYY-MM-DD | null",
  "join_date_to": "YYYY-MM-DD | null",
  "last_name": "string | null",
  "company": "string | null"
}

Rules:
- If a filter is not mentioned, return null.
- "last name is Smith" should return "last_name": "Smith"
- "company is Acme" should return "company": "Acme"
- Return raw JSON only.

User query: "${userInput}"
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    });

    const jsonString = response.choices[0].message.content || '';
    const match = jsonString.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('No JSON found in AI response');
    }

    const filters = JSON.parse(match[0]);

    const baseUrl = 'https://uhubemsdev.imiscloud.com/i4u_Sandbox/FirstName.aspx?';
    const params = new URLSearchParams();

    if (filters.member_status) params.append('status', filters.member_status);
    if (filters.state) params.append('state', filters.state);
    if (filters.join_date_from) params.append('joinDateFrom', filters.join_date_from);
    if (filters.join_date_to) params.append('joinDateTo', filters.join_date_to);
    if (filters.last_name) params.append('LastName', filters.last_name);
    if (filters.company) params.append('Company', filters.company);

    res.json({ url: baseUrl + params.toString() });
  } catch (err) {
    console.error('FULL ERROR:', err);

    res.status(500).json({
      error: err?.message || 'Failed to generate URL',
      type: err?.type || null,
      code: err?.code || null,
      status: err?.status || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running'));
