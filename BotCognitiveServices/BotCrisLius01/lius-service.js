var request = require('request');
var querystring = require('querystring');

var LIUS_API_ENDPOINT = process.env.LUIS_API_URL;

exports.getIntentAndEntities = function (utterance, callback)
{
    var luisRequest = LIUS_API_ENDPOINT + querystring.escape(utterance);

    console.log(luisRequest);

    request(luisRequest, function (err, response, body) {
        if (err) {
            callback(utterance, err);
        }
        else {
            var data = JSON.parse(body);
            console.log(data);

            var msg = "Intent: " + data.topScoringIntent.intent + "\n\n";

            var entities = data.entities;
            if (entities && entities.length > 0) {
                for (var i = 0, len = entities.length; i < len; i++) {
                    var item = entities[i];
                    var type = item.type === "builtin.datetimeV2.date" ? "Birth Date" : item.type;
                    msg += type + ": " + item.entity + "\n\n";
                }
            }

            callback(utterance, msg);
        }
    });
};
