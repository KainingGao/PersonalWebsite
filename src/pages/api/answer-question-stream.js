import { authErrorResponse, requireAuthUser } from "../../lib/authUser";
import { getUserProfile, spendBalanceMinutes } from "../../lib/userStore";

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

function writeEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function transcribeAudio({ audioBase64, mimeType }) {
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType || "audio/webm" });

    form.append("file", blob, `question.${getExtension(mimeType)}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("response_format", "json");

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

    return JSON.parse(text).text || "";
}

function getAnswerPrompt({ transcript, situation, notes, history }) {
    return JSON.stringify(
        {
            candidateSituation: situation,
            candidateNotes: notes,
            recentContext: history,
            markedQuestionTranscript: transcript
        },
        null,
        2
    );
}

async function streamAnswer({ res, transcript, situation, notes, history }) {
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-5.4-mini",
            stream: true,
            input: [
                {
                    role: "system",
                    content: [
                        {
                            type: "input_text",
                            text: `You are a quiet interview copilot. The user manually tapped a button at the exact moment the interviewer finished a question. Answer the marked question quickly in the candidate's first-person voice.

Keep it concise, specific, and natural to say aloud. Use the candidate profile and recent context, but do not invent facts. If context is missing, give a flexible answer frame. Return only the answer text.`
                        }
                    ]
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: getAnswerPrompt({ transcript, situation, notes, history })
                        }
                    ]
                }
            ],
            reasoning: { effort: "low" }
        })
    });

    if (!response.ok) {
        throw new Error(`Answer stream failed: ${await response.text()}`);
    }

    const decoder = new TextDecoder();
    let buffer = "";

    for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
            const dataLine = eventBlock
                .split("\n")
                .find((line) => line.startsWith("data: "));

            if (!dataLine) {
                continue;
            }

            const payload = dataLine.slice(6);

            if (payload === "[DONE]") {
                continue;
            }

            const event = JSON.parse(payload);

            if (event.type === "response.output_text.delta" && event.delta) {
                writeEvent(res, "delta", { text: event.delta });
            }
        }
    }
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

    try {
        const user = await requireAuthUser();
        const {
            audioBase64,
            mimeType,
            situation = "",
            notes = "",
            history = [],
            durationSeconds = 0
        } = req.body || {};

        if (!audioBase64) {
            return res.status(400).json({ error: "Missing audioBase64." });
        }

        let profile = await getUserProfile(user.id, user);

        if (profile.balanceMinutes <= 0) {
            return res.status(402).json({
                error: "Your interview balance is empty. Add minutes from the dashboard.",
                profile
            });
        }

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive"
        });

        const transcript = await transcribeAudio({ audioBase64, mimeType });

        if (durationSeconds > 0) {
            const spend = await spendBalanceMinutes(user.id, Number(durationSeconds) / 60, user);
            profile = spend.profile;
            writeEvent(res, "profile", { profile });
        }

        writeEvent(res, "question", { transcript });

        if (!transcript.trim()) {
            writeEvent(res, "error", { error: "No speech was detected in the marked question." });
            res.end();
            return;
        }

        await streamAnswer({
            res,
            transcript,
            situation,
            notes,
            history: Array.isArray(history) ? history : []
        });

        writeEvent(res, "done", { transcript });
        res.end();
    } catch (error) {
        if (error.statusCode) {
            return authErrorResponse(error, res);
        }

        if (!res.headersSent) {
            return res.status(500).json({ error: error.message || "Unable to answer question." });
        }

        writeEvent(res, "error", { error: error.message || "Unable to answer question." });
        res.end();
    }
}
