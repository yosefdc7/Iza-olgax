"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { updateOwnPinAction } from "@/app/actions/user-actions";

const changePinFormSchema = z
  .object({
    newPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 numeric digits"),
    confirmPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 numeric digits"),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

type ChangePinFormValues = z.infer<typeof changePinFormSchema>;

interface ChangePinFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangePinForm({ open, onOpenChange, onSuccess }: ChangePinFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePinFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Workaround for Zod v4 resolver generic inference with react-hook-form
    resolver: zodResolver(changePinFormSchema) as any,
    defaultValues: {
      newPin: "",
      confirmPin: "",
    },
  });

  if (!open) return null;

  async function onSubmit(data: ChangePinFormValues) {
    try {
      const result = await updateOwnPinAction(data.newPin);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("4-Digit PIN updated successfully");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update PIN");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Set 4-Digit Quick PIN</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            This 4-digit PIN is used to quickly unlock the register terminal and switch cashiers on POS.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5">New 4-Digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              {...register("newPin")}
              placeholder="••••"
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground font-mono text-center tracking-[0.5em] text-lg placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.newPin && (
              <p className="text-xs text-destructive mt-1">{errors.newPin.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm 4-Digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              {...register("confirmPin")}
              placeholder="••••"
              className="w-full px-3 py-2 rounded-lg border bg-background text-foreground font-mono text-center tracking-[0.5em] text-lg placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.confirmPin && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPin.message}</p>
            )}
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
              Save PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
