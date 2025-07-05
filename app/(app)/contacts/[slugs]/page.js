"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  Clock,
  User,
  FileText,
  Eye,
} from "lucide-react";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";
import EditContactDialog from "@/components/ContactEdit";
import { toast } from "sonner";
import { getAlltags } from "@/lib/services/tagService.js";

// TanStack Query function to get contact by ID
const getContactById = async (contactId) => {
  if (!contactId) throw new Error("Contact ID is required");

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const token = await getIdToken(currentUser);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch contact: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (!data.contact) {
    throw new Error("Contact not found in response");
  }

  return data.contact;
};

// TanStack Query function to update contact
const updateContactById = async ({ contactId, formData }) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const token = await getIdToken(currentUser);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(formData),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to update contact: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  return data.contact;
};

// TanStack Query function to delete contact
const deleteContactById = async (contactId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const token = await getIdToken(currentUser);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to delete contact: ${res.status} ${res.statusText}`
    );
  }

  return { success: true };
};

const getContactActivities = async (contactId) => {
  if (!contactId) throw new Error("Contact ID is required");

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("User not authenticated");

  const token = await getIdToken(currentUser);

  const data = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}activity/${contactId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    }
  );

  if (!data.ok) {
    throw new Error(
      `Failed to fetch activities: ${data.status} ${data.statusText}`
    );
  }

  const response = await data.json();
  console.log("Activities response:", response);

  // Handle both single activity object and array of activities
  if (response.activities) {
    return Array.isArray(response.activities)
      ? response.activities
      : [response.activities];
  }

  return [];
};

// Helper function to format activity type
const formatActivityType = (activityType) => {
  const typeMap = {
    UPDATE_CONTACT: "Contact Updated",
    CREATE_CONTACT: "Contact Created",
    DELETE_CONTACT: "Contact Deleted",
    VIEW_CONTACT: "Contact Viewed",
    CALL_CONTACT: "Phone Call",
    EMAIL_CONTACT: "Email Sent",
    MEETING_CONTACT: "Meeting Scheduled",
  };
  return typeMap[activityType] || activityType.replace("_", " ").toLowerCase();
};

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return timestamp;
  }
};

// Helper function to get activity icon
const getActivityIcon = (activityType) => {
  const iconMap = {
    UPDATE_CONTACT: FileText,
    CREATE_CONTACT: User,
    DELETE_CONTACT: Trash2,
    VIEW_CONTACT: Eye,
    CALL_CONTACT: Phone,
    EMAIL_CONTACT: Mail,
    MEETING_CONTACT: Clock,
  };
  return iconMap[activityType] || FileText;
};

export default function ContactDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Extract the contact ID from slugs parameter
  console.log(params);
  const contactId = params?.slugs;

  useEffect(() => {
    if (searchParams.get("isedit") === "true") {
      setIsEditModalOpen(true);
    }
  }, [searchParams]);

  // Fetch contact data
  const {
    data: contact,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => getContactById(contactId),
    enabled: !!contactId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch activities data
  const {
    data: activities = [],
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useQuery({
    queryKey: ["activities", contactId],
    queryFn: () => getContactActivities(contactId),
    enabled: !!contactId,
    retry: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch all tags for color mapping
  const { data: tagdata } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getAlltags("", null, null, ""),
    enabled: true,
  });

  const allTags = tagdata?.tags || [];
  const tagColorMap = {};
  allTags.forEach((tag) => {
    tagColorMap[tag.name] = tag.color;
  });

  // TanStack Mutation for updating contact
  const updateMutation = useMutation({
    mutationFn: updateContactById,
    onSuccess: (updatedContact) => {
      queryClient.setQueryData(["contact", contactId], updatedContact);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["activities", contactId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsEditModalOpen(false);
      toast.success("Contact updated successfully.");
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContactById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.removeQueries({ queryKey: ["contact", contactId] });
      queryClient.removeQueries({ queryKey: ["activities", contactId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Contact deleted successfully.");
      router.push("/contacts");
    },
    onError: (error) => {
      console.error("Error deleting contact:", error);
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (!contactId) return;
    deleteMutation.mutate(contactId);
  };

  const handleUpdate = (formData) => {
    if (!contactId) return;
    updateMutation.mutate({ contactId, formData });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading contact...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p className="text-lg font-semibold">Error loading contact</p>
          <p className="text-sm">
            {error?.message || "An unexpected error occurred"}
          </p>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["contact", contactId],
              })
            }
          >
            Try Again
          </Button>
          <Link href="/contacts">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Contact not found state
  if (!contact) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-600 mb-4">
          <p className="text-lg font-semibold">Contact not found</p>
          <p className="text-sm">
            The contact you're looking for doesn't exist or has been deleted.
          </p>
        </div>
        <Link href="/contacts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
          </Link>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {contact.avatar || contact.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {contact.name || "Unknown Contact"}
              </h1>
              <p className="text-slate-600">
                {contact.company || "No company specified"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <EditContactDialog
            isOpen={isEditModalOpen}
            setIsOpen={setIsEditModalOpen}
            contact={contact}
            isUpdating={updateMutation.isPending}
            onUpdate={handleUpdate}
            allTags={allTags}
          />

          {/* Delete Dialog */}
          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Contact</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{" "}
                  {contact.name || "this contact"}? This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Contact"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: Mail, label: "Email", value: contact.email },
              { icon: Phone, label: "Phone", value: contact.phone },
              { icon: Building, label: "Company", value: contact.company },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center space-x-3">
                <Icon className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="font-medium">{value || "Not provided"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contact.tags && contact.tags.length > 0 ? (
                contact.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    style={{
                      backgroundColor: tagColorMap[tag] || "#e5e7eb",
                      color: "#ffffff",
                    }}
                  >
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No tags assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              {contact.note || "No notes available"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-slate-600">Loading activities...</span>
            </div>
          ) : activitiesError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">Failed to load activities</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["activities", contactId],
                  })
                }
              >
                Try Again
              </Button>
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.activityType);
                return (
                  <div
                    key={activity._id}
                    className="flex items-start space-x-3 p-4 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <ActivityIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">
                          {formatActivityType(activity.activityType)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {activity.details || "No details available"}
                      </p>
                      {activity.user && (
                        <p className="text-xs text-slate-400 mt-1">
                          User: {activity.user}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">No activity yet</p>
              <p className="text-slate-400 text-sm">
                Activity will appear here when actions are performed on this
                contact.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}