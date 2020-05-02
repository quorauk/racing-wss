import WebSocket from 'ws';
import axios from "axios"
import dotenv from "dotenv"
import { v4 as uuidv4 } from "uuid"

dotenv.config()

const websockets = {}

const gsheetsKey=process.env.GSHEETS_KEY

const getData = async (spreadsheet, table, range) => {
    const tableEncoded = encodeURIComponent(table)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet}/values/${tableEncoded}${range}?key=${gsheetsKey}`
    try {
        const resp = await axios.get(url)
        return processData(resp.data)
    } catch(e) {
        console.log(e)
    }
}

const processData = (data) => {
    return data.values
        .filter((row) => row[1] !== '')
        .map((row) => {
            return {
                name: row[1],
                best: row[6],
                batch: row[7]
            }
        })
}

const wss = new WebSocket.Server({
    port: parseInt(process.env.PORT),
    perMessageDeflate: {
      zlibDeflateOptions: {
        // See zlib defaults.
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Other options settable:
      clientNoContextTakeover: true, // Defaults to negotiated value.
      serverNoContextTakeover: true, // Defaults to negotiated value.
      serverMaxWindowBits: 10, // Defaults to negotiated value.
      // Below options specified as default values.
      concurrencyLimit: 10, // Limits zlib concurrency for perf.
      threshold: 1024 // Size (in bytes) below which messages
      // should not be compressed.
    }
  });

let latestData
const setLatestData = async () => {
    latestData = await getData("1zqI1Sc_wmUlObM6-FukcFu85htGsSFkSNCOgdXJuQDo", "Calculation Sheet", "!A2:H17")
}
setLatestData()

wss.on('connection', async function connection(ws) {
    const hookUUID = uuidv4()

    ws.send(JSON.stringify(latestData))

    ws.on('close', () => {
        console.log("closing")
        delete websockets[hookUUID]
    })

    websockets[hookUUID] = ws
});

setInterval(async () => {
    console.log("sending")
    await setLatestData()
    Object.values(websockets).forEach((ws : WebSocket) => {
        ws.send(JSON.stringify(latestData))
    })

}, parseInt(process.env.SEND_INTERVAL))