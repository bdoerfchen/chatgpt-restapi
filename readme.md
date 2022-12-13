# General
This REST API is based on onury5506's [Discord GPT Chatbot](https://github.com/onury5506/Discord-ChatGPT-Bot), which used transitive-bullshit's [ChatGPT Library](https://github.com/transitive-bullshit/chatgpt-api) to send requests to OpenAIs API. But instead of creating a discord bot and subscribing to incoming messages, this API opens a way for other machine services to chat with ChatGPT.

It offers the comfort to send messages and get the response in a conversation with a simple conversationID. The API uses this ID to map to chatGPT specific information like the `parentMessageId` and their `conversationId`. After a restart of this application, the API still keeps this mapping. To reset a conversation, use the given endpoint.

You provide your account information and a [puppeteer](https://pptr.dev/)-instance opens a headless chromium to get the necessary session-cookie. After 10 minutes this gets repeated to never stop answering incoming requests.

# Setup
To setup the service you have to provide some information in the `.env`-File in the applications directory. In this repository is a `env.example` you have to fill out with your information and rename to `.env`.

The application needs the following information in the file:
### OPENAI_EMAIL
The email of your OpenAI account.

    OPENAI_EMAIL=<your email>
### OPENAI_PASSWORD
The password of your OpenAI account.

    OPENAI_PASSWORD=<your password>
### PORT
The port, that the webserver uses to provide the API.

    PORT=<the desired port>
Choose a port, that is not used in your environment.
### CONVERSATION_LIFETIME
This API offers the feature to automatically reset conversations, if they are not used for a specific amount of seconds.
In the `env.example`-file the default is set to 1 year.

    CONVERSATION_LIFETIME=<amount in seconds>


# API Reference
The HTTP REST API is available on the port set in the `.env`-File.
## Sending chat messages
### Request
To send a chat message, you choose a `conversationID`, which identifies your conversation with ChatGPT. If you send a new message with the same `conversationID`, then ChatGPT remains in the same context and knows your previous messages.

To send a request, use the following route:

    POST /chat/{conversationID}

With the following body:
```json
{
    "prompt": <your prompt : string>
}
```


The `conversationID` is of any type you desire, as the NodeJS backend doesnt use strict types. So you can use a `string` (URLEncoded or no space), a `number` or a `UUID`.

### Response
This endpoint returns following object, when the complete response was received from ChatGPT:

```json
{
    "response": <ChatGPTs response : string>,
    "timestamp": <Response Date : number>,
    "responseTime": <Miliseconds for GPTs response : number>,
    "session": <your conversationId>
}
```

## Resetting conversations
### Request
If you wish to clear a conversation you can use this endpoint:

    DELETE /chat/{conversationID}

The `conversationId` is of the type you used before when sending a message.

### Response
You get a '`200 OK`' response if it was successful.
