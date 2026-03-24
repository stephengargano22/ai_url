import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from 'openai';
import cors from 'cors';

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.json());

// ⚠️ IMPORTANT: Use StackBlitz env system
const openai = new OpenAI({
  apiKey: "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"
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
    const prompt = `
Extract filters from the user query and return ONLY JSON.
Schema:
{
  "member_status": "active | lapsed | null",
  "state": "VIC | NSW | QLD | null",
  "join_date_from": "YYYY-MM-DD | null",
  "join_date_to": "YYYY-MM-DD | null"
}
User query: "${userInput}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    let jsonString = response.choices[0].message.content;

// Remove markdown code blocks if present
jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    const filters = JSON.parse(jsonString);

    const baseUrl = 'https://yourimis.org/iqa?';
    const params = new URLSearchParams();

    if (filters.member_status) params.append('status', filters.member_status);
    if (filters.state) params.append('state', filters.state);
    if (filters.join_date_from) params.append('joinDateFrom', filters.join_date_from);
    if (filters.join_date_to) params.append('joinDateTo', filters.join_date_to);

    res.json({ url: baseUrl + params.toString() });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

app.listen(3000, () => console.log('Server running'));
