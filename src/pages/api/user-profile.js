import { authErrorResponse, requireAuthUser } from "../../lib/authUser";
import { getUserProfile, saveUserProfile } from "../../lib/userStore";

export default async function handler(req, res) {
    try {
        const user = await requireAuthUser();

        if (req.method === "GET") {
            const profile = await getUserProfile(user.id, user);
            return res.status(200).json({ profile, user });
        }

        if (req.method === "POST") {
            const profile = await saveUserProfile(user.id, {
                displayName: req.body.displayName || "",
                background: req.body.background || "",
                experiences: req.body.experiences || "",
                projects: req.body.projects || "",
                targetRole: req.body.targetRole || "",
                extraNotes: req.body.extraNotes || ""
            }, user);

            return res.status(200).json({ profile, user });
        }

        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        if (error.statusCode) {
            return authErrorResponse(error, res);
        }

        return res.status(500).json({ error: error.message || "Unable to load profile." });
    }
}
