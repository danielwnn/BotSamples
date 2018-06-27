/*-----------------------------------------------------------------------------
  A bot calls CRIS and LIUS to understand user's speech and intents 
-----------------------------------------------------------------------------*/

// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder'),
    botbuilder_azure = require("botbuilder-azure"),
    needle  = require('needle'),
    restify = require('restify'),
    request = require('request'),
    tts  = require('./tts-service.js'),
    cris = require('./cris-service.js'),
    lius = require('./lius-service.js');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot 
var connector = new builder.ChatConnector({
    // callbackUrl: process.env.CALLBACK_URL,
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Start the server
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */
var tableName = process.env.STORAGE_TABLE_NAME;
var storageConnStr = process.env.STORAGE_CONN_STR;

var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, storageConnStr);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

// ============================================================
//  The main bot function
// ============================================================
bot.dialog('/', function (session) {
    if (hasAudioAttachment(session)) {
        var stream = getAudioStreamFromMessage(session.message);
        cris.getTextFromAudioStream(stream)
            .then(function (text) {
                if (text) {
                    lius.getIntentAndEntities(text, function (utterance, msg) {
                        var result = "You said: " + utterance + "\n\n" + msg;
                        session.send(result);
                        tts.Synthesize(msg);
                    });
                } else {
                    session.send("Sorry, couldn't understand!");
                }
            })
            .catch(function (error) {
                session.send('Oops! Something went wrong. Try again later.');
                console.error(error);
            });
    } else {
        var text = session.message.text;
        if (text) {
            lius.getIntentAndEntities(text, function (utterance, msg) {
                var result = "You said: " + utterance + "\n\n" + msg;
                session.send(result);
                tts.Synthesize(msg);
            });
        } else {
            session.send('Did you upload an audio file or speak to the microphone?');
        }        
    }
});

//=========================================================
// Bots Events
//=========================================================

// Sends greeting message when the bot is first added to a conversation
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                var reply = new builder.Message()
                    .address(message.address)
                    .text('Hi! I am SpeechToText Bot. I can understand the content of any audio and convert it to text. Try sending me a wav file.');
                bot.send(reply);
            }
        });
    }
});

//=========================================================
// Utilities
//=========================================================
function hasAudioAttachment(session) {
    return session.message.attachments.length > 0 &&
        (session.message.attachments[0].contentType === 'audio/wav' ||
            session.message.attachments[0].contentType === 'application/octet-stream');
}

function getAudioStreamFromMessage(message) {
    var headers = {};
    var attachment = message.attachments[0];
    if (checkRequiresToken(message)) {
        // The Skype attachment URLs are secured by JwtToken,
        // you should set the JwtToken of your bot as the authorization header for the GET request your bot initiates to fetch the image.
        // https://github.com/Microsoft/BotBuilder/issues/662
        connector.getAccessToken(function (error, token) {
            var tok = token;
            headers['Authorization'] = 'Bearer ' + token;
            headers['Content-Type'] = 'application/octet-stream';

            return needle.get(attachment.contentUrl, { headers: headers });
        });
    }

    headers['Content-Type'] = attachment.contentType;
    return needle.get(attachment.contentUrl, { headers: headers });
}

function checkRequiresToken(message) {
    return message.source === 'skype' || message.source === 'msteams';
}

