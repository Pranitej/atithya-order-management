import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mockApi,
  renderWithProviders,
  requestsMade,
} from "../../../tests/helpers/render";
import { AuthForm } from "./auth-form";

const asha = {
  id: "64b7f0c2a1d3e4f5a6b7c8e1",
  name: "Asha Rao",
  email: "asha@example.com",
  role: "customer" as const,
};

const signedIn = { status: 200, body: { data: { user: asha } } };

/** The JSON body of the first request sent to `path`. */
function bodySentTo(fetchMock: ReturnType<typeof mockApi>, path: string) {
  const call = fetchMock.mock.calls.find(([input]) => String(input) === path);
  return JSON.parse(String(call?.[1]?.body));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthForm signing in", () => {
  it("signs in with the email and password entered", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const fetchMock = mockApi({ "POST /api/v1/auth/login": signedIn });
    renderWithProviders(<AuthForm mode="login" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-9");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(bodySentTo(fetchMock, "/api/v1/auth/login")).toEqual({
      email: "asha@example.com",
      password: "correct-horse-9",
    });
  });

  it("shows the server's reason when sign-in is refused", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    mockApi({
      "POST /api/v1/auth/login": {
        status: 401,
        body: {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email or password is incorrect",
          },
        },
      },
    });
    renderWithProviders(<AuthForm mode="login" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect",
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not contact the server with an email that is not valid", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({});
    renderWithProviders(<AuthForm mode="login" onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "whatever-1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(requestsMade(fetchMock)).toEqual([]);
  });

  it("signs in as the demo customer with one click", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const fetchMock = mockApi({ "POST /api/v1/auth/login": signedIn });
    renderWithProviders(<AuthForm mode="login" onSuccess={onSuccess} />);

    await user.click(
      screen.getByRole("button", { name: "Continue as demo customer" }),
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(bodySentTo(fetchMock, "/api/v1/auth/login")).toEqual({
      email: "asha@atithya.example",
      password: "demo-customer-1",
    });
  });

  it("signs in as the demo kitchen account with one click", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({ "POST /api/v1/auth/login": signedIn });
    renderWithProviders(<AuthForm mode="login" onSuccess={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Continue as kitchen staff" }),
    );

    await waitFor(() =>
      expect(requestsMade(fetchMock)).toEqual(["POST /api/v1/auth/login"]),
    );
    expect(bodySentTo(fetchMock, "/api/v1/auth/login").email).toBe(
      "kitchen@atithya.example",
    );
  });
});

describe("AuthForm creating an account", () => {
  it("registers with the name, email and password entered", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const fetchMock = mockApi({
      "POST /api/v1/auth/register": { ...signedIn, status: 201 },
    });
    renderWithProviders(<AuthForm mode="register" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Your name"), "Asha Rao");
    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-9");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(bodySentTo(fetchMock, "/api/v1/auth/register")).toEqual({
      name: "Asha Rao",
      email: "asha@example.com",
      password: "correct-horse-9",
    });
  });

  it("refuses a password that is too short before contacting the server", async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi({});
    renderWithProviders(<AuthForm mode="register" onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Your name"), "Asha Rao");
    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Use at least 8 characters",
    );
    expect(requestsMade(fetchMock)).toEqual([]);
  });

  it("says when the email already has an account", async () => {
    const user = userEvent.setup();
    mockApi({
      "POST /api/v1/auth/register": {
        status: 409,
        body: {
          error: {
            code: "EMAIL_TAKEN",
            message: "An account with this email already exists",
          },
        },
      },
    });
    renderWithProviders(<AuthForm mode="register" onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText("Your name"), "Asha Rao");
    await user.type(screen.getByLabelText("Email"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-9");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account with this email already exists",
    );
  });
});
