const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');
const MAX_CHUNK_SIZE = 100 * 1024 * 1024; // 100 MB
const chunksBuffer = {};

/**
 * Creates an HTTP server instance using the Node.js http module.
 * This server handles PUT requests to the '/upload' endpoint.
 * @param {http.IncomingMessage} req - The request object.
 * @param {http.ServerResponse} res - The response object.
 */
const server = http.createServer((req, res) => {
    if (req.url === '/upload' && req.method === 'PUT') {
        upload(req, res); 
    } else {
        res.statusCode = 404;
        res.end("Not Found")
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});

/**
 * Validates the headers object to ensure it contains required fields and valid values.
 * @param {Object} headers - The headers object containing metadata about the upload.
 * @returns {Object} - An error object containing messages and a code if any validation errors are found. 
 *                     If no errors are found an empty object is returned.
 */
function checkHeaders (headers) {
    const error = {};

    if (!(
        headers['chunk-number'] 
        && headers['total-chunks'] 
        && headers['file-id']
        && headers['file-extension']
    )) {
        error.message = 'Missing required headers';
        error.code = 400;
    }

    if (isNaN(headers['chunk-number']) || isNaN(headers['total-chunks'])) {
        error.message = 'chunk-number or total-chunks are not valid numbers';
        error.code = 400;
    }

    const pattern = /^[a-zA-Z0-9-_\.]+$/;
    if(!pattern.test(headers['file-id']) || !pattern.test(headers['file-extension'])) {
        error.code = 400;
        error.message = 'file-id or file-extension are not valid';
    }

    return error;
}

/**
 * Handles file upload requests.
 * Validates the headers object to ensure it contains required fields and valid values.
 * If the headers are valid, the function stores the uploaded file chunks and assembles them into a complete file.
 * @param {http.IncomingMessage} req - The request object containing information about the HTTP request.
 * @param {http.ServerResponse} res - The response object used to send back the HTTP response.
 */
function upload(req, res) {
    const error = checkHeaders(req.headers);
    if (Object.keys(error).length) {
        res.statusCode = error.code;
        return res.end(error.message);
    }

    const fileId = req.headers['file-id'];
    const fileExtension = req.headers['file-extension'];
    const totalChunks = parseInt(req.headers['total-chunks']);
    const chunkNumber = parseInt(req.headers['chunk-number']);

    chunksBuffer[fileId] = chunksBuffer[fileId] ?? Array(totalChunks).fill().map(() => []);;
    
    let totalChunkSize = 0;
    req.on('data', (chunk) => {
        totalChunkSize += chunk.length;

        if (totalChunkSize > MAX_CHUNK_SIZE) {
            res.statusCode = 413;
            res.end(`Chunk size exceeds the maximum allowed size of ${MAX_CHUNK_SIZE} bytes`);
            return req.destroy(); 
        }

        chunksBuffer[fileId][chunkNumber - 1].push(chunk);
    })

    req.on('end', () => {
        if (chunksBuffer[fileId].every(chunk => chunk.length)) {
            const filePath = path.normalize(path.join(UPLOADS_FOLDER, `${fileId}.${fileExtension}`)); 
            const writeStream = fs.createWriteStream(filePath);

            for (let chunk of chunksBuffer[fileId]) {
                writeStream.write(Buffer.concat(chunk));
            }

            writeStream.end();

            writeStream.on('finish', () => {
                console.log(`File ${fileId} uploaded successfully`);
                delete chunksBuffer[fileId]; 
                res.statusCode = 200;
                res.end("Upload completed");
            });

            writeStream.on('error', (err) => {
                console.error(`Error writing chunks for file ${fileId}: ${err.message}`);
                res.statusCode = 500;
                res.end("Internal Server Error");
            });
        } else {
            console.log(`Received chunk ${chunkNumber} for file ${fileId}`);
            res.statusCode = 200;
            res.end("Chunk received successfully");
        }
    })
}