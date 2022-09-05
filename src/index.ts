import { Client, MessageEmbed } from 'discord.js';
import { capitalize } from 'lodash';
import * as db from 'quick.db';
// import config from './config.json' assert {type: 'json'};
const config = require('../config.json');

const client = new Client();
const prefix = config.prefix

client.on('ready', () => console.log('oatmealsucks bot is now online'))

function msToTime(s) {
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;

    return hrs + 'h ' + mins + 'm ' + secs + 's!';
}

function kStringToInt(val: any) {
    if (!val) return undefined;
    if (isNaN(val)) {
        let multiplier = val.substr(-1)?.toLowerCase();
        if (multiplier == 'k') return parseFloat(val) * 1000;
        else if (multiplier == 'm') return parseFloat(val) * 1000000;
    } else {
        return parseInt(val);
    }
}

function displayGold(x: number | string) {
    if (!x) return 0;
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

type Snowflake = string;

type playerType = {
    gold: number,
    inv: {
        milk: number,
        oat: number,
        oatmeal: number
    },
    username: string,
    id: Snowflake,
    lastDaily: number
}

client.on('message', async msg => {
    if (!msg.guild) console.log("returning 1"); return;
    if (msg.author.bot) console.log("returning 2"); return;
    if (!msg.content.toLocaleLowerCase().startsWith(prefix)) console.log("returning 3"); return;

    let args = msg.content.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();
    let id = msg.author.id;
    let player: playerType = JSON.parse(await db.fetch(`player_${id}`));
    if (!player) {
        player = { id, username: msg.author.username, inv: { oatmeal: 1, milk: 0, oat: 0 }, gold: 0, lastDaily: 0 }
        await db.set(`player_${id}`, JSON.stringify(player))
        msg.channel.send(new MessageEmbed().setColor(0xf5e0e6).setTitle(`${msg.author.username}, Welcome to Oatmeal bot`).setDescription('oatmeal.'))
    }

    if (player.gold === null) player.gold = 0;
    if (player.inv.milk === null) player.inv.milk = 0;
    if (player.inv.oat === null) player.inv.oat = 0;
    if (player.inv.oatmeal === null) player.inv.oatmeal = 0;


    let validItems = [
        'oatmeal',
        'oat',
        'milk'
    ]


    switch (command) {
        case 'inv':
        case 'inventory':
        case 'bal':
        case 's':
        case 'stats':
        case 'is':

            let embed = new MessageEmbed()
                .setDescription(`Gold: ${displayGold(player.gold)}\n\nOatmeal: ${displayGold(player.inv.oatmeal)}\nOats: ${displayGold(player.inv.oat)}\nMilk: ${displayGold(player.inv.milk)}`)
                .setColor(0xf5e0e6)

            msg.channel.send(embed)
            break;

        case 'make':
        case 'craft':
            //@ts-ignore
            if (args[0] && (isNaN(kStringToInt(args[0])) && args[0] != 'all')) return msg.channel.send(new MessageEmbed().setColor(0xff0000).setDescription('first argument must be a number'))

            let amount = args[0] ? kStringToInt(args[0] || 1) : 1;

            if(args[0] == 'all') amount = player.inv.milk > player.inv.oat ? player.inv.oat : player.inv.milk // get the lower of the two numbers

            if(amount == 0) amount = 1; 

            if (player.inv.milk < amount || player.inv.oat < amount) {
                let needed;
                if (player.inv.milk < amount && player.inv.oat < amount) needed = `You need: \n${displayGold(amount - player.inv.milk)} more milk\n${displayGold(amount - player.inv.oat)} more oat`
                else if (player.inv.milk < amount) needed = `You need: \n${displayGold(amount - player.inv.milk)} more milk`
                else if (player.inv.oat < amount) needed = `You need: \n${displayGold(amount - player.inv.oat)} more oat`
                return msg.channel.send(new MessageEmbed().setColor(0xFF0000).setTitle('Craft failed!').setDescription(`You need ${needed}`))
            }

            //@ts-ignore
            player.inv.milk -= parseInt(amount);//@ts-ignore
            player.inv.oat -= parseInt(amount);//@ts-ignore
            player.inv.oatmeal += parseInt(amount);

            msg.channel.send(
                new MessageEmbed()
                    .setColor(0x00FF00)
                    .setDescription(`successfully crafted ${displayGold(amount)} oatmeal`)
                    .setFooter(`${displayGold(player.inv.milk)} milk and ${displayGold(player.inv.oat)} oat remaining`)
            )

            break;

        case 'buy':

            let itemID = args[0];//.toLowerCase();
            let itemPrice = itemID == 'oatmeal' ? 11 : 5;
            let price = kStringToInt(args[1] || 1) * itemPrice

            let buyAm = kStringToInt(args[1] || 1);

            if(buyAm == 0) buyAm = 1;
            if(isNaN(buyAm)) buyAm = 1;

            if (!validItems.includes(itemID)) return msg.channel.send(
                new MessageEmbed()
                    .setColor(0xFF0000)
                    .setTitle('Buy failed!')
                    .setDescription('Invalid itemID')
            )

            if (price > player.gold) return msg.channel.send(
                new MessageEmbed()
                    .setColor(0xFF0000)
                    .setTitle('Buy failed!')
                    .setDescription(`You need ${displayGold(price - player.gold)} more gold`)
            )

            player.inv[itemID] += buyAm
            player.gold -= price;

            msg.channel.send(
                new MessageEmbed()
                    .setColor(0x00ff00)
                    .setDescription(`successfully bought ${displayGold(buyAm)} ${capitalize(itemID)}`)
                    .setFooter(`You now have ${displayGold(player.gold - price)} gold left`)
            )

            break;

        case 'shop':
        case 'market':
        case 's':
            msg.channel.send(
                new MessageEmbed()
                    .setColor(0x00ff00)
                    .addField('Oatmeal', '11 gold')
                    .addField('Oat', '5 gold')
                    .addField('Milk', '5 gold')
            )
            break;

        case 'lb':
        case 'leaderboard':
            let all = await db.all().map(x => JSON.parse(JSON.parse(x.data)));
            let sorted = all.sort((x, y) => y.inv.oatmeal - x.inv.oatmeal)
            if (sorted.length > 15) sorted.length = 15;

            let lbembed = new MessageEmbed()
                .setColor(0xf5e0e6)
                .setTitle(`Oatmeal bot leaderboard`)

            for (let x in sorted) {
                let p = sorted[x];
                lbembed.addField(p.username, `${displayGold(p.inv.oatmeal)} oatmeal`)
            }

            msg.channel.send(lbembed)

            break;


        case 'sell':
            let itemId = args[0].toLowerCase();
            let am = args[1] ? kStringToInt(args[1]) : 1
            let itemPrice2 = itemId == 'oatmeal' ? 11 : 5;

            if (!am) am = 1;
            console.log(am)
//@ts-ignore
            if(am == 'all') am = player.inv[itemId]

            if (!validItems.includes(itemId)) return msg.channel.send(
                new MessageEmbed()
                    .setColor(0xFF0000)
                    .setTitle('Sell failed!')
                    .setDescription('Invalid itemID')
            )

            if (kStringToInt(am) > player.inv[itemId]) return msg.channel.send(
                new MessageEmbed()
                    .setColor(0xFF0000)
                    .setTitle('Sell failed!')
                    .setDescription(`You need ${displayGold(kStringToInt(am) - player.inv[itemId])} more ${itemId}`)
            )

            player.inv[itemId] -= kStringToInt(am)
            player.gold += kStringToInt(am) * itemPrice2;

            msg.channel.send(
                new MessageEmbed()
                    .setColor(0x00ff00)
                    .setDescription(`successfully sold ${displayGold(kStringToInt(am))} ${capitalize(itemId)}`)
                    .setFooter(`You have ${displayGold(player.inv[itemId])} left`)
            )
            break;


        case 'dev':
            if (!config.ownerID.includes(msg.author.id)) return;
            try {
                let prop = args[1];
                let use;

                if (!isNaN(args[1] as any)) {
                    player = await db.fetch(`player_${args[1]}`)
                    prop = args[2];
                }

                prop.split('.').forEach(prop => {
                    use = use ? use[prop] : player[prop];
                });

                switch (args[0].toLowerCase()) {
                    case 'get':
                        let playerProp =
                            player.id === msg.author.id ? '' : `\`{${player.id}}\`.`;
                        msg.channel.send(
                            new MessageEmbed()
                                .setTitle(`\`${typeof use}\` Player.${playerProp}${prop}`)
                                .setDescription(
                                    `\`\`\`ts\n${JSON.stringify(use, null, 4) || 'undefined'
                                    }\n\`\`\`
                      `
                                )
                        );
                        break;
                    case 'set':
                        // we only have up to 3 nested objects
                        let __setter__: any = args
                            .slice(player.id === msg.author.id ? 2 : 3)
                            .map(x => `${x}`)
                            .join(' ')
                            .trim();
                        let isNumber = parseInt(__setter__) != NaN;

                        if (IsJsonString(__setter__)) __setter__ = JSON.parse(__setter__);
                        else if (isNumber) __setter__ = parseInt(__setter__);

                        switch (prop.split('.').length) {
                            case 1:
                                player[prop] = __setter__;
                                break;
                            case 2:
                                player[prop.split('.')[0]][prop.split('.')[1]] = __setter__;
                                break;
                            case 3:
                                player[prop.split('.')[0]][prop.split('.')[1]][
                                    prop.split('.')[2]
                                ] = __setter__;
                                break;
                        }

                        msg.channel.send(
                            new MessageEmbed()
                                .setColor(0x00ff00)
                                .setDescription(
                                    `set property ${prop} \n  value: \`${JSON.stringify(
                                        __setter__
                                    )}\`\ntypeof \`${typeof __setter__}\``
                                )
                                .setFooter(
                                    `usage: ${config.prefix}dev {set/get} {property} {value}`
                                )
                        );
                }
            } catch (err) {
                msg.channel.send(
                    `\`\`\`ts\n${(err as Error).name}: ${(err as Error).message}\n\`\`\``
                );
            }
            break;


        case 'daily':
        case 'retard':

            if (Date.now() - player.lastDaily < 86400000) {
                let diff = 86400000 - (Date.now() - player.lastDaily);
                msg.channel.send(
                    new MessageEmbed()
                        .setColor(16711680)
                        .setDescription(`Wait ${msToTime(diff)} for your next oatmeal.`)
                );
            } else {
                if (!player.inv['oatmeal']) {
                    player.inv['oatmeal'] = 1;
                    player.lastDaily = Date.now();
                    msg.channel.send(
                        new MessageEmbed()
                            .setColor(0x00ff00)
                            .setTitle('Daily reward')
                            .setDescription(
                                `You received \`1x Oatmeal\`!`
                            )
                            .setFooter(`Come back tomorrow!`)
                    );
                } else {
                    player.inv['oatmeal'] += 1;
                    player.lastDaily = Date.now();
                    let embed = new MessageEmbed()
                        .setColor(0x00ff00)
                        .setTitle('Daily reward')
                        .setDescription(
                            `You received \`1x Oatmeal\`!`
                        )
                        .setFooter(`Come back tomorrow!`)
                    msg.channel.send(embed);
                }
            }
            break;

        default:
            break;
    }

    await db.set(`player_${id}`, JSON.stringify(player))


})

client.login(config.token)