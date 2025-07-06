// FRONTEND: Updated Tags Page to Send Multiple Tags

"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

const Tags = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3b82f6");

  // Bulk add tags state
  const [newTags, setNewTags] = useState([{ name: "", color: "#3b82f6" }]);

  const handleAddTagField = () => {
    setNewTags([...newTags, { name: "", color: "#3b82f6" }]);
  };

  const handleRemoveTagField = (idx) => {
    setNewTags(newTags.filter((_, i) => i !== idx));
  };

  const handleTagInputChange = (idx, field, value) => {
    setNewTags(
      newTags.map((tag, i) => (i === idx ? { ...tag, [field]: value } : tag))
    );
  };

  const handleAddTags = async () => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);

    const tagsToAdd = newTags.filter((tag) => tag.name.trim() !== "");
    if (tagsToAdd.length === 0) {
      toast.error("Please enter at least one tag name.");
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tags/bulk`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tags: tagsToAdd }),
        credentials: "include",
      }
    );

    const data = await res.json();
    if (data.success) {
      toast.success(data.message || "Tags added successfully.");
      setIsAddDialogOpen(false);
      setNewTags([{ name: "", color: "#3b82f6" }]);
      queryClient.invalidateQueries(["tags"]);
    } else {
      toast.error(data.message || "Failed to add tags.");
    }
  };

  const handleEditTag = async () => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    if (!editingTag) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tags/${editingTag._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editName, color: editColor }),
        credentials: "include",
      }
    );

    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      setIsEditDialogOpen(false);
      setEditingTag(null);
      setEditName("");
      setEditColor("#3b82f6");
      queryClient.invalidateQueries(["tags"]);
    } else {
      toast.error(data.message || "Failed to update tag.");
    }
  };

  const handleDeleteTag = async (tagId, force = false) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("You must be logged in");
        return;
      }
      const token = await getIdToken(currentUser);

      const url = force
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/tags/${tagId}?force=true`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/tags/${tagId}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries(["tags"]);
        queryClient.invalidateQueries(["contacts"]);
      } else {
        if (data.contactCount > 0) {
          if (
            confirm(
              `Tag "${data.tagName}" is used by ${data.contactCount} contact(s). Do you want to remove it from all contacts and delete the tag?`
            )
          ) {
            handleDeleteTag(tagId, true);
          }
        } else {
          toast.error(data.error || "Failed to delete tag");
        }
      }
    } catch (err) {
      console.error("Delete tag error:", err);
      toast.error("Failed to delete tag. Please try again.");
    }
  };

  const { data: tagdata } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getAlltags("", null, null, ""),
  });

  const tags = tagdata?.tags || [];
  const tagCounts = tagdata?.tagCounts || {};

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Tags Management
          </h1>
          <p className="text-slate-600 mt-2">
            Organize your contacts with custom tags
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Tag(s)
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Multiple Tags</DialogTitle>
              <DialogDescription>
                Enter names and colors for all tags.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddTags();
              }}
            >
              {newTags.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`name-${idx}`}>Tag Name *</Label>
                    <Input
                      id={`name-${idx}`}
                      name={`name-${idx}`}
                      placeholder="Enter tag name"
                      required
                      value={tag.name}
                      onChange={(e) =>
                        handleTagInputChange(idx, "name", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`color-${idx}`}>Color *</Label>
                    <Input
                      id={`color-${idx}`}
                      name={`color-${idx}`}
                      type="color"
                      required
                      value={tag.color}
                      onChange={(e) =>
                        handleTagInputChange(idx, "color", e.target.value)
                      }
                    />
                  </div>
                  {newTags.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 mt-6"
                      onClick={() => handleRemoveTagField(idx)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTagField}
                >
                  + Add Another
                </Button>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                  >
                    Add Tag(s)
                  </Button>
                </div>
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
              <div
                key={tag._id}
                className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <span className="font-medium">{tag.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {tagCounts[tag.name] || 0} contact
                      {(tagCounts[tag.name] || 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTag(tag);
                        setEditName(tag.name);
                        setEditColor(tag.color);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeleteTag(tag._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
              <Input
                id="edit-name"
                name="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Color *</Label>
              <Input
                id="edit-color"
                name="color"
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600"
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

export default Tags;
