const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
client.prefix = config.prefix;
const prefix = config.prefix;
const fs = require('fs');
const moment = require('moment');
const ping = require('minecraft-server-util');
let cooldown = new Set();
let cdseconds = 1;

var userTickets = new Map();

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();


fs.readdir("./commands/", (err, files) => {

  if(err) console.log(err);
  let jsfile = files.filter(f => f.split(".").pop() === "js");
  if(jsfile.length <= 0){
    console.log("Couldn't find commands.");
    return;
  }
  

  jsfile.forEach((f, i) =>{
    let props = require(`./commands/${f}`);
    console.log(`${f} carregado!`);
    client.commands.set(props.help.name, props);
    props.help.aliases.forEach(alias => { 
      client.aliases.set(alias, props.help.name);
  });
});
})

client.on("message", async message => {
  let msg = message.content.toLowerCase();
  if (message.author.bot) return undefined;
  let sender = message.author;
  let user = message.author;

  if (message.content.indexOf(client.prefix) !== 0) return;
  const args = message.content.slice(client.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  let commandFile;

  if(client.commands.has(command)){
    commandFile = client.commands.get(command);
  } else if (client.aliases.has(command)) {
    commandFile = client.commands.get(client.aliases.get(command));
  }
  
  try{
    commandFile.run(client, message, args);
  } catch (e){
    
  };

  if (message.content.toLowerCase() === "s!ticket") {
    const embed = new Discord.RichEmbed()
      .setAuthor(client.user.username, client.user.displayAvatarURL)
      .setDescription("React a esta mensagem para abrir um ticket.")
      .setColor("#F39237");
    message.channel.send(embed).then(embedMessage => {
      embedMessage.react(":ticketreact:695358539715051537");
    });
  }
  
});

client.on("ready", () => {
  console.log(client.user.username + " conectou-se");
  console.log('Estou em ' + client.guilds.size + ' servers');

  const statuses = ["o meu prefix é s!", "veja meus comandos com s!comandos"];

  setInterval(() => {
    let status = statuses[Math.floor(Math.random() * statuses.length)];
    client.user.setActivity(status, { type: "WATCHING" });
  }, 5000);
});


client.on("raw", payload => {
  if (payload.t === "MESSAGE_REACTION_ADD") {
    if (
      payload.d.emoji.name === "ticketreact" ||
      payload.d.emoji.name != "checkreact"
    ) {
      if (payload.d.message_id === "") {
        let channel = client.channels.get(payload.d.channel_id);
        if (channel.messages.has(payload.d.message_id)) {
          return;
        } else {
          channel
            .fetchMessage(payload.d.message_id)
            .then(msg => {
              let reaction = msg.reactions.get(
                ":ticketreact:695358539715051537"
              );
              let user = client.users.get(payload.d.user_id);
              client.emit("messageReactionAdd", reaction, user);
              reaction.remove(user);
            })
            .catch(err => console.log(err));
        }
      }
    } else if (payload.d.emoji.name === "checkreact") {
      let channel = client.channels.get(payload.d.channel_id);
      if (channel.messages.has(payload.d.message_id)) {
        return;
      } else {
        channel.fetchMessage(payload.d.message_id).then(msg => {
          let reaction = msg.reactions.get(":checkreact:695358759165362186");
          let user = client.users.get(payload.d.user_id);
          client.emit("messageReactionAdd", reaction, user);
        });
      }
    }
  }
});

client.on("messageReactionAdd", (reaction, user) => {
  if (reaction.emoji.name === "ticketreact") {
    if (
      userTickets.has(user.id) ||
      reaction.message.guild.channels.some(
        channel => channel.name.toLowerCase() === user.username + "-ticket"
      )
    ) {
      user.send("Voce ja tem um ticket!");
    } else {
      let guild = reaction.message.guild;
      guild.createChannel(`${user.username}-ticket`, {
          type: "text",
          permissionOverwrites: [
            {
              allow: "VIEW_CHANNEL",
              id: user.id
            },
            {
              deny: "VIEW_CHANNEL",
              id: guild.id
            },
            {
              allow: "VIEW_CHANNEL",
              id: "689062523751628859"
            },
            {
              allow: "VIEW_CHANNEL",
              id: "689856906650845212"
            },
            {
              allow: "VIEW_CHANNEL",
              id: "689062524381036583"
            },
            {
              allow: "VIEW_CHANNEL",
              id: "689062524963913747"
            },
            {
              allow: "VIEW_CHANNEL",
              id: "689062525488201786"
            }
          ]
        })
        .then(ch => {
          userTickets.set(user.id, ch.id);
          let embed = new Discord.RichEmbed();
          embed.setTitle("Ticket Suporte");
          embed.setDescription(
            "Por favor explique o seu problema e um staff tentara ajuda-lo.\n\nDe react a esta mensagem para poder fechar o ticket."
          );
          embed.setColor("#40BCD8");
          ch.send(embed).then(embedMessage => {
            embedMessage.react(":checkreact:695358759165362186");
          });
        })
        .catch(err => console.log(err));
    }
  } else if (reaction.emoji.name === "checkreact") {
    if (userTickets.has(user.id)) {
      if (reaction.message.channel.id === userTickets.get(user.id)) {
        let embed = new Discord.RichEmbed();
        embed.setDescription("Ticket ira ser fechado em 5 segundos.");
        reaction.message.channel.send(embed);
        userTickets.delete(user.id);
        setTimeout(() => {
          reaction.message.channel
            .delete("closing ticket")
            .then(channel => {
              console.log("Deleted " + channel.name);
            })
            .catch(err => console.log(err));
        }, 5000);
      }
    } else if (
      reaction.message.guild.channels.some(
        channel => channel.name.toLowerCase() === user.username + "-ticket"
      )
    ) {
      let embed = new Discord.RichEmbed();
      embed.setDescription("Ticket ira ser fechado em 5 segundos.");
      reaction.message.channel.send(embed);
      userTickets.delete(user.id);
      setTimeout(() => {
        reaction.message.guild.channels.forEach(channel => {
          if (channel.name.toLowerCase() === user.username + "-ticket") {
            channel
              .delete()
              .then(ch => console.log("Deleted Channel " + ch.id));
          }
        });
      }, 5000);
    }
  }
});

client.login(process.env.TOKEN);
