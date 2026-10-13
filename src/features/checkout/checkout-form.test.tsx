import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CheckoutForm } from "./checkout-form";

const name = () => screen.getByLabelText("Full name");
const address = () => screen.getByLabelText("Delivery address");
const phone = () => screen.getByLabelText("Phone number");
const placeOrder = () => screen.getByRole("button", { name: "Place order" });

async function fillValidDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(name(), "Asha Rao");
  await user.type(address(), "12 MG Road, Indiranagar, Bengaluru 560038");
  await user.type(phone(), "+91 98765 43210");
}

describe("CheckoutForm", () => {
  it("submits the delivery details in the form the API expects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CheckoutForm onSubmit={onSubmit} submitting={false} />);

    await user.type(name(), "  Asha Rao ");
    await user.type(address(), "12 MG Road, Indiranagar, Bengaluru 560038");
    await user.type(phone(), "+91 98765 43210");
    await user.click(placeOrder());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Asha Rao",
      address: "12 MG Road, Indiranagar, Bengaluru 560038",
      phone: "+919876543210",
    });
  });

  it("asks for every missing detail and does not submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CheckoutForm onSubmit={onSubmit} submitting={false} />);

    await user.click(placeOrder());

    expect(name()).toBeInvalid();
    expect(address()).toBeInvalid();
    expect(phone()).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("explains what is wrong with a phone number", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CheckoutForm onSubmit={onSubmit} submitting={false} />);
    await fillValidDetails(user);

    await user.clear(phone());
    await user.type(phone(), "12345");
    await user.click(placeOrder());

    expect(phone()).toBeInvalid();
    expect(phone()).toHaveAccessibleDescription(
      "Enter a valid phone number (10 to 15 digits)",
    );
    expect(name()).toBeValid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an address too short to deliver to", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CheckoutForm onSubmit={onSubmit} submitting={false} />);
    await fillValidDetails(user);

    await user.clear(address());
    await user.type(address(), "Flat 2");
    await user.click(placeOrder());

    expect(address()).toHaveAccessibleDescription(
      "Enter your full delivery address",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears an error once the field is corrected", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm onSubmit={vi.fn()} submitting={false} />);
    await user.click(placeOrder());
    expect(name()).toBeInvalid();

    await user.type(name(), "Asha Rao");

    expect(name()).toBeValid();
  });

  it("starts with the account holder's name filled in", () => {
    render(
      <CheckoutForm
        onSubmit={vi.fn()}
        submitting={false}
        defaultName="Asha Rao"
      />,
    );

    expect(name()).toHaveValue("Asha Rao");
  });

  it("shows a problem the server found next to the field it concerns", () => {
    render(
      <CheckoutForm
        onSubmit={vi.fn()}
        submitting={false}
        serverErrors={{
          "customer.phone": ["Enter a valid phone number (10 to 15 digits)"],
        }}
      />,
    );

    expect(phone()).toBeInvalid();
    expect(phone()).toHaveAccessibleDescription(
      "Enter a valid phone number (10 to 15 digits)",
    );
  });

  it("cannot be submitted twice while the order is being placed", () => {
    render(<CheckoutForm onSubmit={vi.fn()} submitting={true} />);

    const button = screen.getByRole("button", { name: /place order/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
