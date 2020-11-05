# bim360-zip-extract
extract files from a very large zip file, on bim360


### Four API's


#### Step1: List BIM360 folder contents API

endpoint: bim//list
- INPUT:  project, folder, token
- OUTPUT: list of files (json format)
- Example: http://localhost:3000/bim/list?project=b.b4589cd9-ef9f-44a0-bea9-cc0dbc7f4544&folder=co.HBY2HScmSQiJkdsS9Qqm9Q&token=eyJhbGciOiJIUzI1NiIsImt.....

note: make sure that project starts with a b. .. ie. b4589cd9-ef9f-44a0-bea9-cc0dbc7f4544 becomes b.b4589cd9-ef9f-44a0-bea9-cc0dbc7f4544
---


#### Step2: List ZIP directory API

endpoint: /listZipContents
- INPUT:  zipURL, size
- OUTPUT: directory listing of zip file
- Example: listZipContents?size=4561790847&zipURL=https://developer.api.autodesk.com/oss/v2/buckets/wip.dm.prod/objects/5ab93dac-fdc2-4ffc-a14d-d93f2e02591f.rvt

Reference: [The structure of a PkZIP](https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html)

---


#### Step3: Transfer API

endpoint: /transfer
- INPUT:  filename
- OUTPUT: was transfer successful?  (json format)
- Example: /transfer?filename=master.rvt
- Optional INPUT: destProject, destFolder (specify different destination "project & folder")
---


#### Step4: Transfer Progress API

endpoint: /status
- INPUT:  filename
- OUTPUT: get progress of transfer (json format)
- Example: /status?filename=master.rvt

---

DEMO: https://bim360-zip-extract.herokuapp.com

