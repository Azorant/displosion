import { ConsoleTransport, Logger } from 'acordia';
import {
  Client,
  Collection,
  Colors,
  MessageFlags,
  Routes,
  SlashCommandBuilder,
  Team,
  User,
  type ClientOptions,
  type CommandInteractionOption,
  type Interaction,
  type RESTPutAPIApplicationCommandsResult,
  type RESTPutAPIApplicationGuildCommandsResult,
} from 'discord.js';
import { existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { BaseCommand, type CommandPermissions } from './baseCommand.js';
import { BaseEvent } from './baseEvent.js';

class CommandClient<Context> extends Client {
  commands = new Collection<string, BaseCommand<Context>>();
  events = new Collection<string, BaseEvent<Context>>();
  context: Context;
  logger = Logger.createInstance('CommandClient').addTransport(new ConsoleTransport());

  constructor(options: {
    /**
     * Context to be passed to commands and events
     *
     * @type {Context}
     */
    context: Context;

    /**
     * Discord.js client options
     *
     * @type {ClientOptions}
     */
    options: ClientOptions;

    /**
     * Directory to commands
     *
     * @type {string}
     */
    commandsPath?: string;

    /**
     * Directory to events
     *
     * @type {string}
     */
    eventsPath?: string;
  }) {
    super(options.options);
    this.context = options.context;
    this.loadCommands(options.commandsPath || '');
    this.loadEvents(options.eventsPath || '');
  }

  /**
   * Load command files
   *
   * @memberof CommandClient
   */
  async loadCommands(directory: string) {
    if (!directory) return;
    this.commands.clear();
    if (!existsSync(pathToFileURL(directory))) return this.logger.warning(`Unable to load commands`);
    const files = readdirSync(pathToFileURL(directory));
    for (const file of files) {
      const module = await this.loadModule<BaseCommand<Context>>(path.join(directory, file));
      if (module) this.commands.set(module.command.name, module);
    }
    this.logger.info(`Loaded ${this.commands.size} commands`);
  }

  /**
   * Load event files
   *
   * @memberof CommandClient
   */
  async loadEvents(directory: string) {
    this.removeAllListeners();
    this.on('interactionCreate', (interaction) => this.handleCommand(interaction));
    if (!directory) return;
    this.events.clear();
    if (!existsSync(pathToFileURL(directory))) return this.logger.warning(`Unable to load events`);
    const files = readdirSync(pathToFileURL(directory));
    for (const file of files) {
      const fileURL = !global.require ? path.join(directory, file) : pathToFileURL(path.join(directory, file));

      const fileStats = statSync(fileURL);

      if (fileStats.isDirectory()) {
        const items = readdirSync(fileURL);
        for (const item of items) {
          const itemURL = !global.require
            ? path.join(directory, file, item)
            : pathToFileURL(path.join(directory, file, item));

          const itemStats = statSync(itemURL);
          if ((itemStats.isFile() && item.endsWith('js')) || item.endsWith('ts')) {
            const module = await this.loadModule<BaseEvent<Context>>(path.join(directory, file, item));
            if (module) {
              this.events.set(item, module);
              this[module.once ? 'once' : 'on'](module.event, (...args) => module.execute(this.context, ...args));
            }
          }
        }
      } else {
        const module = await this.loadModule<BaseEvent<Context>>(path.join(directory, file));
        if (module) {
          this.events.set(file, module);
          this[module.once ? 'once' : 'on'](module.event, (...args) => module.execute(this.context, ...args));
        }
      }
    }
    this.logger.info(`Loaded ${this.events.size} events`);
  }

  private async loadModule<T>(file: string) {
    if (path.basename(file).startsWith('_')) return null;
    let hasRequire = false;

    if (require) {
      hasRequire = true;
      delete require.cache[require.resolve(file)];
    }

    try {
      const Module = await import(hasRequire ? file : pathToFileURL(file).href + `?t=${Date.now()}`);
      const module: T = new Module.default();
      return module;
    } catch (error) {
      this.logger.error(`Error loading module ${file}:`, error);
      return null;
    }
  }

  private async handleCommand(interaction: Interaction) {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = this.commands.get(interaction.commandName);
      if (!command) return;

      const log = `${interaction.inGuild() ? `${interaction.guild?.name} (${interaction.guildId})` : 'DM'} | ${interaction.user.username} (${interaction.user.id}) | /${interaction.commandName} ${this.parseArg(interaction.options.data)}`;

      if (command.ownerOnly) {
        const owner = this.application?.owner ?? (await this.application?.fetch())?.owner;
        if (!owner) {
          this.logger.error('Unable to check application owner |', log);
          return;
        }
        let isOwner = false;
        if (owner instanceof User && owner.id === interaction.user.id) isOwner = true;
        if (owner instanceof Team && owner.members.find((m) => m.id === interaction.user.id)) isOwner = true;
        if (!isOwner) {
          this.logger.warning('Non-owner trying to run command |', log);
          return;
        }
      }

      if (interaction.inGuild() && command.commandPermissions.length) {
        const missing = interaction.memberPermissions.missing(command.commandPermissions, true);
        if (missing.length) {
          await interaction.reply({
            embeds: [
              {
                title: 'Missing Permissions',
                description: `You need the following permissions to run this command: ${missing.join(', ')}`,
                color: Colors.Yellow,
              },
            ],
            flags: MessageFlags.Ephemeral,
          });
          this.logger.warning('Missing Permissions |', log);
          return;
        }
      }

      try {
        if (interaction.isChatInputCommand() && command.executeCommand) {
          await command.executeCommand(this.context, interaction);
        } else if (interaction.isContextMenuCommand() && command.executeContext) {
          await command.executeContext(this.context, interaction);
        }
        this.logger.success(log);
      } catch (error) {
        this.logger.error(log, error);
      }
    } else if (interaction.isAutocomplete()) {
      const command = this.commands.get(interaction.commandName);
      if (!command || !command.executeAutocomplete) return;

      try {
        await command.executeAutocomplete(this.context, interaction);
      } catch (error) {
        this.logger.error(`Error executing autocomplete for /${interaction.commandName}:`, error);
      }
    } else if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
      const [commandName] = interaction.customId.split(':');
      const command = this.commands.get(commandName!);
      if (!command || !command.executeComponent) return;
      try {
        await command.executeComponent(this.context, interaction);
      } catch (error) {
        this.logger.error(`Error executing component for ${interaction.customId}:`, error);
      }
    }
  }

  /**
   * Register slash commands to discord
   *
   * @memberof CommandClient
   */
  async registerCommands(guildId?: string) {
    if (guildId) {
      const guild = this.guilds.cache.get(guildId);
      if (!guild) return this.logger.warning('Unable to get dev guild to deploy commands');
      this.logger.info(`Deploying commands to ${guild.name}`);
      const commands = this.commands.map((command) =>
        command.command instanceof SlashCommandBuilder ? command.command.toJSON() : command.command,
      );
      const data = (await this.rest.put(Routes.applicationGuildCommands(this.user!.id, guild.id), {
        body: commands,
      })) as RESTPutAPIApplicationGuildCommandsResult;
      this.logger.success(`Deployed ${data.length} commands`);
    } else if (process.env.DEPLOY_COMMANDS) {
      this.logger.info(`Deploying commands globally`);
      const commands = this.commands.map((command) =>
        command.command instanceof SlashCommandBuilder ? command.command.toJSON() : command.command,
      );
      const data = (await this.rest.put(Routes.applicationCommands(this.user!.id), {
        body: commands,
      })) as RESTPutAPIApplicationCommandsResult;
      this.logger.success(`Deployed ${data.length} commands`);
    }
  }

  private parseArg(options: readonly CommandInteractionOption[]) {
    const args: string[] = [];
    for (const option of options) {
      if (option.options?.length) {
        args.push(`${option.name} ${this.parseArg(option.options)}`);
      } else {
        args.push(`${option.name}:${option.value}`);
      }
    }
    return args;
  }
}

export { CommandClient, BaseCommand, BaseEvent, type CommandPermissions };
