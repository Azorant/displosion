import path from 'path';
import { CommandClient } from '../dist/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: './test/.env' });

export class Bot {
  client: CommandClient<Bot>;

  constructor() {
    this.client = new CommandClient({
      context: this,
      commandsPath: path.join(import.meta.dirname, 'commands'),
      eventsPath: path.join(import.meta.dirname, 'events'),
      options: {
        intents: ['Guilds', 'MessageContent', 'GuildMembers'],
      },
    });

    this.client.login(process.env.TOKEN!);
  }
}

new Bot();
