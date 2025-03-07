/**
 * AsciiMe - Telegram Bot
 * 
 * This bot converts images sent by users into ASCII art and creates shell commands
 * that display the ASCII art when executed. The bot requires a description in Russian
 * which is used as the command name.
 */

// Load environment variables from .env file
require('dotenv').config()

// Import required dependencies
const Telegraf = require('telegraf');          // Telegram bot framework
const Telegram = require('telegraf/telegram'); // Telegram API client
const https = require('http');                 // HTTP client for file downloads
const SocksAgent = require('socks5-https-client/lib/Agent'); // SOCKS proxy support
const imageToAscii = require("image-to-ascii"); // Image to ASCII converter

// File system and OS utilities
const fs = require('fs');
var os = require("os");

// Directory where ASCII art files will be stored
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

/**
 * SOCKS proxy configuration
 * Used when the bot needs to connect through a proxy
 * Configure these values in your .env file
 */
const socksAgent = new SocksAgent({
    socksHost: process.env.SOCKS_PROXY_HOST,
    socksPort: process.env.SOCKS_PROXY_PORT,
    socksUsername: process.env.SOCKS_PROXY_USERNAME,
    socksPassword: process.env.SOCKS_PROXY_PASSWORD
});

// Telegram API configuration with optional proxy support
const telegramConfig = {
    agent: process.env.USE_PROXY ? socksAgent : null
};

// Telegraf bot configuration
const telegrafConfig = {
    telegram: telegramConfig
};

// Example bot token placeholder (actual token should be in .env file)
const BOT_TOKEN = 'Put-your-telegram-bot-token-here';

// Creating an output folder if not exists
// This folder will store the ASCII art files
if (!fs.existsSync(filesDir)){
    fs.mkdirSync(filesDir);
}

// Initialize Telegram API client and Telegraf bot instance
// BOT_TOKEN should be defined in your .env file
const telegram = new Telegram(process.env.BOT_TOKEN, telegramConfig);
const bot = new Telegraf(process.env.BOT_TOKEN, telegrafConfig)

/**
 * Middleware for logging response time
 * This is useful for debugging performance issues
 * Can be removed in production
 */
bot.use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log('Response time: %sms', ms)
});

/**
 * Bot command handlers
 * 
 * /start - Initial greeting when user starts the bot
 * /help - Instructions on how to use the bot
 * 'Привет' - Responds to the Russian greeting
 */
bot.start((ctx) => ctx.reply('Привет, человек!'))
bot.help((ctx) => ctx.reply('Просто пришли мне картинку с описанием на русском языке и я сделаю из нее команду.'))
// bot.on('sticker', (ctx) => ctx.reply('👍')) - Commented out sticker handler
bot.hears('Привет', (ctx) => ctx.reply('И тебе не хворать!'))

/**
 * Text message handler
 * Responds to any text message with a generic response
 * The bot primarily processes images, not text
 */
bot.on('text', (ctx) => {
    ctx.reply('Нич*го не понял, но очень интересно!');
})

/**
 * Photo message handler
 * This is the main functionality of the bot:
 * 1. Receives an image with a Russian caption
 * 2. Downloads the image
 * 3. Converts it to ASCII art
 * 4. Creates a shell command that displays the ASCII art
 */
bot.on('photo', (ctx) => {
    // Get the file link for the photo
    // Using the first (smallest) version of the photo
    var photoFileLink = telegram.getFileLink(ctx.message.photo[0]['file_id']);


    photoFileLink.then((fileLink) => {

        // Process the caption: remove non-Russian characters and convert to lowercase
        // This will be used as the shell command name
        const captionNormalized = ctx.message.caption
            ? ctx.message.caption.replace(/[^а-я]/ig, '').toLowerCase()
            : null;

        // Validate that a caption was provided
        if (!captionNormalized) {
            return ctx.reply('Плохое описание!');
        }

        // Define the path where the ASCII art file will be saved
        const finalFileName = filesDir + '/' + captionNormalized;

        // Download the image file using the same proxy configuration if enabled
        const file = fs.createWriteStream(finalFileName);
        const httpRequest = https.get(
            fileLink,
            {
                agent: process.env.USE_PROXY ? socksAgent : null,
            }, function(response) {
                response.pipe(file);
            });

        // Process the image after download is complete
        httpRequest.on('close', function() {
            // Convert the downloaded image to ASCII art
            imageToAscii(finalFileName, imageToAsciiOptions, (err, converted) => {
                if (!err) {
                    // Save the ASCII art to the file
                    fs.writeFile(finalFileName, converted + os.EOL, function(err) {
                        if (err) {
                            return ctx.reply(err);
                        } else {
                            // Notify the user that the command has been created
                            return ctx.reply('Супер! Вот такая команда получилась: ' + captionNormalized);
                        }
                    });

                    // Create a shell alias that displays the ASCII art when the command is run
                    // This appends to a .bashrc file in the files directory
                    fs.appendFile(
                        filesDir + '/' + '.bashrc',
                        'alias ' + captionNormalized + '="cat \'' + filesDir + '/' + captionNormalized + '\'"' + os.EOL,
                        function (err) {
                            // Error handling is done elsewhere
                        }
                    );
                } else {
                    return ctx.reply(err);
                }
            });
        });

        // Handle image download errors
        httpRequest.on('error', function(err) {
            return ctx.reply('Image downloading error: ' + err);
        });

        // Handle image download timeout
        httpRequest.on('timeout', function () {
            return ctx.reply('Image downloading timeout');
        });
    })
    .catch((err) => {
        // Handle errors in getting the file link
        return ctx.reply(err);
    });
})

// Start the bot
bot.launch();
