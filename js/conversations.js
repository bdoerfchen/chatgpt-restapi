import fs from 'fs';
import dotenv from 'dotenv'
import UTIL from './util.js';

var conversationMap = {}
const conversationTimeLimit = process.env.CONVERSATION_LIFETIME;
var loaded = false;

function getConversation(sessionsid){
    let conversation = {
        conversationId: undefined,
        parentMessageId: undefined
    };
    
    if(conversationMap[sessionsid]){
        conversation = conversationMap[sessionsid];
    }else{
        conversationMap[sessionsid] = conversation;
    }

    conversation.lastSeen = Date.now();
    
    return conversation;
}

function updateConversation(sessionid, conversation)
{
    conversationMap[sessionid] = conversation;
    saveConversations();
}

function resetConversation(sessionsid){
    delete conversationMap[sessionsid]
    saveConversations();
}

function saveConversations()
{
    let data = JSON.stringify(conversationMap);
    fs.writeFile(UTIL.CONVERSATION_FILE, data, 'utf8', (err) => {
        if (err)
            console.log("Could not save conversations. ", err)
    });
}

async function loadConversations()
{
    if (loaded)
        return;
    loaded = true;

    let readFunction = () => new Promise((res, rej) => {
        fs.readFile(UTIL.CONVERSATION_FILE, 'utf8', (err, data) => {
            if (err)
                rej("No conversations saved, yet.");
            else
            {
                conversationMap = JSON.parse(data);
                res();
            }
        });
    });

    try
    {
        await readFunction();
        console.log("Loaded previous conversations successfully");
    } catch (ex)
    {
        console.log("Could not load previous conversations. Error: ", ex);
    }
}

function cleanUnactiveConversations(){
    
    try{
        const users = Object.keys(conversationMap)
        users.forEach((user)=>{
            const lastSeen = conversationMap[user].lastSeen
            if(Date.now()-lastSeen-conversationTimeLimit >= 0){
                delete conversationMap[user]
            }
        })
    }catch(e){

    }finally{
        setTimeout(cleanUnactiveConversations,60000)
    }
}

cleanUnactiveConversations()

export default {
    loadConversations,
    getConversation,
    resetConversation,
    updateConversation
}