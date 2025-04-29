'use strict'

//-------------

require('dotenv').config();

//--
const express = require('express');
const bodyParser = require('body-parser')
const app = express();
require('express-ws')(app);

const webSocket = require('ws');

app.use(bodyParser.json());

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

//-------

const servicePhoneNumber = process.env.SERVICE_PHONE_NUMBER;
console.log("Service phone number:", servicePhoneNumber);

//--- Vonage API ---

const { Auth } = require('@vonage/auth');

const credentials = new Auth({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  applicationId: process.env.APP_ID,
  privateKey: './.private.key'    // private key file name with a leading dot 
});

const apiBaseUrl = "https://" + process.env.API_REGION;

const options = {
  apiHost: apiBaseUrl
};

const { Vonage } = require('@vonage/server-sdk');

const vonage = new Vonage(credentials, options);

//--- Streaming timer - Audio packets to Vonage ---

// const timer = 19; // in ms, actual timer duration is higher
const timer = 18; // in ms, actual timer duration is higher

//--- Streaming timer calculation ---

let prevTime = Date.now();
let counter = 0;
let total = 0;
let cycles = 2000;

console.log('\n>>> Wait around', Math.round(cycles * timer / 1000), 'seconds to see the actual streaming timer average ...\n');

const streamTimer = setInterval ( () => {
    
    const timeNow = Date.now();
    const difference = timeNow - prevTime;
    total = total + difference;
    prevTime = timeNow;

    counter++;

    if (counter == cycles) { 
        clearInterval(streamTimer);
        console.log('\n>>> Average streaming timer (should be close to 20 AND under 20.000):', total / counter);
    };

}, timer);

//---- Deepgram Voice Agent ----

const dgApiKey = process.env.DEEPGRAM_API_KEY;
const dgVoiceAgentEndpoint = process.env.DEEPGRAM_VOICE_AGENT_ENDPOINT;

const dgVoiceAgentSettings = 
{
    "type": "SettingsConfiguration",
    "audio": {
      "input": {
        "encoding": "linear16", // DO NOT CHANGE
        "sample_rate": 16000  // DO NOT CHANGE 
      },
      "output": {
        "encoding": "linear16", // DO NOT CHANGE
        "sample_rate": 16000, // DO NOT CHANGE
        "container": "none"
      }
    },
    "agent":
    {
        "listen":
        {
            "model": "nova-3"
        },
        "think":
        {
            "provider":
            {
                "type": "anthropic"
            },
            "model": "claude-3-haiku-20240307",
            "instructions": ""
        },
        "speak":
        {
            "model": process.env.DEEPGRAM_AGENT_SPEAK
        }
    }
};

//---- Custom settings ---
const maxCallDuration = process.env.MAX_CALL_DURATION; // in seconds

//============= Initiating outbound PSTN calls ===============

//-- Use case where the PSTN call is outbound
//-- manually trigger outbound PSTN call to "callee" number - see sample request below
//-- sample request: https://<server-address>/call?callee=12995550101

app.get('/call', async(req, res) => {

  if (req.query.callee == null) {

    res.status(200).send('"callee" number missing as query parameter - please check');
  
  } else {

    // code may be added here to make sure the number is in valid E.164 format (without leading '+' sign)
    // TBD: for demos - allow only US numbers for outbound calling
  
    res.status(200).send('Ok');  

    const hostName = req.hostname;

    //-- Outgoing PSTN call --

    vonage.voice.createOutboundCall({
      to: [{
        type: 'phone',
        number: req.query.callee
      }],
      from: {
       type: 'phone',
       number: servicePhoneNumber
      },
      limit: maxCallDuration, // limit outbound call duration for demos purposes
      answer_url: ['https://' + hostName + '/answer_1'],
      answer_method: 'GET',
      event_url: ['https://' + hostName + '/event_1'],
      event_method: 'POST'
      })
      .then(res => console.log(">>> Outgoing PSTN call status:", res))
      .catch(err => console.error(">>> Outgoing PSTN call error:", err))

    }

});

//-----------------------------

app.get('/answer_1', async(req, res) => {

  const  hostName = req.hostname;

  const uuid = req.query.uuid;

  const wsUri = 'wss://' + hostName + '/socket?original_uuid=' + uuid;

  const nccoResponse = [
    {
      "action": "talk",
      "text": "Hello. This is a call from your preferred voice agent, please wait.",
      "language": "en-US",
      "style": 11
    },
    {
      "action": "connect",
      "eventType": "synchronous",
      "eventUrl": ["https://" + hostName + "/ws_event"],
      "from": req.query.to,    // normally not important, this value matters only if your application logic needs it
      "endpoint": [
        {
          "type": "websocket",
          "uri": wsUri,
          "content-type": "audio/l16;rate=16000", // never modify
          "headers": {}
        }
      ]

    }
  ];

  res.status(200).json(nccoResponse);

 });

//------------

app.post('/event_1', async(req, res) => {

  res.status(200).send('Ok');

});

//--------------------

app.post('/ws_event', async(req, res) => {

  res.status(200).send('Ok');

  setTimeout( () => {

    if (req.body.status == 'answered') {
      vonage.voice.playTTS(req.body.uuid,  
        {
        text: "Hello",  // get voice agent to greet user
        language: 'en-US', 
        style: 11
        })
      .then(res => console.log("Play TTS on WebSocket", res))
      .catch(err => console.error("Failed to play TTS on WebSocket:", req.body.uuid, err));
    }

  }, 1500);
  

});

//============= Processing inbound PSTN calls ===============

//-- Incoming PSTN call --

app.get('/answer', async(req, res) => {

  const hostName = req.hostname;

  //--

  const uuid = req.query.uuid;
 
  const wsUri = 'wss://' + hostName + '/socket?original_uuid=' + uuid;

  const nccoResponse = [
    {
      "action": "talk",
      "text": "Hello, please wait while we're connecting your call!",
      "language": "en-US",
      "style": 11
    },
    {
      "action": "connect",
      "eventType": "synchronous",
      "eventUrl": ["https://" + hostName + "/ws_event"],
      "from": req.query.from,    // normally not important, this value matters only if your application logic needs it
      "endpoint": [
        {
          "type": "websocket",
          "uri": wsUri,
          "content-type": "audio/l16;rate=16000", // never modify
          "headers": {}
        }
      ]

    }
  ];

  res.status(200).json(nccoResponse);

});

//------------

app.post('/event', async(req, res) => {

  res.status(200).send('Ok');

});

//=================== Connector server =========================
//--- Handling WebSockets from Vonage Voice API platform
//--- and WebSockets to Deepgram Voice Agent connector

app.ws('/socket', async (ws, req) => {

  let wsDgOpen = false; // WebSocket to Deepgram ready for binary audio payload?
  let wsVgOpen = true; // WebSocket to Vonage ready for binary audio payload?

  const originalUuid = req.query.original_uuid;

  console.log('>>> Websocket connected with');
  console.log('original call uuid:', originalUuid);

  //--

  let dgPayload = Buffer.alloc(0);
  let streamToVgIndex = 0;

  //-- stream audio to VG --

  const streamTimer = setInterval ( () => {

    if (dgPayload.length != 0) {

      const streamToVgPacket = Buffer.from(dgPayload).subarray(streamToVgIndex, streamToVgIndex + 640);  // 640-byte packet for linear16 / 16 kHz
      streamToVgIndex = streamToVgIndex + 640;

      if (streamToVgPacket.length != 0) {
        if (wsVgOpen) { ws.send(streamToVgPacket) };
      } else {
        streamToVgIndex = streamToVgIndex - 640; // prevent index from increasing for ever as it is beyond buffer current length
      }

    }  

  }, timer);

  //--

  console.log('Opening connection to DeepGram Voice Agent');

  const wsDg = new webSocket("wss://" + dgVoiceAgentEndpoint, {
    headers: { authorization: "token " + dgApiKey }
  });

  //--

  wsDg.on('error', async (event) => {

    console.log('WebSocket to Deepgram error:', event);

  });  

  //-- 

  wsDg.on('open', () => {
      console.log('WebSocket to Deepgram opened');
      wsDg.send(JSON.stringify(dgVoiceAgentSettings));
      wsDgOpen = true;
  });

  //--

  wsDg.on('message', async(msg, isBinary) =>  {
    if (isBinary) {
      if(wsVgOpen) {
        dgPayload = Buffer.concat([dgPayload, msg]);
      }
    } else {
        console.log(`Message from DG VA: ${msg}`);

        if (JSON.parse(msg)["type"] === "UserStartedSpeaking") { 
            // barge-in handling
            dgPayload = Buffer.alloc(0);  // reset stream buffer to VG
            streamToVgIndex = 0;
        }
    }
  });

  //--

  wsDg.on('close', async () => {

    wsDgOpen = false; // stop sending audio payload to DG platform
    
    console.log("Deepgram WebSocket closed");
  });

  //---------------

  ws.on('message', async (msg) => {
    
    if (typeof msg === "string") {
    
      console.log("\n>>> Vonage WebSocket text message:", msg);
    
    } else {

      if(wsDgOpen) {
        wsDg.send (msg)
      }

    }

  });

  //--

  ws.on('close', async () => {

    clearInterval(streamTimer);

    wsVgOpen = false; // can no longer send audio payload to VG platform
    wsDgOpen = false; // stop sending audio payload to DG platform

    wsDg.close(); // close WebSocket to DG
    
    console.log("Vonage WebSocket closed");
  });

});

//================ For Vonage Cloud Runtime (VCR) only ==============
//--- If this application is hosted on VCR  --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=====================================================================

const port = process.env.VCR_PORT || process.env.PORT || 8000;

app.listen(port, () => console.log(`Voice API application and Connector application listening on local port ${port}.`));

//------------