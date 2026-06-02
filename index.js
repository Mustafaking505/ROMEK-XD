import dotenv from 'dotenv';
dotenv.config();

import {
    makeWASocket,
    fetchLatestBaileysVersion,
    DisconnectReason,
    useMultiFileAuthState,
} from '@whiskeysockets/baileys';

import { Handler, Callupdate, GroupUpdate } from './src/event/index.js';
import express from 'express';
import pino from 'pino';
import fs from 'fs';
import NodeCache from 'node-cache';
import path from 'path';
import chalk from 'chalk';
import axios from 'axios';
import config from './config.cjs';
import pkg from './lib/autoreact.cjs';

const { emojis, doReact } = pkg;

const sessionName = "session";
const app = express();

let useQR = false;
let initialConnection = true;
const PORT = process.env.PORT || 3000;

const logger = pino({ level: "silent" });
const msgRetryCounterCache = new NodeCache();

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function downloadSessionData() {
    if (!config.SESSION_ID) {
        console.error('Please add SESSION_ID in env');
        return false;
    }

    const sessdata = config.SESSION_ID.split("ALADDIN-XD&")[1];
    const url = `https://pastebin.com/raw/${sessdata}`;

    try {
        const response = await axios.get(url);
        const data = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);

        await fs.promises.writeFile(credsPath, data);
        console.log("🔒 Session Loaded Successfully (ALADDIN XD⁷⁹)");
        return true;
    } catch (err) {
        return false;
    }
}

async function start() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        console.log(`🤖 ALADDIN XD⁷⁹ running WA v${version.join('.')}`);

        const Matrix = makeWASocket({
            version,
            logger,
            printQRInTerminal: useQR,
            browser: ["𝐀𝐋𝐀𝐃𝐃𝐈𝐍 𝐗𝐃⁷⁹", "Chrome", "3.0"],
            auth: state,
        });

        Matrix.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'close') {
                if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                    start();
                }
            } else if (connection === 'open') {
                if (initialConnection) {
                    console.log("✅ Connected Successfully to 𝐀𝐋𝐀𝐃𝐃𝐈𝐍 𝐗𝐃⁷⁹");

                    Matrix.sendMessage(Matrix.user.id, {
                        text: `╭───❍ *Welcome to 𝐀𝐋𝐀𝐃𝐃𝐈𝐍 𝐗𝐃⁷⁹* ❍───╮

Hello ${config.BOT_NAME} 👋  
🤖 Powerful WhatsApp Bot Activated

⚡ Prefix: ${config.PREFIX}
📡 Status: Online

💖 © Powered by 𝐀𝐋𝐀𝐃𝐃𝐈𝐍 𝐗𝐃⁷⁹`
                    });

                    initialConnection = false;
                }
            }
        });

        Matrix.ev.on('creds.update', saveCreds);

        Matrix.ev.on("messages.upsert", async (chatUpdate) => {
            await Handler(chatUpdate, Matrix, logger);
        });

        Matrix.ev.on("call", async (json) => {
            await Callupdate(json, Matrix);
        });

        Matrix.ev.on("group-participants.update", async (messag) => {
            await GroupUpdate(Matrix, messag);
        });

        // AUTO REACT
        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message || mek.key.fromMe) return;

                if (config.AUTO_REACT) {
                    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                    await doReact(emoji, mek, Matrix);
                }
            } catch (e) {
                console.log("Auto react error", e);
            }
        });

        // STATUS VIEW
        Matrix.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek?.message || mek.key.fromMe) return;

                if (mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
                    await Matrix.readMessages([mek.key]);

                    if (config.AUTO_STATUS_REPLY) {
                        await Matrix.sendMessage(mek.key.participant, {
                            text: config.STATUS_READ_MSG || "✅ Status Seen by 𝐀𝐋𝐀𝐃𝐃𝐈𝐍 𝐗𝐃⁷⁹"
                        });
                    }
                }
            } catch (e) {
                console.log(e);
            }
        });

    } catch (error) {
        console.error("Critical Error:", error);
    }
}

async function init() {
    if (fs.existsSync(credsPath)) {
        await start();
    } else {
        const ok = await downloadSessionData();

        if (ok) {
            await start();
        } else {
            useQR = true;
            await start();
        }
    }
}

init();

app.get('/', (req, res) => {
    res.send("𝐀𝐋𝐀𝐃𝐃𝐈𝐍 𝐗𝐃⁷⁹ Bot Running...");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});