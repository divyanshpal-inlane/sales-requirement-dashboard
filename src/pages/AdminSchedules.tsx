import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

import { LocationModal } from "@/components/modals/LocationModal";
import { CalendarModal } from "@/components/modals/CalendarModal";
import { useScheduleData } from "@/hooks/useScheduleData";
import { useLocationServices } from "@/hooks/useLocationServices";
import { useCalendarServices } from "@/hooks/useCalendarServices";
import { Schedule } from "@/types/schedule";

export default function AdminSchedules() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { schedules, loading, fetchSchedules } = useScheduleData();
  const { 
    distanceInfo, 
    isLocationModalOpen, 
    setIsLocationModalOpen,
    loadingDistance,
    handleCalculateDistance 
  } = useLocationServices();
  const {
    calendarEvents,
    isCalendarModalOpen,
    setIsCalendarModalOpen,
    loadingCalendar,
    handleViewCalendar
  } = useCalendarServices();

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-4 animate-spin border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl">
        <div className="flex gap-4 items-center mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex gap-2 items-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Admin Schedules</h1>
        </div>

        <div className="grid gap-6">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{schedule.subject}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Instructor:</strong> {schedule.instructor_name}
                    </div>
                    <div>
                      <strong>Learner:</strong> {schedule.learner_name}
                    </div>
                    <div>
                      <strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        schedule.status === 'active' ? 'bg-green-100 text-green-800' :
                        schedule.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.status}
                      </span>
                    </div>
                    <div>
                      <strong>Start Date:</strong> {format(new Date(schedule.start_date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => handleCalculateDistance(schedule)}
                      disabled={loadingDistance}
                    >
                      {loadingDistance ? "Calculating..." : "View Distance & Map"}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleViewCalendar(schedule)}
                      disabled={loadingCalendar}
                    >
                      {loadingCalendar ? "Loading..." : "View Instructor Schedule"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>

        {schedules.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No schedules found.</p>
          </div>
        )}
      </div>

      <LocationModal 
        open={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        distanceInfo={distanceInfo}
      />

      <CalendarModal
        open={isCalendarModalOpen}
        onOpenChange={setIsCalendarModalOpen}
        calendarEvents={calendarEvents}
      />
    </div>
  );
}
