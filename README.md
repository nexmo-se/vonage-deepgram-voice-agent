# Connecting Vonage API Calls to Deepgram Voice Agent

## What this application does

It allows connecting [Voice](https://www.vonage.com/communications-apis/voice/) or [Video](https://www.vonage.com/communications-apis/video/) calls to a [Deepgram Voice Agent](https://deepgram.com/learn/introducing-ai-voice-agent-api) for interaction with an LLM AI Voice Assistant.

A User interacts with the Agent using voice. Real-time transcripts of what the User says as well what the Agent says are also returned.

Barge-in is supported, meaning if User resumes speaking, an Agent voice response in progress would be immediately interrupted

Vonage API platform supports different **voice channels** for connecting to Deepgram Voice Agent, including:
- Public Switched Telephone Network (**PSTN**), e.g. cell phones, landline phones, VoIP phones/applications connecting via PSTN,
- Session Initiation Protocol (**SIP**), e.g. SIP trunking, SIP from Vonage Video API clients, SIP from Contact Centers,
- Vonage **Voice WebRTC clients** (Web, iOS, Android),
- Vonage **Video WebRTC clients** (Web, iOS, Android),
- **WebSocket** connections, e.g. from Contact Centers, augmenting existing Voice applications.

In this sample application code, users are connected with inbound or outbound PSTN calls.

This application may be easily updated to support other voice channels. You may [contact us](https://www.vonage.com/communications-apis/contact-api/) as you are building your next project.

## How this application works

See the diagram **_overview-diagram.png_**.</br>

In this diagram, the application is shown in two parts for easier description, however both parts are in one source code file in this repository.</br>

First, a call is established with the User, it can be an inbound call or an outbound call,</br>
then a WebSocket leg is established with the Connector (part 1) which sends the audio from the User to Deepgram Voice Agent (DG VA).</br>

Received audio from DG VA are sent to the User.

Received User and Agent transcriptions are sent to the Orchestrator (part 2).</br>


## Set up

You may choose to deploy locally on your computer for testing, then or directly, in a cloud hosted environment as explained as follows.

### Local deployment on your computer

#### Node.js

[Download and install Node.js](https://nodejs.org/en/download/package-manager) version 18.

This Node.js application has been tested with Node.js version 18.19.1.

#### Ngrok

[Download and install ngrok](https://ngrok.com/download), an Internet tunelling service.</br>
Sign in or sign up with [ngrok](https://ngrok.com/), from the menu, follow the **Setup and Installation** guide.

Set up a domain to forward to the local port 8000 (as this application will be listening on local port 8000).

Start ngrok to listen on port 8000,</br>
please take note of the ngrok **Enpoint URL** as it will be need in the next sections,
that URL looks like:</br>
`https://xxxxxxxx.ngrok.io`

#### Deepgram

Sign in or sign up with [Deepgram](https://deepgram.com/).

Create or use an existing project, then create or retrieve an existing API key.

For the next steps, you will need:</br>
- The Deegpram **API key** (as environment variable **`DEEPGRAM_API_KEY`**)</br>

#### Vonage API Account - Voice API Application

[Log in to your](https://ui.idp.vonage.com/ui/auth/login) or [sign up for a](https://ui.idp.vonage.com/ui/auth/registration) Vonage API account.

Go to [Your applications](https://dashboard.nexmo.com/applications), access an existing application or [+ Create a new application](https://dashboard.nexmo.com/applications/new).

Under Capabilities section (click on [Edit] if you do not see this section):

Enable Voice</br>

- Under Answer URL, leave HTTP GET, and enter</br>
`https://<host>:<port>/answer`</br>
(replace \<host\> and \<port\> with the public host name and if necessary public port of the server where this sample application is running)</br>

- Under Event URL, **select** HTTP POST, and enter</br>
`https://<host>:<port>/event`</br>
(replace \<host\> and \<port\> with the public host name and if necessary public port of the server where this sample application is running)</br>

Note: If you are using ngrok for this sample application, the Answer URL and Event URL look like:</br>
`https://xxxxxxxx.ngrok.io/answer`</br>
`https://xxxxxxxx.ngrok.io/event`</br> 

- Under Region, select a region, please take note of your selection,	

- Click on [Generate public and private key] if you did not yet create or want new ones, save the private key file in this application folder as .private.key (leading dot in the file name).</br>

**IMPORTANT**: Do not forget to click on [Save changes] at the bottom of the screen if you have created a new key set.</br>

- Link a phone number to this application if none has been linked to the application.

For the next steps, you will need:</br>
- The [account API key](https://dashboard.nexmo.com/settings) (as environment variable **`API_KEY`**)</br>
- The [account API secret](https://dashboard.nexmo.com/settings), not signature secret, (as environment variable **`API_SECRET`**)</br>
- The **`application ID`** (as environment variable **`APP_ID`**),</br>
- The selected **`Region`** (as environment variable **`API_REGION`**),</br>
- The **`phone number linked`** to your application (as environment variable **`SERVICE_PHONE_NUMBER`**).</br>

Copy or rename .env-example to .env<br>

Update all the parameters in .env file as per previous sections contents.<br>

Install node modules with the command:<br>
 ```bash
npm install
```

Launch the application:<br>
```bash
node vonage-deepgram-voice-agent.cjs
```
Default local (not public!) of this application listening `port` is: 8000.

Make sure ngrok is running as per previous section.


### Hosted deployment on Vonage Cloud Runtime

You may deploy on Vonage's serverless infrastructure [Vonage Cloud Runtime](https://developer.vonage.com/en/vonage-cloud-runtime/overview).

WIP - Instructions will be added here in a few days. Sorry for the delay.


## How to test this application

### Inbound PSTN call

Call the phone number linked to your Vonage API account.

### Outbound PSTN call

You may trigger an outbound call by opening the following web address<br>
`https://<public_host_name>/call?callee=<callee_phone_number>`<br>

for example:<br>
`https://xxxxxxxx.ngrok.io/call?callee=12995550101`<br>
or<br>
`https://myserver.mycompany.com:32000/call?callee=12995550101`<br>


## Live demo

You may test call a demo instance of this application running on [Vonage Cloud Runtime](https://developer.vonage.com/en/vonage-cloud-runtime/overview) by calling<br> +1 **201-365-7974**.




