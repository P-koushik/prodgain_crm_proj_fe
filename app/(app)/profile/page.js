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

  // Helper to update profile state from backend user data
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

  // Fetch profile on mount
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

  // File select handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
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
        e.target.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        e.target.value = "";
        return;
      }
      setImage(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  // Cloudinary upload
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "profilepicks");
    formData.append("folder", "avatars");
    try {
      setUploading(true);
      setUploadProgress(0);
      const response = await axios.post(
        "https://api.cloudinary.com/v1_1/ddlrkl4jy/image/upload",
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );
      return response.data.secure_url;
    } catch (error) {
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

  // Unified profile update (for avatar and info)
  const updateProfile = async (updateData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("You must be logged in");
        return;
      }
      const token = await getIdToken(currentUser);
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
      if (res.data && res.data.user) {
        updateProfileState(res.data.user);
        toast.success("Profile updated successfully!");
        return true;
      }
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error(err.response?.data?.error || "Failed to update profile.");
      return false;
    }
  };

  // Avatar upload handler
  const handleUpload = async () => {
    if (!image) {
      toast.error("Please select an image first!");
      return;
    }
    try {
      const imageUrl = await uploadToCloudinary(image);
      const updateData = {
        name: `${profile.firstname} ${profile.lastname}`.trim() || "User",
        email: profile.email,
        phone: profile.phone || "",
        company: profile.company || "",
        avatar: imageUrl,
      };
      const success = await updateProfile(updateData);
      if (success) {
        setImage(null);
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
      }
    } catch (error) {
      // Error handled in updateProfile
    }
  };

  // Edit profile dialog open
  const handleEdit = () => {
    setEditProfile(profile);
    setEditOpen(true);
  };

  // Edit profile input change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Edit profile submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const updateData = {
      name: `${editProfile.firstname} ${editProfile.lastname}`.trim(),
      email: editProfile.email,
      phone: editProfile.phone,
      company: editProfile.company,
      avatar: profile.avatar, // Keep existing avatar
    };
    const success = await updateProfile(updateData);
    if (success) setEditOpen(false);
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
