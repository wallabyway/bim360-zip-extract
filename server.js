const fetch = require('node-fetch');
const StreamZip = require('node-stream-zip');
const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: true })
let ze = null;

console.log(__dirname);
// ROUTES
fastify.get('/listcontents', async (request, reply) => {
    ze = new netZipExtract(request.query.filename, request.query.length);
    //'https://developer.api.autodesk.com/oss/v2/signedresources/8c3540de-4d5f-46c1-8d51-8e3abb2ec821?region=US', 11122924);
    const contents = await ze.getContents();
    console.log(contents);
    return contents;
})

fastify.get('/', async (request, reply) => {
    return { status: 'alive' }
})

fastify.get('/extract', async (request, reply) => {
    if (!ze) 
        return {status:`not-ready.  Please call 'listcontents' endpoint again`};
// http://localhost:3000/extract?outfile=Three Run Stair.rvt&destURL=https://developer.api.autodesk.com/oss/v2/signedresources/2552d59e-e3c7-4a50-807a-42a1d89e026e?region=US
//    ze = new netZipExtract(request.query.filename, request.query.length);
//    const contents = await ze.getContents();
    const result = await ze.extractFile(request.query.outfile, request.query.destURL);
    return result;
})

fastify.post('/', async (request, reply) => {
    return { status: 'awake' }
})

fastify.listen(process.env.PORT || 3000, "0.0.0.0", (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
})

// Main
class netZipExtract {
    constructor(URL, fileLength) {
        this.URL = URL;
        this.fileLength = fileLength;
        this.tmpFn = 'tmp.zip';
        console.log(`starting netZipExtract URL:${URL} ${fileLength}`)
    }

    // fetch a chunk of bytes from BIM360 and write to 'temp' file on fs
    async _fetchWrite( fd, offset, length ) {
        const res = await fetch( this.URL, { headers: {
            'range': `bytes=${offset}-${offset+length}`,
            //'Authorization': `Bearer ${this.token}`
        }});
        // Write bytes to file
        fs.writeSync(fd, (await res.buffer()), 0, buff.length, offset);
    }

    getContents() { return new Promise(async resolve => {

        const chunksize = 16*1024; // only need 16k bytes of data

        //fetch header, footer, write bytes temp file
        const tmpfile = fs.openSync(this.tmpFn, 'w');
        await this._fetchWrite(tmpfile, 0, chunksize); // fetch/write header
        await this._fetchWrite(tmpfile, this.fileLength - chunksize, chunksize); // fetch/write footer
        fs.closeSync(tmpfile);

        // now, extract content directory
        this.zip = new StreamZip({ file: this.tmpFn, storeEntries: true });
        this.zip.on('ready', () => { 
            this.entries = this.zip.entries();
            //zip.close();
            resolve(this.entries);
        })});
    }

    // extract a filename from the bim360 zip, post it to subfolder
    async extractFile( filename, destURL ) {
    return new Promise(async resolve => {
        // get filename's offset and byte-length, located inside the zip file
        const offset = this.entries[filename].offset;
        const size = this.entries[filename].compressedSize;

        // now, fetch the exact bytes from bim360, and write to our temp file
        const tmpfile = fs.openSync(this.tmpFn, 'a');
        const zipHdrBytes = 128;
        await this._fetchWrite(tmpfile, offset, size + zipHdrBytes); // fetch/write our filename within the zip
        fs.closeSync(tmpfile);

        // now, use StreamZip to do it's magic.
        this.zip.extract( filename, filename, async err => {
            if (err) resolve({status: 'Zip-Extract error'});

            // upload file to forge signedURL
            const data = fs.readFileSync(filename);
            const res = await fetch( destURL, { method: 'PUT', body: data });
            // header: { Authorization: `Bearer ${this.token}` }
            this.zip.close();
            resolve({status: `complete. ${filename} Extracted and uploaded to bim360`})
        });
    })}
}

// result.rvt = https://developer.api.autodesk.com/oss/v2/signedresources/2552d59e-e3c7-4a50-807a-42a1d89e026e?region=US