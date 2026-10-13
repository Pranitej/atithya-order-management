"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import {
  type DeliveryDetails,
  type DeliveryDetailsInput,
  deliveryDetailsSchema,
} from "@/shared/schemas";

type CheckoutFormProps = {
  onSubmit: (details: DeliveryDetails) => void;
  submitting: boolean;
  defaultName?: string;
  /** Field errors returned by the API, keyed like "customer.phone". */
  serverErrors?: Record<string, string[]>;
};

export function CheckoutForm({
  onSubmit,
  submitting,
  defaultName = "",
  serverErrors,
}: CheckoutFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryDetailsInput, unknown, DeliveryDetails>({
    // The same schema the API validates with, so the two can never disagree.
    resolver: zodResolver(deliveryDetailsSchema),
    defaultValues: { name: defaultName, address: "", phone: "" },
  });

  const errorFor = (field: keyof DeliveryDetailsInput) =>
    errors[field]?.message ?? serverErrors?.[`customer.${field}`]?.[0];

  return (
    <form
      noValidate
      onSubmit={handleSubmit((details) => onSubmit(details))}
      className="flex flex-col gap-5"
    >
      <TextField
        id="checkout-name"
        label="Full name"
        autoComplete="name"
        error={errorFor("name")}
        {...register("name")}
      />
      <TextAreaField
        id="checkout-address"
        label="Delivery address"
        autoComplete="street-address"
        hint="Flat or house number, street, area and PIN code."
        error={errorFor("address")}
        {...register("address")}
      />
      <TextField
        id="checkout-phone"
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="The rider calls this number if they cannot find you."
        error={errorFor("phone")}
        {...register("phone")}
      />

      <Button type="submit" size="lg" block loading={submitting}>
        Place order
      </Button>
      <p className="-mt-2 text-center text-sm text-muted">
        Pay the rider by cash or UPI when your food arrives.
      </p>
    </form>
  );
}
