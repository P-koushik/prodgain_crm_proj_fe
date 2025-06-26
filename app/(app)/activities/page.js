"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, Search, Clock, Mail, Phone, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const iconMap = {
  email: Mail,
  call: Phone,
  note: FileText,
  generic: FileText,
  login: Mail,
  logout: FileText,
  updateProfile: Phone,
  deleteAccount: FileText,
};

const colorMap = {
  email: "bg-blue-500",
  call: "bg-green-500",
  note: "bg-orange-500",
  generic: "bg-gray-500",
  login: "bg-blue-600",
  logout: "bg-red-500",
  updateProfile: "bg-purple-600",
  deleteAccount: "bg-red-600",
};

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) {
        setLoading(false);
        setActivities([]);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}activity`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await res.json();
        // console.log("Activities Response:", result); // debug
        setActivities(result || []);
      } catch (err) {
        console.error("Error fetching activities:", err.message);
        setActivities([]);
      }
      setLoading(false);
    };
    fetchActivities();
  }, [user]);
  
console.log("Activities:", activities); // debug
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Activity Timeline
          </h1>
          <p className="text-slate-600 mt-2">Track all interactions and activities</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search activities..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {loading ? (
              <div>Loading...</div>
            ) : activities.length === 0 ? (
              <div className="text-slate-500">No activities found.</div>
            ) : (
              activities.map((activity) => {
                const Icon = iconMap[activity.activityType] || FileText;
                const color = colorMap[activity.activityType] || "bg-gray-400";
                const displayUser =
                  typeof activity.user === "string"
                    ? activity.user
                    : activity.user?.name || "Unknown User";
                const initials =
                  typeof activity.user === "string"
                    ? activity.user[0]?.toUpperCase() || "U"
                    : activity.user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U";

                return (
                  <div key={activity._id} className="flex items-start space-x-4">
                    <div className={`p-2 rounded-full ${color} flex-shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {activity.details || activity.activityType}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span>{displayUser}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>
                          {activity.timestamp
                            ? new Date(activity.timestamp).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Activities;
