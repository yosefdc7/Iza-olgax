"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { X, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { updateUserAction } from "@/app/actions/user-actions";
import { updateUserSchema } from "@/lib/user-schemas";

type EditUserFormValues = z.infer<typeof updateUserSchema>;

interface EditUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "CASHIER";
  };
  onSuccess?: () => void;
}

export function EditUserForm({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround for Zod v4 resolver generic inference with react-hook-form
    resolver: zodResolver(updateUserSchema) as any,
    defaultValues: {
      name: user.name || "",
      email: user.email,
      role: user.role,
      pin: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: user.name || "",
        email: user.email,
        role: user.role,
        pin: "",
      });
    }
  }, [open, user, reset]);

  if (!open) return null;

  async function onSubmit(data: EditUserFormValues) {
    try {
      const payload: EditUserFormValues = {
        name: data.name,
        email: data.email,
        role: data.role,
      };

      if (data.pin && data.pin.trim() !== "") {
        payload.pin = data.pin.trim();
      }

      const result = await updateUserAction(user.id, payload);

      if (result.error) {
        if ("details" in result && Array.isArray(result.details)) {
          result.details.forEach((err) => {
            if (err.path?.[0]) {
              setError(err.path[0] as keyof EditUserFormValues, {
                type: "server",
                message: err.message,
              });
            }
          });
        } else {
          toast.error(result.error as string);
        }
        return;
      }

      toast.success("User updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Edit User</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              {...register("name")}
              placeholder="John Doe"
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              {...register("email")}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Role</label>
            <select
              {...register("role")}
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ADMIN">Admin</option>
              <option value="CASHIER">Cashier</option>
            </select>
            {errors.role && (
              <p className="text-xs text-destructive mt-1">{errors.role.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Reset 4-Digit POS PIN</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Optional</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              {...register("pin")}
              placeholder="Leave blank to keep existing PIN"
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground font-mono tracking-widest placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.pin && (
              <p className="text-xs text-destructive mt-1">{errors.pin.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Set a new 4-digit numeric PIN for quick POS unlock & cashier switching.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-input hover:bg-muted transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
