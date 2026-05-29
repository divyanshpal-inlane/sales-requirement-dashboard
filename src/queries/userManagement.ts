import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabaseClient";
import { ADMIN_PERMISSIONS, PermissionKey } from "./adminPermissions";

// All available user permissions (same as admin permissions for now)
export const USER_PERMISSIONS = ADMIN_PERMISSIONS;

export interface User {
  id: string;
  phone: string;
  name: string;
  admin_id: string;
  created_by_admin_id: string;
  created_at: string;
  signed_up: string | null;
}

export interface UserWithPermissions extends User {
  permissions: PermissionKey[];
}

// Get current user's info and permissions
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.phone) {
        console.log("[useCurrentUser] No phone on auth user");
        return null;
      }

      console.log("[useCurrentUser] Auth user phone:", user.phone);

      // Normalize phone - try multiple formats to match User table
      const digits = user.phone.replace(/\D/g, "");
      const phoneVariants = [
        user.phone,
        digits,
        digits.replace(/^91/, ""),
        `+91${digits.replace(/^91/, "")}`,
      ];

      console.log("[useCurrentUser] Trying phone variants:", phoneVariants);

      // Get user record - fetch ALL users and match client-side
      const { data: allUsers, error: userError } = await (
        supabase
          .from("User" as any)
          .select("*") as any
      );

      if (userError) {
        console.error("[useCurrentUser] Error fetching users:", userError);
        return null;
      }

      console.log(
        "[useCurrentUser] All user phones:",
        allUsers?.map((a: User) => a.phone),
      );

      // Match by comparing digits
      const foundUser =
        allUsers?.find((u: User) => {
          if (!u.phone) return false;
          const userDigits = u.phone.replace(/\D/g, "");
          return phoneVariants.some(
            (v) =>
              v === u.phone ||
              v.replace(/\D/g, "") === userDigits ||
              userDigits.endsWith(digits.replace(/^91/, "")) ||
              digits.replace(/^91/, "").endsWith(userDigits),
          );
        }) ?? null;

      console.log("[useCurrentUser] Matched user:", foundUser);

      if (!foundUser) {
        return null;
      }

      // Get user's permissions
      const { data: permissions, error: permError } = await (
        supabase
          .from("user_permissions" as any)
          .select("permission") as any
      ).eq("user_id", foundUser.id);

      if (permError) {
        console.error("Error fetching permissions:", permError);
        return {
          ...foundUser,
          permissions: [] as PermissionKey[],
        } as UserWithPermissions;
      }

      return {
        ...foundUser,
        permissions: (permissions || []).map((p: any) => p.permission as PermissionKey),
      } as UserWithPermissions;
    },
  });
}

// Check if current user has a specific permission
export function useHasUserPermission(permission: PermissionKey) {
  const { data: user, isLoading } = useCurrentUser();

  return {
    hasPermission: user?.permissions?.includes(permission) || false,
    isLoading,
  };
}

// Get all users created by current admin
export function useAdminUsers() {
  return useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.phone) {
        console.error("[useAdminUsers] No phone on auth user");
        return [];
      }

      // Get current admin's ID
      const { data: admin, error: adminError } = await supabase
        .from("Admin")
        .select("id")
        .eq("phone", user.phone)
        .single();

      if (adminError || !admin) {
        console.error("[useAdminUsers] Error fetching admin:", adminError);
        return [];
      }

      // Get all users created by this admin
      const { data: users, error } = await (
        supabase
          .from("User" as any)
          .select("*") as any
      ).eq("created_by_admin_id", admin.id as any)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get permissions for each user
      const usersWithPermissions: UserWithPermissions[] = await Promise.all(
        (users || []).map(async (user: User) => {
          const { data: permissions } = await (
            supabase
              .from("user_permissions" as any)
              .select("permission") as any
          ).eq("user_id", user.id);

          return {
            ...user,
            permissions: (permissions || []).map(
              (p: any) => p.permission as PermissionKey,
            ),
          } as UserWithPermissions;
        }),
      );

      return usersWithPermissions;
    },
  });
}

// Create new user (admin only)
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phone,
      name,
      password,
      permissions,
    }: {
      phone: string;
      name: string;
      password: string;
      permissions: PermissionKey[];
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.phone) {
        throw new Error("Admin not authenticated");
      }

      // Get current admin's ID
      const { data: admin, error: adminError } = await supabase
        .from("Admin")
        .select("id")
        .eq("phone", user.phone)
        .single();

      if (adminError || !admin) {
        throw new Error("Admin not found");
      }

      // Edge function handles everything: User table, auth user, and permissions
      const { data: authData, error: authError } =
        await supabase.functions.invoke("create-user", {
          body: {
            phone,
            password,
            name,
            permissions,
            adminId: admin.id,
          },
        });

      console.log("[useCreateUser] Response:", { authData, authError });

      if (authError) {
        console.error("[useCreateUser] Auth error:", authError);
        throw new Error(authError.message || "Failed to create user");
      }

      // Check if the function returned an error in the response
      if (authData && !authData.success) {
        console.error("[useCreateUser] Function error:", authData.error);
        throw new Error(authData.error || "Failed to create user");
      }

      if (!authData || !authData.userId) {
        console.error("[useCreateUser] Invalid response:", authData);
        throw new Error("Invalid response from server");
      }

      console.log("[useCreateUser] Success! Created user:", authData.userId);
      return { id: authData.userId, phone, name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}

// Update user permissions (admin only for their users)
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: PermissionKey[];
    }) => {
      // Delete existing permissions
      const { error: deleteError } = await (
        supabase
          .from("user_permissions" as any)
          .delete() as any
      ).eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissions.length > 0) {
        const permissionRecords = permissions.map((permission) => ({
          user_id: userId,
          permission,
        }));

        const { error: insertError } = await (
          supabase
            .from("user_permissions" as any)
            .insert(permissionRecords as any) as any
        );

        if (insertError) throw insertError;
      }

      return { userId, permissions };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
}

// Delete user (admin only for their users)
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Get user phone for auth deletion
      const { data: user } = await (
        supabase
          .from("User" as any)
          .select("phone") as any
      ).eq("id", userId)
        .single();

      // Delete from User table (permissions will cascade)
      const { error } = await (
        supabase
          .from("User" as any)
          .delete() as any
      ).eq("id", userId);

      if (error) throw error;

      // Delete auth user via edge function
      if (user?.phone) {
        await supabase.functions.invoke("delete-user", {
          body: { phone: user.phone },
        });
      }

      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
}
