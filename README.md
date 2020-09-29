# bim360-zip-extract
extract files from a very large zip file, on bim360


### Four API's

![Screen Shot 2020-09-29 at 12 10 28 PM](https://user-images.githubusercontent.com/440241/94604721-eeacbc80-024c-11eb-9609-10fba95e24e1.JPG)

---

![Screen Shot 2020-09-29 at 12 10 34 PM](https://user-images.githubusercontent.com/440241/94604729-f2404380-024c-11eb-9c87-b62171231459.JPG)

#### Step2: List contents API

endpoint: /listcontents
- INPUT:  project, folder, token
- OUTPUT: list of files (json format)
- Example: /listcontents?project=1234&folder=1234&token=ey3348...

Reference: [The structure of a PkZIP](https://users.cs.jmu.edu/buchhofp/forensics/formats/pkzip.html)

---

![Screen Shot 2020-09-29 at 12 10 41 PM](https://user-images.githubusercontent.com/440241/94604737-f53b3400-024c-11eb-96ea-2270714abf89.JPG)

#### Step3: Transfer API

endpoint: /transfer
- INPUT:  filename
- OUTPUT: was transfer successful?  (json format)
- Example: /transfer?filename=master.rvt
- Optional INPUT: destProject, destFolder (specify different destination "project & folder")
---

![Screen Shot 2020-09-29 at 12 10 46 PM](https://user-images.githubusercontent.com/440241/94604750-f8362480-024c-11eb-92a6-f096fe747db8.JPG)

#### Step4: Transfer Progress API

endpoint: /status
- INPUT:  filename
- OUTPUT: get progress of transfer (json format)
- Example: /status?filename=master.rvt

---

DEMO: https://bim360-zip-extract.herokuapp.com

