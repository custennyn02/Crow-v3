require("dotenv/config");
const { Client } = require("discord.js");
const { OpenAI } = require("openai");
const {
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionsBitField,
  Permissions,
  Embed,
  ActivityType,
} = require("discord.js");

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

client.on(Events.ClientReady, (x) => {
  console.log(`${x.user.tag} is ready`);

  const activities = [
    {
      name: "digital birds",
      type: ActivityType.Watching,
    },
    {
      name: "ai spelling bee",
      type: ActivityType.Competing,
    },
    {
      name: "one hand clapping",
      type: ActivityType.Listening,
    },
    {
      name: "am I?",
      type: ActivityType.Playing,
    },
  ];

  setInterval(() => {
    const random = Math.floor(Math.random() * activities.length);
    client.user.setActivity(activities[random]);
  }, 10000);

  const embed = new SlashCommandBuilder()
    .setName("embed")
    .setDescription("This command sends an embed.");

  client.application.commands.create(embed);
});

const IGNORE_PREFIX = "/";
const CHANNELS = ["1194209615144046602"]; // channel id from discord.

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "embed") {
    const embed = new EmbedBuilder()
      .setTitle("Welcome to the murder!") // this should not be setName but setTitle!
      .setDescription("These are the rules that bind us crows.")
      .setAuthor({
        name: "Crow",
        iconURL:
          "https://cdn.discordapp.com/attachments/1193497956482031678/1194270201655599196/plague_Doctor1.png?ex=65afbdcc&is=659d48cc&hm=c747e8f19eb780dbd638650b86dc27c063753c599db8eeecfc9ee641e660ed1c&",
      })
      .setColor(0xfff000) // could also be just 'random'
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/1193497956482031678/1194270201655599196/plague_Doctor1.png?ex=65afbdcc&is=659d48cc&hm=c747e8f19eb780dbd638650b86dc27c063753c599db8eeecfc9ee641e660ed1c&"
      )
      .addFields(
        {
          name: "Rule 1",
          value: "Be Respectful",
          inline: false,
        },
        {
          name: "Rule 2",
          value: "Follow Rule 1",
          inline: false,
        },
        {
          name: "Rule 3",
          value: "Follow the above rules",
          inline: false,
        }
      )
      .setImage(
        "https://cdn.discordapp.com/attachments/1193497956482031678/1194272709165719652/crow.png?ex=65afc022&is=659d4b22&hm=9bf629d724e389f8c3eec45f9b1a01f9028915abbfa2a1cb85da8de39787d588&"
      )
      .setFooter({
        text: "YanZizka",
        iconURL:
          "https://cdn.discordapp.com/attachments/701443358576476271/1194175029366243338/cry.png?ex=65af6529&is=659cf029&hm=151c35b59fda9404fbf030e6dadff2145bee04bf68242c83b3a5cf992443d19b&",
      })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
});

client.on("messageCreate", async (message) => {
  // this is an event listener. atm it listens for anything you send as message on the channel.
  if (message.author.bot) return; // if the author is a bot ignore
  if (message.content.startsWith(IGNORE_PREFIX)) return; // if the content starts with "!" then ignore
  if (
    !CHANNELS.includes(message.channelId) &&
    !message.mentions.users.has(client.user.id)
  )
    return; // if the message is not the specified channel then ignore also if the bot is not pinged ignore.

  await message.channel.sendTyping();

  const sendTypingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 5000);

  let conversation = [];

  conversation.push({
    role: "system",
    content: "Chat GPT is a friendly chatbot.",
  });

  let prevMessages = await message.channel.messages.fetch({ limit: 10 }); // it remembers the previous 10 messages
  prevMessages.reverse(); // I don't get this. research later

  prevMessages.forEach((msg) => {
    if (msg.author.bot && msg.author.id !== client.user.id) return;
    if (msg.content.startsWith(IGNORE_PREFIX)) return;

    const username = msg.author.username
      .replace(/\s+/g, "_")
      .replace(/[^\w\s]/gi, "");

    if (msg.author.id === client.user.id) {
      conversation.push({
        role: "assistant",
        name: username,
        content: msg.content,
      });
    }

    conversation.push({
      role: "user",
      name: username,
      content: msg.content,
    });
  });

  const response = await openai.chat.completions
    .create({
      model: "gpt-3.5-turbo",
      messages: conversation,
    })
    .catch((error) => console.error("OpenAI Error:]\n", error));

  clearInterval(sendTypingInterval);

  if (!response) {
    message.reply(
      "I'm having some trouble with the OpenAI API. Try again in a moment."
    );
    return;
  }

  const responseMessage = response.choices[0].message.content;
  const chunkSizeLimit = 2000;

  for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
    const chunk = responseMessage.substring(i, i + chunkSizeLimit);

    await message.reply(chunk);
  }
});

client.login(process.env.TOKEN);
