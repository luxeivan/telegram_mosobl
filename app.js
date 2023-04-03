const { Telegraf, session, Scenes: { WizardScene, Stage }, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config()
const axios = require('axios')
function auth() {
    return new Promise(
        func1 => {
            axios.post(process.env.URL + '/auth/local', {
                identifier: process.env.LOGIN,
                password: process.env.PASS
            })
                .then(res => {
                    func1(res.data.jwt)
                })
                .catch(err => {
                    console.log(err)
                    func1(null)
                })
        })
}

// const exit_keyboard = Markup.keyboard(['exit']).oneTime()
// const remove_keyboard = Markup.removeKeyboard()

const nameHandler = Telegraf.on('text', async ctx => {
    ctx.scene.state.city = ctx.message.text
    await ctx.reply('Напишите свою улицу:')
    return ctx.wizard.next()
})
const ageHandler = Telegraf.on('text', async ctx => {
    // console.log(ctx.message.from.id)
    let authjwt = ''
    await auth().then(jwt => authjwt = jwt)
    axios.get(process.env.URL + `/telegram-subscribers?filters[userId][$eq]=${ctx.message.from.id}`, {
        headers: {
            Authorization: `Bearer ${authjwt}`
        }
    }).then(res => {
        // console.log(ctx.message)
        if (res.data.data.length < 1) {
            axios.post(process.env.URL + `/telegram-subscribers`, {
                data: {
                    userId: '' + ctx.message.from.id,
                    username: ctx.message.from.username,
                    city: ctx.scene.state.city,
                    street: ctx.message.text,
                    firstname: ctx.message.from.first_name,
                    lastname: ctx.message.from.last_name,
                    activeSubscription: true
                }
            }, {
                headers: {
                    Authorization: `Bearer ${authjwt}`
                }
            })

        } else {
            axios.put(process.env.URL + `/telegram-subscribers/${res.data.data[0].id}`, {
                data: {
                    userId: '' + ctx.message.from.id,
                    username: ctx.message.from.username,
                    city: ctx.scene.state.city,
                    street: ctx.message.text,
                    firstname: ctx.message.from.first_name,
                    lastname: ctx.message.from.last_name,
                    activeSubscription: true
                }
            }, {
                headers: {
                    Authorization: `Bearer ${authjwt}`
                }
            })
        }
    }).catch(err => {
        console.log(err.message)
    })

    ctx.session.city = ctx.scene.state.city
    ctx.session.street = ctx.message.text
    await ctx.reply('Вы успешно подписались на рассылку.')
    return ctx.scene.leave()
})

const infoScene = new WizardScene('infoScene', nameHandler, ageHandler)
infoScene.enter(ctx => ctx.reply('Напишите свой город: '))

const stage = new Stage([infoScene])
stage.hears('exit', ctx => ctx.scene.leave())

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session(), stage.middleware())


bot.start((ctx) => {
    ctx.telegram.sendMessage(ctx.from.id, 'Подписка на рассылку по плановым отключениям по адресу',
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Подписаться', callback_data: 'subscribe' }],
                    [{ text: 'Отписаться', callback_data: 'unsubscribe' }],
                    [{ text: 'Информация', callback_data: 'info' }]
                ]

            }
        })
})
bot.command('info', info)
bot.command('subscribe', subscribe)
bot.command('unsubscribe', unsubscribe)

bot.action('subscribe', subscribe)
bot.action('unsubscribe', unsubscribe)
bot.action('info', info)

function subscribe(ctx) {
    ctx.scene.enter('infoScene')
}

async function unsubscribe(ctx) {
    let authjwt = ''
    await auth().then(jwt => authjwt = jwt)
    axios.get(process.env.URL + `/telegram-subscribers?filters[userId][$eq]=${ctx.message.from.id}`, {
        headers: {
            Authorization: `Bearer ${authjwt}`
        }
    }).then(res => {
        // console.log(ctx.message)
        if (res.data.data.length < 1) {
            ctx.reply('Вы не подписаны на рассылку по плановым отключениям.')

        } else {
            axios.put(process.env.URL + `/telegram-subscribers/${res.data.data[0].id}`, {
                data: {
                    userId: '' + ctx.message.from.id,
                    username: ctx.message.from.username,
                    firstname: ctx.message.from.first_name,
                    lastname: ctx.message.from.last_name,
                    activeSubscription: false
                }
            }, {
                headers: {
                    Authorization: `Bearer ${authjwt}`
                }
            })
        }
    }).catch(err => {
        console.log(err.message)
    })
    ctx.reply('Вы успешно отписались от рассылки.')
}
async function info(ctx) {
    // console.log(ctx.message)
    let authjwt = ''
    await auth().then(jwt => authjwt = jwt)
    axios.get(process.env.URL + `/telegram-subscribers?filters[userId][$eq]=${ctx.message.from.id}`, {
        headers: {
            Authorization: `Bearer ${authjwt}`
        }
    }).then(res => {
        console.log(res.data.data[0].attributes)
        if (res.data.data.length < 1) {
            ctx.reply('Вы не подписаны на рассылку по плановым отключениям.')
        } else if (res.data.data[0] && !res.data.data[0].attributes.activeSubscription) {
            ctx.reply('Вы не подписаны на рассылку по плановым отключениям.')
        } else {
            ctx.replyWithHTML(`Вы подписаны на рассылку по адресу:<b> ${capitalizeFirstLetter(res.data.data[0].attributes.city)} ул. ${capitalizeFirstLetter(res.data.data[0].attributes.street)}</b>`)
        }
    }).catch(err => {
        console.log(err.message)
    })
}
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
// bot.help((ctx) => ctx.reply('Send me a sticker'));
// bot.on(message('sticker'), (ctx) => ctx.reply('👍'));
// bot.hears('hi', (ctx) => ctx.reply('Hey there'));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));