import { getUserProfile, saveUserProfile } from "../../lib/userStore";

function getUserId(req) {
    return req.headers["x-user-id"] || req.query.userId || req.body?.userId;
}

export default async function handler(req, res) {
    try {
        const userId = getUserId(req);

        if (!userId) {
            return res.status(400).json({ error: "Missing user id." });
        }

        if (req.method === "GET") {
            const profile = await getUserProfile(userId);
            return res.status(200).json({ profile });
        }

        if (req.method === "POST") {
            const profile = await saveUserProfile(userId, {
                displayName: req.body.displayName || "",
                background: req.body.background || "",
                experiences: req.body.experiences || "",
                projects: req.body.projects || "",
                targetRole: req.body.targetRole || "",
                extraNotes: req.body.extraNotes || ""
            });

            return res.status(200).json({ profile });
        }

        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        return res.status(500).json({ error: error.message || "Unable to load profile." });
    }
}
