import fs from 'fs'

const DATA_DIRECTORY = "./data";
const CONVERSATION_FILE = DATA_DIRECTORY + "/conversation";
const SESSION_FILE = DATA_DIRECTORY + "/session";

async function ensureDirectoryExists() {
    let func = () => new Promise(async (res, rej) => {
        fs.access(DATA_DIRECTORY, fs.constants.F_OK, async (err) => {
            if (err) {
                await fs.mkdir(DATA_DIRECTORY, {}, (err) => {
                    if (err)
                    {
                        console.error(err);
                        rej(err);
                    }
                    else
                    {
                        console.log("Creating /data on first start");
                        setTimeout(() => res(), 2000);
                    }
                });
            } else
                res();
        });
    });
    await func();
}

export default {
    DATA_DIRECTORY,
    CONVERSATION_FILE,
    SESSION_FILE,
    ensureDirectoryExists
}