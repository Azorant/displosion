import { ContextMenuCommandBuilder, MessageContextMenuCommandInteraction } from 'discord.js';
import { BaseCommand } from '../../dist/baseCommand';
import { Bot } from '..';

export default class MessageContextCommand extends BaseCommand<Bot> {
  commandPermissions = [];
  ownerOnly = false;
  command = new ContextMenuCommandBuilder().setName('Message Context').setType(3).toJSON();
  executeContext(_: Bot, interaction: MessageContextMenuCommandInteraction) {
    interaction.reply(`You right clicked on ${interaction.targetMessage.url}`);
  }
}
