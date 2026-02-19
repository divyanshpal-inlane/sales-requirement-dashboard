import {
  Calendar,
  ClipboardList,
  Loader2,
  PhoneCall,
  Settings,
  ShieldCheck,
  Upload,
  UserCircle,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ADMIN_PERMISSIONS,
  PermissionKey,
  useCurrentAdmin,
} from "@/queries/adminPermissions";

// Map permission keys to feature configs
const featureConfig: Record<
  PermissionKey,
  {
    title: string;
    description: string;
    icon: typeof UserPlus;
    link: string;
    color: string;
  }
> = {
  learner_management: {
    title: "Learner Management",
    description: "Create and manage learner enrollments",
    icon: UserPlus,
    link: "/admin/learner-management",
    color: "text-teal-500",
  },
  customer_migration: {
    title: "Customer Migration",
    description: "Migrate existing customers from paper records",
    icon: Upload,
    link: "/admin/learner-migration",
    color: "text-purple-500",
  },
  schedule_management: {
    title: "Schedule Management",
    description: "Manage and organize training schedules for learners",
    icon: Calendar,
    link: "/admin/schedules",
    color: "text-blue-500",
  },
  ll_applications: {
    title: "LL Applications",
    description: "Process and update learner's license applications",
    icon: ClipboardList,
    link: "/admin/learner-ll-details",
    color: "text-green-500",
  },
  post_ll_applications: {
    title: "Post-LL Applications",
    description: "Process and update driver's license applications",
    icon: ClipboardList,
    link: "/admin/learner-details",
    color: "text-green-500",
  },
  instructor_management: {
    title: "Instructor Management",
    description: "Add, edit, and manage driving instructors",
    icon: Users,
    link: "/admin/instructors",
    color: "text-orange-500",
  },
  notification_management: {
    title: "Daily Notification Management",
    description: "Set reminders and send daily notifications to learners",
    icon: PhoneCall,
    link: "/admin/notification-management",
    color: "text-teal-500",
  },
  customer_info: {
    title: "Paid Customer Information",
    description: "View and manage detailed customer information",
    icon: UserCircle,
    link: "/admin/customer-info",
    color: "text-indigo-500",
  },
  tentative_schedules: {
    title: "Tentative Schedules Info",
    description: "Search tentative schedules",
    icon: Calendar,
    link: "/admin/tentative-schedules-info",
    color: "text-orange-500",
  },
  learner_issue_fixer: {
    title: "Learner Issue Fixer",
    description: "Diagnose and fix learner app, payment, and scheduling issues",
    icon: Wrench,
    link: "/admin/learner-issue-fixer",
    color: "text-red-500",
  },
  settings: {
    title: "Settings",
    description: "Configure payment gateways and app settings",
    icon: Settings,
    link: "/admin/settings",
    color: "text-gray-600",
  },
};

export default function AdminHome() {
  const { data: currentAdmin, isLoading } = useCurrentAdmin();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter features based on admin's permissions
  const allowedFeatures = currentAdmin?.permissions
    ?.filter((perm) => featureConfig[perm])
    .map((perm) => featureConfig[perm]) || [];

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
          {currentAdmin?.is_super_admin && (
            <p className="mt-1 text-sm text-purple-600">
              Logged in as Super Admin
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {/* Super Admin Management - only for super admins */}
          {currentAdmin?.is_super_admin && (
            <Card className="border-purple-200 transition-all hover:shadow-lg">
              <Link to="/admin/admin-management">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-purple-100 p-2 text-purple-600">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Admin Management</CardTitle>
                      <CardDescription className="mt-1">
                        Create and manage admin accounts and permissions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="ghost">
                    Access Admin Management
                  </Button>
                </CardContent>
              </Link>
            </Card>
          )}

          {/* Feature cards based on permissions */}
          {allowedFeatures.map((feature) => (
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

          {allowedFeatures.length === 0 && !currentAdmin?.is_super_admin && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>No Access</CardTitle>
                <CardDescription>
                  You don't have permission to access any features. Please contact
                  the Super Admin to get access.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
