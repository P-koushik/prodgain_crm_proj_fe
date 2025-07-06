"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Pencil } from "lucide-react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";
import { toast } from "sonner";

const Profile = () => {
  const [profile, setProfile] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    company: "",
    avatar: "",
  });

  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(profile);
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "profilepicks"); // must be exact
    formData.append("folder", "avatars"); // organize uploads

    try {
      setUploading(true);
      setUploadProgress(0);

      console.log("Uploading file:", file.name, "Size:", file.size);

      const response = await axios.post(
        "https://api.cloudinary.com/v1_1/ddlrkl4jy/image/upload", // Use image/upload for images
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
            console.log(`Upload progress: ${progress}%`);
          },
        }
      );

      console.log("Cloudinary response:", response.data);
      return response.data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      console.error("Error response:", error.response?.data);

      let errorMessage = "Upload failed";
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Selected file:", file);

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "Please select a valid image file (JPEG, PNG, GIF, or WebP)"
        );
        e.target.value = ""; // Clear the input
        return;
      }

      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        e.target.value = ""; // Clear the input
        return;
      }

      setImage(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      toast.error("Please select an image first!");
      return;
    }

    try {
      console.log("Starting upload process...");
      const imageUrl = await uploadToCloudinary(image);

      console.log("Image uploaded successfully:", imageUrl);
      console.log("Current profile:", profile);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("You must be logged in");
        return;
      }

      const token = await getIdToken(currentUser);
      console.log("Updating profile with new avatar...");

      const updateData = {
        name: `${profile.firstname} ${profile.lastname}`.trim() || "User",
        email: profile.email,
        phone: profile.phone || "",
        company: profile.company || "",
        avatar: imageUrl,
      };

      console.log("Update data:", updateData);

      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
        updateData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Profile update response:", res.data);

      if (res.data && res.data.user) {
        updateProfileState(res.data.user);
        setImage(null);
        // Clear the file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
        toast.success("Avatar updated successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Error details:", error.response?.data);

      let errorMessage = "Failed to upload avatar";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  const updateProfileState = (userData) => {
    const [firstname, ...rest] = userData.name?.split(" ") || ["", ""];
    const lastname = rest.join(" ");
    const newProfile = {
      firstname,
      lastname,
      email: userData.email || "",
      phone: userData.phone || "",
      company: userData.company || "",
      avatar: userData.avatar || "",
    };
    setProfile(newProfile);
    setEditProfile(newProfile);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast.error("You must be logged in");
          return;
        }
        const token = await getIdToken(currentUser);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data && data.user) {
          updateProfileState(data.user);
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleEdit = () => {
    setEditProfile(profile);
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("You must be logged in");
        return;
      }
      const token = await getIdToken(currentUser);
      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
        {
          name: `${editProfile.firstname} ${editProfile.lastname}`.trim(),
          email: editProfile.email,
          phone: editProfile.phone,
          company: editProfile.company,
          avatar: profile.avatar, // Keep existing avatar
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data && res.data.user) {
        updateProfileState(res.data.user);
        setEditOpen(false);
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error(err.response?.data?.error || "Failed to update profile.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-slate-600 mt-2">Manage your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={
                  profile.avatar
                    ? `${profile.avatar}?v=${new Date().getTime()}`
                    : "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png"
                }
                alt="Profile Avatar"
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                {profile.firstname?.[0] || "U"}
                {profile.lastname?.[0] || ""}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Button variant="outline" className="relative">
                  <Camera className="h-4 w-4 mr-2" />
                  Select Image
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                  />
                </Button>
                {image && (
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    {uploading ? `Uploading... ${uploadProgress}%` : "Upload"}
                  </Button>
                )}
              </div>
              {image && (
                <p className="text-sm text-green-600">Selected: {image.name}</p>
              )}
              <p className="text-sm text-slate-500">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.firstname || "Not set"}
              </div>
            </div>
            <div>
              <Label>Last Name</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.lastname || "Not set"}
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.email || "Not set"}
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.phone || "Not set"}
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.company || "Not set"}
              </div>
            </div>
          </div>

          <Button className="mt-4" variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">First Name</Label>
                <Input
                  id="firstname"
                  name="firstname"
                  value={editProfile.firstname}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Last Name</Label>
                <Input
                  id="lastname"
                  name="lastname"
                  value={editProfile.lastname}
                  onChange={handleEditChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={editProfile.email}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={editProfile.phone}
                onChange={handleEditChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={editProfile.company}
                onChange={handleEditChange}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600"
                type="submit"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
