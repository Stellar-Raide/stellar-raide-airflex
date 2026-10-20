import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { NextIntlClientProvider } from "next-intl";
import Navbar from "./Navbar";

const navMessages = {
  Nav: {
    marketplace: "Marketplace",
    sell: "Sell",
    wallet: "Wallet",
    signIn: "Sign In",
    logOut: "Log out",
    balance: "Balance",
    loadingBalance: "Loading…",
    viewProfile: "View your profile",
    primary: "Primary",
    mobilePrimary: "Mobile primary",
    navMenu: "Navigation menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    switchLanguage: "Change language",
  },
};

/**
 * Navbar component stories.
 *
 * Demonstrates the shared persistent navigation bar across guest and
 * authenticated user states, various wallet balances, mobile drawer viewports,
 * and dark mode themes.
 */
const meta: Meta<typeof Navbar> = {
  title: "Components/Navbar",
  component: Navbar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={navMessages}>
        <div className="min-h-[300px] bg-gray-50 dark:bg-gray-950">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  argTypes: {
    initialAuthed: {
      control: "boolean",
      description: "Controls whether the user is simulated as signed in",
    },
    initialBalance: {
      control: "text",
      description: "Mock wallet balance string (e.g. '2,450.00 XLM')",
    },
    initialDrawerOpen: {
      control: "boolean",
      description: "Controls mobile slide-in drawer visibility",
    },
    currentTheme: {
      control: { type: "select" },
      options: ["light", "dark"],
      description: "Active theme mode passed to ThemeToggle",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

/** Default guest view showing "Sign In" CTA and public navigation links. */
export const GuestLoggedOut: Story = {
  name: "Guest (Logged Out)",
  args: {
    initialAuthed: false,
    initialBalance: null,
    initialDrawerOpen: false,
    currentTheme: "light",
  },
};

/** Authenticated user with active wallet balance and masked phone number. */
export const AuthenticatedUser: Story = {
  name: "Authenticated User",
  args: {
    initialAuthed: true,
    initialUser: { phone: "+2348012345678", id: "user-123" },
    initialBalance: "2,450.00 XLM",
    initialDrawerOpen: false,
    currentTheme: "light",
  },
};

/** Authenticated user with zero balance. */
export const ZeroBalanceUser: Story = {
  name: "Zero Balance",
  args: {
    initialAuthed: true,
    initialUser: { phone: "+2348098765432", id: "user-456" },
    initialBalance: "0.00 XLM",
    initialDrawerOpen: false,
    currentTheme: "light",
  },
};

/** Mobile viewport with the slide-in drawer opened. */
export const MobileDrawerOpen: Story = {
  name: "Mobile Drawer Open",
  args: {
    initialAuthed: true,
    initialUser: { phone: "+2348012345678", id: "user-123" },
    initialBalance: "15,000.00 NGN",
    initialDrawerOpen: true,
    currentTheme: "light",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

/** Dark mode navigation bar appearance. */
export const DarkMode: Story = {
  name: "Dark Mode",
  args: {
    initialAuthed: true,
    initialUser: { phone: "+2348012345678", id: "user-123" },
    initialBalance: "500.00 XLM",
    initialDrawerOpen: false,
    currentTheme: "dark",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={navMessages}>
        <div className="dark min-h-[300px] bg-gray-900">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
