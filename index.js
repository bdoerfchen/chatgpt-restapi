import dotenv from 'dotenv'
import { ChatGPTAPI } from 'chatgpt'
import OPENAI_SESSION from './js/openai_session.js'
import Conversations from './js/conversations.js'

import express from 'express'
import bodyParser from 'body-parser'

import UTIL from './js/util.js';

dotenv.config()

// Logs in via username and password. Returns API with valid session token and updates it automatically.
async function initChatGPT() {
    let sessionToken
    let counter = 10;
    while (counter > 0) {
        try {
            sessionToken = await OPENAI_SESSION.getSession(process.env.OPENAI_EMAIL, process.env.OPENAI_PASSWORD)
            break
        } catch (e) {
            console.error("initChatGPT ERROR : " + e)
            counter--;
        }
    }

    if (counter == 0) {
        throw "Invalid Auth Info!"
    }

    let api = new ChatGPTAPI({ sessionToken })

    await api.ensureAuth()

    async function updateSessionToken() {
        try {
            let sessionToken = await OPENAI_SESSION.getSession(process.env.OPENAI_EMAIL, process.env.OPENAI_PASSWORD)
            let new_api = new ChatGPTAPI({ sessionToken })

            await new_api.ensureAuth()

            OPENAI_SESSION.saveSessionCookie(sessionToken);
            api = new_api;
            console.log("Session Token Changed - ", new Date())
        } catch (e) {
            console.error("Error session token refresh : " + e + " - " + new Date());
        } finally {
            setTimeout(updateSessionToken, OPENAI_SESSION.COOKIE_LIFETIME)
        }
    }
    setTimeout(updateSessionToken, OPENAI_SESSION.COOKIE_LIFETIME)

    return {
        sendMessage: (message, opts = {}) => {
            return api.sendMessage(message, opts)
        },
        getConversation(opts = {}) {
            return api.getConversation(opts)
        }
    };
}

async function setupExpress(chatGPT)
{
    const port = process.env.PORT;
    const server = express();
    
    const logging = (req, res, next) => {
        console.log(req.method + " " + req.path + "; [" + req.ip + "]");
        next();
    }
    server.use(logging);
    server.use(bodyParser.json());

    server.post("/chat/:sessionid", async (req, res) => {
        let session = req.params.sessionid;
        if (!session)
        {
            res.sendStatus(400);
            return;
        }

        let prompt = req.body;
        let convOptions = Conversations.getConversation(session);
        let conversation = chatGPT.getConversation(convOptions);
        
        console.log("\tChatting with prompt: ", prompt);
        let startTime = Date.now();
        let chatResponse = await conversation.sendMessage(prompt.prompt);
        Conversations.updateConversation(session, {
            conversationId: conversation.conversationId,
            parentMessageId: conversation.parentMessageId
        });

        let response = {
            response: chatResponse,
            timestamp: Date.now(),
            responseTime: (Date.now() - startTime),
            session: session
        }
        res.send(response);
    });
    server.delete("/chat/:sessionid", (req, res) => {
        let session = req.params.sessionid;
        if (!session)
            res.sendStatus(400);
        else
        {
            Conversations.resetConversation(session);
            res.sendStatus(200);
        }

    });

    server.listen(port);
    console.log("Server running on :" + port);
}

async function main() {
    
    await UTIL.ensureDirectoryExists();

    const chatGPT = await initChatGPT().catch(e => {
        console.error(e);
        process.exit();
    });
    console.log("ChatGPT is loaded and set up");

    setupExpress(chatGPT);

    Conversations.loadConversations();

    console.log("API is ready for incoming requests.");
}

main();