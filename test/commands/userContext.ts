import { ContextMenuCommandBuilder, UserContextMenuCommandInteraction } from 'discord.js';
import { BaseCommand } from '../../dist/baseCommand';
import { Bot } from '..';

export default class UserContextCommand extends BaseCommand<Bot> {
  commandPermissions = [];
  ownerOnly = false;
  command = new ContextMenuCommandBuilder().setName('User Context').setType(2).toJSON();
  executeContext(_: Bot, interaction: UserContextMenuCommandInteraction) {
    interaction.reply(`You right clicked on ${interaction.targetUser.username}`);
  }
}
