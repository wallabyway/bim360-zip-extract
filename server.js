const fetch = require('node-fetch');
const StreamZip = require('node-stream-zip');
var fs = require('fs');


const fastify = require('fastify')({
    logger: true
  })
  
  fastify.get('/listcontents', async (request, reply) => {
    const ze = new netZipExtract(request.query.filename, request.query.length);
    //'https://developer.api.autodesk.com/oss/v2/signedresources/8c3540de-4d5f-46c1-8d51-8e3abb2ec821?region=US', 11122924);
    const contents = await ze.getContents();
    console.log(contents);
    return contents;
  })

  fastify.post('/', async (request, reply) => {
    const input = request.body;      
    const ze = new netZipExtract(input.url, input.filelength);
    ze.getContents();
    return { is: 'awake' }
  })

  fastify.listen(8080, (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
  })


class netZipExtract {
    constructor(URL, fileLength) {
        console.log(`starting netZipExtract URL:${URL} ${fileLength}`)
        this.URL = URL;
        this.fileLength = fileLength;
        this.tmpFn = 'tmp.zip';

    }

    // range GET zip file, from BIM360, write to temp file
    async _fetchWrite( fd, offset, length ) {
        // Fetch a small chunk of bytes from BIM 360
        const res = await fetch(this.URL, {
            headers: {
                'range': `bytes=${offset}-${offset+length-1}`,
                //'Authorization': `Bearer ${this.token}`
            }
        });
        // Write bytes to the tmp file on file-system
        const buff = await res.buffer();
        fs.writeSync(fd, buff, 0, buff.length, offset);
        return buff;
    }

    getContents() {
        return new Promise(async resolve => {

            const chunksize = 16*1024; // only need 16k bytes of data

            //fetch header, footer, write bytes temp file
            const tmpfile = fs.openSync(this.tmpFn, 'w');
            await this._fetchWrite(tmpfile, 0, chunksize); // fetch/write header
            await this._fetchWrite(tmpfile, this.fileLength - chunksize, chunksize); // fetch/write footer
            fs.closeSync(tmpfile);
    
            // now, extract content directory
            const zip = new StreamZip({ file: this.tmpFn, storeEntries: true });
            zip.on('ready', () => { 
                this.entries = zip.entries();
                zip.close();
                resolve(this.entries);
            });
    
        });
    }
}
