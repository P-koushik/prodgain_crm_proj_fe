"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getAlltags } from "@/lib/services/tagService.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";

const Tags = () => {
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");

  const handleAddTag = async () => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        name,
        color
      }),
      credentials: "include",
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries(["tags"]);
    }
  };

  const handleEditTag = async () => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    if (!editingTag) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}tags/${editingTag._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, color }),
      credentials: "include",
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setIsEditDialogOpen(false);
      setEditingTag(null);
      queryClient.invalidateQueries(["tags"]);
    }
  };

  const handleDeleteTag = async (tagId) => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}tags/${tagId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
  }

  const { data: tagdata } = useQuery({queryKey: ["tags"],queryFn: () => getAlltags("", null, null, ""),});

  const tags = tagdata?.tags || [];
  const tagCounts = tagdata?.tagCounts || {};
  // console.log("tagcounts", tagCounts);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Tags Management
          </h1>
          <p className="text-slate-600 mt-2">Organize your contacts with custom tags</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Tag</DialogTitle>
              <DialogDescription>Create a new tag to organize your contacts.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTag();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Tag Name *</Label>
                <Input id="name" name="name" placeholder="Enter tag name" required onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color *</Label>
                <Input id="color" name="color" type="color" defaultValue="#3b82f6" required onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                  Add Tag
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => (
              <div key={tag._id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></div>
                    <span className="font-medium">{tag.name}</span>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTag(tag);
                        setName(tag.name);
                        setColor(tag.color);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteTag(tag._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* <p className="text-sm text-slate-500">{tagCounts} contacts</p> */}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update the tag information.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleEditTag();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-name">Tag Name *</Label>
              <Input id="edit-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color *</Label>
              <Input id="edit-color" name="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} required />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tags;
