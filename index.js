require('dotenv').config()

const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const https = require('http');
const SocksAgent = require('socks5-https-client/lib/Agent');
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

const socksAgent = new SocksAgent({
    socksHost: process.env.SOCKS_PROXY_HOST,
    socksPort: process.env.SOCKS_PROXY_PORT,
    socksUsername: process.env.SOCKS_PROXY_USERNAME,
    socksPassword: process.env.SOCKS_PROXY_PASSWORD
});

const telegramConfig = {
    agent: process.env.USE_PROXY ? socksAgent : null
};

const telegrafConfig = {
    telegram: telegramConfig
};

const BOT_TOKEN = 'Put-your-telegram-bot-token-here';

// Creating an output folder if not exists
if (!fs.existsSync(filesDir)){
    fs.mkdirSync(filesDir);
}

const telegram = new Telegram(process.env.BOT_TOKEN, telegramConfig); // , [options]
const bot = new Telegraf(process.env.BOT_TOKEN, telegrafConfig)

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

        const captionNormalized = ctx.message.caption
            ? ctx.message.caption.replace(/[^а-я]/ig, '').toLowerCase()
            : null;

        if (!captionNormalized) {
            return ctx.reply('Плохое описание!');
        }

        const finalFileName = filesDir + '/' + captionNormalized;

        // Downloading file through the same socksAgent
        const file = fs.createWriteStream(finalFileName);
        const httpRequest = https.get(
            fileLink,
            {
                agent: process.env.USE_PROXY ? socksAgent : null,
            }, function(response) {
                response.pipe(file);
            });

        httpRequest.on('close', function() {
            imageToAscii(finalFileName, imageToAsciiOptions, (err, converted) => {
                if (!err) {
                    fs.writeFile(finalFileName, converted + os.EOL, function(err) {
                        if (err) {
                            return ctx.reply(err);
                        } else {
                            return ctx.reply('Супер! Вот такая команда получилась: ' + captionNormalized);
                        }
                    });

                    fs.appendFile(
                        filesDir + '/' + '.bashrc',
                        'alias ' + captionNormalized + '="cat \'' + filesDir + '/' + captionNormalized + '\'"' + os.EOL,
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

        httpRequest.on('error', function(err) {
            return ctx.reply('Image downloading error: ' + err);
        });

        httpRequest.on('timeout', function () {
            return ctx.reply('Image downloading timeout');
        });
    })
    .catch((err) => {
        return ctx.reply(err);
    });


})


bot.launch();