import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: (
    <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>
      🌀 AirFlex Docs
    </span>
  ),
  project: {
    link: "https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex",
  },
  chat: {
    link: "https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/discussions",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.03 2 11c0 2.83 1.45 5.36 3.73 7.02L5 22l4.36-1.63A11.6 11.6 0 0 0 12 20c5.52 0 10-4.03 10-9S17.52 2 12 2z" />
      </svg>
    ),
  },
  docsRepositoryBase: "https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex/blob/main/apps/docs-site",
  // Nextra's built-in Flexsearch index covers every page under `pages/`
  // automatically — no additional wiring required for the search bar
  // in the top nav.
  search: {
    placeholder: "Search the docs…",
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
  editLink: {
    text: "Edit this page on GitHub →",
  },
  feedback: {
    content: "Question? Give us feedback →",
    labels: "feedback",
  },
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} ©{" "}
        <a href="https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex" target="_blank" rel="noreferrer">
          AirFlex
        </a>
        . API Reference and Contract Reference pages are generated at build
        time — see <code>apps/docs-site/scripts/</code>.
      </span>
    ),
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s – AirFlex Docs",
    };
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta
        name="description"
        content="AirFlex documentation — Getting Started, API Reference, Contract Reference, SDK Reference, Deployment, and Contributing."
      />
    </>
  ),
};

export default config;
