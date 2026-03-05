import type {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  PermissionFlags,
  CommandInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  AnySelectMenuInteraction,
  ModalSubmitInteraction,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';

export type CommandPermissions = Array<keyof PermissionFlags>;

export abstract class BaseCommand<Context> {
  abstract command: RESTPostAPIChatInputApplicationCommandsJSONBody | RESTPostAPIContextMenuApplicationCommandsJSONBody;
  abstract commandPermissions: CommandPermissions;
  abstract ownerOnly: boolean;
  executeCommand?(context: Context, interaction: CommandInteraction): unknown;
  executeAutocomplete?(context: Context, interaction: AutocompleteInteraction): unknown;
  executeComponent?(
    context: Context,
    interaction: ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction,
  ): unknown;
  executeContext?(
    context: Context,
    interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction,
  ): unknown;
}
