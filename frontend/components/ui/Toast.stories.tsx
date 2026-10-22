import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "UI/Toast",
  component: Toast,
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["info", "success", "warning", "error"],
      description: "Feedback status variant of the toast notification",
    },
    message: {
      control: "text",
      description: "Notification message displayed to the user",
    },
    onClose: {
      action: "closed",
      description: "Optional dismissal callback handler",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Info: Story = {
  args: {
    type: "info",
    message: "A new trade proposal has been submitted for review.",
    onClose: () => {},
  },
};

export const Success: Story = {
  args: {
    type: "success",
    message: "Escrow funds have been successfully locked and verified on Stellar.",
    onClose: () => {},
  },
};

export const Warning: Story = {
  args: {
    type: "warning",
    message: "Your network connection is unstable. Pending actions will sync when back online.",
    onClose: () => {},
  },
};

export const ErrorState: Story = {
  args: {
    type: "error",
    message: "Failed to broadcast transaction: Insufficient XLM balance for transaction fee.",
    onClose: () => {},
  },
};

export const WithoutDismiss: Story = {
  args: {
    type: "info",
    message: "Permanent status alert without dismiss button.",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Toast
        type="success"
        message="Listing published to marketplace successfully."
        onClose={() => {}}
      />
      <Toast
        type="info"
        message="Buyer is inspecting the escrow contract."
        onClose={() => {}}
      />
      <Toast
        type="warning"
        message="Trade expires in 15 minutes unless confirmed."
        onClose={() => {}}
      />
      <Toast
        type="error"
        message="Payment confirmation timed out."
        onClose={() => {}}
      />
    </div>
  ),
};
