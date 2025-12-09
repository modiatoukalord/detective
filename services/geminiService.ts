import { GoogleGenAI } from "@google/genai";
import { Card } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateCaseIntro = async (cards: Card[]): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Une nuit sombre, un cri silencieux. L'enquête commence maintenant.";

  try {
    const suspect = cards.find(c => c.type === 'SUSPECT')?.name;
    const location = cards.find(c => c.type === 'LOCATION')?.name;
    const weapon = cards.find(c => c.type === 'WEAPON')?.name;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a very short, cryptic, noir-style introduction in French (max 2 sentences) for a detective case involving a ${weapon} found at the ${location}. Do not reveal the suspect. Keep it atmospheric.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Une nuit sombre, un cri silencieux. L'enquête commence maintenant.";
  }
};

export const generateHint = async (
    playerHand: Card[],
    knownCleared: Card[],
    lastMove: string
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Consultez attentivement votre carnet.";

  try {
    const handNames = playerHand.map(c => c.name).join(', ');
    const clearedNames = knownCleared.map(c => c.name).join(', ');

    const prompt = `
      You are a veteran detective assistant in a card game (like Clue). Answer in French.
      The player holds: ${handNames}.
      The player knows these cards are innocent (cleared): ${clearedNames}.
      The last event was: ${lastMove}.
      
      Give a short, helpful, but slightly cryptic hint in French about what they should do next (e.g., "Tu n'as pas assez vérifié les lieux" or "Concentre-toi sur les armes"). Max 1 sentence.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    return "Relisez vos indices, détective.";
  }
};

export const generateConclusion = async (
  won: boolean,
  solution: Card[]
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return won ? "Affaire classée ! Vous avez trouvé la vérité !" : "Le coupable s'est échappé...";

  try {
    const suspect = solution.find(c => c.type === 'SUSPECT')?.name;
    const location = solution.find(c => c.type === 'LOCATION')?.name;
    const weapon = solution.find(c => c.type === 'WEAPON')?.name;

    const prompt = won
      ? `Write a triumphant, 2-sentence noir outro in French for solving the case. The culprit was ${suspect} at ${location} with a ${weapon}.`
      : `Write a gloomy, 2-sentence noir outro in French for failing to solve the case. The real culprit was ${suspect} at ${location} with a ${weapon}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    return won ? "Excellente déduction ! La vérité triomphe." : "Le mystère reste entier.";
  }
};