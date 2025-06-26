"use client"
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Filter, Upload, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { getAllContacts } from "@/lib/services/contactService.js";
import { getAlltags } from "@/lib/services/tagService.js";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

const Contacts = () => {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvContacts, setCsvContacts] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    tags: [],
    note: "",
  });
  const [pagenumber, setPagenumber] = useState(1);
  const itemsPerPage = 5;
  const router = useRouter();
  
  console.log("Current Page Number:", pagenumber);  
  
  const { data: contactdata } = useQuery({ 
    queryKey: ["contacts", pagenumber], 
    queryFn: () => getAllContacts('', pagenumber, itemsPerPage, '')
  });
  
  const { data: tagdata } = useQuery({ 
    queryKey: ["tags"], 
    queryFn: () => getAlltags('', null, null, ''), 
    enabled: true 
  });
  
  const contacts = contactdata?.contacts || [];
  // Since backend doesn't provide total count, we'll estimate based on current page data
  const hasNextPage = contacts.length === itemsPerPage;
  const hasPrevPage = pagenumber > 1;
  const starttagdata = tagdata?.tags || [];
  
  // Reset to page 1 when search term changes
  useEffect(() => {
    setPagenumber(1);
  }, [searchTerm]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedContacts(contacts.map(c => c._id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId, checked) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(_id => _id !== contactId));
    }
  };

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

  // Unified handleChange for all input fields
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

  // For tag checkbox selection
  const handleTagCheckbox = (tagName, checked) => {
    setContactForm((prev) => ({
      ...prev,
      tags: checked
        ? [...prev.tags, tagName]
        : prev.tags.filter((t) => t !== tagName),
    }));
  };

  // For CSV row selection (if you want to edit/import a single row)
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

  // Submit handler for both manual and CSV single row
  const handlesubmit = async (e) => {
    if (e) e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return alert("You must be logged in");
    const token = await getIdToken(currentUser);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ ...contactForm, user: currentUser.uid }),
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setIsAddModalOpen(false);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        tags: [],
        note: "",
      });
    }
  };

  const handledelete = async () => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    if (selectedContacts.length === 0) {
      alert("Please select at least one contact to delete.");
      return;
    }
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: selectedContacts }),
      credentials: "include",
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setSelectedContacts([]);
    } else {
      alert("Failed to delete contacts.");
    }
  };

  const handledeleteone = async (contactId) => {
    const currentUser = auth.currentUser;
    const token = await getIdToken(currentUser);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts/${contactId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setSelectedContacts([]);
    } else {
      alert("Failed to delete contacts.");
    }
  };

  // Handle CSV file selection and parsing with validation
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0];
    setCsvFile(file);
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          // Validate required fields for each row
          const requiredFields = ["name", "email", "phone", "company"];
          const errors = [];
          const validRows = [];

          results.data.forEach((row, idx) => {
            // Support both lowercase and capitalized headers
            const name = row.name || row.Name;
            const email = row.email || row.Email;
            const phone = row.phone || row.Phone;
            const company = row.company || row.Company;

            if (!name || !email || !phone || !company) {
              errors.push(`Row ${idx + 2} is missing required fields.`);
            } else {
              validRows.push(row);
            }
          });

          if (errors.length > 0) {
            alert(
              "Some rows in your CSV are missing required fields:\n\n" +
                errors.join("\n") +
                "\n\nOnly valid rows will be shown and can be imported."
            );
          }

          setCsvContacts(validRows);
        },
        error: function (err) {
          alert("Failed to parse CSV file. Please check your file format.");
          setCsvContacts([]);
        },
      });
    }
  };

  // Save all CSV contacts to DB (one by one, using POST /contacts)
  const handleSaveCsvContacts = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return alert("You must be logged in");
    const token = await getIdToken(currentUser);

    const contactsToSave = csvContacts.map((c) => ({
      name: c.name || c.Name || "",
      email: c.email || c.Email || "",
      phone: c.phone || c.Phone || "",
      company: c.company || c.Company || "",
      tags: c.tags
        ? c.tags.split(",").map((t) => t.trim())
        : c.Tags
        ? c.Tags.split(",").map((t) => t.trim())
        : [],
      note: c.note || c.Note || "",
      user: currentUser.uid,
    }));

    let allSuccess = true;
    for (const contact of contactsToSave) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!data.success) {
        allSuccess = false;
      }
    }

    if (allSuccess) {
      alert("All contacts imported successfully.");
      setCsvModalOpen(false);
      setCsvContacts([]);
      setCsvFile(null);
    } else {
      alert("Some contacts failed to import.");
    }
  };

  // Generate page numbers for pagination (without knowing total pages)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Contacts
          </h1>
          <p className="text-slate-600 mt-2">Manage your customer relationships</p>
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
                  <Input id="name" name="name" placeholder="Enter full name" value={contactForm.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" placeholder="Enter email address" value={contactForm.email} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="Enter phone number" value={contactForm.phone} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Enter company name" value={contactForm.company} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {starttagdata.map((tag) => (
                        <div key={tag._id} className="flex items-center space-x-2 px-2 py-1">
                          <Checkbox
                            id={`tag-${tag._id}`}
                            checked={contactForm.tags.includes(tag.name)}
                            onCheckedChange={(checked) => handleTagCheckbox(tag.name, checked)}
                          />
                          <label htmlFor={`tag-${tag._id}`} className="text-sm cursor-pointer">
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
                  <Textarea id="note" name="note" placeholder="Add any notes about this contact" value={contactForm.note} onChange={handleChange} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600" type="submit">
                    Save Contact
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen} className="w-auto">
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
                  Select a CSV file to import contacts. Columns: name, email, phone, company, tags, note.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input type="file" accept=".csv" onChange={handleCsvFileChange} />
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
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvContacts.map((c, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="max-w-[120px] truncate">{c.name || c.Name}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{c.email || c.Email}</TableCell>
                            <TableCell className="max-w-[120px] truncate">{c.phone || c.Phone}</TableCell>
                            <TableCell className="max-w-[140px] truncate">{c.company || c.Company}</TableCell>
                            <TableCell className="max-w-[140px] truncate">{c.tags || c.Tags}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{c.note || c.Note}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCsvRowSelect(c)}
                              >
                                Edit & Save
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setCsvModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600"
                    onClick={handleSaveCsvContacts}
                    disabled={csvContacts.length === 0}
                  >
                    Save All Contacts
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
            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedContacts.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                {selectedContacts.length} contact(s) selected
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Tag Selected</Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={handledelete} >
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={contacts.length > 0 && selectedContacts.length === contacts.length}
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
              {/* Show CSV contacts (not yet saved) at the top */}
              {csvContacts.map((contact, idx) => (
                <TableRow key={`csv-${idx}`} className="bg-yellow-50">
                  <TableCell />
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {contact.name?.[0] || contact.Name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{contact.name || contact.Name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{contact.email || contact.Email}</TableCell>
                  <TableCell className="text-slate-600">{contact.company || contact.Company}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags
                        ? contact.tags.split(",")
                        : contact.Tags
                        ? contact.Tags.split(",")
                        : []
                      ).map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className={getTagColor(tag.trim())}>
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{contact.note || contact.Note}</TableCell>
                  <TableCell />
                </TableRow>
              ))}
              {contacts.map((contact) => (
                <TableRow key={contact._id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedContacts.includes(contact._id)}
                      onCheckedChange={(checked) => handleSelectContact(contact._id, checked)}
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
                        <Link href={`/contacts/${contact._id}`} className="hover:underline text-blue-700">
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
                        <Badge key={idx} variant="secondary" className={getTagColor(tag)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{contact.lastInteraction}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => {
                        router.push(`/contacts/${contact._id}?isedit=true`)
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handledeleteone(contact._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevPage}
          onClick={() => setPagenumber(prev => Math.max(1, prev - 1))}
        >
          Prev
        </Button>
        
        {getVisiblePages().map((pageNum) => (
          <Button
            key={pageNum}
            size="sm"
            variant={pagenumber === pageNum ? "default" : "outline"}
            className={pagenumber === pageNum ? "font-bold bg-blue-600 text-white" : ""}
            onClick={() => setPagenumber(pageNum)}
          >
            {pageNum}
          </Button>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          onClick={() => setPagenumber(prev => prev + 1)}
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