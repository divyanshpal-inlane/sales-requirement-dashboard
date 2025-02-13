import { Calendar, ClipboardList } from "lucide-react";
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
      title: "Schedule Management",
      description: "Manage and organize training schedules for learners",
      icon: Calendar,
      link: "/admin/schedules",
      color: "text-blue-500",
    },
    {
      title: "Learner LL Details",
      description: "Process and update learner license applications",
      icon: ClipboardList,
      link: "/admin/learner-ll-details",
      color: "text-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/30 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage schedules and learner licenses
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
