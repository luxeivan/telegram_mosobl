const { Telegraf, session, Scenes: { WizardScene, Stage }, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config()
const axios = require('axios')

// const exit_keyboard = Markup.keyboard(['exit']).oneTime()
// const remove_keyboard = Markup.removeKeyboard()

const nameHandler = Telegraf.on('text', async ctx => {
    ctx.scene.state.city = ctx.message.text
    await ctx.reply('Напишите свою улицу')
    return ctx.wizard.next()
})
const ageHandler = Telegraf.on('text', async ctx => {
    ctx.session.city = ctx.scene.state.city
    ctx.session.street = ctx.message.text
    await ctx.reply('Вы успешно подписались на рассылку')
    return ctx.scene.leave()
})

const infoScene = new WizardScene('infoScene', nameHandler, ageHandler)
infoScene.enter(ctx => ctx.reply('Напишите свой город'))

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

// bot.command('city', (ctx) => {
//     console.log(ctx.message.text.slice(6))
// })
// bot.command('add', (ctx) => {
//     ctx.scene.enter('infoScene')
// })
bot.command('info', info)
bot.command('subscribe', subscribe)

bot.action('subscribe', subscribe)
bot.action('unsubscribe', unsubscribe)
bot.action('info', info)

function subscribe(ctx) {
    ctx.scene.enter('infoScene')
}

function unsubscribe(ctx) {
    ctx.reply('Отписаны')
}
function info(ctx) {
    if (ctx.session.city && ctx.session.street) {
        ctx.replyWithHTML(`Вы подписаны на рассылку по адресу:<b> ${capitalizeFirstLetter(ctx.session.city)} ул. ${capitalizeFirstLetter(ctx.session.street)}</b>`)
    }else{
        ctx.reply('Вы еще не подписаны на рассылку по плановым отключениям')
    }
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