//Imports
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";


//Start up the App
const app = express();
const port = 3000;

//API 
//For reed.co.uk auth is the apikey with empty password
const API_KEY = process.env.Api_key_reed;
const API_URL = `https://www.reed.co.uk/api/1.0/`
const auth = {
    username: API_KEY,
    password:"",
};
//For Udemy.com Auth is api key and password. Needs to be encoded with base 64 
const UDEMY_API_KEY = process.env.Api_Udemy;
const UDEMY_API_URL = 'https://www.udemy.com/api-2.0/'
const UDEMY_API_Password = process.env.Api_Udemy_Password;
const UdemyAuth = Buffer.from(`${UDEMY_API_KEY}:${UDEMY_API_Password}`).toString('base64');

//Middlewares
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

//Homepage
app.get("/",(req,res)=>{
    res.render("index.ejs")
});

/*
/Search functionality 
First set all the passed form data to variables
if part time selected set full time to false and vice versa.
But if none selected, both a true. 

Get request to API based on information
Config file is the auth
*/

app.post("/search", async (req,res)=>{
   console.log(req.body)
    const keywords = req.body.keyword;
    const locationName = req.body.location;
    const minimumSalary = req.body.minimumSalary; 
    let fullTime = "";
    let partTime = "";
    
    switch (req.body.time) {
        case "part":
            fullTime = false;
            partTime = true
            break;
        case "full":
            fullTime = true
            partTime = false;
            break
        default:
            partTime = true;
            fullTime = true;
            break;
    }
    // put all the params together
    const params = {
        keywords:keywords,
        locationName:locationName,
        partTime: partTime,
        fullTime: fullTime,
        minimumSalary: minimumSalary,
        resultsToTake: 5
    };
    //this uses axios to get an api call uses the params, and auth made earlier
    try {
        const result = await axios.get(API_URL + `search?`, { 
            params,
            auth
        });

        res.render("index.ejs", { content: result.data, keywords : keywords});
    } catch (error) {
    
        console.log("fail");
        console.error(error);
        res.render("index.ejs",{ content: JSON.stringify(error)});
    } 
});




//this for when the user clicks on the info button
app.post("/info", async (req,res)=>{
const jobId = req.body.jobId;
const keywords = req.body.keywords;
try {
    const jobResult = await axios.get(API_URL + `jobs/` + jobId,
        {
            auth
    });
    //gets the full time / part time result
    const time = jobResult.data.fullTime ? "Full Time" : "Part Time";
    //gets the salary or if no salary puts competitive. Because capitalism means you can post a job without saying that????
    const salary = jobResult.data.minimumSalary ? `${jobResult.data.minimumSalary} - ${jobResult.data.maximumSalary}` : "Competitive";
    const jobDescription = jobResult.data.jobDescription;
    
    // This part is to get the UDEMY courses 
    // Gets X courses based on the keywords submitted on the jobs search. I've used 3 (numberOfCourses) I could add an option to change this.
    //This was a little tricky to work out. 
    //Some reason I kept getting the URL endding in [object object] this lead to me getting random course
    //I couldn't pass the params to this as like the job search api call. This was giving me [object object]
    //I want specific courses to match the key word search. 
    //So just make it into a string. Problem here is it limits the size that's returned. 
    //The auth as well was tricky. Unlikey the last one I had to encode it bofore I sent it.
    const numberOfCourses = 3;
    const courses = await axios.get(UDEMY_API_URL + `courses/?page_size=${numberOfCourses}&search=${keywords}&ordering=relevance`,
        {
            headers:{
                Authorization: `Basic ${UdemyAuth}`
            }   
        }
    );
    
    const coursesData = courses.data; // this is the course data
    res.render("view.ejs", { 
        content : jobResult.data,
        keywords,
        time,
        salary,
        jobDescription,
        coursesData
    });
} catch (error) {
    console.log(error);
    res.render("view.ejs", {error : "We cannot acces this info at this time"}) 
}
});







app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
