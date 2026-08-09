type SlashResponse = {
  text: string;
};

type SlashHandler = (args: { text?: string }) => SlashResponse;

const COMMAND_REGISTRY: Record<string, SlashHandler> = {
  "/demo": () => ({
    text: "Book your live demo: https://calendly.com/shadowspark/demo",
  }),
  "/status": () => ({
    text: `ShadowSpark systems are online. Timestamp: ${new Date().toISOString()}`,
  }),
  "/help": () => ({
    text: "Available commands: /demo, /status, /help",
  }),
};

export function dispatchSlashCommand(command: string, text?: string): SlashResponse {
  const handler = COMMAND_REGISTRY[command];
  if (!handler) {
    return {
      text: "Unknown command. Use /help for available commands.",
    };
  }

  return handler({ text });
}

export function formatSlashResponse(response: SlashResponse): SlashResponse {
  return response;
}
