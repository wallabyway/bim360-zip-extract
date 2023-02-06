# bim360-zip-extract
extract files from a very large zip file, on bim360
Also, detects the difference between .RVT and .ZIP

### The problem:
![0-theProblem](https://user-images.githubusercontent.com/440241/152435523-75d191ec-1052-41ed-8fd7-6ab3be3b2157.JPG)
![1-step1-partial-transfer](https://user-images.githubusercontent.com/440241/152435543-1c69dd13-7e39-43bd-8128-d0c89f83986a.JPG)
![2-step2-create-incomplete-zip-file-decode-dir](https://user-images.githubusercontent.com/440241/152435560-d5f1b10e-aad5-40a3-b1dd-e6789db7bb83.JPG)
![3-step3-use-offsets-and-retrieve-file-with-range-get](https://user-images.githubusercontent.com/440241/152435573-8f263fff-361e-49b3-a9ed-1cc48887720d.JPG)
![4-step4-unzip-file-and-save](https://user-images.githubusercontent.com/440241/152435582-79b2fdf1-665d-4881-9f32-573c71ad6aca.JPG)



deployed to http://bim360-zip-extract.herokuapp.com/

### Walkthrough video (YouTube): https://youtu.be/02ChjbwLjUY

![Screen Shot 2021-02-05 at 6 49 25 PM](https://user-images.githubusercontent.com/440241/107471063-52ab8f80-6b21-11eb-92f8-ea1d6b5d61cb.JPG)

Instructions:
1. GetBIM360access-token fromBIM360( use the debug tool, network console, type ‘manifest’)
2. Copy/Paste Access-token into the Access-token box
3. In a separate browser, Go to yourBIM360source folder
4. Copy/Paste theBIM360source URL into the ‘Source' box
5. Now, navigateBIM360to your destination Folder (and Project) and Copy/Paste theBIM360URL into the ‘Destination' box
6. Click the blue ‘login’ button, wait, and you should see the Tree-list appear
7. Now, “Double-click" on the Revit file (that is disguised as azip), in the tree-view. It should ‘expand’
8. Now, “Double-click” on the sub-file, you want to transfer
9. Click the blue “transfer” button and wait for the file to appear on the right “destination” Tree-list



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

...
