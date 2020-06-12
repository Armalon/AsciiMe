const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');

const imageToAscii = require("image-to-ascii");

const fs = require('fs');
var os = require("os");

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



const bot = new Telegraf(BOT_TOKEN)
const telegram = new Telegram(BOT_TOKEN); // , [options]

bot.use(async (ctx, next) => {
    // console.log('ctx', ctx);
    
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log('Response time: %sms', ms)
});

const filesDir = __dirname + '/files';

bot.start((ctx) => ctx.reply('Welcome'))
bot.help((ctx) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.hears('hi', (ctx) => ctx.reply('Hey there'))

bot.on('text', (ctx) => {
    console.log('ctx', ctx);

    console.log('ctx.from', ctx.from);

    console.log('ctx.message', ctx.message);

    console.log('ctx.message.photo', ctx.message.photo);



    // console.log('ctx.db', ctx.db);
    
    ctx.reply('Hello World');
})

bot.on('photo', (ctx) => {
    console.log('ctx', ctx);

    console.log('ctx.from', ctx.from);

    console.log('ctx.message', ctx.message);

    console.log('ctx.message.photo', ctx.message.photo);

    // console.log('ctx.db', ctx.db);

    var photoFileLink = telegram.getFileLink(ctx.message.photo[0]['file_id']);

    console.log('photoFile', photoFileLink);

    photoFileLink.then((fileLink) => {
        console.log('result', fileLink);

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
                        console.log(err || 'Saved!');
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