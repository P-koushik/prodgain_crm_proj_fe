"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const iconMap = {
  email: "mail",
  call: "bg-green-500",
  note: "bg-orange-500",
  generic: "bg-gray-500",
  login: "bg-blue-600",
  logout: "bg-red-500",
  updateProfile: "bg-purple-600",
  deleteAccount: "bg-red-600",
};

function getActivityIconAndColor(type) {
  return {
    color: iconMap[type] || "bg-gray-400",
  };
}

function formatActivityType(type) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatActivityTime(timestamp) {
  return timestamp
    ? `${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`
    : "";
}

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: null,
      endDate: null,
      key: "selection",
    },
  ]);
  const [selectedActivityType, setSelectedActivityType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activityTypes, setActivityTypes] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;

  useEffect(() => {
    setPage(1);
  }, [user, dateRange, selectedActivityType]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) {
        setLoading(false);
        setActivities([]);
        setHasMore(false);
        return;
      }
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const params = new URLSearchParams({
          page,
          limit: LIMIT,
          ...(selectedActivityType !== "all" && { type: selectedActivityType }),
          ...(dateRange[0].startDate &&
            dateRange[0].endDate && {
              start: dateRange[0].startDate.toISOString(),
              end: dateRange[0].endDate.toISOString(),
            }),
        });
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}activity?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const result = await res.json();
        if (page === 1) {
          setActivities(result || []);
          const types = Array.from(
            new Set((result || []).map((a) => a.activityType))
          );
          setActivityTypes(types);
        } else {
          setActivities((prev) => [...prev, ...(result || [])]);
          const types = Array.from(
            new Set(
              [...activities, ...(result || [])].map((a) => a.activityType)
            )
          );
          setActivityTypes(types);
        }
        setHasMore(result && result.length === LIMIT);
      } catch (err) {
        if (page === 1) setActivities([]);
        setHasMore(false);
      }
      setLoading(false);
    };
    fetchActivities();
    // eslint-disable-next-line
  }, [user, page, dateRange, selectedActivityType]);

  const filteredActivities = activities.filter((activity) => {
    if (dateRange[0].startDate && dateRange[0].endDate) {
      const activityDate = new Date(activity.timestamp);
      const start = new Date(dateRange[0].startDate);
      const end = new Date(dateRange[0].endDate);
      end.setHours(23, 59, 59, 999);
      if (activityDate < start || activityDate > end) return false;
    }
    if (
      selectedActivityType !== "all" &&
      activity.activityType !== selectedActivityType
    )
      return false;
    return true;
  });

  function ActivityItem({ activity }) {
    const { color } = getActivityIconAndColor(activity.activityType);
    return (
      <div key={activity._id} className="relative flex items-start gap-4">
        <div className="z-10">
          <span
            className={`flex items-center justify-center h-10 w-10 rounded-full ${color} shadow-lg ring-4 ring-white`}
          />
        </div>
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow border border-slate-100 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-base text-slate-900">
                {formatActivityType(activity.activityType)}
              </span>
            </div>
            <div className="text-slate-700 mb-2 text-sm">
              {activity.details || activity.activityType}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>{formatActivityTime(activity.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Activity Timeline
          </h1>
          <p className="text-slate-600 mt-2">
            Track all interactions and activities
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Date Range Button */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowDatePicker((v) => !v)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Date Range
              </Button>
              {showDatePicker && (
                <div className="absolute z-50 mt-2">
                  <DateRange
                    editableDateInputs={true}
                    onChange={(item) => setDateRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={dateRange}
                    maxDate={new Date()}
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Done
                  </Button>
                </div>
              )}
            </div>
            {/* Filter Button */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              {showFilters && (
                <div className="absolute z-50 mt-2 bg-white border rounded shadow p-2 min-w-[180px]">
                  <div className="mb-2 font-semibold text-sm">
                    Activity Type
                  </div>
                  <select
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={selectedActivityType}
                    onChange={(e) => {
                      setSelectedActivityType(e.target.value);
                      setShowFilters(false);
                    }}
                  >
                    <option value="all">All Types</option>
                    {activityTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatActivityType(type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {/* Clear All Filters */}
            <Button
              variant="outline"
              onClick={() => {
                setDateRange([
                  { startDate: null, endDate: null, key: "selection" },
                ]);
                setSelectedActivityType("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-8">
            {/* Vertical timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 z-0" />
            <div className="space-y-8">
              {loading ? (
                <div>Loading...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="text-slate-500">No activities found.</div>
              ) : (
                filteredActivities.map((activity) => (
                  <ActivityItem key={activity._id} activity={activity} />
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasMore && !loading && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
};

export default Activities;
