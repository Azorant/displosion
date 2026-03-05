import {
  SlashCommandBuilder,
  CommandInteraction,
  AutocompleteInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { BaseCommand } from '../../dist/baseCommand.js';
import type { Bot } from '../index.js';

export default class TestCommand extends BaseCommand<Bot> {
  command = new SlashCommandBuilder()
    .setName('test')
    .setDescription('A test command')
    .addStringOption((option) =>
      option.setName('auto').setDescription('Autocomplete option').setAutocomplete(true).setRequired(true),
    )
    .toJSON();
  commandPermissions = [];
  ownerOnly = false;
  executeCommand(_: Bot, interaction: CommandInteraction) {
    interaction.reply({
      content: `(●'◡'●)\nYou entered: ${interaction.options.get('auto')?.value}`,
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId('test:button').setLabel('Button').setStyle(ButtonStyle.Success),
          )
          .toJSON(),
      ],
    });
  }
  executeAutocomplete(_: Bot, interaction: AutocompleteInteraction) {
    const focusedValue = interaction.options.getFocused();
    const choices = ['apple', 'banana', 'orange'];
    const filtered = choices.filter((choice) => choice.startsWith(focusedValue));
    interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
  }
  executeComponent(_: Bot, interaction: ButtonInteraction) {
    interaction.reply('You clicked the button!');
  }
}
