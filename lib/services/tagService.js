import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";

export const getAlltags = async (search, page, limit, tag) => {
  const currentUser = auth.currentUser;
  const token = await getIdToken(currentUser);
  try {
    let queries = "";

    if (search) {
      queries += search;
    }
    if (page) {
      queries += `&page=${page}`;
    }
    if (limit) {
      queries += `&limit=${limit}`;
    }
    if (tag) {
      queries += `&tag=${tag}`;
    }
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tags${queries}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export async function getTagUsageCounts(token) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tags/usage-counts`,
    {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    }
  );
  return res.json();
}
