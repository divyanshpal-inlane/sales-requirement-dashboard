import {
  Loader2,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  useCurrentAdmin,
  PermissionKey,
  useAllAdmins,
} from "@/queries/adminPermissions";
import {
  USER_PERMISSIONS,
  UserWithPermissions,
  useAdminUsers,
  useAllUsers,
  useCreateUser,
  useDeleteUser,
  useUpdateUserPermissions,
} from "@/queries/userManagement";

export default function UserManagement() {
  const { toast } = useToast();
  const { data: currentAdmin, isLoading: currentAdminLoading } =
    useCurrentAdmin();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: allAdmins, isLoading: allAdminsLoading } = useAllAdmins();
  const { data: allUsers, isLoading: allUsersLoading } = useAllUsers();
  const createUser = useCreateUser();
  const updatePermissions = useUpdateUserPermissions();
  const deleteUser = useDeleteUser();

  // For super admin, show all admins + all users created by any admin
  // For regular admin, show only their created users
  const displayUsers = currentAdmin?.is_super_admin ? 
    [...(allAdmins || []), ...(allUsers || [])] : 
    (users || []);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<UserWithPermissions | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    phone: "",
    password: "",
    permissions: [] as PermissionKey[],
  });
  const [editPermissions, setEditPermissions] = useState<PermissionKey[]>([]);
  const [phoneError, setPhoneError] = useState("");

  // Validate phone number - must be exactly 10 digits
  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10;
  };

  const handlePhoneChange = (value: string) => {
    setNewUserForm((prev) => ({
      ...prev,
      phone: value,
    }));
    
    if (value && !isValidPhone(value)) {
      setPhoneError("Phone number must be exactly 10 digits");
    } else {
      setPhoneError("");
    }
  };

  // Check if current user is admin
  if (currentAdminLoading || usersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentAdmin?.is_admin && !currentAdmin?.is_super_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-6 w-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only Admins can manage users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateUser = async () => {
    try {
      await createUser.mutateAsync(newUserForm);
      setShowCreateDialog(false);
      setNewUserForm({ name: "", phone: "", password: "", permissions: [] });
      toast({
        title: "Success",
        description: "User created successfully!",
      });
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;
    try {
      await updatePermissions.mutateAsync({
        userId: selectedUser.id,
        permissions: editPermissions,
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "Permissions updated successfully!",
      });
    } catch (error: unknown) {
      console.error("Error updating permissions:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update permissions";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User deleted successfully!",
      });
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: UserWithPermissions | any) => {
    setSelectedUser(user as UserWithPermissions);
    setEditPermissions(user.permissions);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user: UserWithPermissions | any) => {
    setSelectedUser(user as UserWithPermissions);
    setShowDeleteDialog(true);
  };

  const toggleNewPermission = (permission: PermissionKey) => {
    setNewUserForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleEditPermission = (permission: PermissionKey) => {
    setEditPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const selectAllPermissions = (isNew: boolean) => {
    // Only allow selecting permissions that the current admin has
    const adminPermissions = currentAdmin?.permissions || [];
    if (isNew) {
      setNewUserForm((prev) => ({ ...prev, permissions: adminPermissions }));
    } else {
      setEditPermissions(adminPermissions);
    }
  };

  const clearAllPermissions = (isNew: boolean) => {
    if (isNew) {
      setNewUserForm((prev) => ({ ...prev, permissions: [] }));
    } else {
      setEditPermissions([]);
    }
  };

  return (
    <div
      className="min-h-screen bg-white p-8"
      style={{
        backgroundImage: 'url("/assets/bg_pattern.svg")',
        backgroundRepeat: "repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                User Management
              </h1>
              <p className="mt-1 text-muted-foreground">
                Create and manage users with specific permissions
              </p>
            </div>
          </div>
          {!currentAdmin?.is_super_admin && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          )}
        </div>

        {!displayUsers || displayUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                {currentAdmin?.is_super_admin ? "No users to display." : "You haven't created any users yet."}
              </p>
              {!currentAdmin?.is_super_admin && (
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First User
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        <CardDescription>{user.phone}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        Edit Permissions
                      </Button>
                      {!currentAdmin?.is_super_admin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        No permissions assigned
                      </span>
                    ) : (
                      user.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                        >
                          {USER_PERMISSIONS[perm]?.label || perm}
                        </span>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="User name"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="10-digit phone number"
                  value={newUserForm.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-xs text-red-500">{phoneError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions</Label>
                  <div className="space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllPermissions(true)}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearAllPermissions(true)}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
                  {Object.values(USER_PERMISSIONS)
                    .filter((perm) => {
                      // Exclude unwanted permissions
                      const excludedPermissions = ["kam_management", "instructor_matrix", "lessons_dashboard", "admin_management"];
                      if (excludedPermissions.includes(perm.key)) return false;
                      // Only show permissions that admin has
                      return currentAdmin?.permissions?.includes(perm.key as PermissionKey);
                    })
                    .map((perm) => (
                    <div
                      key={perm.key}
                      className="flex items-start space-x-3 rounded p-2 hover:bg-gray-50"
                    >
                      <Checkbox
                        id={`new-${perm.key}`}
                        checked={newUserForm.permissions.includes(
                          perm.key as PermissionKey,
                        )}
                        onCheckedChange={() =>
                          toggleNewPermission(perm.key as PermissionKey)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`new-${perm.key}`}
                          className="cursor-pointer text-sm font-medium"
                        >
                          {perm.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {perm.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={
                  createUser.isPending ||
                  !newUserForm.name ||
                  !newUserForm.phone ||
                  !newUserForm.password ||
                  !isValidPhone(newUserForm.phone)
                }
              >
                {createUser.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Permissions Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Permissions</DialogTitle>
              <DialogDescription>
                Update permissions for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-center justify-between pb-2">
                <Label>Permissions</Label>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => selectAllPermissions(false)}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAllPermissions(false)}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
                {Object.values(USER_PERMISSIONS)
                  .filter((perm) => {
                    // Exclude unwanted permissions
                    const excludedPermissions = ["kam_management", "instructor_matrix", "lessons_dashboard", "admin_management"];
                    if (excludedPermissions.includes(perm.key)) return false;
                    // Only show permissions that admin has
                    return currentAdmin?.permissions?.includes(perm.key as PermissionKey);
                  })
                  .map((perm) => (
                  <div
                    key={perm.key}
                    className="flex items-start space-x-3 rounded p-2 hover:bg-gray-50"
                  >
                    <Checkbox
                      id={`edit-${perm.key}`}
                      checked={editPermissions.includes(
                        perm.key as PermissionKey,
                      )}
                      onCheckedChange={() =>
                        toggleEditPermission(perm.key as PermissionKey)
                      }
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`edit-${perm.key}`}
                        className="cursor-pointer text-sm font-medium"
                      >
                        {perm.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {perm.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePermissions}
                disabled={updatePermissions.isPending}
              >
                {updatePermissions.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedUser?.name}? This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
