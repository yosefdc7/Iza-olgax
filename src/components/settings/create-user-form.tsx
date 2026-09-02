"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { X, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { createUserAction } from "@/app/actions/user-actions";
import { createUserSchema } from "@/lib/user-schemas";

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export function CreateUserForm({ open, onOpenChange, onUserCreated }: CreateUserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround for Zod v4 resolver generic inference with react-hook-form
    resolver: zodResolver(createUserSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      pin: "",
      role: "CASHIER",
    },
  });

  async function onSubmit(data: CreateUserFormValues) {
    try {
      const result = await createUserAction(data);

      if (result.error) {
        if (typeof result.error === "object") {
          Object.entries(result.error as Record<string, string[]>).forEach(([field, msgs]) => {
            setError(field as keyof CreateUserFormValues, {
              type: "server",
              message: msgs[0],
            });
          });
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success(`User ${data.email} created successfully`);
      reset();
      onOpenChange(false);
      onUserCreated?.();
    } catch {
      toast.error("Failed to create user");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-md bg-background rounded-lg shadow-xl border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Add New User</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name *</label>
            <input
              type="text"
              {...register("name")}
              placeholder="John Doe"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email *</label>
            <input
              type="email"
              {...register("email")}
              placeholder="john@example.com"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <PasswordInput
              label="Password *"
              {...register("password")}
              placeholder="At least 4 characters"
              error={errors.password?.message}
              className="flex h-9 rounded-md"
            />
            <p className="text-[11px] text-muted-foreground">Minimum 4 characters (simple text or numbers allowed).</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                <span>4-Digit POS PIN (Optional)</span>
              </label>
              <span className="text-[11px] text-muted-foreground">4 digits</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              {...register("pin")}
              placeholder="e.g. 1234"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono tracking-widest outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {errors.pin && <p className="text-xs text-destructive">{errors.pin.message}</p>}
            <p className="text-[11px] text-muted-foreground">
              Used for quick POS terminal lock/unlock and fast cashier switching.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role *</label>
            <select
              {...register("role")}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="CASHIER">Cashier</option>
              <option value="ADMIN">Admin</option>
            </select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9 rounded-md border border-input hover:bg-muted transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-9 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
