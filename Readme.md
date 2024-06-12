# Resumable File Uploader

This is a simple exploration project for a file upload service implemented in pure Node.js. The service allows users to upload files of unlimited sizes and provides the ability to resume uploads in case of failures.

## Workflow

The workflow of the Resumable File Uploader is as follows:

1. **File Fragmentation**: The client breaks the file into multiple smaller chunks, called fragments. These fragments needs to be of the size defined in the MAX_CHUNK_SIZE constant,

2. **Upload**: The client dispatches these fragments to the server for upload in any order, as each fragment contains metadata allowing the server to reconstruct the original file.

3. **Resilience**: If a fragment encounters an issue during transmission, such as network interruption or server failure, the client has the ability to retransmit the affected fragment.

## Usage

To use the Resumable File Uploader:

1. Clone the repository to your local machine.
3. Start the server using `node server.js` or `npm start`.
4. Access the upload endpoint using a client application or tool.
5. Upload files by breaking them into fragments and dispatching them to the server. I recommend the following tool (https://pinetools.com/split-files)

Request example:

```
curl --location --request PUT 'localhost:3000/upload' \
--header 'chunk-number: 1' \
--header 'total-chunks: 1' \
--header 'file-id: test' \
--header 'file-extension: pdf' \
--data '@/C:/Users/your-user/Downloads/test.pdf'
```