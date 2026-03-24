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
  "join_date_to": "YYYY-MM-DD | null",
  "company": "string | null",
  "last_name": "string | null"
}

Rules:
- company = organisation/employer name mentioned
- last_name = surname of a person
- return null if not present

User query: "${userInput}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    let jsonString = response.choices[0].message.content;

    // Clean markdown if present
    jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

    const filters = JSON.parse(jsonString);

    const baseUrl = 'https://uhubemsdev.imiscloud.com/i4u_Sandbox/FirstName.aspx?';
    const params = new URLSearchParams();

    if (filters.member_status) params.append('status', filters.member_status);
    if (filters.state) params.append('state', filters.state);
    if (filters.join_date_from) params.append('joinDateFrom', filters.join_date_from);
    if (filters.join_date_to) params.append('joinDateTo', filters.join_date_to);

    // ✅ NEW FIELDS
    if (filters.company) params.append('Company', filters.company);
    if (filters.last_name) params.append('LastName', filters.last_name);

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
