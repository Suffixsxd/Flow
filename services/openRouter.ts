import { NoteStyle, Flashcard } from '../types';

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

const makeRequest = async (system: string, user: string, model: string = MODEL) => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Flow Notes"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        extra_body: { reasoning: { enabled: true } }
      })
    });

    if (!response.ok) {
        const t = await response.text();
        console.error("API Error", t);
        throw new Error(`OpenRouter API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");
    return content;
};

export const curateNote = async (transcript: string, style: NoteStyle, previousContext?: string): Promise<string> => {
  if (!transcript.trim()) return previousContext || "";
  try {
    return await makeRequest(
        getSystemPrompt(style),
        `TASK: Update the notes based on the full transcript below.\n\nEXISTING NOTES:\n${previousContext || "(None)"}\n\nFULL TRANSCRIPT:\n"${transcript}"\n\nINSTRUCTIONS:\n- Output ONLY the formatted Markdown.\n- Do not include conversational filler.`
    );
  } catch (error) {
    console.error("Failed to curate note:", error);
    return previousContext || transcript; 
  }
};

export const refineNote = async (currentContent: string, instructions: string): Promise<string> => {
  try {
    return await makeRequest(
        "You are an expert editor. Modify the provided notes according to the user's instructions. Keep the Markdown formatting.",
        `CURRENT NOTES:\n${currentContent}\n\nUSER INSTRUCTIONS:\n"${instructions}"\n\nOUTPUT:\nReturn the updated Markdown notes only.`
    );
  } catch (error) {
    console.error("Failed to refine note:", error);
    return currentContent;
  }
};

export const generateMindMap = async (content: string): Promise<string> => {
    try {
        const raw = await makeRequest(
            "You are a data visualization expert. Create a detailed educational mermaid.js graph.",
            `NOTES:\n${content}\n\nINSTRUCTIONS:\n- Create a 'graph TB' (Top-to-Bottom) flowchart.\n- STRUCTURE:\n  1. Root Node: The Main Topic.\n  2. Branches: Major Headings.\n  3. Leaves: EDUCATIONAL CONCEPTS. Go into detail. Instead of just keywords, include short definitions, facts, or nuances.\n- CONTENT: Nodes should be informative for learning (e.g., [Mitosis: Process of cell division]).\n- SYNTAX RULES:\n  1. Use unique alphanumeric IDs (e.g. A1, B2).\n  2. ALWAYS use square brackets for node text: id[Label]. DO NOT use parentheses () or circle nodes.\n  3. NO double quotes (") inside text.\n  4. Do NOT include style/classDefs.\n- Output ONLY the mermaid code.`
        );
        
        // Clean up markdown code blocks if present
        let cleaned = raw.replace(/```mermaid/g, '').replace(/```graph/g, '').replace(/```/g, '').trim();
        
        // Remove any existing graph declaration to ensure we can strictly set it
        cleaned = cleaned.replace(/^graph (LR|TD|TB|BT|RL).*/gm, '').trim();
        
        // Remove any existing classDef to prevent conflicts
        cleaned = cleaned.replace(/^classDef.*/gm, '').trim();
        
        // Remove lines that don't look like connections or nodes (cleanup hallucinations)
        cleaned = cleaned.split('\n').filter(line => line.includes('-->') || line.includes('[') || line.trim() === '').join('\n');
        
        // Global sanitize: replace double quotes with single quotes to prevent syntax errors
        cleaned = cleaned.replace(/"/g, "'");

        // Aggressive sanitize: Remove parentheses to prevent 'got PS' errors in Mermaid
        // This replaces '(' and ')' with empty strings or benign characters
        cleaned = cleaned.replace(/\(/g, ' - ').replace(/\)/g, '');

        // Prepend valid header and custom style for the "vertical, detailed" look
        // We use rx:5 for a more card-like rectangular look suitable for text
        const style = "classDef default fill:#1a1a1a,stroke:#444,stroke-width:1px,color:#fff,rx:5,ry:5,font-family:Inter,padding:12px,line-height:1.4;";
        
        cleaned = `graph TB\n${style}\n${cleaned}`;
        
        return cleaned;
    } catch (error) {
        console.error("Failed to generate mind map:", error);
        throw error;
    }
};

export const generateFlashcards = async (content: string): Promise<Flashcard[]> => {
    try {
        const raw = await makeRequest(
            "You are a study expert. Create 5-10 key flashcards from the notes. Return a JSON array.",
            `NOTES:\n${content}\n\nINSTRUCTIONS:\n- Output strictly a JSON array of objects with 'id' (random string), 'front' (question), and 'back' (answer) properties.\n- No markdown formatting in the output, just raw JSON string.`
        );
        // Clean up potential markdown wrappers
        const jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Failed to generate flashcards:", error);
        throw error;
    }
};