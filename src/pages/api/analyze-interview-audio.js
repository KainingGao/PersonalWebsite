export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb"
        }
    }
};

const openAiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;

function getExtension(mimeType = "") {
    if (mimeType.includes("mp4")) {
        return "mp4";
    }

    if (mimeType.includes("mpeg")) {
        return "mp3";
    }

    if (mimeType.includes("wav")) {
        return "wav";
    }

    return "webm";
}

function normalizeSegments(segments = []) {
    return segments
        .filter((segment) => segment?.text?.trim())
        .map((segment) => ({
            speaker: segment.speaker || "Speaker",
            text: segment.text.trim(),
            start: typeof segment.start === "number" ? segment.start : null,
            end: typeof segment.end === "number" ? segment.end : null
        }));
}

function getResponseText(response) {
    if (response.output_text) {
        return response.output_text;
    }

    return (response.output || [])
        .flatMap((item) => item.content || [])
        .map((content) => content.text || "")
        .join("")
        .trim();
}

async function transcribeAudio({ audioBase64, mimeType }) {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

    form.append("file", blob, `interview-audio.${getExtension(mimeType)}`);
    form.append("model", "gpt-4o-transcribe-diarize");
    form.append("response_format", "diarized_json");
    form.append("chunking_strategy", "auto");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${openAiKey}`
        },
        body: form
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`Transcription failed: ${text}`);
    }

    return JSON.parse(text);
}

async function decideAndAnswer({
    transcript,
    segments,
    situation,
    notes,
    history,
    questionBuffer
}) {
    const system = `You are a quiet interview practice copilot on the candidate's phone.

Goal:
- Summarize every transcript chunk so future follow-up questions have context.
- Maintain an interviewer-question buffer across chunks.
- Detect whether the newest chunk completes an interviewer question.
- If the candidate is just answering, thinking aloud, greeting, or continuing an answer, do not trigger an answer.
- If the interviewer question is incomplete or still being set up, mark it as partial_question.
- If the interviewer asks a complete question, draft a concise first-person answer the candidate could say.

Rules:
- Use speaker labels when helpful, but do not assume the same label always belongs to the same person across chunks.
- Treat Zara as the interviewer when that name appears.
- Trigger only for a real interview question or clear prompt such as "tell me about..." or "walk me through...".
- Do not answer the candidate's own rhetorical questions.
- Keep the answer truthful to the supplied candidate situation and notes.
- If there is not enough personal context, provide a flexible answer frame instead of inventing details.
- For long questions split across chunks, combine the incoming questionBuffer with the latest transcript.
- Set questionState to:
  - no_question for background, silence artifacts, greetings, or interviewer statements without an ask.
  - partial_question for an interviewer prompt that appears unfinished.
  - complete_question when the interviewer question or prompt is ready to answer.
  - candidate_answering when the candidate is answering or continuing an answer.
- The summary should be short, factual, and useful as future interview context.
- Return JSON only.`;

    const user = JSON.stringify(
        {
            candidateSituation: situation,
            candidateNotes: notes,
            existingQuestionBuffer: questionBuffer,
            recentHistory: history,
            latestTranscript: transcript,
            latestSegments: segments
        },
        null,
        2
    );

    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-5-mini",
            input: [
                {
                    role: "system",
                    content: [{ type: "input_text", text: system }]
                },
                {
                    role: "user",
                    content: [{ type: "input_text", text: user }]
                }
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "interview_helper_decision",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            summary: { type: "string" },
                            questionState: {
                                type: "string",
                                enum: [
                                    "no_question",
                                    "partial_question",
                                    "complete_question",
                                    "candidate_answering"
                                ]
                            },
                            shouldAnswer: { type: "boolean" },
                            question: { type: "string" },
                            questionFragment: { type: "string" },
                            accumulatedQuestion: { type: "string" },
                            answer: { type: "string" },
                            bullets: {
                                type: "array",
                                items: { type: "string" },
                                maxItems: 4
                            },
                            followUp: { type: "string" },
                            reason: { type: "string" }
                        },
                        required: [
                            "summary",
                            "questionState",
                            "shouldAnswer",
                            "question",
                            "questionFragment",
                            "accumulatedQuestion",
                            "answer",
                            "bullets",
                            "followUp",
                            "reason"
                        ]
                    }
                }
            },
            reasoning: { effort: "minimal" }
        })
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Answer generation failed: ${responseText}`);
    }

    const responseJson = JSON.parse(responseText);
    const decisionText = getResponseText(responseJson);

    return JSON.parse(decisionText);
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!openAiKey) {
        return res.status(500).json({
            error: "Missing OPENAI_KEY or OPENAI_API_KEY in the server environment."
        });
    }

    const {
        audioBase64,
        mimeType,
        situation = "",
        notes = "",
        history = [],
        questionBuffer = ""
    } = req.body || {};

    if (!audioBase64) {
        return res.status(400).json({ error: "Missing audioBase64." });
    }

    try {
        const transcription = await transcribeAudio({ audioBase64, mimeType });
        const segments = normalizeSegments(transcription.segments);
        const transcript =
            transcription.text ||
            segments.map((segment) => `${segment.speaker}: ${segment.text}`).join("\n");

        if (!transcript.trim()) {
            return res.status(200).json({
                transcript: "",
                segments: [],
                summary: "No speech was detected.",
                questionState: "no_question",
                shouldAnswer: false,
                question: "",
                questionFragment: "",
                accumulatedQuestion: "",
                answer: "",
                bullets: [],
                followUp: "",
                reason: "No speech was detected."
            });
        }

        const decision = await decideAndAnswer({
            transcript,
            segments,
            situation,
            notes,
            history: Array.isArray(history) ? history : [],
            questionBuffer
        });

        return res.status(200).json({
            transcript,
            segments,
            summary: decision.summary || "",
            questionState: decision.questionState || "no_question",
            shouldAnswer: Boolean(decision.shouldAnswer),
            question: decision.question || "",
            questionFragment: decision.questionFragment || "",
            accumulatedQuestion: decision.accumulatedQuestion || "",
            answer: decision.answer || "",
            bullets: Array.isArray(decision.bullets) ? decision.bullets : [],
            followUp: decision.followUp || "",
            reason: decision.reason || ""
        });
    } catch (error) {
        return res.status(500).json({
            error: error.message || "Unable to analyze audio."
        });
    }
}
