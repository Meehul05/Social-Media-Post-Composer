import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import App from "../App";
import { store } from "../app/store";
import { clearPost, setPublishedPosts } from "../features/post/postSlice";
import { setDrafts } from "../features/drafts/draftSlice";
import { setScheduledPosts } from "../features/schedule/scheduleSlice";
import { setAuthUser, setTheme } from "../features/auth/authSlice";

describe("Post Composer — Phase 12 Frontend Redesign & Integration Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store.dispatch(clearPost());
    store.dispatch(setDrafts([]));
    store.dispatch(setScheduledPosts([]));
    store.dispatch(setPublishedPosts([]));
    store.dispatch(setTheme("light"));
    store.dispatch(
      setAuthUser({
        id: 1,
        displayName: "Admin",
        email: "admin@example.com",
        role: "ROLE_ADMIN",
      })
    );
  });

  it("renders the Post Composer application shell and navigation", () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    expect(screen.getByText("PostComposer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create post/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /drafts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calendar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /integrations/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("allows the user to enter shared and platform-specific post content", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const textarea = screen.getByPlaceholderText(
      "What do you want to share with your audience?"
    );

    await user.type(textarea, "This is my test post.");
    expect(textarea).toHaveValue("This is my test post.");

    // Switch to Instagram custom content tab
    const igTab = screen.getByRole("tab", { name: /instagram custom/i });
    await user.click(igTab);

    const igTextarea = screen.getByPlaceholderText(
      /Optional custom Instagram caption/i
    );
    await user.type(igTextarea, "Custom IG caption #launch");
    expect(igTextarea).toHaveValue("Custom IG caption #launch");
  });

  it("allows the user to select a platform", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    const instagramButton = screen.getByRole("button", { name: /instagram/i });
    await user.click(instagramButton);
    expect(instagramButton).toHaveClass("pill");
  });

  it("allows a valid post to be saved as a draft", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    await user.click(screen.getByRole("button", { name: /instagram/i }));

    const textarea = screen.getByPlaceholderText(
      "What do you want to share with your audience?"
    );
    await user.type(textarea, "Test draft post");

    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/Draft saved successfully/i)).toBeInTheDocument();
    });
  });

  it("allows a saved draft to be loaded, previewed, and deleted with confirmation", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    await user.click(screen.getByRole("button", { name: /instagram/i }));

    const textarea = screen.getByPlaceholderText(
      "What do you want to share with your audience?"
    );
    await user.type(textarea, "Draft to be loaded");

    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/Draft saved successfully/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /drafts/i }));
    expect(screen.getByText(/Draft to be loaded/)).toBeInTheDocument();

    // Open Delete Confirmation Modal
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByText(/Delete Draft\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Draft to be loaded/)).not.toBeInTheDocument();
    });
  });

  it("rejects an empty post", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    await user.click(screen.getByRole("button", { name: /instagram/i }));
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    expect(
      screen.queryByText(/Draft saved successfully/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Post cannot be empty/i)).toBeInTheDocument();
  });

  it("allows a post to be scheduled and viewed in Scheduled Posts and Calendar", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    await user.click(screen.getByRole("button", { name: /instagram/i }));

    const textarea = screen.getByPlaceholderText(
      "What do you want to share with your audience?"
    );
    await user.type(textarea, "Scheduled test post");

    const dateInput = document.querySelector('input[type="date"]');
    const timeInput = document.querySelector('input[type="time"]');

    await user.clear(dateInput);
    await user.type(dateInput, "2027-01-15");

    await user.clear(timeInput);
    await user.type(timeInput, "10:00");

    await user.click(screen.getByRole("button", { name: /schedule/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Post scheduled successfully/i)
      ).toBeInTheDocument();
    });

    // Navigate to Scheduled Posts view
    await user.click(screen.getByText(/Scheduled Posts/i));
    expect(screen.getByText("Scheduled test post")).toBeInTheDocument();

    // Navigate to Calendar view and toggle Weekly View
    await user.click(screen.getByRole("button", { name: /calendar/i }));
    const weekBtn = screen.getByRole("button", { name: /weekly view/i });
    await user.click(weekBtn);
    expect(weekBtn).toHaveClass("active");
  });

  it("renders Dashboard Overview, Analytics with Sandbox disclosure, Integrations, and Settings", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // 1. Overview
    await user.click(screen.getByRole("button", { name: /overview/i }));
    expect(
      screen.getByText(/Executive Publishing Overview/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Total Pipeline Posts/i)).toBeInTheDocument();

    // 2. Analytics
    await user.click(screen.getByRole("button", { name: /analytics/i }));
    expect(screen.getByText(/Analytics Overview/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Simulated Sandbox Telemetry/i)
    ).toBeInTheDocument();

    // 3. Integrations
    await user.click(screen.getByRole("button", { name: /integrations/i }));
    expect(
      screen.getByText(/Social Platform Integrations/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Sandbox Mode Active/i)).toBeInTheDocument();

    // 4. Settings & Theme toggle
    await user.click(screen.getByRole("button", { name: /settings/i }));
    expect(screen.getByText(/Profile Information/i)).toBeInTheDocument();

    const themeBtn = screen.getByRole("button", {
      name: /Switch to dark theme/i,
    });
    await user.click(themeBtn);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("displays partial-skip warning when Instagram limit is exceeded but LinkedIn passes", async () => {
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Select both Instagram and LinkedIn
    await user.click(screen.getByRole("button", { name: /instagram/i }));
    await user.click(screen.getByRole("button", { name: /linkedin/i }));

    // Set shared content over 2200 chars (valid for LinkedIn <= 3000, invalid for Instagram > 2200)
    store.dispatch(clearPost());
    const longCopy = "A".repeat(2300);
    const textarea = screen.getByPlaceholderText(
      "What do you want to share with your audience?"
    );
    await user.click(textarea);
    await user.paste(longCopy);

    expect(
      screen.getByText(/Publishing will skip Instagram and continue with LinkedIn/i)
    ).toBeInTheDocument();
  });

  it("supports Published Posts history inspection and Authentication modal / Logout flow", async () => {
    const user = userEvent.setup();

    store.dispatch(
      setPublishedPosts([
        {
          id: 901,
          post: "Enterprise launch announcement",
          instagram: true,
          linkedin: true,
          status: "PUBLISHED",
          publishedAt: "2026-11-01T14:00:00.000Z",
          externalInstagramId: "ig_sandbox_901",
          externalLinkedinId: "urn:li:share:sandbox_901",
        },
      ])
    );

    render(
      <Provider store={store}>
        <App />
      </Provider>
    );

    // Navigate to Published Posts
    await user.click(screen.getByRole("button", { name: /published posts/i }));
    expect(
      screen.getByText("Enterprise launch announcement")
    ).toBeInTheDocument();

    // Open Inspect modal
    await user.click(screen.getByRole("button", { name: /inspect/i }));
    expect(
      screen.getByText(/Published Dispatch Details/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^close$/i }));

    // Navigate to Settings and test Logout -> Sign In modal
    await user.click(screen.getByRole("button", { name: /settings/i }));
    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(screen.getByText(/Session Signed Out/i)).toBeInTheDocument();
    });

    // Open Sign In modal from header or banner
    const signInButtons = screen.getAllByRole("button", { name: /sign in/i });
    await user.click(signInButtons[0]);
    expect(
      screen.getByText(/Sign In to PostComposer/i)
    ).toBeInTheDocument();
  });
});
