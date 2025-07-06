import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";

export const getAllContacts = async (search, page, limit, tag) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const token = await getIdToken(currentUser);

    const queries = [];
    if (search) queries.push(`search=${encodeURIComponent(search)}`);
    if (page) queries.push(`page=${page}`);
    if (limit) queries.push(`limit=${limit}`);
    if (tag) queries.push(`tags=${encodeURIComponent(tag)}`); // match your backend

    const queryString = queries.length > 0 ? `?${queries.join("&")}` : "";

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/contacts${queryString}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      return { contacts: [], success: false, message: "No contacts found" };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching contacts:", err);
    throw err;
  }
};

export const getcountofcontacts = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    const token = await getIdToken(currentUser);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/contacts/count`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      return { contacts: [], success: false, message: "No contacts found" };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error fetching count contacts:", err);
    throw err;
  }
};
