import type { ClientEvents } from 'discord.js';

export abstract class BaseEvent<Context> {
  abstract event: keyof ClientEvents;
  abstract once: boolean;
  abstract execute(context: Context, ...args: unknown[]): unknown;
}
