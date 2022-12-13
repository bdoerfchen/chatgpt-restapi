import puppeteer from 'puppeteer';
import fs from 'fs';
import UTIL from './util.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36'
const COOKIE_LIFETIME = 600000;

const OPENAI_URLS = {
    LOGIN: "https://chat.openai.com/auth/login"
}

const SELECTORS = {
    login_button_selector: "#__next > div > div > div.flex.flex-row.gap-3 > button:nth-child(1)",
    email_input_selector: "#username",
    button_login_id: "._button-login-id",
    button_login_password: "._button-login-password",
    password_input_selector: "#password",
}

function wait(t) {
    return new Promise((res) => {
        setTimeout(res, t)
    });
}

const options = {
    nodejs: {
        headless: true
    },
    docker: {
        headless: true,
        executablePath: '/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-gpu',
        ]
    }
}

async function readSessionCookie()
{
    try
    {
        let loadFromFile = () => new Promise((res, rej) => {
            fs.readFile(UTIL.SESSION_FILE, 'utf8', (err, data) => {
                if (err)
                {
                    rej("File does not exist, yet.");
                    return;
                }

                let cookieData = JSON.parse(data);
                let timeLeft = cookieData.timestamp + COOKIE_LIFETIME - Date.now();
                if (cookieData.timestamp > 0 && timeLeft < 0)
                    rej("Too old: " + timeLeft);
                else
                    res(cookieData.sessionCookie);
            });
        });
        return await loadFromFile();

    } catch (ex)
    {
        console.log("Previous cookie does not exist or is too old. Error: ", ex);
        return null;
    }
}

async function saveSessionCookie(cookie)
{
    let sessionData = { sessionCookie: cookie, timestamp: Date.now() };
    let data = JSON.stringify(sessionData);
    let writeToFile = () => new Promise((res, rej) => {
        fs.writeFile(UTIL.SESSION_FILE, data, {encoding: 'utf8', flag: 'w'}, (error) => {
            if (error)
                rej(error);
            else
                res();
        })
    });
    await writeToFile();
}

async function getSession(email, password)
{ 
    let cookie = await readSessionCookie();

    if (cookie != null)
    {
        console.log("Found valid session cookie");
        return cookie;
    }
    else
    {
        console.log("Requesting new session cookie");
        cookie = await getSessionByPuppeteer(email, password);
        console.log("Cookie: ", cookie);
        try
        {
            await saveSessionCookie(cookie);
            console.log("Saved session cookie");
        } catch (ex)
        {
            console.log("Could not save the session cookie: ", ex);
        }
        return cookie;
    }    
}

async function getSessionByPuppeteer(email, password) {

    if (!email || !password) {
        throw "empty email or password!"
    }

    const browser = await puppeteer.launch(process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD ? options.docker : options.nodejs)
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)

    try {
        await page.goto(OPENAI_URLS.LOGIN,{timeout:120000})

        await page.waitForSelector(SELECTORS.login_button_selector)
        await page.click(SELECTORS.login_button_selector)

        await page.waitForNavigation({ waitUntil: 'networkidle2' }) // wait page load
        await wait(500)

        await page.type(SELECTORS.email_input_selector, email, { delay: 100 })

        await page.waitForSelector(SELECTORS.button_login_id)
        await page.click(SELECTORS.button_login_id)

        await wait(500)

        await page.type(SELECTORS.password_input_selector, password, { delay: 100 })
        await page.waitForSelector(SELECTORS.button_login_password)
        await page.click(SELECTORS.button_login_password)

        await page.waitForNavigation({ waitUntil: 'networkidle2' }) // wait page load
        await wait(1000)

        const cookies = await page.cookies()
        const session_cookie = cookies.filter((cookie) => cookie.name == "__Secure-next-auth.session-token")[0]

        if (!session_cookie || !session_cookie.value) {
            throw "session not found!"
        }

        return session_cookie.value
    } catch (e) {
        throw e
    } finally {
        browser.close()
    }


}

export default {
    getSession,
    saveSessionCookie,
    COOKIE_LIFETIME
}