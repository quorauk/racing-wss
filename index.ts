import WebSocket from 'ws';
import axios from "axios"
import dotenv from "dotenv"

dotenv.config()

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

wss.on('connection', async function connection(ws) {
    const interval = setInterval(async () => {
        console.log("sending")
        const data = await getData("1zqI1Sc_wmUlObM6-FukcFu85htGsSFkSNCOgdXJuQDo", "Calculation Sheet", "!A2:H17")
        ws.send(JSON.stringify(data))

    }, parseInt(process.env.SEND_INTERVAL))

    const data = await getData("1zqI1Sc_wmUlObM6-FukcFu85htGsSFkSNCOgdXJuQDo", "Calculation Sheet", "!A2:H17")
    ws.send(JSON.stringify(data))

    ws.on('close', () => {
        console.log("closing")
        clearInterval(interval)
    })
});