const fetch = require('node-fetch');
const StreamZip = require('node-stream-zip');
const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({ logger: true })
let ze = null;
let bm = null;

// ROUTES
fastify.get('/', async (request, reply) => {
    return { status: 'alive' }
})

// INPUT: projectID, folderID, AccessToken
// OUTPUT: list of BIM360 files in the folder
fastify.get('/bim/list', async (request, reply) => {
    if (!request.query.project) return "INPUT: project, folder, token";
    bm = new BIM360utils(request.query.project, request.query.folder, request.query.token);
    const res = await bm.getFolderContents();
    return res;
});

// INPUT: zipURL, size (file-size)
// OUTPUT: list of zip file contents
fastify.get('/listZipContents', async (request, reply) => {
    if (!request.query.zipURL) return "INPUT: zipURL, size (file-size)";
    try {
        ze = new netZipExtract(request.query.zipURL, request.query.size, bm.token);
        const contents = await ze.getContents();
        return contents;
    } catch(err) { return err }
})

// INPUT: filename
// OUTPUT: status of result (timeout after 30seconds)
fastify.get('/transfer', async (request, reply) => {
    if (!request.query.filename) return "INPUT: filename";
    try {
        const filename = request.query.filename;
        if (!ze && !bm) return {status:`not-ready.  Use 'listcontents' first`};
        const destURL = await bm.createEmptyFile(filename);
        const status = await ze.extractFile(filename, destURL);
        const status2 = await bm.createVersion();
        return {status1: status, status2: status2};
    } catch(err) {
        return {status: err};
    }
})

// INPUT: filename
// OUTPUT: status of job
fastify.get('/status', async (request, reply) => {
    if (!request.query.filename) return "INPUT: filename";
    const id = request.query.filename;
    if (!id) return;
    return (id) ?  `{ "${id}" : "${ze.session[id]}" }` : "missing filename= parameter"
})

fastify.listen(process.env.PORT || 3000, "0.0.0.0", (err, address) => {
    if (err) throw err
    fastify.log.info(`server listening on ${address}`)
})


/*
fastify.get('/bim/empty', async (request, reply) => {
    const res = await bm.createEmptyFile(request.query.filename);
    return res;
})

fastify.get('/bim/upload', async (request, reply) => {
    const res = await bm.createVersion();
    return res;
})

fastify.get('/extract2', async (request, reply) => {
    try {
        if (!ze) return {status:`not-ready.  Use 'listcontents' first`};
        const status = await ze.extractFile(request.query.outfile, request.query.destURL);
        return {status: status};
    } catch(err) {
        return {status: err};
    }
})
*/


//
// Main
//
class netZipExtract {
    constructor(URN, fileLength, token) {
        this.URL = `${URN}`;
        this.token = token;
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
            'Authorization': `Bearer ${this.token}`
        }});
        if (res.status != 206) 
            throw(`error:${res.statusText}, bytes=${offset}-${offset+length}`)
        // Write bytes to file
        const buff = await res.buffer();
        fs.writeSync(fd, buff, 0, buff.length, offset);
        return res.status;
    }

    async _createTempZip(offset, size) {
        const tmpfile = fs.openSync(this.tmpFn, 'w');
        const chunksize = 4 * 1024; // only need 16k bytes of data
        await this._fetchWrite(tmpfile, 0, chunksize); // fetch/write header            
        await this._fetchWrite(tmpfile, this.fileLength - chunksize, chunksize); // fetch/write footer
        const zipHeaderOffset = 128;
        if (offset && size)
            await this._fetchWrite(tmpfile, offset, size + zipHeaderOffset); // fetch/write our filename within the zip
        fs.closeSync(tmpfile);        
    }

    //
    // get directory-list inside zip (that's hosted on bim360)
    //
    async getContents() { return new Promise(async resolve => {
        this._log(`fetch/extract Contents: ${this.URL} size ${this.fileLength}...`)
        try {
            await this._createTempZip();
            // now, extract content directory
            this.zip = new StreamZip({ file: this.tmpFn, storeEntries: true });
        }
        catch(err) {resolve(err);return}
        this.zip.on('error', (err) => { resolve(`error:${err}`) });
        this.zip.on('ready', () => { 
            this.entries = this.zip.entries();
            this.zip.close();
            resolve(this.entries);
        });
    })};

    //
    // extract a file from inside the zip file, then post it to bim360 destURL
    //
    async extractFile( filename, destURL ) { return new Promise(async resolve => {
        // get filename's offset and byte-length, located inside the zip file
        if (!this.entries) return;
        const offset = this.entries[filename].offset;
        const size = this.entries[filename].compressedSize;
        this.filename = filename;

        // now, fetch the exact bytes from bim360, and write to our temp file
        const MBytes = Math.round(size / 100000) / 10;
        this._log(`(downloading ${MBytes} MB) ${filename} , zip offset: ${offset}`)
        await this._createTempZip(offset, size);

        // now, use StreamZip to do it's magic.
        this._log(`Extracting ${filename} from ${this.tmpFn}...`)
        this.zip = new StreamZip({ file: this.tmpFn, storeEntries: true });
        this.zip.on('error', err => { throw(`error:${err}`) });
        this.zip.on('ready', async () => { 
            this.entries = this.zip.entries();

            this.zip.extract( filename, filename, async err => {
            //if (err) throw(`Zip-Extract error: ${err}`);

            this._log(`Uploading (0 KB) ${filename} to ${destURL}...`)

            // upload file to forge signedURL
            let bytes = size;
            const stream = fs.createReadStream(filename,{highWaterMark: 1024 * 1024 });
            stream.on('data', b => { 
                this._log(`Upload progress ${96-Math.round((bytes/size)*96)}%`)
                bytes-=b.length;
            });
            const rs2 = await fetch(destURL, { 
                method: 'PUT',
                headers: { Authorization: `Bearer ${this.token}` },
                body: stream });
            const res2 = await rs2.json();
            console.log(res2);
            // this.zip.close();  // don't close zip before upload complete. this seems buggy for slow networks
            this._log(`Upload complete: ${filename} to ${destURL}.${res2}`)
            resolve(`Upload complete: ${filename} to ${destURL}. ${res2}`)
            });
        });
    })}

    _log(m) {
        console.log(m);
        if (this.filename) this.session[this.filename] = m;
    }
}


class BIM360utils {
    constructor(project, folder, token) {
        this.folder = folder;
        this.project = project;
        this.token = token;
    }

    async getFolderContents() {
        const res = await fetch( `https://developer.api.autodesk.com/data/v1/projects/${this.project}/folders/urn:adsk.wipprod:fs.folder:${this.folder}/contents`, 
        { headers: { Authorization: `Bearer ${this.token}` }});
        const jres = await res.json();
        if (!jres.included) return jres;
        return jres.included.map(i => { return ({ 
            filename: i.attributes.displayName, 
            size:i.attributes.storageSize,
            url: `https://developer.api.autodesk.com/oss/v2/buckets/wip.dm.prod/objects/${i.relationships.storage.data.id.split('/')[1]}`
        })});
    }

    

    // token2 (optional) is a second ACCESS_TOKEN of a 2nd BIM360 HUB.
    // Use this to save the resulting output file to a secondary BIM360 Hub
    async createEmptyFile(filename) {
        this.filename = filename;
        const res = await fetch( `https://developer.api.autodesk.com/data/v1/projects/${this.project}/storage`, 
        {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept : 'application/vnd.api+json',
                Authorization: `Bearer ${this.token}`
            },
            body: `{
                "jsonapi": { "version": "1.0" },
                "data": {
                  "type": "objects",
                  "attributes": {
                    "name": "${this.filename}"
                  },
                  "relationships": {
                    "target": {
                      "data": { "type": "folders", "id": "urn:adsk.wipprod:fs.folder:${this.folder}" }
                    }
                  }
                }
          }`
        });
        const obj = await res.json();
        this.objid = obj.data.id.split("/")[1];
        return `https://developer.api.autodesk.com/oss/v2/buckets/wip.dm.prod/objects/${this.objid}`;
    }

    async createVersion() {
        const res = await fetch( `https://developer.api.autodesk.com/data/v1/projects/${this.project}/items`, 
        {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept : 'application/vnd.api+json',
                Authorization: `Bearer ${this.token}`
            },
            body: `{
                "jsonapi": { "version": "1.0" },
                "data": {
                  "type": "items",
                  "attributes": {
                    "displayName": "${this.filename}",
                    "extension": {
                      "type": "items:autodesk.bim360:File",
                      "version": "1.0"
                    }
                  },
                  "relationships": {
                    "tip": {
                      "data": {
                        "type": "versions", "id": "1"
                      }
                    },
                    "parent": {
                      "data": {
                        "type": "folders",
                        "id": "urn:adsk.wipprod:fs.folder:${this.folder}"
                      }
                    }
                  }
                },
                "included": [
                  {
                    "type": "versions",
                    "id": "1",
                    "attributes": {
                      "name": "${this.filename}",
                      "extension": {
                        "type": "versions:autodesk.bim360:File",
                        "version": "1.0"
                      }
                    },
                    "relationships": {
                      "storage": {
                        "data": {
                          "type": "objects",
                          "id": "urn:adsk.objects:os.object:wip.dm.prod/${this.objid}"
                        }
                      }
                    }
                  }
                ]
              }`
        });
        const obj = await res.json();
        return obj;
    }
}