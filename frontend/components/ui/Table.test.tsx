import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Table, THead, TBody, TR, TH, TD, TableEmptyState } from "./Table";

describe("Table UI primitives (#448)", () => {
  it("renders an accessible table with the caption as aria-label", () => {
    render(
      <Table caption="Disputed trades">
        <THead>
          <TR>
            <TH>Trade</TH>
            <TH>Amount</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>abc123</TD>
            <TD>₦1,000</TD>
          </TR>
        </TBody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-label", "Disputed trades");
    expect(screen.getByText("₦1,000")).toBeInTheDocument();
  });

  it("header uses theme tokens with dark-mode variants (legible in both modes)", () => {
    const { container } = render(
      <Table>
        <THead>
          <TR>
            <TH>Col</TH>
          </TR>
        </THead>
        <TBody />
      </Table>,
    );
    const thead = container.querySelector("thead")!;
    expect(thead.className).toContain("dark:bg-gray-800");
    expect(thead.className).toContain("dark:text-gray-400");
    expect(thead.className).toContain("dark:border-gray-700");
    // No hardcoded light-only colours
    expect(thead.className).not.toContain("text-white");
  });

  it("body rows have visible separators and a hover state in both modes", () => {
    const { container } = render(
      <Table>
        <TBody>
          <TR>
            <TD>row 1</TD>
          </TR>
          <TR>
            <TD>row 2</TD>
          </TR>
        </TBody>
      </Table>,
    );
    const tbody = container.querySelector("tbody")!;
    expect(tbody.className).toContain("dark:divide-gray-700");
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0].className).toContain("hover:bg-gray-50");
    expect(rows[0].className).toContain("dark:hover:bg-gray-700");
  });

  it("selected row is highlighted accessibly in both modes", () => {
    const { container } = render(
      <Table>
        <TBody>
          <TR selected>
            <TD>selected</TD>
          </TR>
        </TBody>
      </Table>,
    );
    const row = container.querySelector("tbody tr")!;
    expect(row.getAttribute("data-selected")).toBe("true");
    expect(row.className).toContain("bg-violet-50");
    expect(row.className).toContain("dark:bg-violet-900");
  });

  it("empty state spans columns and uses theme tokens", () => {
    const { container } = render(
      <Table>
        <TBody>
          <TR>
            <TableEmptyState colSpan={3}>No records found.</TableEmptyState>
          </TR>
        </TBody>
      </Table>,
    );
    const cell = container.querySelector("td")!;
    expect(cell.getAttribute("colSpan")).toBe("3");
    expect(cell).toHaveTextContent("No records found.");
    expect(cell.className).toContain("dark:text-gray-400");
  });

  it("header cells are scope=col for accessibility", () => {
    const { container } = render(
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
          </TR>
        </THead>
        <TBody />
      </Table>,
    );
    const th = container.querySelector("th")!;
    expect(th.getAttribute("scope")).toBe("col");
  });
});
