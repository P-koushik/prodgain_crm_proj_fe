"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Filter,
  Upload,
  Edit,
  Trash2,
  MoreHorizontal,
  Grid3X3,
  List,
} from "lucide-react";
import { getAllContacts } from "@/lib/services/contactService.js";
import { getAlltags } from "@/lib/services/tagService.js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

const Contacts = () => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvContacts, setCsvContacts] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [csvErrors, setCsvErrors] = useState([]);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    tags: [],
    note: "",
  });
  const [pagenumber, setPagenumber] = useState(1);
  const router = useRouter();
  const queryClient = useQueryClient();
  const debounceTimeout = useRef(null);
  const [importing, setImporting] = useState(false);

  const itemsPerPage = 12;

  // Debounce searchTerm
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 800);

    return () => clearTimeout(debounceTimeout.current);
  }, [searchTerm]);

  const { data: contactdata } = useQuery({
    queryKey: ["contacts", pagenumber, debouncedSearch],
    queryFn: () =>
      getAllContacts(debouncedSearch, pagenumber, itemsPerPage, ""),
  });

  const { data: tagdata } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getAlltags("", null, null, ""),
    enabled: true,
  });

  const contacts = contactdata?.contacts || [];

  const hasNextPage = contacts.length === itemsPerPage;
  const hasPrevPage = pagenumber > 1;
  const starttagdata = tagdata?.tags || [];

  // Build a tag color map: { tagName: color }
  const tagColorMap = {};
  starttagdata.forEach((tag) => {
    tagColorMap[tag.name] = tag.color;
  });

  useEffect(() => {
    setPagenumber(1);
  }, [searchTerm]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContacts(contacts.map((c) => c._id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId, checked) => {
    if (checked) {
      setSelectedContacts((prev) => [...prev, contactId]);
    } else {
      setSelectedContacts((prev) => prev.filter((_id) => _id !== contactId));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "tags") {
      setContactForm((prev) => ({
        ...prev,
        tags: value ? value.split(",").map((tag) => tag.trim()) : [],
      }));
    } else {
      setContactForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleTagCheckbox = (tagName, checked) => {
    setContactForm((prev) => ({
      ...prev,
      tags: checked
        ? [...prev.tags, tagName]
        : prev.tags.filter((t) => t !== tagName),
    }));
  };

  const handleCsvRowSelect = (csvRow) => {
    setContactForm({
      name: csvRow.name || csvRow.Name || "",
      email: csvRow.email || csvRow.Email || "",
      phone: csvRow.phone || csvRow.Phone || "",
      company: csvRow.company || csvRow.Company || "",
      tags: csvRow.tags
        ? csvRow.tags.split(",").map((t) => t.trim())
        : csvRow.Tags
        ? csvRow.Tags.split(",").map((t) => t.trim())
        : [],
      note: csvRow.note || csvRow.Note || "",
    });
    setIsAddModalOpen(true);
  };

  const handlesubmit = async (e) => {
    if (e) e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return toast.error("You must be logged in");
    const token = await getIdToken(currentUser);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...contactForm, user: currentUser.uid }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      setIsAddModalOpen(false);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        tags: [],
        note: "",
      });
      queryClient.invalidateQueries(["contacts"]);
    } else {
      toast.error(data.message || "Failed to add contact.");
    }
  };

  const handledelete = async () => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact to delete.");
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contacts`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: selectedContacts }),
      credentials: "include",
    });

    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      setSelectedContacts([]);
      queryClient.invalidateQueries(["contacts"]); // <-- refetch contacts
    } else {
      toast.error("Failed to delete contacts.");
    }
  };

  const handledeleteone = async (contactId) => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/contacts/${contactId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    if (data.success) {
      toast.success(data.message);
      setSelectedContacts([]);
      queryClient.invalidateQueries(["contacts"]); // <-- refetch contacts
    } else {
      toast.error("Failed to delete contacts.");
    }
  };

  // Drag-and-drop handler
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const requiredFields = ["name", "email", "phone", "company"];
        const errors = [];
        const validRows = [];
        const seen = new Set();

        results.data.forEach((row, idx) => {
          const name = row.name || row.Name;
          const email = (row.email || row.Email || "").toLowerCase();
          const phone = row.phone || row.Phone;
          const company = row.company || row.Company;

          if (!name || !email || !phone || !company) {
            errors.push(`Row ${idx + 2} is missing required fields.`);
          } else {
            if (seen.has(email)) {
              errors.push(`Row ${idx + 2} is a duplicate (email: ${email}).`);
            } else {
              seen.add(email);
              validRows.push({
                name,
                email,
                phone,
                company,
                tags: (row.tags || row.Tags || "")
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
                note: row.note || row.Note || "",
              });
            }
          }
        });

        setCsvErrors(errors);
        setCsvContacts(validRows);
      },
      error: function (err) {
        setCsvErrors([
          "Failed to parse CSV file. Please check your file format.",
        ]);
        setCsvContacts([]);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  const handleSaveCsvContacts = async () => {
    setImporting(true);
    try {
      const currentUser = auth.currentUser;
      const token = await getIdToken(currentUser);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/contacts/import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ contacts: csvContacts }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Contacts imported successfully.");
        setCsvModalOpen(false);
        setCsvContacts([]);
        setCsvFile(null);
        setCsvErrors([]);
        queryClient.invalidateQueries(["contacts"]);
      } else {
        toast.error(
          data.message ||
            "Some contacts may have been skipped due to duplicates."
        );
      }
    } catch (err) {
      toast.error("Failed to import contacts. Please try again.");
    }
    setImporting(false);
  };

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;

    // Always show current page and 2 pages before/after if they exist
    const startPage = Math.max(1, pagenumber - 2);
    const endPage = pagenumber;

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const initials = (contact) => {
    // console.log("Contact:", contact.split(' '));
    return contact.split(" ").map((contact) => {
      const nameParts = contact;
      return nameParts.length > 1 ? `${nameParts[0][0]}` : nameParts[0][0];
    });
  };

  const GridView = () => (
    <div className="space-y-4">
      {/* Select All for Grid View */}
      <div className="flex items-center space-x-2 pb-2 border-b">
        <Checkbox
          checked={
            contacts.length > 0 && selectedContacts.length === contacts.length
          }
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-slate-600">
          Select All ({contacts.length} contacts)
        </span>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {contacts.map((contact) => (
          <Card
            key={contact._id}
            className={`hover:shadow-lg transition-shadow cursor-pointer ${
              selectedContacts.includes(contact._id)
                ? "ring-2 ring-blue-500 bg-blue-50"
                : ""
            }`}
            onClick={() =>
              handleSelectContact(
                contact._id,
                !selectedContacts.includes(contact._id)
              )
            }
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {contact.avatar || initials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">
                      <Link
                        href={`/contacts/${contact._id}`}
                        className="hover:underline text-blue-700"
                        onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking link
                      >
                        {contact.name}
                      </Link>
                    </h3>
                    <p className="text-xs text-slate-600">{contact.company}</p>
                  </div>
                </div>
                <Checkbox
                  checked={selectedContacts.includes(contact._id)}
                  onCheckedChange={(checked) =>
                    handleSelectContact(contact._id, checked)
                  }
                  onClick={(e) => e.stopPropagation()} // Prevent double-trigger
                />
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <span className="font-medium">Email:</span>
                  <span className="truncate">{contact.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <span className="font-medium">Phone:</span>
                  <span>{contact.phone}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {(contact.tags || []).map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: tagColorMap[tag] || "#e5e7eb",
                        color: "#ffffff",
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {contact.lastInteraction || "No recent activity"}
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card selection
                      router.push(`/contacts/${contact._id}?isedit=true`);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card selection
                      handledeleteone(contact._id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const ListView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={
                contacts.length > 0 &&
                selectedContacts.length === contacts.length
              }
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Last Interaction</TableHead>
          <TableHead className="w-12">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow key={contact._id}>
            <TableCell>
              <Checkbox
                checked={selectedContacts.includes(contact._id)}
                onCheckedChange={(checked) =>
                  handleSelectContact(contact._id, checked)
                }
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    {contact.avatar}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  <Link
                    href={`/contacts/${contact._id}`}
                    className="hover:underline text-blue-700"
                  >
                    {contact.name}
                  </Link>
                </span>
              </div>
            </TableCell>
            <TableCell className="text-slate-600">{contact.email}</TableCell>
            <TableCell className="text-slate-600">{contact.company}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(contact.tags || []).map((tag, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: tagColorMap[tag] || "#e5e7eb",
                      color: "#ffffff",
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-slate-500 text-sm">
              {contact.lastInteraction}
            </TableCell>
            <TableCell>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    router.push(`/contacts/${contact._id}?isedit=true`);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handledeleteone(contact._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Contacts
          </h1>
          <p className="text-slate-600 mt-2">
            Manage your customer relationships
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Create a new contact in your CRM system.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handlesubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter full name"
                    value={contactForm.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter email address"
                    value={contactForm.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="Enter phone number"
                    value={contactForm.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    placeholder="Enter company name"
                    value={contactForm.company}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {starttagdata.map((tag) => (
                        <div
                          key={tag._id}
                          className="flex items-center space-x-2 px-2 py-1"
                        >
                          <Checkbox
                            id={`tag-${tag._id}`}
                            checked={contactForm.tags.includes(tag.name)}
                            onCheckedChange={(checked) =>
                              handleTagCheckbox(tag.name, checked)
                            }
                          />
                          <label
                            htmlFor={`tag-${tag._id}`}
                            className="text-sm cursor-pointer"
                          >
                            {tag.name}
                          </label>
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="tags"
                    name="tags"
                    placeholder="Comma separated tags"
                    value={contactForm.tags.join(",")}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Notes</Label>
                  <Textarea
                    id="note"
                    name="note"
                    placeholder="Add any notes about this contact"
                    value={contactForm.note}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    type="submit"
                  >
                    Save Contact
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={csvModalOpen}
            onOpenChange={setCsvModalOpen}
            className="w-auto"
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[1024px]">
              <DialogHeader>
                <DialogTitle>Import Contacts from CSV</DialogTitle>
                <DialogDescription>
                  Drag and drop a CSV file here, or click to select. Columns:
                  name, email, phone, company, tags, note.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Drag-and-drop area */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <input {...getInputProps()} />
                  {isDragActive ? (
                    <p className="text-blue-700">Drop the CSV file here ...</p>
                  ) : (
                    <p>
                      Drag & drop a CSV file here, or{" "}
                      <span className="underline text-blue-700">
                        click to select
                      </span>
                    </p>
                  )}
                  {csvFile && (
                    <p className="mt-2 text-xs text-slate-500">
                      Selected file: {csvFile.name}
                    </p>
                  )}
                </div>

                {/* Error display */}
                {csvErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded p-2 text-sm space-y-1">
                    {csvErrors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}

                {/* Table preview */}
                {csvContacts.length > 0 && (
                  <div className="max-h-60 overflow-y-scroll border rounded p-2 bg-slate-50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvContacts.map((c, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell>{c.email}</TableCell>
                            <TableCell>{c.phone}</TableCell>
                            <TableCell>{c.company}</TableCell>
                            <TableCell>{c.tags.join(", ")}</TableCell>
                            <TableCell
                              style={{
                                maxWidth: "200px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                cursor: "pointer",
                              }}
                              title={c.note}
                            >
                              {c.note}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setCsvModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    onClick={handleSaveCsvContacts}
                    disabled={csvContacts.length === 0 || importing}
                  >
                    {importing ? "Importing..." : "Save All Contacts"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search contacts..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-row-reverse items-end overflow-hidden">
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-none border-0"
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-none border-0"
          >
            <Grid3X3 className="h-4 w-4 mr-2" />
            Grid
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedContacts.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedContacts.length} contact(s) selected
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Tag Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={handledelete}
                >
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Display */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? <GridView /> : <ListView />}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevPage}
          onClick={() => setPagenumber((prev) => Math.max(1, prev - 1))}
        >
          Prev
        </Button>

        {getVisiblePages().map((pageNum) => (
          <Button
            key={pageNum}
            size="sm"
            variant={pagenumber === pageNum ? "default" : "outline"}
            className={
              pagenumber === pageNum ? "font-bold bg-blue-600 text-white" : ""
            }
            onClick={() => setPagenumber(pageNum)}
          >
            {pageNum}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => setPagenumber((prev) => prev + 1)}
        >
          Next
        </Button>
      </div>

      {/* Pagination Info */}
      {contacts.length > 0 && (
        <div className="text-center text-sm text-slate-600">
          Page {pagenumber} - Showing {contacts.length} contacts
        </div>
      )}
    </div>
  );
};

export default Contacts;
