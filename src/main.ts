import { dirname, importx } from '@discordx/importer';
import { Message, Interaction, TextBasedChannel, Snowflake, GuildMember, Role, RoleManager, User } from 'discord.js';
import { IntentsBitField, ChannelType } from 'discord.js';
import { Client } from 'discordx';
import { announcementsByStatusAndID, instanceByID } from './utils/queries.js';
import AnnouncementMessage from './utils/Message.js';
import { getCET } from './utils/time.js';
import sanityClient from '@sanity/client';

const { BOT_TOKEN, SANITY_TOKEN, SANITY_PROJECT, INTERVAL_MINUTES } = process.env;

export const bot = new Client({
  // To use only guild command
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],

  // Debug logs are disabled in silent mode
  silent: false,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: '!',
  },
});

bot.once('ready', async () => {
  // Make sure all guilds are cached
  // await bot.guilds.fetch();

  // Synchronize applications commands with Discord
  await bot.initApplicationCommands();

  // To clear all guild commands, uncomment this line,
  // This is useful when moving from guild commands to global commands
  // It must only be executed once
  //
  //  await bot.clearApplicationCommands(
  //    ...bot.guilds.cache.map((g) => g.id)
  //  );

  console.log('Bot started');

  // Set timer for checking and sending out announcements
  const interval = 1000 * 60 * Number(INTERVAL_MINUTES);

  const check = async () => {
    // Get all upcoming announcements
    const announcements = await sanity.fetch(announcementsByStatusAndID, {
      isPosted: false, // Match announcements that haven't been posted yet
      currentTime: getCET() // Match announcements that are scheduled after current time
    });

    for (const announcement of announcements) {
      if (announcement.isPosted) {
        return
      }

      const [instance] = await sanity.fetch(instanceByID, { id: announcement.instance._ref });

      const res = await sanity.patch(announcement._id).set({
        isPosted: true
      }).commit();

      let recipientUsers: Set<User> = new Set();
      let recipientChannels: Set<TextBasedChannel> = new Set();

      const guild = await bot.guilds.fetch(instance.discordGuildId);

      // Get users from recipient roles
      await guild.members.fetch();
      const guildRoles = await guild.roles.fetch();

      for (const guildRole of guildRoles.values()) {
        if (announcement.recipient_roles.includes(guildRole.name)) {
          const role = await guild.roles.fetch(guildRole.id);

          role?.members.map(({ user }) => {
            if (!user.bot) {
              recipientUsers.add(user);
            }
          });
        }
      }

      // Get recipient channels
      for (const channelID of announcement.recipient_channels) {
        const channel = (await guild.channels.fetch(channelID) as TextBasedChannel);

        // Ensure channel exists and is text compatible
        if (channel.type !== ChannelType.GuildText) {
          return
        }

        recipientChannels.add(channel);
      }

      // Compose message
      const message = new AnnouncementMessage({ 
        link: announcement.link,
        title: announcement.title,
        description: announcement.text,
        subdomain: instance.subdomain,
        instanceTitle: instance.title,
        icon: instance.smallLogo.asset.url,
        color: instance.highlightColor 
      });

      // Send to recipient channels
      for (const channel of recipientChannels) {
        await channel.send(message);
      }

      // Send to recipient users
      for (const recipient of recipientUsers) {
        await recipient.send(message);
      }
    }
  }

  await check();
  setInterval(async () => {
    await check();
  }, interval);

});

bot.on('interactionCreate', (interaction: Interaction) => {
  bot.executeInteraction(interaction);
});

bot.on('messageCreate', (message: Message) => {
  bot.executeCommand(message);
});

export const sanity = sanityClient({
  projectId: SANITY_PROJECT,
  dataset: 'production',
  apiVersion: 'v2021-10-21',
  token: SANITY_TOKEN,
  useCdn: false
});

async function run() {
  // The following syntax should be used in the commonjs environment
  //
  // await importx(__dirname + '/{events,commands}/**/*.{ts,js}');

  // The following syntax should be used in the ECMAScript environment
  await importx(`${dirname(import.meta.url)}/{events,commands}/**/*.{ts,js}`);

  // Let's start the bot
  if (!BOT_TOKEN) {
    throw Error('Could not find BOT_TOKEN in your environment');
  }

  // Log in with your bot token
  await bot.login(BOT_TOKEN);
}

run();