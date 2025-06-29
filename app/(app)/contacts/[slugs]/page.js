'use client';

import { useRouter, useParams ,useSearchParams} from 'next/navigation';
import { useState ,useEffect} from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Building } from 'lucide-react';
import { auth } from '@/firebase';
import { getIdToken } from 'firebase/auth';
import EditContactDialog from '@/components/ContactEdit';
import { toast } from "sonner";

// TanStack Query function to get contact by ID
const getContactById = async (contactId) => {
  if (!contactId) throw new Error('Contact ID is required');
  
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  
  const token = await getIdToken(currentUser);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`, {
    method: 'GET',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch contact: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  
  if (!data.contact) {
    throw new Error('Contact not found in response');
  }
  
  return data.contact;
};

// TanStack Query function to update contact
const updateContactById = async ({ contactId, formData }) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  
  const token = await getIdToken(currentUser);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(formData),
  });

  if (!res.ok) {
    throw new Error(`Failed to update contact: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.contact;
};

// TanStack Query function to delete contact
const deleteContactById = async (contactId) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('User not authenticated');
  
  const token = await getIdToken(currentUser);
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete contact: ${res.status} ${res.statusText}`);
  }

  return { success: true };
};

export default function ContactDetail() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Extract the contact ID from slugs parameter
  console.log(params)
  const contactId = params?.slugs;
  useEffect(() => {

    if (searchParams.get("isedit") === "true") {
      setIsEditModalOpen(true);
    }
  }, [searchParams]);
  

  const { 
    data: contact, 
    isLoading, 
    error, 
    isError 
  } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => getContactById(contactId),
    enabled: !!contactId, // Only run query if contactId exists
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // TanStack Mutation for updating contact
  const updateMutation = useMutation({
    mutationFn: updateContactById,
    onSuccess: (updatedContact) => {
      queryClient.setQueryData(["contact", contactId], updatedContact);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsEditModalOpen(false);
      toast.success("Contact updated successfully.");
    },
    onError: (error) => {
      console.error('Error updating contact:', error);
      toast.error(`Failed to update contact: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContactById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.removeQueries({ queryKey: ["contact", contactId] });
      toast.success("Contact deleted successfully.");
      router.push('/contacts');
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
      toast.error(`Failed to delete contact: ${error.message}`);
    },
  });

  const getTagColor = (tag) => {
    const colors = {
      "Hot Lead": "bg-red-100 text-red-800",
      "Customer": "bg-green-100 text-green-800",
      "Prospect": "bg-blue-100 text-blue-800",
      "Enterprise": "bg-purple-100 text-purple-800",
      "Design": "bg-orange-100 text-orange-800",
    };
    return colors[tag] || "bg-gray-100 text-gray-800";
  };

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
          <p className="text-sm">{error?.message || 'An unexpected error occurred'}</p>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["contact", contactId] })}
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
          <p className="text-sm">The contact you're looking for doesn't exist or has been deleted.</p>
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
                {contact.avatar || contact.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{contact.name || 'Unknown Contact'}</h1>
              <p className="text-slate-600">
                {contact.position ? `${contact.position}${contact.company ? ` at ${contact.company}` : ''}` : contact.company || 'No company specified'}
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
          />

          {/* Delete Dialog */}
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Contact</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {contact.name || 'this contact'}? This action cannot be undone.
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
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Contact'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
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
                  <p className="font-medium">{value || 'Not provided'}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Tags</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(contact.tags && contact.tags.length > 0) ? (
                contact.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className={getTagColor(tag)}>
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
          <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-slate-600">{contact.notes || 'No notes available'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader><CardTitle>Activity History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(contact.activities && contact.activities.length > 0) ? (
              contact.activities.map((activity, idx) => (
                <div key={activity.id || idx} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{activity.description}</p>
                    <p className="text-sm text-slate-500">{activity.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">No activity yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}