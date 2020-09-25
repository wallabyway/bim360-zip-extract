const fetch = require('node-fetch');
const StreamZip = require('node-stream-zip');
const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: true })
let ze = null;

// ROUTES
fastify.get('/', async (request, reply) => {
    return { status: 'alive' }
})

fastify.get('/status', async (request, reply) => {
    const id = request.query.filename;
    if (!id) return;
    return (id) ?  `{ "${id}" : "${ze.session[id]}" }` : "missing filename= parameter"
})

fastify.get('/listcontents', async (request, reply) => {
    ze = new netZipExtract(request.query.filename, request.query.length);
    const contents = await ze.getContents();
    return contents;    
})

fastify.get('/extract', async (request, reply) => {
    if (!ze) return {status:`not-ready.  Use 'listcontents' first`};
    try {
        const status = await ze.extractFile(request.query.outfile, request.query.destURL);
        return {status: status};
    } catch(err) {
        return {status: err};
    }
})

fastify.post('/', async (request, reply) => {
    return { status: 'awake' }
})

fastify.listen(process.env.PORT || 3000, "0.0.0.0", (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
})

//
// Main
//
class netZipExtract {
    constructor(URL, fileLength) {
        this.URL = URL;
        this.fileLength = fileLength;
        this.tmpFn = 'tmp.zip';
        this.session = [];
    }

    //
    // fetch a chunk of bytes from BIM360 and write to 'temp' file on fs
    //
    async _fetchWrite( fd, offset, length ) {
        const res = await fetch( this.URL, { headers: {
            'range': `bytes=${offset}-${offset+length}`,
            //'Authorization': `Bearer ${this.token}`
        }});
        if (res.status != 206) throw(`error:${res.statusText}, bytes=${offset}-${offset+length}`)
        // Write bytes to file
        const buff = await res.buffer();
        fs.writeSync(fd, buff, 0, buff.length, offset);
        return res.status;
    }

    log(m) {
        console.log(m);
        if (this.filename) this.session[this.filename] = m;
    }

    //
    //
    getContents() { return new Promise(async resolve => {
        this.log(`fetch/extract Contents: ${this.URL} size ${this.fileLength}...`)

        //fetch header, footer, write bytes temp file
        const chunksize = 4*1024; // only need 16k bytes of data
        try {
            const tmpfile = fs.openSync(this.tmpFn, 'w');
            await this._fetchWrite(tmpfile, 0, chunksize); // fetch/write header            
            await this._fetchWrite(tmpfile, this.fileLength - chunksize, chunksize); // fetch/write footer
            fs.closeSync(tmpfile);
        }
        catch(err) {resolve(err); return; }

        // now, extract content directory
        this.zip = new StreamZip({ file: this.tmpFn, storeEntries: true });
        this.zip.on('error', (err) => { throw(`error:${err}`) });
        this.zip.on('ready', () => { 
            this.entries = this.zip.entries();
            this.zip.close();
            resolve(this.entries);
        });
    })};

    //
    // extract a filename from the bim360 zip, post it to subfolder
    //
    async extractFile( filename, destURL ) { return new Promise(async resolve => {
        // get filename's offset and byte-length, located inside the zip file
        if (!this.entries) return;
        const offset = this.entries[filename].offset;
        const size = this.entries[filename].compressedSize;
        this.filename = filename;

        // now, fetch the exact bytes from bim360, and write to our temp file
        const MBytes = Math.round(size / 100000) / 10;
        this.log(`(downloading ${MBytes} MB) ${filename} , zip offset: ${offset}`)
        const tmpfile = fs.openSync(this.tmpFn, 'w');
        const zipHdrBytes = 128;
        const chunksize = 4 * 1024; // only need 16k bytes of data
        await this._fetchWrite(tmpfile, 0, chunksize); // fetch/write header            
        await this._fetchWrite(tmpfile, this.fileLength - chunksize, chunksize); // fetch/write footer
        await this._fetchWrite(tmpfile, offset, size + zipHdrBytes); // fetch/write our filename within the zip
        fs.closeSync(tmpfile);

        // now, use StreamZip to do it's magic.
        this.log(`Extracting ${filename} from ${this.tmpFn}...`)
        this.zip = new StreamZip({ file: this.tmpFn, storeEntries: true });
        this.zip.on('error', err => { throw(`error:${err}`) });
        this.zip.on('ready', () => { 
            this.entries = this.zip.entries();

            this.zip.extract( filename, filename, async err => {
            if (err) throw(`Zip-Extract error: ${err}`);

            this.log(`Uploading (0 KB) ${filename} to ${destURL}...`)

            // upload file to forge signedURL
            let bytes = size;
            const stream = fs.createReadStream(filename,{highWaterMark: 2.5 * 1024 * 1024 });
            stream.on('data', b => { 
                this.log(`Upload progress ${96-Math.round((bytes/size)*96)}%`)
                bytes-=b.length;
            });
            await fetch(destURL, { method: 'PUT', body: stream });
            // header: { Authorization: `Bearer ${this.token}` }
            // this.zip.close();  // don't close too early
            this.log(`Upload complete: ${filename} to ${destURL}.`)
            resolve(`Upload complete: ${filename} to ${destURL}.`)
            });
        });
    })}   
}