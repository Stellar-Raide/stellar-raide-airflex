import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import ThemeToggle from "./ThemeToggle";

/**
 * ThemeToggle stories.
 *
 * Demonstrates the theme toggle button across light and dark modes,
 * including interactive switching, accessible aria labels, and SSR placeholder states.
 */
const meta: Meta<typeof ThemeToggle> = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  argTypes: {
    currentTheme: {
      control: { type: "select" },
      options: ["light", "dark"],
      description: "Controls the active visual theme state",
    },
    forceMounted: {
      control: "boolean",
      description: "Bypasses SSR hydration wait for immediate story rendering",
    },
    onToggle: {
      action: "toggled",
      description: "Fires when user clicks the toggle button",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

/** Light mode — renders moon icon with accessible label "Switch to dark mode". */
export const LightMode: Story = {
  name: "Light Mode",
  args: {
    currentTheme: "light",
    forceMounted: true,
  },
  parameters: {
    backgrounds: { default: "light" },
  },
};

/** Dark mode — renders sun icon with accessible label "Switch to light mode". */
export const DarkMode: Story = {
  name: "Dark Mode",
  args: {
    currentTheme: "dark",
    forceMounted: true,
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};

/** Interactive wrapper maintaining toggle state for live preview testing. */
export const Interactive: Story = {
  name: "Interactive State",
  render: (args = {}) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [theme, setTheme] = useState<"light" | "dark">(args.currentTheme ?? "light");
    return (
      <div className={`p-8 rounded-xl ${theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Active theme: {theme}</span>
          <ThemeToggle
            {...args}
            currentTheme={theme}
            forceMounted={true}
            onToggle={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              args.onToggle?.();
            }}
          />
        </div>
      </div>
    );
  },
  args: {
    currentTheme: "light",
    forceMounted: true,
  },
};

/** SSR placeholder before client-side hydration completes. */
export const UnmountedPlaceholder: Story = {
  name: "Unmounted (SSR Placeholder)",
  args: {
    forceMounted: false,
  },
};
