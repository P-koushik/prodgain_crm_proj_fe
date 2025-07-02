// "use client";

// import { useEffect, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Camera, Pencil } from "lucide-react";
// import axios from "axios";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { auth } from "@/firebase";
// import { getIdToken } from "firebase/auth";
// import { toast } from "sonner";
// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { storage } from "@/firebase"; // Ensure you have Firebase storage initialized
// const Profile = () => {
//   const [profile, setProfile] = useState({
//     firstname: "",
//     lastname: "",
//     email: "",
//     phone: "",
//     company: "",
//     avatar: "",
//   });
//   const [loading, setLoading] = useState(true);
//   const [editOpen, setEditOpen] = useState(false);
//   const [editProfile, setEditProfile] = useState(profile);
//   console.log("profile", profile);

//    const handleUpload = () => {
//     if (!image) return alert("Please select an image first!");

//     const storageRef = ref(storage, `uploads/${Date.now()}_${image.name}`);
//     const uploadTask = uploadBytesResumable(storageRef, image);

//     uploadTask.on(
//       "state_changed",
//       (snapshot) => {
//         // Progress
//         const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
//         setProgress(percent);
//       },
//       (error) => {
//         console.error("Upload error:", error);
//       },
//       () => {
//         // Get URL
//         getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
//           setUrl(downloadURL);
//           console.log("File available at", downloadURL);
//         });
//       }
//     );
//   };

//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         const currentUser = auth.currentUser;
//         if (!currentUser) {
//           toast.error("You must be logged in");
//           return;
//         }
//         const token = await getIdToken(currentUser);
//         const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}profile`, {
//           method: "GET",
//           headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${token}`,
//           },
//         });
//         const data = await res.json(); // Parse JSON
//         if (data && data.user) {

//           setProfile({
//             firstname: data.user.name?.split(" ")[0] || "",
//             lastname: data.user.name?.split(" ").slice(1).join(" ") || "",
//             email: data.user.email || "",
//             phone: data.user.phone || "",
//             company: data.user.company || "",
//             avatar: data.user.avatar || "",
//           });

//         }
//       } catch (err) {
//         toast.error("Failed to load profile.");
//       }
//       setLoading(false);
//     };

//     fetchProfile();
//   }, []);

//   const handleEdit = () => {
//     setEditProfile(profile);
//     setEditOpen(true);
//   };

//   console.log("url",profile.avatar)

//   const handleEditChange = (e) => {
//     const { name, value } = e.target;
//     setEditProfile((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleEditSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const currentUser = auth.currentUser;
//       if (!currentUser) {
//         toast.error("You must be logged in");
//         return;
//       }
//       const token = await getIdToken(currentUser);
//       const res = await axios.put(
//         `${process.env.NEXT_PUBLIC_API_URL}profile`,
//         {
//           name: `${editProfile.firstname} ${editProfile.lastname}`,
//           email: editProfile.email,
//           phone: editProfile.phone,
//           company: editProfile.company,
//         },
//         {
//           headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${token}`,
//           },
//         }
//       );

//       if (res.data && res.data.user) {
//         const [firstname, ...rest] = res.data.user.name?.split(" ") || ["", ""];
//         const lastname = rest.join(" ");
//         setProfile({
//           firstname,
//           lastname,
//           email: res.data.user.email,
//           phone: res.data.user.phone,
//           company: res.data.user.company,
//           avatar: res.data.user.avatar || "",
//         });
//         setEditOpen(false);
//         toast.success("Profile updated successfully!");
//       }
//     } catch (err) {
//       toast.error("Failed to update profile.");
//     }
//   };

//   if (loading) {
//     return <div>Loading...</div>;
//   }

//   return (
//     <div className="space-y-6 max-w-4xl">
//       <div>
//         <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
//           Profile Settings
//         </h1>
//         <p className="text-slate-600 mt-2">Manage your account information</p>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Profile Information</CardTitle>
//           <CardDescription>Update your personal details</CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           <div className="flex items-center space-x-4">
//             <Avatar className="h-20 w-20">
//               <AvatarImage src={profile.avatar || "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png"} />
//               {/* <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
//                 {profile.firstname?.[0] || "U"}
//                 {profile.lastname?.[0] || ""}
//               </AvatarFallback> */}
//             </Avatar>
//             <div>
//               <Button variant="outline" className="relative" onClick={handleUpload}>
//                 <Camera className="h-4 w-4 mr-2" />
//                 Change Avatar
//                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e)=>e.target.files[0]} />
//               </Button>
//               <p className="text-sm text-slate-500 mt-1">JPG, PNG or GIF. Max size 2MB.</p>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <Label>First Name</Label>
//               <div className="border rounded px-3 py-2 bg-slate-50">{profile.firstname}</div>
//             </div>
//             <div>
//               <Label>Last Name</Label>
//               <div className="border rounded px-3 py-2 bg-slate-50">{profile.lastname}</div>
//             </div>
//             <div>
//               <Label>Email</Label>
//               <div className="border rounded px-3 py-2 bg-slate-50">{profile.email}</div>
//             </div>
//             <div>
//               <Label>Phone</Label>
//               <div className="border rounded px-3 py-2 bg-slate-50">{profile.phone}</div>
//             </div>
//             <div>
//               <Label>Company</Label>
//               <div className="border rounded px-3 py-2 bg-slate-50">{profile.company}</div>
//             </div>
//           </div>

//           <Button className="mt-4" variant="outline" onClick={handleEdit}>
//             <Pencil className="h-4 w-4 mr-2" />
//             Edit
//           </Button>
//         </CardContent>
//       </Card>

//       <Dialog open={editOpen} onOpenChange={setEditOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Edit Profile</DialogTitle>
//             <DialogDescription>Update your personal details</DialogDescription>
//           </DialogHeader>
//           <form onSubmit={handleEditSubmit} className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="firstname">First Name</Label>
//                 <Input
//                   id="firstname"
//                   name="firstname"
//                   value={editProfile.firstname}
//                   onChange={handleEditChange}
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="lastname">Last Name</Label>
//                 <Input
//                   id="lastname"
//                   name="lastname"
//                   value={editProfile.lastname}
//                   onChange={handleEditChange}
//                 />
//               </div>
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 name="email"
//                 type="email"
//                 value={editProfile.email}
//                 onChange={handleEditChange}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="phone">Phone</Label>
//               <Input
//                 id="phone"
//                 name="phone"
//                 value={editProfile.phone}
//                 onChange={handleEditChange}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="company">Company</Label>
//               <Input
//                 id="company"
//                 name="company"
//                 value={editProfile.company}
//                 onChange={handleEditChange}
//               />
//             </div>
//             <div className="flex justify-end space-x-2">
//               <Button variant="outline" type="button" onClick={() => setEditOpen(false)}>
//                 Cancel
//               </Button>
//               <Button className="bg-gradient-to-r from-blue-600 to-purple-600" type="submit">
//                 Save Changes
//               </Button>
//             </div>
//           </form>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// };

// export default Profile;



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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
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

  try {
    setUploading(true);
    setUploadProgress(0);

    const response = await axios.post(
      "https://api.cloudinary.com/v1_1/ddlrkl4jy/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      }
    );

    return response.data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    toast.error(
      `Upload failed: ${error.response?.data?.error?.message || "Unknown error"}`
    );
    throw error;
  } finally {
    setUploading(false);
    setUploadProgress(0);
  }
};


  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      setImage(file);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      toast.error("Please select an image first!");
      return;
    }

    try {
      const imageUrl = await uploadToCloudinary(image);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("You must be logged in");
        return;
      }

      const token = await getIdToken(currentUser);
      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}profile`,
        {
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email,
          phone: profile.phone,
          company: profile.company,
          avatar: imageUrl,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data && res.data.user) {
        const [firstname, ...rest] = res.data.user.name?.split(" ") || ["", ""];
        const lastname = rest.join(" ");
        setProfile({
          firstname,
          lastname,
          email: res.data.user.email,
          phone: res.data.user.phone,
          company: res.data.user.company,
          avatar: res.data.user.avatar || "",
        });
        setImage(null);
        toast.success("Avatar updated successfully!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar. Please try again.");
    }
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
          `${process.env.NEXT_PUBLIC_API_URL}profile`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (data && data.user) {
          setProfile({
            firstname: data.user.name?.split(" ")[0] || "",
            lastname: data.user.name?.split(" ").slice(1).join(" ") || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            company: data.user.company || "",
            avatar: data.user.avatar || "",
          });
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        toast.error("Failed to load profile.");
      }
      setLoading(false);
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
        `${process.env.NEXT_PUBLIC_API_URL}profile`,
        {
          name: `${editProfile.firstname} ${editProfile.lastname}`,
          email: editProfile.email,
          phone: editProfile.phone,
          company: editProfile.company,
          avatar: profile.avatar,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data && res.data.user) {
        const [firstname, ...rest] = res.data.user.name?.split(" ") || ["", ""];
        const lastname = rest.join(" ");
        setProfile({
          firstname,
          lastname,
          email: res.data.user.email,
          phone: res.data.user.phone,
          company: res.data.user.company,
          avatar: res.data.user.avatar || "",
        });
        setEditOpen(false);
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error("Failed to update profile.");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-slate-600 mt-2">
          Manage your account information
        </p>
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
                    {uploading
                      ? `Uploading... ${uploadProgress}%`
                      : "Upload"}
                  </Button>
                )}
              </div>
              {image && (
                <p className="text-sm text-green-600">
                  Selected: {image.name}
                </p>
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
                {profile.firstname}
              </div>
            </div>
            <div>
              <Label>Last Name</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.lastname}
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.email}
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.phone}
              </div>
            </div>
            <div>
              <Label>Company</Label>
              <div className="border rounded px-3 py-2 bg-slate-50">
                {profile.company}
              </div>
            </div>
          </div>

          <Button className="mt-4" variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
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
