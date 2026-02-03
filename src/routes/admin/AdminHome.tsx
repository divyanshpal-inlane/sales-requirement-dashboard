import {
  Calendar,
  Calendar as CalendarIcon,
  ClipboardList,
  PhoneCall,
  Upload,
  UserCircle,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminHome() {
  const adminFeatures = [
    {
      title: "Learner Management",
      description: "Create and manage learner enrollments",
      icon: UserPlus,
      link: "/admin/learner-management",
      color: "text-teal-500",
    },
    {
      title: "Customer Migration",
      description: "Migrate existing customers from paper records",
      icon: Upload,
      link: "/admin/learner-migration",
      color: "text-purple-500",
    },
    {
      title: "Schedule Management",
      description: "Manage and organize training schedules for learners",
      icon: Calendar,
      link: "/admin/schedules",
      color: "text-blue-500",
    },
    {
      title: "LL Applications",
      description: "Process and update learner's license applications",
      icon: ClipboardList,
      link: "/admin/learner-ll-details",
      color: "text-green-500",
    },
    // V2 feature: set date for DL test
    // {
    //   title: "Driving Test Dates",
    //   description:
    //     "Schedule and manage driving license test dates for learners",
    //   icon: CalendarIcon,
    //   link: "/admin/dl-test-dates",
    //   color: "text-purple-500",
    // },
    {
      title: "Post-LL Applications",
      description: "Process and update driver's license applications",
      icon: ClipboardList,
      link: "/admin/learner-details",
      color: "text-green-500",
    },
    {
      title: "Instructor Management",
      description: "Add, edit, and manage driving instructors",
      icon: Users,
      link: "/admin/instructors",
      color: "text-orange-500",
    },
    {
      title: "Daily Notification Management",
      description: "Set reminders and send daily notifications to learners",
      icon: PhoneCall,
      link: "/admin/notification-management",
      color: "text-teal-500",
    },
    {
      title: "Paid Customer Information",
      description: "View and manage detailed customer information",
      icon: UserCircle,
      link: "/admin/customer-info",
      color: "text-indigo-500",
    },
    {
      title: "Tentative Schedules Info",
      description: "Search tentative schedules",
      icon: Calendar,
      link: "/admin/tentative-schedules-info",
      color: "text-orange-500",
    },
    {
      title: "Learner Issue Fixer",
      description:
        "Diagnose and fix learner app, payment, and scheduling issues",
      icon: Wrench,
      link: "/admin/learner-issue-fixer",
      color: "text-red-500",
    },
  ];

  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage schedules and learner licenses
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {adminFeatures.map((feature) => (
            <Card
              key={feature.title}
              className="transition-all hover:shadow-lg"
            >
              <Link to={feature.link}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-lg bg-gray-100 p-2 ${feature.color}`}
                    >
                      <feature.icon size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="ghost">
                    Access {feature.title}
                  </Button>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
