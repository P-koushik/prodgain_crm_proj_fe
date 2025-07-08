"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Activity, Tags } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getcountofcontacts } from "@/lib/services/contactService.js";
import { getAlltags } from "@/lib/services/tagService.js";
import { getActivityLogs } from "@/lib/services/activityService.js";

const Dashboard = () => {
  const { data: contactData, isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getcountofcontacts(),
  });

  console.log("Contact Data:", contactData);

  const { data: tagData, isLoading: tagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () => getAlltags('', null, null, ''),
  });

  const { data: activityData, isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => getActivityLogs(),
  });

  const contacts = contactData?.data.allContacts || [];
  const tags = contactData?.data.tagDistribution || [];
  const showDataAccordingToDay = contactData?.data.activitiesByDay;
  const countbycompany = contactData?.data.contactsByCompany || [];
  const activities = activityData || [];

  // Enhanced color palette for pie chart
  const pieChartColors = [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#8b5cf6", // Purple
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#ec4899", // Pink
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#a855f7", // Violet
  ];

  const totalContacts = contacts.length;
  const totalTags = tags.length;
  const totalActivities = contactData?.data.activities || 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = contacts.filter(contact =>
    new Date(contact.createdAt) >= oneWeekAgo
  ).length;

  const companyCounts = countbycompany.reduce((acc, contact) => {
    const company = contact.company || 'Unknown';
    acc[company] = (acc[company] || 0) + 1;
    return acc;
  }, {});

  const contactsByCompany = Object.entries(companyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, contacts]) => ({ name, contacts }));

  // Process activities timeline (last 7 days)
  const activitiesByDay = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Initialize all days with 0
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = dayNames[date.getDay()];
    activitiesByDay[dayName] = 0;
  }

  // Count activities by day
  activities.forEach(activity => {
    const activityDate = new Date(activity.timestamp);
    const dayName = dayNames[activityDate.getDay()];
    const daysDiff = Math.floor((new Date() - activityDate) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 6) {
      activitiesByDay[dayName]++;
    }
  });

  const activitiesTimeline = Object.entries(showDataAccordingToDay || {}).map(([date, activities]) => ({
    date,
    activities
  }));

  // Process tag distribution with enhanced colors
  const tagCounts = {};
  contacts.forEach(contact => {
    if (contact.tags && Array.isArray(contact.tags)) {
      contact.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const totalTaggedContacts = Object.values(tagCounts).reduce((sum, count) => sum + count, 0);

  const tagDistribution = Object.entries(tagCounts)
    .map(([name, count], index) => {
      const percentage = totalTaggedContacts > 0 ? Math.round((count / totalTaggedContacts) * 100) : 0;
      // Use enhanced color palette instead of tag color
      const color = pieChartColors[index % pieChartColors.length];
      return { name, value: percentage, color, count };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Add "Other" category if there are more tags
  if (Object.keys(tagCounts).length > 5) {
    const otherCount = Object.entries(tagCounts)
      .slice(5)
      .reduce((sum, [, count]) => sum + count, 0);
    const otherPercentage = totalTaggedContacts > 0 ? Math.round((otherCount / totalTaggedContacts) * 100) : 0;
    if (otherPercentage > 0) {
      tagDistribution.push({
        name: "Other",
        value: otherPercentage,
        color: "#6b7280", // Gray for "Other"
        count: otherCount
      });
    }
  }

  if (contactsLoading || tagsLoading || activitiesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-2">Loading dashboard data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-4 w-4 bg-slate-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-slate-600 mt-2">Welcome back! Here's what's happening with your CRM.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{totalContacts}</div>
            <p className="text-xs text-blue-600 mt-1">
              {newThisWeek > 0 ? `+${newThisWeek} new this week` : 'No new contacts this week'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">New This Week</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{newThisWeek}</div>
            <p className="text-xs text-green-600 mt-1">
              {newThisWeek > 0 ? 'New contacts added' : 'No new contacts'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{totalActivities}</div>
            <p className="text-xs text-purple-600 mt-1">
              {totalActivities > 0 ? 'Activities logged' : 'No activities yet'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Active Tags</CardTitle>
            <Tags className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{totalTags}</div>
            <p className="text-xs text-orange-600 mt-1">
              {totalTags > 0 ? 'Tags available' : 'No tags created'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts by Company Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts by Company</CardTitle>
            <CardDescription>
              {contactsByCompany.length > 0
                ? 'Top companies with most contacts'
                : 'No company data available'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contactsByCompany.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countbycompany}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="contacts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500">
                No company data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activities Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activities This Week</CardTitle>
            <CardDescription>Daily activity tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activitiesTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="activities"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tag Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Distribution</CardTitle>
          <CardDescription>
            {tagDistribution.length > 0
              ? 'Breakdown of contact tags'
              : 'No tagged contacts available'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tagDistribution.length > 0 ? (
            <div className="flex flex-col lg:flex-row items-center">
              <ResponsiveContainer width="100%" height={300} className="lg:w-1/2">
                <PieChart>
                  <Pie
                    data={tagDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {tagDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, name]}
                    labelFormatter={(label) => `Tag: ${label}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="lg:w-1/2 space-y-4">
                {tagDistribution.map((tag, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    <span className="text-sm font-medium">{tag.name}</span>
                    <span className="text-sm text-slate-500">
                      {tag.value}% ({tag.count} contacts)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No tagged contacts available
            </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;