import { authErrorResponse, requireAuthUser } from "../../lib/authUser";
import { addBalanceMinutes, getUserProfile } from "../../lib/userStore";

export default async function handler(req, res) {
    try {
        const user = await requireAuthUser();

        if (req.method === "GET") {
            const profile = await getUserProfile(user.id, user);
            return res.status(200).json({ profile, user });
        }

        if (req.method === "POST") {
            const minutes = Number(req.body.minutes || 15);
            const profile = await addBalanceMinutes(user.id, minutes, user);
            return res.status(200).json({ profile, user });
        }

        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        if (error.statusCode) {
            return authErrorResponse(error, res);
        }

        return res.status(500).json({ error: error.message || "Unable to update balance." });
    }
}
