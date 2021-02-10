//var ServerURL = 'http://localhost:8080';
var ServerURL = 'https://bim360-zip-extract.herokuapp.com';



// Vue.js components
window.app = new Vue({
    el: "#app",

    data: {
        form: { 
            destURN: "",
            srcURN: "", 
            token: "",
            filename:"",
        },
        istoast: true,
        toastmsg: "na",
        treeData: {  filename: "BIM360-Folder (Source)",  isOpen:true },
        treeData2: treeData2
    },
    methods: {

        toggle1: function(item) {
            alert('item')
        },

        makeFolder: function(item) {
            this.selectedItem = item;
            
            if (item.url) 
                this.listZipContents(item.size, item.url);
            else {
                this.form.filename = item.filename;
            }
        },

        parseURN(urn) {
            const arr = urn.split('/');
            return {project:`b.${arr[4]}`, folder:arr[6].split("folder:")[1]}
        },

        listBimFiles: async function() {
            await this.updateTreeView(this.form.srcURN, this.treeData);
            setInterval( async () =>  {
                await this.updateTreeView(this.form.destURN, this.treeData2);
            }, 4000);
        },


        updateTreeView: async function(urn, treeData) {
            const bim = this.parseURN(urn);
            const url = `${ServerURL}/bim/list?project=${bim.project}&folder=${bim.folder}&token=${this.form.token}`;
            const res = await (await fetch( url, {mode: 'cors'} )).json();
            Vue.set(treeData, "children", res);
            treeData.isOpen = true;
            return res[0];
        },

        listZipContents: async function(size, url) {
            const req = `${ServerURL}/listZipContents?size=${size}&zipURL=${url}`;
            const res = await (await fetch( req )).json();
            Vue.set(this.selectedItem, "children", []);

            Object.entries(res).forEach( i => { 
                this.selectedItem.children.push(
                    { filename:i[0], offset: i[1].offset, size: i[1].size } 
                )
            });
            return res;
        },


        transfer: async function() {
            const filename = this.selectedItem.filename;
            const bim = this.parseURN(this.form.destURN);
            const url = `${ServerURL}/transfer?filename=${filename}&destProject=${bim.project}&destFolder=${bim.folder}`;
            const res = await fetch( url );
            return res.json();
        },

        showtoast: function(msg) {
            console.log(msg);
            this.istoast = true;
            this.toastmsg = msg;
            setTimeout(function(){ app.istoast=false; }, 3000);
        },


    }
})
