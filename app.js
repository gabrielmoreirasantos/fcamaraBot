var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var watson = require('watson-developer-cloud');
var app = express();
var contexid = "";

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var conversation_id = "";

// Configs do watson Conversation
var w_conversation = watson.conversation({
    url: 'https://gateway.watsonplatform.net/conversation/api',
    username: process.env.CONVERSATION_USERNAME || '1ae080d0-c6b5-413e-aeff-72fc1436388b',
    password: process.env.CONVERSATION_PASSWORD || 'PzQhKklpssWW',
    version: 'v1',
    version_date: '2016-07-11'
});
var workspace = process.env.WORKSPACE_ID || 'workspaceId';

//Verifica Token do webhook para usar API do facebook
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'EAAEotZBVZBswUBAO6bh2L85Ea7XkrfNdJH41fr5F4V6tz6e5ZAEl449Ak0OWZCsYtmYdHXDxKohOusDa1T0QpSsIZC9Yu0So9kG9iMh42lHfL4SQ9MEc1xyzO5tVwiIBwVaokshXfhZCyvel5ZCVA4dCcdAp44WaJ8Te5it4kqdku58FauVP743') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Erro de validação no token.');
});

app.post('/webhook/', function (req, res) {
	var text = null;
	
    messaging_events = req.body.entry[0].messaging;
    
    //Faz uma iteração para cada mensagem recebida
	for (i = 0; i < messaging_events.length; i++) {	
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        if (event.message && event.message.text) {
			text = event.message.text;
		}else if (event.postback && !text) {
			text = event.postback.payload;
		}else{
			break;
		}
		
		var params = {
			input: text,
			// context: {"conversation_id": conversation_id}
			context:contexid
		}
		
		//Id do workspace com as intents, Entities e dialogs
		var payload = {
			workspace_id: "41e785eb-63b4-4cb7-ab3b-1fd6f0d37547"
		};

		if (params) {
			if (params.input) {
				params.input = params.input.replace("\n","");
				payload.input = { "text": params.input };
			}
			if (params.context) {
				payload.context = params.context;
			}
		}
		callWatson(payload, sender);
    }
    res.sendStatus(200);
});

//Recebe os dados do workspace e faz a chamada do watson
function callWatson(payload, sender) {

	w_conversation.message(payload, function (err, convResults) {
		 console.log(convResults);
		contexid = convResults.context;
		
        if (err) {
            return responseToRequest.send("Erro.");
        }
		
		if(convResults.context != null)
    	   conversation_id = convResults.context.conversation_id;
        if(convResults != null && convResults.output != null){
			var i = 0;
			while(i < convResults.output.text.length){

				//Envia as respostas do bot(convResults) para o facebook
				sendMessage(sender, convResults.output.text[i++]);

				//Envia as intents para o facebook. Apenas para fins de teste
				//sendMessage(sender, convResults.intents[i++].intent);
			}
		}
            
    });
}

//Envia mensagem para api do facebook
function sendMessage(sender, text_) {
	text_ = text_.substring(0, 319);
	messageData = {	text: text_ };

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};

var token = "EAAEotZBVZBswUBAO6bh2L85Ea7XkrfNdJH41fr5F4V6tz6e5ZAEl449Ak0OWZCsYtmYdHXDxKohOusDa1T0QpSsIZC9Yu0So9kG9iMh42lHfL4SQ9MEc1xyzO5tVwiIBwVaokshXfhZCyvel5ZCVA4dCcdAp44WaJ8Te5it4kqdku58FauVP743";
var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3000);
app.listen(port, host);