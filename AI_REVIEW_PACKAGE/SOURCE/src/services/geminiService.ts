import { GeminiParsedData, Project } from '../types';

export async function parseBrainDumpWithGemini(
  transcriptText: string,
  apiKey: string,
  model = 'gemini-3.8-flash',
  existingProjects: Project[] = []
): Promise<GeminiParsedData> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is not configured. Please enter your Google AI Studio API key in Settings.');
  }

  // Model cascade: If the primary model spikes with 503 (high demand), auto-try fallbacks
  const primary = (!model || model.includes('2.5')) ? 'gemini-3.8-flash' : model;
  const modelsToTry = [
    primary,
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
  ].filter((m, i, arr) => arr.indexOf(m) === i);

  const existingProjectNames = existingProjects.map(p => `"${p.name}"`).join(', ');

  const systemInstruction = `
You are Momentum's ADHD-optimized extraction engine. 
The user has ADD and dumps unstructured voice notes or quick thoughts across multiple domains.
Your goal is to parse their brain dump into 4 fundamental buckets without cognitive overhead:

1. "quick_jobs" (Tasks): Independent, bite-sized tasks completed in one sitting (e.g., "Call electrician", "Order parts").
   - Explicit trigger keywords: "Task: ...", "[1m]", "[5m]", "[15m]". Timing tags [1m], [5m], [15m] may appear anywhere, including at the end of the entry (e.g., "Task: Call dentist [5m]"). Strip the timing tag from the title and place it in the "duration" field.
2. "responsibilities" (Jobs): Multi-step obligations with an end state. Identify the overarching job and extract the single immediate "next_action" step.
   - Explicit trigger keywords: "Job: ...", "Bigger Job: ...", "Resp: ...", "Responsibility: ...", "Bigger: ...".
3. "project_updates": Ongoing creative or long-term projects. Check if the thought matches or updates an existing project (${existingProjectNames || 'None specified yet'}) or creates/updates a project. Extract project_name, the concise update_note ("where I am"), and the immediate new_next_step.
   - Explicit trigger keyword: "Project: ...".
4. "habits": Habits or daily rhythms (e.g. Bedtime, workout/stretching, water, reading, push-ups). Record true/false or numeric value (e.g. minutes or reps).
   - Explicit trigger keyword: "Habit: ...".

Current Date Context: ${new Date().toISOString().split('T')[0]}

Schema:
Return pure JSON matching this exact structure:
{
  "quick_jobs": [{"title": "string", "due": "string or null", "duration": "1m or 5m or 15m or null"}],
  "responsibilities": [{"title": "string", "next_action": "string", "due": "string or null"}],
  "project_updates": [{"project_name": "string", "update_note": "string", "new_next_step": "string or null"}],
  "habits": [{"name": "string", "value": "boolean or number"}]
}
If a category has no matching items in the user's input, return an empty array for that category.
`;

  let lastErrorMsg = '';

  for (const currentModel of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;

    const is38 = currentModel.includes('3.8');

    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: `Brain dump input:\n"""\n${transcriptText}\n"""`
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    };

    if (is38) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingLevel: "low",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMsg = errorText;
        try {
          const errJson = JSON.parse(errorText);
          parsedMsg = errJson.error?.message || errorText;
        } catch {}

        // If 503 (high demand) or 429, try the next fallback model!
        if (response.status === 503 || response.status === 429) {
          console.warn(`Model ${currentModel} returned ${response.status}. Trying next fallback model...`);
          lastErrorMsg = parsedMsg;
          continue;
        }

        throw new Error(`Gemini API error (${response.status}): ${parsedMsg}`);
      }

      const json = await response.json();
      const candidateParts = json.candidates?.[0]?.content?.parts || [];
      const nonThoughtParts = candidateParts.filter((p: any) => !p.thought);
      const rawText =
        nonThoughtParts.map((p: any) => p.text).join('').trim() ||
        candidateParts[candidateParts.length - 1]?.text ||
        '';

      if (!rawText) {
        continue;
      }

      const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleanedText) as GeminiParsedData;
      return {
        quick_jobs: parsed.quick_jobs || [],
        responsibilities: parsed.responsibilities || [],
        project_updates: parsed.project_updates || [],
        habits: parsed.habits || [],
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`Model ${currentModel} timed out. Trying fallback...`);
        lastErrorMsg = 'Request timed out';
        continue;
      }
      // If network error, try next model
      lastErrorMsg = err.message || 'Unknown network error';
    }
  }

  throw new Error(`Gemini servers are currently experiencing high demand. ${lastErrorMsg}`);
}
