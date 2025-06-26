import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";

export const getActivityLogs = async () => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("User not authenticated");
        }

        const token = await getIdToken(currentUser);

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}activities`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            credentials: "include",
        });

        if (!res.ok) {
            return [];
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching activities:", err);
        return [];
    }
}; 