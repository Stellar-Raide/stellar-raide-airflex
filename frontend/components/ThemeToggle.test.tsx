import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle Component (Issue #471)", () => {
  it("renders light mode icon and accessible label to switch to dark", () => {
    render(<ThemeToggle currentTheme="light" forceMounted={true} />);
    const button = screen.getByRole("button", { name: "Switch to dark mode" });
    expect(button).toBeInTheDocument();
  });

  it("renders dark mode icon and accessible label to switch to light", () => {
    render(<ThemeToggle currentTheme="dark" forceMounted={true} />);
    const button = screen.getByRole("button", { name: "Switch to light mode" });
    expect(button).toBeInTheDocument();
  });

  it("invokes onToggle callback when clicked", () => {
    const handleToggle = jest.fn();
    render(
      <ThemeToggle
        currentTheme="light"
        forceMounted={true}
        onToggle={handleToggle}
      />
    );
    const button = screen.getByRole("button", { name: "Switch to dark mode" });
    fireEvent.click(button);
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });
});
