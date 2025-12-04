import { NoteStyle } from '../types';

const MODEL = "openai/gpt-oss-20b:free";
const API_KEY = "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";

const getSystemPrompt = (style: NoteStyle): string => {
  switch (style) {
    case 'academic':
      return "You are an academic research assistant. Format the provided transcript into structured notes with clear headers (##), bullet points, and a brief summary. Maintain a formal, objective tone.";
    case 'creative':
      return "You are a creative writer. Transform the provided transcript into a flowing, engaging narrative or prose. Capture the mood, essence, and emotion of the speaker.";
    case 'meeting':
      return "You are a professional secretary. Extract clear Action Items (with checkboxes [ ]), Key Decisions, and a list of Attendees from the transcript. Keep it concise.";
    case 'default':
    default:
      return "You are an expert note-taker. Organize the provided transcript into a clean, hierarchical structure using Markdown headers (##), bullet points, and bold text for emphasis. Use appropriate emojis to categorize sections visually.";
  }
};

export const curateNote = async (transcript: string, style: NoteStyle, previousContext?: string): Promise<string> => {
  if (!transcript.trim()) return previousContext || "";
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Flow Notes"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(style)
          },
          {
            role: "user",
            content: `TASK: Update the notes based on the full transcript below.\n\nEXISTING NOTES:\n${previousContext || "(None)"}\n\nFULL TRANSCRIPT:\n"${transcript}"\n\nINSTRUCTIONS:\n- Output ONLY the formatted Markdown.\n- Do not include conversational filler ("Here are your notes").\n- Merge the new transcript information naturally into the existing structure.`
          }
        ],
        extra_body: {
          reasoning: {
            enabled: true
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`OpenRouter API Error (${response.status}):`, errText);
      throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("Empty response from AI");

    return content;

  } catch (error) {
    console.error("Failed to curate note:", error);
    return previousContext || transcript; 
  }
};