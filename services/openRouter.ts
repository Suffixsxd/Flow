import { NoteStyle } from '../types';

const API_KEY = "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";
const MODEL = "openai/gpt-oss-20b:free";

const getSystemPrompt = (style: NoteStyle): string => {
  switch (style) {
    case 'academic':
      return "You are an academic research assistant. Format the following transcript into structured notes with headers, bullet points, and a summary. maintain a formal tone.";
    case 'creative':
      return "You are a creative writer. Turn the following transcript into a flowing narrative or prose. Capture the essence and emotion.";
    case 'meeting':
      return "You are a secretary. Extract action items, key decisions, and attendees from the transcript. Use check boxes for tasks.";
    case 'default':
    default:
      return "You are an expert note taker. Format the following transcript into clean bullet points with appropriate emojis to categorize sections. Keep it structured and easy to read.";
  }
};

export const curateNote = async (transcript: string, style: NoteStyle, previousContext?: string): Promise<string> => {
  if (!transcript.trim()) return "";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin, // Required by OpenRouter
        "X-Title": "Aura Notes App"
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
            content: `Here is the current transcript segment:\n\n"${transcript}"\n\n${previousContext ? `Previous context:\n${previousContext}` : ''}\n\nUpdate the notes based on this new information.`
          }
        ],
        extra_body: {
          reasoning: { enabled: true }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";

  } catch (error) {
    console.error("Failed to curate note:", error);
    return transcript; // Fallback to raw text
  }
};