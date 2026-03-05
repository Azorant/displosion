import { ClientEvents } from 'discord.js';
import { Bot } from '..';
import { BaseEvent } from '../../dist';

export default class ReadyEvent extends BaseEvent<Bot> {
  event: keyof ClientEvents = 'ready';
  once = false;
  execute(context: Bot) {
    console.log('Ready');
    context.client.registerCommands(process.env.GUILD!);
  }
}
