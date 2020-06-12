const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');

const imageToAscii = require("image-to-ascii");

const fs = require('fs');
var os = require("os");

const filesDir = __dirname + '/files';

// Feel free to change any options here according to the image-to-ascii lib manual
// https://www.npmjs.com/package/image-to-ascii
var imageToAsciiOptions = {
    colored: false,
    reverse: false,
    pixels: ' .,:;/\\i1tfLCOG08@',
    size: {
        height: '50%',
        width: '50%',
    },
    size_options: {
        screen_size: {
            height: 120,
            width: 120,
        }
    },
}

const BOT_TOKEN = 'Put-your-telegram-bot-token-here';


const telegram = new Telegram(BOT_TOKEN); // , [options]
const bot = new Telegraf(BOT_TOKEN)

// Debugging middleware, can be removed
bot.use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log('Response time: %sms', ms)
});

bot.start((ctx) => ctx.reply('Привет, человек!'))
bot.help((ctx) => ctx.reply('Просто пришли мне картинку с описанием на русском языке и я сделаю из нее команду.'))
// bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('Привет', (ctx) => ctx.reply('И тебе не хворать!'))

bot.on('text', (ctx) => {
    // console.log('ctx', ctx);
    //
    // console.log('ctx.from', ctx.from);
    //
    // console.log('ctx.message', ctx.message);
    //
    // console.log('ctx.message.photo', ctx.message.photo);

    ctx.reply('Нич*го не понял, но очень интересно!');
})

bot.on('photo', (ctx) => {
    // console.log('ctx', ctx);
    //
    // console.log('ctx.from', ctx.from);
    //
    // console.log('ctx.message', ctx.message);
    //
    // console.log('ctx.message.photo', ctx.message.photo);

    // console.log('ctx.db', ctx.db);

    var photoFileLink = telegram.getFileLink(ctx.message.photo[0]['file_id']);

    // console.log('photoFile', photoFileLink);

    photoFileLink.then((fileLink) => {
        // console.log('result', fileLink);

        // asciify(fileLink, asciifyOptions, function (err, asciified) {
        //     if (err) throw err;
        //
        //     // Print to console
        //     console.log('asciified==', asciified);
        // });

        const captionNormalized = ctx.message.caption
            ? ctx.message.caption.replace(/\W/g, '')
            : null;

        if (!captionNormalized) {
            return ctx.reply('Bad caption!');
        }

        imageToAscii(fileLink, imageToAsciiOptions, (err, converted) => {

            if (!err) {
                fs.writeFile(filesDir + '/' + captionNormalized, converted + os.EOL, function(err) {
                    if (err) {
                        return ctx.reply(err);
                    } else {
                        return ctx.reply('Ok!');
                    }
                });

                fs.appendFile(
                    filesDir + '/' + '.bashrc',
                    'alias ' + captionNormalized + '="cat ' + filesDir + '/' + captionNormalized + '"' + os.EOL,
                    function (err) {
                        // console.log(err || 'Saved!');
                    }
                );
            } else {
                return ctx.reply(err);
            }
            // console.log(err || converted);
        });
    });


})


bot.launch();