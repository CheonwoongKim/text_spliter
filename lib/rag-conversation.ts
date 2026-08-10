/**
 * Conversation context for multi-turn RAG tests.
 *
 * A follow-up question is usually not self-contained ("what about the second
 * one?"), so retrieval that only sees the latest question fails for reasons
 * that have nothing to do with the index or the chunking. Carrying prior turns
 * lets the workbench separate those causes.
 *
 * Prior turns are conversation state, not evidence. They are never presented to
 * the model as retrieved document context, and they never override a
 * source-grounded fact.
 */

export const MAX_CONTEXT_TURNS = 6;
export const MAX_TURN_CHARACTERS = 1500;
export const RETRIEVAL_QUERY_MAX_LENGTH = 8000;

export interface ConversationTurn {
  question: string;
  answer: string;
}

function trimTurn(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.length > MAX_TURN_CHARACTERS
    ? `${normalized.slice(0, MAX_TURN_CHARACTERS)}…`
    : normalized;
}

/**
 * Normalize client-supplied history. Only the most recent turns are kept so a
 * long conversation cannot crowd out the retrieved evidence.
 */
export function normalizeConversationTurns(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const record = entry && typeof entry === "object" ? entry as Record<string, unknown> : null;
      return {
        question: trimTurn(record?.question),
        answer: trimTurn(record?.answer),
      };
    })
    .filter((turn) => turn.question && turn.answer)
    .slice(-MAX_CONTEXT_TURNS);
}

/**
 * Build the text used for retrieval. Prior turns are prepended so pronouns and
 * ellipsis resolve, but the current question stays last and therefore dominant.
 */
export function buildRetrievalQuery(
  question: string,
  turns: ConversationTurn[],
): string {
  if (turns.length === 0) return question;

  const context = turns
    .map((turn) => `${turn.question} ${turn.answer}`)
    .join("\n");

  const combined = `${context}\n${question}`;
  return combined.length > RETRIEVAL_QUERY_MAX_LENGTH
    ? combined.slice(combined.length - RETRIEVAL_QUERY_MAX_LENGTH)
    : combined;
}

/**
 * Render prior turns for the answer prompt, labelled as conversation so the
 * model cannot mistake them for retrieved document evidence.
 */
export function renderConversationContext(turns: ConversationTurn[]): string {
  if (turns.length === 0) return "";

  const lines = turns.flatMap((turn, index) => [
    `Turn ${index + 1} question: ${turn.question}`,
    `Turn ${index + 1} answer: ${turn.answer}`,
  ]);

  return [
    "Earlier turns of this conversation, for resolving references only.",
    "This is not document evidence and must never be cited as a source.",
    ...lines,
  ].join("\n");
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function nextTurnIndex(value: unknown): number {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : 0;
}
