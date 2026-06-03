import { getUser } from "@netlify/identity";

export async function requireAuthUser() {
    const user = await getUser();

    if (!user) {
        const error = new Error("Please log in to continue.");
        error.statusCode = 401;
        throw error;
    }

    return {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.email || ""
    };
}

export function authErrorResponse(error, res) {
    return res.status(error.statusCode || 500).json({
        error: error.message || "Authentication failed."
    });
}
